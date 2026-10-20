'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./bucket-engine'),R=require('./calculator-report');
class Node{
 constructor(id){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};this.dataset={};}
 get value(){return this._value;}set value(n){this._value=String(n);}
 setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}replaceChildren(){this.innerHTML='';}reset(){for(const id of ['eventName','eventAmount'])get(id).value='';get('eventYear').value='5';get('eventMonth').value='1';get('eventBasis').value='today';}
}
const nodes=new Map([...fs.readFileSync('bucket-plan.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Node(m[1])]));
const get=id=>{assert.ok(nodes.has(id),'Missing '+id);return nodes.get(id);},saved=new Map([['intimetec-custom-plan-v1','keep-custom'],['intimetec-freedom-v1','keep-freedom'],['corpus-survival-v1','keep-survival'],['InTimeTec-investment-planner-v2','keep-growth']]);let chart,download;
const timers=new Map();let timerId=0;
const context=vm.createContext({BucketPlanner:E,CalculatorReport:{...R,download(html,kind,currency){download={html,kind,currency};}},ChartHover:{attach(host,data){chart=data;}},setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{getElementById:get,querySelectorAll:()=>[]}});
get('extraWithdrawalPanel').hidden=true;
const source=fs.readFileSync('bucket-plan.js','utf8');vm.runInContext(source,context);
const submit=()=>get('bucketForm').listeners.submit({preventDefault(){}}),set=(key,value)=>get('b-'+key).value=String(value),read=()=>JSON.parse(saved.get('intimetec-bucket-preview-v1'));
assert.equal(get('bucketError').textContent,'');assert.ok(get('bucketCards').innerHTML.includes('Living costs'));assert.ok(get('bucketCards').innerHTML.includes('Emergency reserve'));assert.ok(get('bucketCards').innerHTML.includes('Long-term growth'));assert.equal(chart.points.length,421);assert.equal(chart.currency,'INR');
const counts=id=>(get(id).innerHTML.match(/<tr>/g)||[]).length;
assert.equal(counts('bucketTableRows'),35);get('bucketMonthly').onclick();assert.equal(counts('bucketTableRows'),420);assert.equal(get('bucketMonthly').attrs['aria-pressed'],'true');
get('eventName').value='<img src=x onerror=alert(1)>';get('eventAmount').value='500000';get('eventYear').value='5';get('eventMonth').value='1';get('eventBasis').value='today';get('emergencyForm').listeners.submit({preventDefault(){}});
assert.equal(get('eventError').textContent,'');assert.equal(read().events.length,1);assert.ok(get('bucketEvents').innerHTML.includes('&lt;img'));assert.ok(!get('bucketEvents').innerHTML.includes('<img'));assert.ok(get('transferRows').innerHTML.includes('Emergency expense'));
set('currency','USD');get('b-currency').onchange();assert.equal(chart.currency,'USD');assert.equal(read().events.length,1);assert.equal(read().settings.corpus,E.defaults.corpus);
get('bucketReport').onclick();assert.equal(download.kind,'buckets');assert.equal(download.currency,'USD');assert.ok(download.html.includes('Complete monthly schedule'));assert.ok(download.html.includes('Saved emergency expenses'));assert.ok(!download.html.includes('<img src=x'));
const snapshot=JSON.parse(download.html.match(/<script id="intimetec-calculation-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(snapshot.calculator,'buckets');assert.equal(snapshot.events.length,1);assert.deepEqual(snapshot.results,E.project(read().settings,read().events));
set('endAge',62);set('shockPercent',0);submit();assert.equal(get('bucketError').textContent,'');assert.ok(get('bucketEvents').innerHTML.includes('Outside this plan'));assert.equal(read().events.length,1);
set('monthly','');submit();assert.equal(get('bucketReport').disabled,true);assert.equal(get('bucketCards').innerHTML,'');assert.equal(get('bucketTableRows').innerHTML,'');assert.ok(get('bucketError').textContent.includes('monthly spending'));
get('bucketReset').onclick();assert.deepEqual(read().settings,E.defaults);assert.equal(read().events.length,0);assert.equal(get('bucketError').textContent,'');assert.equal(get('bucketReport').disabled,false);
set('corpus',100000);submit();assert.ok(get('allocationSummary').innerHTML.includes('more to fully fund'));assert.ok(get('bucketOutcome').innerHTML.includes('First unpaid withdrawal'));assert.ok(get('bucketOutcome').className.includes('shortfall'));
get('bucketReset').onclick();set('shockPercent',30);set('shockYear',1);submit();assert.ok(get('bucketOutcome').innerHTML.includes('30% one-off equity fall'));assert.ok(E.project(read().settings).rows[0].shock<0);
for(const [key,value] of [['intimetec-custom-plan-v1','keep-custom'],['intimetec-freedom-v1','keep-freedom'],['corpus-survival-v1','keep-survival'],['InTimeTec-investment-planner-v2','keep-growth']])assert.equal(saved.get(key),value);
saved.set('intimetec-bucket-preview-v1','{invalid');vm.runInContext(source,context);assert.deepEqual(read().settings,E.defaults);
assert.ok(fs.readFileSync('index.html','utf8').includes('class="choice bucket-choice" href="bucket-plan.html"'));assert.ok(fs.readFileSync('bucket-plan.html','utf8').includes('class="back-to-planners" href="index.html"'));
// Inspect ₹70k withdrawals and a new, inflated five-year reserve after a complete year.
get('bucketReset').onclick();set('startMonth','2026-10');set('monthly',70000);set('spendingReturn',0);set('emergencyReturn',0);set('equityReturn',0);submit();
const initial=E.project(read().settings),amounts=()=>[...get('bucketCards').innerHTML.matchAll(/class="bucket-value">([^<]+)/g)].map(m=>m[1]),money0=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
assert.equal(amounts()[0],money0(initial.initial.spending));get('bucketStep').onclick();assert.equal(amounts()[0],money0(initial.initial.spending-70000));assert.ok(get('bucketStageStatus').textContent.includes('Monthly living withdrawal'));assert.ok(get('bucketMonthLedger').innerHTML.includes('−'));
get('bucketDate').value='2027-10';get('bucketDate').onchange();assert.equal(amounts()[0],money0(initial.initial.spending-70000*12));get('bucketStep').onclick();assert.ok(get('bucketStageStatus').textContent.includes('Scheduled refill'));assert.equal(amounts()[0],money0(E.spendingTarget(read().settings,12)));assert.ok(get('rollingWindow').textContent.includes('Oct 2027'));
get('bucketStep').onclick();assert.equal(amounts()[0],money0(E.spendingTarget(read().settings,12)-73500));assert.ok(get('rollingWindow').textContent.includes('Nov 2027'));assert.equal(counts('fiveYearRows'),6);
get('bucketReport').onclick();const explored=JSON.parse(download.html.match(/<script id="intimetec-calculation-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(explored.inspection.date,'2027-10');assert.equal(explored.inspection.phase,'withdrawal');assert.equal(explored.inspection.nextSpendingIndex,13);assert.ok(download.html.includes('Rolling five-year spending window'));
get('bucketDate').value='2026-10';get('bucketDate').onchange();get('bucketNextRefill').onclick();assert.equal(get('bucketDate').value,'2027-10');assert.ok(get('bucketStageStatus').textContent.includes('Scheduled refill'));
get('bucketPlay').onclick();assert.equal(get('bucketPlay').attrs['aria-pressed'],'true');assert.equal(timers.size,1);const [id,tick]=[...timers][0];timers.delete(id);tick();assert.ok(get('bucketStageStatus').textContent.includes('Monthly living withdrawal'));get('bucketPlay').onclick();assert.equal(timers.size,0);assert.equal(get('bucketPlay').attrs['aria-pressed'],'false');
get('bucketDate').value='1900-01';get('bucketDate').onchange();assert.ok(get('bucketDateError').textContent.includes('Choose a month'));assert.equal(get('bucketDate').value,'2027-10');
get('bucketReset').onclick();assert.equal(get('bucketDateError').textContent,'');assert.equal(get('bucketDate').value,E.defaults.startMonth);
// Ordinary months have no return button; anniversary months expose the annual credit.
set('startMonth','2026-10');submit();
assert.ok(!get('bucketStages').innerHTML.includes('returns applied'));
get('bucketDate').value='2026-12';get('bucketDate').onchange();assert.ok(!get('bucketStages').innerHTML.includes('returns applied'));
get('bucketDate').value='2027-09';get('bucketDate').onchange();assert.ok(get('bucketStages').innerHTML.includes('Year end · returns applied'));
while(!get('bucketStageStatus').textContent.includes('Year end · returns applied'))get('bucketStep').onclick();
get('bucketReport').onclick();assert.ok(download.html.includes('average of the 12 monthly balances'));assert.ok(!download.html.includes('Annual returns compound monthly'));
get('bucketDate').value='2027-10';get('bucketDate').onchange();assert.ok(!get('bucketStages').innerHTML.includes('returns applied'));
// Per-bucket histories reconcile each monthly and yearly opening / cash flow / closing.
set('shockPercent',30);set('shockYear',2);submit();
get('eventName').value='History medical expense';get('eventAmount').value='25000';get('eventYear').value='2';get('eventMonth').value='6';get('eventBasis').value='future';get('emergencyForm').listeners.submit({preventDefault(){}});
const clickData=(id,dataset)=>get(id).listeners.click({target:{closest:()=>({dataset})}});
clickData('bucketCards',{historyOpen:'spending'});assert.equal(get('bucketHistory').hidden,false);
assert.equal((get('bucketHistoryRows').innerHTML.match(/<tr\b/g)||[]).length,420);assert.ok(get('bucketHistoryTitle').textContent.includes('Living costs'));
assert.ok(get('bucketCards').innerHTML.includes('aria-label="View Bucket 01 transaction history"'));
assert.ok(get('bucketHistoryRows').innerHTML.includes('Year-end return · Sep 2027'));
assert.ok(get('bucketHistoryRows').innerHTML.includes('Scheduled refill · Oct 2027'));
const cells=()=>[...get('bucketHistoryRows').innerHTML.matchAll(/<tr[^>]*>[\s\S]*?<\/th>([\s\S]*?)<\/tr>/g)].map(row=>[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cell=>Number(cell[1].replace(/<[^>]*>/g,'').replace(/−/g,'-').replace(/—/g,'0').replace(/[^\d.\-]/g,''))));
for(const key of ['spending','emergency','equity']){
 clickData('bucketHistoryTabs',{historyBucket:key});
 for(const yearly of [false,true]){
  get(yearly?'bucketHistoryYearly':'bucketHistoryMonthly').onclick();assert.equal((get('bucketHistoryRows').innerHTML.match(/<tr\b/g)||[]).length,yearly?35:420);
  const projected=E.project(read().settings,read().events),displayed=cells();
  displayed.forEach((values,i)=>{assert.equal(values.length,7);const [opening,incoming,outgoing,withdrawals,market,returns,closing]=values;assert.ok(Math.abs(opening+incoming+outgoing+withdrawals+market+returns-closing)<.04);assert.ok(Math.abs(closing-(yearly?projected.years:projected.rows)[i][key])<.01);});
 }
 if(key==='equity')assert.ok(get('bucketHistoryRows').innerHTML.includes('Market fall'));
 if(key==='emergency')assert.ok(get('bucketHistoryRows').innerHTML.includes('Emergency expense'));
}
clickData('bucketHistoryRows',{historyMonth:'11'});assert.equal(get('bucketDate').value,'2027-09');assert.ok(get('bucketHistoryDetails').innerHTML.includes('Year end · returns applied'));
const lastPhase=E.project(read().settings).rows[11].phases.length-1;
clickData('bucketHistoryDetails',{historyPhase:String(lastPhase)});assert.ok(get('bucketStageStatus').textContent.includes('Year end · returns applied'));assert.ok(get('bucketHistoryStatus').textContent.includes('Year end · returns applied'));
get('bucketHistoryClose').onclick();assert.equal(get('bucketHistory').hidden,true);
clickData('bucketCards',{historyOpen:'emergency'});set('monthly','');submit();assert.equal(get('bucketHistory').hidden,true);
get('bucketReset').onclick();assert.equal(get('bucketHistory').hidden,false);
// Longer intervals persist and the history marks the actual refill month.
clickData('bucketHistoryTabs',{historyBucket:'spending'});
for(const years of [2,3,4,5]){
 set('startMonth','2026-10');set('refillMonths',years*12);submit();
 assert.equal(get('bucketError').textContent,'');assert.equal(read().settings.refillMonths,years*12);
 assert.ok(get('refillRule').textContent.includes('every '+years+' years'));
 get('bucketDate').value='2026-10';get('bucketDate').onchange();get('bucketNextRefill').onclick();
 assert.equal(get('bucketDate').value,(2026+years)+'-10');assert.ok(get('bucketStageStatus').textContent.includes('Scheduled refill'));
 assert.ok(get('bucketHistoryRows').innerHTML.includes('Scheduled refill · Oct '+(2026+years)));
}
get('bucketReport').onclick();assert.ok(download.html.includes('60 months'));
// Refill animation uses the exact scheduled-review phase, not later emergency transfers.
get('bucketReset').onclick();set('startMonth','2026-10');set('refillMonths',24);submit();
const refillPlan=E.project(read().settings),refillRow=refillPlan.rows[24],reviewIndex=refillRow.phases.findIndex(p=>p.key==='review'),pre=refillRow.phases[reviewIndex-1],post=refillRow.phases[reviewIndex];
assert.ok(get('refillDate').textContent.includes('Oct 2028'));
for(const value of [pre.equity,post.equity,post.spending-pre.spending,post.spending,post.emergency])assert.ok(get('refillDiagram').innerHTML.includes(money0(value)));
assert.ok(get('refillDiagram').innerHTML.includes('refill-stream spending active'));
get('refillMotion').onclick();assert.equal(get('refillDiagram').dataset.paused,'true');assert.equal(get('refillMotion').attrs['aria-pressed'],'true');
get('refillInspect').onclick();assert.equal(get('bucketDate').value,'2028-10');assert.ok(get('bucketStageStatus').textContent.includes('Scheduled refill'));assert.equal(get('refillDiagram').dataset.paused,'true');
get('refillMotion').onclick();assert.equal(get('refillDiagram').dataset.paused,'false');
get('bucketDate').value='2061-09';get('bucketDate').onchange();assert.equal(get('refillInspect').disabled,true);assert.equal(get('refillDiagram').innerHTML,'');assert.ok(get('refillDate').textContent.includes('No more'));
get('bucketReset').onclick();set('corpus',0);submit();assert.ok(get('refillDiagram').innerHTML.includes('No funds available'));assert.ok(get('refillVisualStatus').textContent.includes('targets still short'));
set('monthly',0);set('emergency',0);submit();assert.ok(get('refillDiagram').innerHTML.includes('No transfer needed'));assert.ok(get('refillVisualStatus').textContent.includes('no money moved'));
set('monthly','');submit();assert.equal(get('refillDiagram').innerHTML,'');assert.equal(get('refillInspect').disabled,true);
// Direct Bucket 2 entry preserves regular SWP, exposes refill choice and opens its ledger.
get('bucketReset').onclick();set('startMonth','2026-10');set('refillMonths',24);submit();
assert.equal((get('bucketCards').innerHTML.match(/data-extra-withdrawal=/g)||[]).length,1);
clickData('bucketCards',{extraWithdrawal:'true'});assert.equal(get('extraWithdrawalPanel').hidden,false);assert.equal(get('extraDate').value,'2026-10');assert.equal(get('extraRefill').value,'scheduled');
const saveExtra=()=>get('extraWithdrawalForm').listeners.submit({preventDefault(){}});
get('extraReason').value='Home repair <script>';get('extraAmount').value=25000;get('extraDate').value='2027-03';saveExtra();
assert.equal(get('extraWithdrawalError').textContent,'');assert.equal(read().events.length,1);assert.equal(read().events[0].month,6);assert.equal(read().events[0].refill,'scheduled');assert.equal(read().events[0].inflate,false);assert.equal(read().settings.monthly,E.defaults.monthly);
assert.equal(get('bucketDate').value,'2027-03');assert.ok(get('bucketHistoryTitle').textContent.includes('Emergency reserve'));assert.ok(get('bucketStageStatus').textContent.includes('extra withdrawal paid'));assert.ok(get('bucketEvents').innerHTML.includes('&lt;script&gt;'));assert.ok(get('bucketEvents').innerHTML.includes('Refill at next review'));
assert.ok(!E.project(read().settings,read().events).rows[5].phases.some(p=>p.key==='emergencyRefill'));
get('bucketReport').onclick();assert.ok(download.html.includes('At next scheduled review'));assert.ok(download.html.includes('Home repair &lt;script&gt;'));
get('extraReason').value='Second expense';get('extraAmount').value=10000;get('extraDate').value='2027-04';get('extraRefill').value='immediate';saveExtra();assert.equal(read().events[1].refill,'immediate');assert.equal(read().events.length,2);
get('extraDate').value='1900-01';saveExtra();assert.ok(get('extraWithdrawalError').textContent.includes('within your plan'));assert.equal(read().events.length,2);
clickData('bucketEvents',{removeEvent:'0'});assert.equal(read().events.length,1);assert.equal(read().events[0].name,'Second expense');
get('extraWithdrawalClose').onclick();assert.equal(get('extraWithdrawalPanel').hidden,true);
get('bucketReset').onclick();assert.equal(get('extraWithdrawalPanel').hidden,true);assert.equal(get('extraWithdrawalSaved').textContent,'');
console.log('Bucket preview UI passed: isolated storage/reset, reactive allocation, chart amounts, monthly/yearly schedules, emergency escaping/preservation, currency units, reports, invalid/stale results and market-fall scenario.');
