'use strict';
const assert=require('node:assert/strict'),E=require('./custom-engine'),R=require('./custom-report');
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-7,Math.abs(b)*1e-9),`${a} != ${b}`);
const plan=E.createPlan(new Date(2026,5,1));plan.months=12;plan.monthlySip=75000;plan.assets[0].annualReturn=0;
plan.assets.push({id:'stocks',name:'Stocks',type:'Stocks',value:0,annualReturn:0,canWithdraw:true},{id:'gold',name:'Gold ETF',type:'Gold ETF',value:0,annualReturn:0,canWithdraw:true},{id:'silver',name:'Silver ETF',type:'Silver ETF',value:0,annualReturn:0,canWithdraw:true});
plan.overrides=[{month:'2026-06',sip:80000,note:'Planned',flows:[{type:'investment',amount:9000,assetId:'gold',note:'Planned bonus'},{type:'expense',amount:1000,inflate:false,note:'Cost'}]}];
const forecast=E.project(plan);near(forecast.rows[0].contributions,89000);
const tx=(id,date,assetId,amount)=>({id,date,assetId,amount,note:'Salary allocation'});
plan.transactions=[tx('stocks1','2026-06-05','stocks',30000),tx('mf1','2026-06-07','core',25000),tx('gold1','2026-06-09','gold',10000),tx('silver1','2026-06-11','silver',5000)];
let o=E.project(plan),s=E.portfolioSummary(plan,o);near(o.rows[0].recorded,70000);near(o.rows[0].contributions,70000);near(o.rows[0].sip,0);near(o.rows[0].extra,0);near(o.rows[0].expensePaid,1000);near(o.rows[0].plannedSip,80000);assert.equal(o.rows[0].usesRecorded,true);
near(o.rows[1].sip,75000);assert.equal(o.rows[1].usesRecorded,false);near(o.recorded,70000);near(o.contributions,895000);near(o.balance,894000);
near(o.assets.find(a=>a.id==='gold').contributions,10000);near(s.recordedCategories.reduce((sum,c)=>sum+c.amount,0),70000);near(s.sip+s.extras+s.recorded+s.existing,s.invested);
assert.ok(R.summaryCards(plan,o)[1].details.some(d=>d.label==='Recorded · Silver ETF'));
// Recorded cash flows coexist with loan payments; they replace investment forecasts only.
const withLoan=JSON.parse(E.exportPlan(plan));withLoan.loans=[{id:'loan',name:'Loan',balance:12000,annualRate:0,remainingMonths:12,source:'income'}];const debt=E.project(withLoan);near(debt.rows[0].emiPaid,1000);near(debt.rows[0].contributions,70000);
// Edits that move a transaction affect both months, without changing saved forecasts.
plan.transactions[0].date='2026-07-05';o=E.project(plan);near(o.rows[0].recorded,40000);near(o.rows[1].recorded,30000);near(o.rows[1].sip,0);
plan.transactions=[];assert.deepEqual(E.project(plan),forecast);
// Outside-horizon entries survive exports and are excluded until the plan includes them.
plan.transactions=[tx('outside','2027-08-08','gold',12345)];o=E.project(plan);near(o.recorded,0);assert.equal(o.outsideTransactions,1);assert.equal(o.rows.some(r=>r.usesRecorded),false);
const report=R.build(plan);assert.ok(report.includes('Investment transaction history'));assert.ok(report.includes('2027-08-08'));assert.ok(report.includes('Outside plan; kept in history'));assert.deepEqual(R.read(report),E.validate(plan));
const extended={...plan,months:15};near(E.project(extended).rows[14].recorded,12345);assert.equal(E.project(extended).outsideTransactions,0);
const legacy=JSON.parse(E.exportPlan(plan));delete legacy.transactions;assert.deepEqual(E.parse(JSON.stringify(legacy)).transactions,[]);
for(const mutation of [t=>t.date='2026-02-30',t=>t.assetId='missing',t=>t.amount=-1,t=>t.note='x'.repeat(201),t=>t.id='<script>']){const broken=JSON.parse(E.exportPlan(plan));mutation(broken.transactions[0]);assert.throws(()=>E.validate(broken));}
assert.throws(()=>E.validate({...plan,transactions:[plan.transactions[0],plan.transactions[0]]}));
const missing=JSON.parse(E.exportPlan(plan));missing.overrides=[];missing.assets=missing.assets.filter(a=>a.id!=='gold');assert.throws(()=>E.validate(missing),/missing investment account/);
for(const year of E.project(extended).years){const rows=E.project(extended).rows.filter(r=>Math.floor((r.index-1)/12)+1===year.year);near(year.recorded,rows.reduce((sum,r)=>sum+r.recorded,0));}
console.log('Custom transactions passed: salary splits by asset, replacing forecasts, retained planned extras, regular expenses/loans, moving/deleting records, category totals, outside dates, round trips and invalid entries.');
