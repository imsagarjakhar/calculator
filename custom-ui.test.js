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
// Keep the six existing cards and add a currency-specific target comparison.
assert.equal((get('summary').innerHTML.match(/class="metric /g)||[]).length+ (get('summary').innerHTML.match(/class="metric"/g)||[]).length,7);
assert.ok(get('summary').innerHTML.includes('Below 1 crore (INR)'));
for(const [value,heading] of [[8000000,'Below'],[12000000,'Above'],[10000000,'Target reached:']]){
 const targetPlan=E.createPlan(new Date(2026,9,19));targetPlan.months=1;targetPlan.monthlySip=0;targetPlan.assets[0].value=value;targetPlan.assets[0].annualReturn=0;
 saved.set('intimetec-custom-plan-v1',E.exportPlan(targetPlan));vm.runInContext(fs.readFileSync('custom-plan.js','utf8'),ctx);
 assert.ok(get('summary').innerHTML.includes(heading+' 1 crore (INR)'));
 assert.ok(get('summary').innerHTML.includes('class="metric '+(value<10000000?'target-below':'target-funded')+'"'));
 assert.ok(get('summary').innerHTML.includes(new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(value-10000000))));
}
saved.set('intimetec-custom-plan-v1',E.exportPlan(plan));vm.runInContext(fs.readFileSync('custom-plan.js','utf8'),ctx);
// Header currency updates saved/results immediately, preserving amounts and draft forms.
const originalSip=read().monthlySip;get('defaultSip').value='77777';get('assetName').value='Unsaved asset';
for(const currency of ['SAR','USD','AED','EUR','GBP','INR']){
 get('currency').value=currency;get('currency').onchange();
 assert.equal(read().currency,currency);assert.equal(read().monthlySip,originalSip);
 assert.ok(get('summary').innerHTML.includes('Below '+(currency==='INR'?'1 crore':'10 million')+' ('+currency+')'));
 assert.equal(get('defaultSip').value,'77777');assert.equal(get('assetName').value,'Unsaved asset');assert.equal(get('currency').value,currency);
}
get('currency').value='INVALID';get('currency').onchange();assert.equal(read().currency,'INR');assert.equal(get('currency').value,'INR');
get('defaultSip').value=originalSip;get('assetName').value='';
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
 exported.name='Future revision';exported.currency='EUR';exported.monthlySip=12345;const text=E.exportPlan(exported);get('importFile').files=[{size:text.length,text:async()=>text}];await get('importFile').onchange();assert.equal(get('importPreview').hidden,false);assert.equal(saved.get('intimetec-custom-plan-v1'),before,'Import must wait for the preview action');assert.ok(get('importDescription').textContent.includes('Future revision'));
 get('confirmImport').onclick();assert.deepEqual(read(),exported);assert.equal(get('importPreview').hidden,true);assert.equal(get('planName').value,'Future revision');
 assert.equal(get('currency').value,'EUR');
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
 // Imported labels are rendered as text, including in HTML-built entry lists.
 const hostile=E.createPlan(),payload='<img src=x onerror=attacked=true>';hostile.name=payload;hostile.assets[0].name=payload;hostile.assets[0].type=payload;
 hostile.loans=[{id:'test',name:payload,balance:1000,annualRate:0,remainingMonths:10,source:'income'}];hostile.overrides=[{month:hostile.startMonth,sip:null,note:payload,flows:[{type:'expense',amount:10,inflate:false,note:payload}]}];
 const hostileFile=Report.build(hostile);get('importFile').files=[{size:hostileFile.length,text:async()=>hostileFile}];await get('importFile').onchange();get('confirmImport').onclick();
 for(const id of ['assetList','loanList','flowList']){assert.ok(!get(id).innerHTML.includes('<img'));assert.ok(get(id).innerHTML.includes('&lt;img'));}
 assert.equal(get('planName').value,payload);assert.equal(ctx.attacked,undefined);
 console.log('Custom page handlers passed: editable assets/loans, monthly SIP and bonus updates, safe removal, CSV/JSON download, staged import/restore, and read-only Growth copying.');
}
checkFiles().catch(e=>{console.error(e);process.exitCode=1;});
