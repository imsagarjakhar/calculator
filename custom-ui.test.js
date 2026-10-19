'use strict';
// Exercise the real page handlers with captured DOM/storage/download surfaces.
// This covers data interactions; it does not replace a visual browser check.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./custom-engine'),Growth=require('./growth-engine'),Report=require('./custom-report');
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
const members={assetForm:['assetName','assetType','assetValue','assetReturn','assetLiquid'],loanForm:['loanName','loanBalance','loanRate','loanMonths','loanSource','loanOriginal','loanStartDate','loanCurrentDate'],flowForm:['flowType','flowAmount','flowNote','flowSource','flowInflation']};
const get=id=>{assert.ok(nodes.has(id),'Missing HTML element '+id);return nodes.get(id);};
const plan=E.createPlan(new Date(2026,9,19));plan.months=12;plan.assets[0].annualReturn=0;
const saved=new Map([['intimetec-custom-plan-v1',E.exportPlan(plan)]]),downloads=[],documentListeners={};
const ctx=vm.createContext({CustomPlan:E,CustomReport:Report,GrowthEngine:Growth,Option:function(name,value){this.name=name;this.value=value;},Blob,
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
 URL:{createObjectURL(blob){downloads.push(blob);return 'download-url';},revokeObjectURL(){}},setTimeout:fn=>fn(),
 document:{getElementById:get,createElement:()=>new Node('download'),body:{append(){}},addEventListener:(type,handler)=>documentListeners[type]=handler}});
