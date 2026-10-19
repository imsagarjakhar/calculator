'use strict';
// Exercise the real page handlers with captured DOM/storage/download surfaces.
// This covers data interactions; it does not replace a visual browser check.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./custom-engine'),Growth=require('./growth-engine');
class Node {
 constructor(id,value=''){this.id=id;this._value=String(value);this.initial=String(value);this.options=[];this.listeners={};this.hidden=false;this.innerHTML='';this.textContent='';this.firstChild={textContent:''};this.files=[];this.dataset={};}
 get value(){return this._value;}set value(v){this._value=String(v);}
 add(option){this.options.push(option);if(this.options.length===1)this.value=option.value;}
 replaceChildren(){this.options=[];this.value='';}
 addEventListener(type,handler){this.listeners[type]=handler;}
 focus(){}scrollIntoView(){}remove(){}click(){}
 reset(){for(const id of members[this.id]||[])nodes.get(id).value=nodes.get(id).initial;}
}
const defaults={currency:'INR',assetType:'Mutual fund',assetLiquid:'yes',loanSource:'income',flowType:'investment',flowSource:'income',flowInflation:'future'};
const nodes=new Map([...fs.readFileSync('custom-plan.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Node(m[1],defaults[m[1]]||'')]));
const members={assetForm:['assetName','assetType','assetValue','assetReturn','assetLiquid'],loanForm:['loanName','loanBalance','loanRate','loanMonths','loanSource'],flowForm:['flowType','flowAmount','flowNote','flowSource','flowInflation']};
const get=id=>{assert.ok(nodes.has(id),'Missing HTML element '+id);return nodes.get(id);};
const plan=E.createPlan(new Date(2026,9,19));plan.months=12;plan.assets[0].annualReturn=0;
const saved=new Map([['intimetec-custom-plan-v1',E.exportPlan(plan)]]),downloads=[],documentListeners={};
const ctx=vm.createContext({CustomPlan:E,GrowthEngine:Growth,Option:function(name,value){this.name=name;this.value=value;},Blob,
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
 URL:{createObjectURL(blob){downloads.push(blob);return 'download-url';},revokeObjectURL(){}},setTimeout:fn=>fn(),
 document:{getElementById:get,createElement:()=>new Node('download'),body:{append(){}},addEventListener:(type,handler)=>documentListeners[type]=handler}});
vm.runInContext(fs.readFileSync('custom-plan.js','utf8'),ctx);
const submit=id=>get(id).onsubmit({preventDefault(){}}),read=()=>E.parse(saved.get('intimetec-custom-plan-v1'));
const clickAction=(action,id)=>documentListeners.click({target:{closest:()=>({dataset:{action,id}})}});
assert.ok(get('summary').innerHTML.includes('Projected net wealth'));
get('assetName').value='Stocks';get('assetType').value='Stocks';get('assetValue').value=0;get('assetReturn').value=0;get('assetLiquid').value='yes';submit('assetForm');
let p=read(),stock=p.assets.find(a=>a.name==='Stocks');assert.ok(stock);assert.equal(get('error').hidden,true);
get('loanName').value='Loan';get('loanBalance').value=12000;get('loanRate').value=0;get('loanMonths').value=12;get('loanSource').value='income';get('loanForm').listeners.input();assert.equal(get('loanEmi').value,'1000.00');submit('loanForm');assert.equal(read().loans.length,1);
get('editMonth').value='2026-11';get('editMonth').onchange();get('flowTarget').value=stock.id;get('flowAmount').value=50000;get('flowNote').value='Salary bonus';submit('flowForm');
p=read();assert.equal(p.overrides[0].flows[0].assetId,stock.id);assert.equal(E.project(p).contributions,290000);
get('monthlyRows').listeners.change({target:{dataset:{sipMonth:'2026-11'},value:'30000'}});p=read();assert.equal(p.overrides[0].sip,30000);assert.equal(E.project(p).contributions,300000);
clickAction('edit-flow','0');get('flowAmount').value=60000;submit('flowForm');p=read();assert.equal(p.overrides[0].flows.length,1);assert.equal(p.overrides[0].flows[0].amount,60000);
const beforeRemove=saved.get('intimetec-custom-plan-v1');clickAction('remove-asset',stock.id);assert.equal(saved.get('intimetec-custom-plan-v1'),beforeRemove);assert.ok(get('error').textContent.includes('Reassign'));
get('exportPlan').onclick();assert.ok(downloads.length);
async function checkFiles(){
 const exported=E.parse(await downloads[0].text());assert.deepEqual(exported,read());
 get('exportCsv').onclick();const csv=await downloads[1].text();assert.ok(csv.includes('portfolioPayments'));assert.equal(csv.trim().split('\r\n').length,13);
 const before=saved.get('intimetec-custom-plan-v1');get('importFile').files=[{size:12,text:async()=>'{bad json'}];await get('importFile').onchange();assert.equal(saved.get('intimetec-custom-plan-v1'),before);assert.ok(get('error').textContent.includes('Import not applied'));
 exported.name='Future revision';exported.monthlySip=12345;const text=E.exportPlan(exported);get('importFile').files=[{size:text.length,text:async()=>text}];await get('importFile').onchange();assert.equal(get('importPreview').hidden,false);assert.equal(saved.get('intimetec-custom-plan-v1'),before,'Import must wait for the preview action');assert.ok(get('importDescription').textContent.includes('Future revision'));
 get('confirmImport').onclick();assert.deepEqual(read(),exported);assert.equal(get('importPreview').hidden,true);assert.equal(get('planName').value,'Future revision');
 // Copying Growth must preserve the original calculator and produce matching output.
 const settings={monthly:2000,stepup:10,years:1,rate:12,goal:1e9,inflation:5},position={assets:[{name:'Gold',type:'Gold',amount:10000,rate:8,liquid:true}],loans:[{name:'Home',balance:12000,rate:0,totalMonths:24,remainingMonths:12,source:'income'}]},extras=[{year:1,month:2,amount:50000,note:'Bonus'}],events=[{name:'Education',amount:3000,year:1,month:6,inflate:false,enabled:true}];
 const original=new Map([['InTimeTec-investment-planner-v2',JSON.stringify({version:3,currency:'INR',inputs:settings,extras})],['growth-position-v1-INR',JSON.stringify(position)],['life-events-v1-growth-INR',JSON.stringify(events)]]);for(const [k,v] of original)saved.set(k,v);
 get('copyGrowth').onclick();assert.equal(get('importPreview').hidden,false);get('confirmImport').onclick();
 const copied=read(),actual=E.project(copied),expected=Growth.projectPlan(settings,extras,events,position);assert.ok(Math.abs(actual.netWorth-expected.netWorth)<1e-6);for(const [k,v] of original)assert.equal(saved.get(k),v,'Growth inputs must stay untouched');
 console.log('Custom page handlers passed: editable assets/loans, monthly SIP and bonus updates, safe removal, CSV/JSON download, staged import/restore, and read-only Growth copying.');
}
checkFiles().catch(e=>{console.error(e);process.exitCode=1;});
