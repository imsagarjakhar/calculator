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
assert.ok(get('summary').innerHTML.includes('Projected net worth'),get('summary').innerHTML);
// The redesigned summary contains seven requested cards and a category breakdown.
assert.equal((get('summary').innerHTML.match(/data-metric=/g)||[]).length,7);
for(const label of ['Projected net worth','Total investment by category','Combined XIRR','Inflation-adjusted net worth','Absolute return','Total loans &amp; remaining loans','Available for withdrawal'])assert.ok(get('summary').innerHTML.includes(label),label);
assert.ok(get('summary').innerHTML.includes('Regular SIP'));assert.ok(get('summary').innerHTML.includes('Existing · Mutual fund'));assert.ok(!get('summary').innerHTML.includes('1 crore'));
saved.set('intimetec-custom-plan-v1',E.exportPlan(plan));vm.runInContext(fs.readFileSync('custom-plan.js','utf8'),ctx);
// Header currency updates saved/results immediately, preserving amounts and draft forms.
const originalSip=read().monthlySip;get('defaultSip').value='77777';get('assetName').value='Unsaved asset';
for(const currency of ['SAR','USD','AED','EUR','GBP','INR']){
 get('currency').value=currency;get('currency').onchange();
 assert.equal(read().currency,currency);assert.equal(read().monthlySip,originalSip);
 assert.ok(get('summary').innerHTML.includes(new Intl.NumberFormat(currency==='INR'?'en-IN':'en-US',{style:'currency',currency,maximumFractionDigits:0}).format(E.project(read()).netWorth)));
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
 // Starting-plan inputs recalculate and persist without an Apply/submit action.
 get('resetPlan').onclick();get('confirmReset').onclick();
 const live=(id,value,type='input')=>{get(id).value=value;get('settingsForm').listeners[type]({target:get(id)});};
 get('startMonth').value='2026-06';get('endMonth').value='2031-06';live('defaultSip',70000);
 assert.equal(read().monthlySip,70000);assert.equal(read().months,61);assert.equal(get('error').hidden,true);
 const monthlyRate=1.08**(1/12)-1,expectedLive=70000*((1+monthlyRate)**61-1)/monthlyRate;
 assert.ok(get('summary').innerHTML.includes(new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(expectedLive)));
 assert.ok(get('monthlyRows').innerHTML.includes('70000'));assert.equal(get('defaultSip').value,'70000');
 live('planName','My live plan ');assert.equal(read().name,'My live plan');assert.equal(get('planName').value,'My live plan ','Typing must retain trailing spaces and the field value');
 live('defaultSip','70000.50');assert.equal(read().monthlySip,70000.5);assert.equal(get('defaultSip').value,'70000.50');
 live('stepup',5);assert.equal(read().annualStepup,5);live('inflation',4);assert.equal(read().inflation,4);
 live('targetToday',5000000);assert.equal(read().targetToday,5000000);
 const futureGoal=5000000*1.04**(61/12),goalMoney=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(futureGoal);
 assert.ok(get('targetFutureHint').textContent.includes(goalMoney));assert.ok(get('targetFutureHint').textContent.includes('Jun 2026 prices'));assert.ok(get('summary').innerHTML.includes('Target at plan end'));assert.ok(get('summary').innerHTML.includes(goalMoney));
 const validBaseline=saved.get('intimetec-custom-plan-v1'),validSummary=get('summary').innerHTML;
 for(const [id,value] of [['targetToday',''],['targetToday',-1],['defaultSip',''],['stepup',-1],['inflation',''],['endMonth','2026-05']]){
  const previousValue=get(id).value;live(id,value);
  assert.equal(saved.get('intimetec-custom-plan-v1'),validBaseline);assert.equal(get('summary').innerHTML,validSummary);assert.equal(get('exportReport').disabled,true);assert.equal(get('exportPlan').disabled,true);assert.equal(get('exportCsv').disabled,true);
  assert.ok(get('settingsUpdateStatus').textContent.includes('last saved plan'));live(id,previousValue);
 }
 assert.equal(get('exportReport').disabled,false);assert.equal(get('error').hidden,true);
 live('defaultSip',0);assert.equal(read().monthlySip,0);live('endMonth','2026-08','change');assert.equal(read().months,3);
 get('assetName').value='Live SIP destination';get('assetType').value='Stocks';get('assetValue').value=0;get('assetReturn').value=0;get('assetLiquid').value='yes';submit('assetForm');
 const destination=read().assets.find(a=>a.name==='Live SIP destination');live('sipTarget',destination.id,'change');assert.equal(read().sipAssetId,destination.id);
 get('monthlyRows').listeners.change({target:{dataset:{sipMonth:'2026-07'},value:'1234'}});live('startMonth','2026-07','change');
 assert.equal(read().startMonth,'2026-07');assert.equal(read().months,2);assert.equal(read().overrides[0].month,'2026-07');assert.equal(read().overrides[0].sip,1234);
 get('exportReport').onclick();assert.deepEqual(Report.read(await downloads.at(-1).text()),read());
 // Record salary allocations by account and retain their exact transaction history.
 get('resetPlan').onclick();get('confirmReset').onclick();get('startMonth').value='2026-06';get('endMonth').value='2027-05';live('defaultSip',75000);
 for(const [name,type] of [['My stocks','Stocks'],['My gold ETF','Gold ETF'],['My silver ETF','Silver ETF']]){get('assetName').value=name;get('assetType').value=type;get('assetValue').value=0;get('assetReturn').value=0;get('assetLiquid').value='yes';submit('assetForm');}
 const accounts=read().assets,stocks=accounts.find(a=>a.type==='Stocks'),gold=accounts.find(a=>a.type==='Gold ETF'),silver=accounts.find(a=>a.type==='Silver ETF');
 get('editMonth').value='2026-06';get('editMonth').onchange();get('flowType').value='investment';get('flowTarget').value=gold.id;get('flowAmount').value=5000;get('flowNote').value='Planned extra';submit('flowForm');
 for(const [asset,day,amount] of [[stocks.id,'05',30000],['core','07',25000],[gold.id,'09',10000],[silver.id,'11',5000]]){get('transactionDate').value='2026-06-'+day;get('transactionAsset').value=read().assets.find(a=>a.id===asset).name;get('transactionAmount').value=amount;get('transactionNote').value='Salary <split>';submit('transactionForm');assert.equal(get('transactionError').textContent,'');}
 assert.equal(read().transactions.length,4);assert.equal(E.project(read()).rows[0].recorded,70000);assert.equal(E.project(read()).rows[0].sip,0);assert.equal(E.project(read()).rows[0].extra,0);assert.equal(E.project(read()).rows[1].sip,75000);assert.ok(get('transactionRows').innerHTML.includes('&lt;split&gt;'));assert.ok(get('monthlyRows').innerHTML.includes('Replaced by records'));assert.equal(get('flowSubmit').disabled,true);
 get('transactionAssetFilter').value=gold.id;get('transactionAssetFilter').onchange();assert.ok(get('transactionTotals').textContent.startsWith('1 transaction'));get('transactionClearFilters').onclick();assert.ok(get('transactionTotals').textContent.startsWith('4 transactions'));
 const stockTransaction=read().transactions.find(t=>t.assetId===stocks.id);clickAction('edit-transaction',stockTransaction.id);get('transactionDate').value='2026-07-05';get('transactionAmount').value=31000;submit('transactionForm');assert.equal(read().transactions.length,4);assert.equal(E.project(read()).rows[0].recorded,40000);assert.equal(E.project(read()).rows[1].recorded,31000);
 get('monthlyRows').listeners.click({target:{closest:()=>({dataset:{recordMonth:'2026-06'}})}});assert.equal(get('transactionMonthFilter').value,'2026-06');assert.equal(get('transactionDate').value,'2026-06-01');assert.ok(get('transactionTotals').textContent.startsWith('3 transactions'));
 const beforeTransactions=saved.get('intimetec-custom-plan-v1');get('transactionDate').value='2026-02-30';get('transactionAmount').value=1234;submit('transactionForm');assert.equal(saved.get('intimetec-custom-plan-v1'),beforeTransactions);assert.ok(get('transactionError').textContent);
 clickAction('remove-asset',silver.id);assert.equal(saved.get('intimetec-custom-plan-v1'),beforeTransactions);
 for(const t of read().transactions)clickAction('remove-transaction',t.id);
 assert.equal(E.project(read()).rows[0].sip,75000);assert.equal(E.project(read()).rows[0].extra,5000);assert.equal(get('flowSubmit').disabled,false);
 get('transactionDate').value='2030-01-15';get('transactionAsset').value=read().assets.find(a=>a.id===silver.id).name;get('transactionAmount').value=1000;get('transactionNote').value='=SUM(1,2)';submit('transactionForm');get('transactionClearFilters').onclick();assert.ok(get('transactionRows').innerHTML.includes('Outside plan'));
 get('transactionCsv').onclick();const historyCsv=await downloads.at(-1).text();assert.ok(historyCsv.includes('2030-01-15'));assert.ok(historyCsv.includes("'="));
 get('exportReport').onclick();const transactionReport=await downloads.at(-1).text();assert.ok(transactionReport.includes('Investment transaction history'));const transactionPlan=Report.read(transactionReport);assert.deepEqual(transactionPlan.transactions,read().transactions);
 get('importFile').files=[{size:transactionReport.length,text:async()=>transactionReport}];await get('importFile').onchange();get('confirmImport').onclick();assert.deepEqual(read(),transactionPlan);
 // Free-text investment names create accounts inline and reuse existing names.
 get('transactionAsset').value='My new silver fund';get('transactionAsset').oninput();assert.equal(get('transactionNewFields').hidden,false);
 get('transactionNewCategory').value='Silver ETF';get('transactionNewReturn').value=7;get('transactionDate').value='2026-08-12';get('transactionAmount').value=4321.25;get('transactionNote').value='New account';
 const accountCount=read().assets.length;submit('transactionForm');assert.equal(get('transactionError').textContent,'');assert.equal(read().assets.length,accountCount+1);
 const inlineAccount=read().assets.find(a=>a.name==='My new silver fund');assert.equal(inlineAccount.type,'Silver ETF');assert.equal(inlineAccount.annualReturn,7);assert.equal(inlineAccount.value,0);assert.ok(read().transactions.some(t=>t.assetId===inlineAccount.id&&t.amount===4321.25));
 get('transactionAsset').value='  MY NEW SILVER FUND  ';get('transactionAsset').oninput();assert.equal(get('transactionNewFields').hidden,true);get('transactionAmount').value=500;submit('transactionForm');assert.equal(read().assets.length,accountCount+1);assert.equal(read().transactions.filter(t=>t.assetId===inlineAccount.id).length,2);
 const beforeBadAccount=saved.get('intimetec-custom-plan-v1');get('transactionAsset').value='Invalid-date new fund';get('transactionAsset').oninput();get('transactionDate').value='2026-02-30';get('transactionAmount').value=100;submit('transactionForm');assert.equal(saved.get('intimetec-custom-plan-v1'),beforeBadAccount);assert.ok(!read().assets.some(a=>a.name==='Invalid-date new fund'));
 get('transactionAsset').value='';submit('transactionForm');assert.ok(get('transactionError').textContent.includes('where you invested'));
 get('exportReport').onclick();assert.deepEqual(Report.read(await downloads.at(-1).text()),read());
 // Plain text entry has no browser datalist; Reset clears persisted records and all new form state.
 const plainPage=fs.readFileSync('custom-plan.html','utf8');assert.ok(!plainPage.includes('transactionAccountSuggestions'));assert.ok(!plainPage.includes('transactionCategorySuggestions'));
 assert.match(plainPage,/<input id="transactionAsset" type="text"[^>]*autocomplete="off"/);
 const editableRecord=read().transactions[0];clickAction('edit-transaction',editableRecord.id);
 get('transactionAsset').value='Unfinished new investment';get('transactionAsset').oninput();get('transactionNewCategory').value='Old category';get('transactionNewReturn').value=17;get('transactionAmount').value=999;get('transactionNote').value='Unsaved note';get('transactionMonthFilter').value='2026-08';get('transactionAssetFilter').value=inlineAccount.id;
 get('resetPlan').onclick();get('confirmReset').onclick();
 assert.equal(read().transactions.length,0);assert.equal(read().assets.length,1);assert.equal(read().loans.length,0);assert.equal(read().overrides.length,0);
 for(const id of ['transactionAsset','transactionAmount','transactionNote','transactionMonthFilter','transactionError'])assert.equal(get(id).value||get(id).textContent,'',id);
 assert.equal(get('transactionNewCategory').value,'Other');assert.equal(get('transactionNewReturn').value,'0');assert.equal(get('transactionNewFields').hidden,true);assert.equal(get('transactionNewReturn').required,false);assert.equal(get('transactionCancel').hidden,true);assert.equal(get('transactionSubmit').textContent,'Add transaction');assert.equal(get('transactionAssetFilter').value,'all');assert.equal(get('transactionDate').value,read().startMonth+'-01');assert.ok(get('transactionRows').innerHTML.includes('No transactions'));assert.equal(get('importPreview').hidden,true);assert.equal(get('resetPreview').hidden,true);
 const defaultAfterReset=saved.get('intimetec-custom-plan-v1');
 // A read begun before Reset cannot stage or restore the old plan after completion.
 let finishRead;const delayedRead=new Promise(resolve=>{finishRead=resolve;});get('importFile').files=[{size:transactionReport.length,text:()=>delayedRead}];const inFlight=get('importFile').onchange();
 get('resetPlan').onclick();get('confirmReset').onclick();finishRead(transactionReport);await inFlight;
 assert.equal(get('importPreview').hidden,true);get('confirmImport').onclick();assert.equal(saved.get('intimetec-custom-plan-v1'),defaultAfterReset);
 assert.equal(saved.get('corpus-survival-v1'),'survival-preserved');
 console.log('Custom page handlers passed: editable assets/loans, monthly SIP and bonus updates, safe removal, CSV/JSON download, staged import/restore, and read-only Growth copying.');
}
checkFiles().catch(e=>{console.error(e);process.exitCode=1;});