vm.runInContext(fs.readFileSync('custom-plan.js','utf8'),ctx);
const submit=id=>get(id).onsubmit({preventDefault(){}}),read=()=>E.parse(saved.get('intimetec-custom-plan-v1'));
const clickAction=(action,id)=>documentListeners.click({target:{closest:()=>({dataset:{action,id}})}});
assert.ok(get('summary').innerHTML.includes('Projected net wealth'));
// End month is inclusive, restores from stored duration, and validates calendar ranges.
assert.equal(get('endMonth').value,'2027-09');
assert.equal(get('endMonth').min,'2026-10');assert.equal(get('endMonth').max,'2086-09');
get('endMonth').value='2026-10';get('endMonth').oninput();submit('settingsForm');
assert.equal(read().months,1);assert.ok(get('durationHint').textContent.startsWith('1 month ·'));
get('endMonth').value='2027-01';submit('settingsForm');assert.equal(read().months,4);
const validDates=saved.get('intimetec-custom-plan-v1');
for(const invalid of ['2026-09','2086-10','']){
 get('endMonth').value=invalid;submit('settingsForm');
 assert.equal(saved.get('intimetec-custom-plan-v1'),validDates);assert.equal(get('error').hidden,false);
}
get('startMonth').value='2026-11';get('endMonth').value='2026-11';get('startMonth').oninput();
assert.equal(get('endMonth').min,'2026-11');submit('settingsForm');assert.equal(read().months,1);
get('startMonth').value='2026-10';get('endMonth').value='2086-09';submit('settingsForm');assert.equal(read().months,720);
get('endMonth').value='2027-09';submit('settingsForm');assert.equal(read().months,12);
get('assetName').value='Stocks';get('assetType').value='Stocks';get('assetValue').value=0;get('assetReturn').value=0;get('assetLiquid').value='yes';submit('assetForm');
let p=read(),stock=p.assets.find(a=>a.name==='Stocks');assert.ok(stock);assert.equal(get('error').hidden,true);
assert.equal(get('loanMode').value,'original');assert.equal(get('loanBalance').readOnly,true);
get('loanName').value='Dated loan';get('loanOriginal').value=60000;get('loanRate').value=0;get('loanYears').value=5;get('loanExtraMonths').value=0;get('loanStartDate').value='2024-10-19';get('loanCurrentDate').value='2026-10-19';get('loanForm').listeners.input();
assert.equal(get('loanPaidMonths').value,'24');assert.equal(get('loanMonths').value,'36');assert.equal(get('loanBalance').value,'36000.00');assert.equal(get('loanEmi').value,'1000.00');assert.equal(get('loanRemainingTotal').value,'36000.00');
submit('loanForm');let dated=read().loans[0];assert.equal(dated.paidMonths,24);assert.equal(dated.startDate,'2024-10-19');assert.equal(dated.originalAmount,60000);
clickAction('edit-loan',dated.id);assert.equal(get('loanMode').value,'original');assert.equal(get('loanYears').value,'5');assert.equal(get('loanCurrentDate').value,'2026-10-19');
get('loanCurrentDate').value='2024-10-18';get('loanForm').listeners.input();assert.equal(get('loanEmi').value,'');submit('loanForm');assert.deepEqual(read().loans[0],dated);
get('loanCancel').onclick();clickAction('remove-loan',dated.id);
get('loanMode').value='current';get('loanMode').onchange();assert.equal(get('loanBalance').readOnly,false);assert.equal(get('loanOriginal').disabled,true);
get('loanName').value='Loan';get('loanBalance').value=12000;get('loanRate').value=0;get('loanMonths').value=12;get('loanSource').value='income';get('loanForm').listeners.input();assert.equal(get('loanEmi').value,'1000.00');submit('loanForm');assert.equal(read().loans.length,1);
clickAction('edit-loan',read().loans[0].id);assert.equal(get('loanMode').value,'current');get('loanCancel').onclick();
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
 get('exportReport').onclick();const html=await downloads.at(-1).text();assert.ok(html.startsWith('<!doctype html>'));assert.deepEqual(Report.read(html),read());
 get('importFile').files=[{size:html.length,text:async()=>html}];const beforeReport=saved.get('intimetec-custom-plan-v1');await get('importFile').onchange();
 assert.equal(get('importPreview').hidden,false);assert.equal(saved.get('intimetec-custom-plan-v1'),beforeReport);get('confirmImport').onclick();assert.deepEqual(read(),exported);
 get('importFile').files=[{size:20,text:async()=>'<html>Other report</html>'}];await get('importFile').onchange();assert.equal(saved.get('intimetec-custom-plan-v1'),beforeReport);assert.ok(get('error').textContent.includes('not an importable'));
 // Copying Growth must preserve the original calculator and produce matching output.
 const settings={monthly:2000,stepup:10,years:1,rate:12,goal:1e9,inflation:5},position={assets:[{name:'Gold',type:'Gold',amount:10000,rate:8,liquid:true}],loans:[{name:'Home',balance:12000,rate:0,totalMonths:24,remainingMonths:12,source:'income'}]},extras=[{year:1,month:2,amount:50000,note:'Bonus'}],events=[{name:'Education',amount:3000,year:1,month:6,inflate:false,enabled:true}];
 const original=new Map([['InTimeTec-investment-planner-v2',JSON.stringify({version:3,currency:'INR',inputs:settings,extras})],['growth-position-v1-INR',JSON.stringify(position)],['life-events-v1-growth-INR',JSON.stringify(events)]]);for(const [k,v] of original)saved.set(k,v);
 get('copyGrowth').onclick();assert.equal(get('importPreview').hidden,false);get('confirmImport').onclick();
 const copied=read(),actual=E.project(copied),expected=Growth.projectPlan(settings,extras,events,position);assert.ok(Math.abs(actual.netWorth-expected.netWorth)<1e-6);for(const [k,v] of original)assert.equal(saved.get(k),v,'Growth inputs must stay untouched');
 saved.set('corpus-survival-v1','survival-preserved');
 get('resetPlan').onclick();assert.equal(get('resetPreview').hidden,false);assert.deepEqual(read(),copied);
 get('cancelReset').onclick();assert.equal(get('resetPreview').hidden,true);assert.deepEqual(read(),copied);
 // Reset also discards a pending import and clears all Custom Plan form/edit state.
 get('copyGrowth').onclick();get('resetPlan').onclick();get('assetName').value='Unsaved asset';get('confirmReset').onclick();
 const reset=read();assert.equal(reset.name,'My custom plan');assert.equal(reset.currency,'INR');assert.equal(reset.months,120);assert.equal(reset.assets.length,1);assert.equal(reset.assets[0].value,0);assert.equal(reset.loans.length,0);assert.equal(reset.overrides.length,0);
 assert.equal(get('assetName').value,'');assert.equal(get('loanName').value,'');assert.equal(get('loanMode').value,'original');assert.equal(get('editMonth').value,reset.startMonth);assert.equal(get('importPreview').hidden,true);assert.equal(get('resetPreview').hidden,true);
 get('confirmImport').onclick();assert.deepEqual(read(),reset);assert.equal(saved.get('corpus-survival-v1'),'survival-preserved');for(const [k,v] of original)assert.equal(saved.get(k),v);
 console.log('Custom page handlers passed: editable assets/loans, monthly SIP and bonus updates, safe removal, CSV/JSON download, staged import/restore, and read-only Growth copying.');
}
checkFiles().catch(e=>{console.error(e);process.exitCode=1;});
