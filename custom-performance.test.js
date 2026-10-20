'use strict';
const assert=require('node:assert/strict'),E=require('./custom-engine'),R=require('./custom-report');
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-7,Math.abs(b)*1e-9),`${a} != ${b}`);
const basic=()=>{const p=E.createPlan(new Date(2026,0,1));p.months=12;p.monthlySip=0;p.inflation=5;p.assets[0].value=100000;p.assets[0].annualReturn=10;return p;};
// Microsoft XIRR example: actual dated flows, 365-day convention.
const sample=[['2008-01-01',-10000],['2008-03-01',2750],['2008-10-30',4250],['2009-02-15',3250],['2009-04-01',2750]].map(([date,amount])=>({date,amount}));
near(E.xirr(sample).rate,.373362535);near(E.xirr([...sample].reverse()).rate,.373362535);
const day=offset=>new Date(Date.UTC(2025,0,1)+offset*86400000).toISOString().slice(0,10);
const multi=E.xirr([{date:day(0),amount:-100},{date:day(365),amount:230},{date:day(730),amount:-132}]);assert.equal(multi.status,'multiple');assert.equal(multi.rate,null);
assert.equal(E.xirr([{date:day(0),amount:-100},{date:day(0),amount:110}]).rate,null);
assert.equal(E.xirr([{date:day(0),amount:-100},{date:day(365),amount:-10}]).rate,null);
assert.throws(()=>E.xirr([{date:'invalid',amount:1}]));
let p=basic(),o=E.project(p),s=E.portfolioSummary(p,o);
near(s.xirr.rate,.1);near(s.gain,10000);near(s.absoluteReturn,.1);near(s.realNetWorth,110000/1.05);near(s.realGain,110000/1.05-100000);near(s.realAbsoluteReturn,1.1/1.05-1);
assert.equal(s.flows[0].date,'2025-12-31');assert.equal(s.flows.at(-1).date,'2026-12-31');
// Targets are entered in plan-start purchasing power and inflated over the inclusive horizon.
near(s.targetToday,10000000);near(s.targetFuture,10500000);near(s.targetGap,10500000-o.netWorth);near(s.realTargetGap,10000000-s.realNetWorth);
const savedProjection=E.project(p);p.targetToday=500000;assert.deepEqual(E.project(p),savedProjection);p.months=61;s=E.portfolioSummary(p);near(s.targetFuture,500000*1.05**(61/12));
const legacy=JSON.parse(E.exportPlan(p));delete legacy.targetToday;assert.equal(E.parse(JSON.stringify(legacy)).targetToday,10000000);
p.targetToday=0;assert.equal(R.summaryCards(p)[0].details,undefined);assert.equal(R.read(R.build(p)).targetToday,0);
assert.throws(()=>E.validate({...p,targetToday:-1}));assert.throws(()=>E.validate({...p,targetToday:'1000'}));
p=basic();
p.startMonth='2024-01';s=E.portfolioSummary(p);near(s.xirr.rate,1.1**(365/366)-1);
for(const rate of [-40,-10,0,8,40]){p=basic();p.assets[0].annualReturn=rate;near(E.portfolioSummary(p).xirr.rate,rate/100);}
// Existing holdings, SIP and extra investments reconcile without double counting.
p=basic();p.monthlySip=1000;p.assets.push({id:'gold',name:'Gold',type:'Gold',value:20000,annualReturn:0,canWithdraw:false});
p.overrides=[{month:'2026-03',sip:0,note:'Skip',flows:[{type:'investment',assetId:'gold',amount:5000,note:'Bonus'}]},{month:'2028-01',sip:null,note:'Outside',flows:[{type:'investment',assetId:'gold',amount:9000,note:''}]}];
s=E.portfolioSummary(p);near(s.sip,11000);near(s.extras,5000);near(s.invested,136000);near(s.existing,120000);near(s.categories.reduce((sum,c)=>sum+c.amount,0)+s.sip+s.extras,s.invested);
// XIRR measures the full investment portfolio; debt and income-funded payments are separate.
p=basic();const withoutLoan=E.portfolioSummary(p);p.loans=[{id:'loan',name:'Loan',balance:12000,annualRate:0,remainingMonths:12,source:'income'}];
s=E.portfolioSummary(p);near(s.xirr.rate,withoutLoan.xirr.rate);near(s.startingLoans,12000);near(s.remainingLoans,0);near(s.loanPayments,12000);
p.loans[0].source='investments';p.assets[0].annualReturn=0;o=E.project(p);s=E.portfolioSummary(p,o);near(s.withdrawals,12000);near(s.gain,0);near(s.xirr.rate,0);
// Each cash flow is deflated at its own month, including funded expenses and loan withdrawals.
p=basic();p.monthlySip=1000;p.overrides=[{month:'2026-04',sip:2000,note:'',flows:[{type:'expense',amount:5000,inflate:false,note:'Repair'}]},{month:'2026-08',sip:null,note:'',flows:[{type:'investment',assetId:'core',amount:3000,note:'Bonus'}]}];
o=E.project(p);s=E.portfolioSummary(p,o);
let realCapital=p.assets[0].value,realProceeds=o.balance/1.05;
for(let i=0;i<12;i++){const deflator=1.05**((i+1)/12),row=o.rows[i];realCapital+=row.contributions/deflator;realProceeds+=(row.expensePaid+row.portfolioPayments)/deflator;}
near(s.realGain,realProceeds-realCapital);near(s.realAbsoluteReturn,(realProceeds-realCapital)/realCapital);near(s.gain,o.growth);
const first=new Date(s.flows[0].date).getTime(),residual=s.flows.reduce((sum,flow)=>sum+flow.amount/(1+s.xirr.rate)**((new Date(flow.date).getTime()-first)/86400000/365),0);near(residual,0);
// Empty portfolios and final-month-only deposits have no measurable annualized return.
p=basic();p.assets[0].value=0;s=E.portfolioSummary(p);assert.equal(s.xirr.rate,null);assert.equal(s.absoluteReturn,null);assert.equal(s.realAbsoluteReturn,null);
p.overrides=[{month:'2026-12',sip:null,note:'',flows:[{type:'investment',assetId:'core',amount:1000,note:''}]}];s=E.portfolioSummary(p);assert.equal(s.xirr.rate,null);near(s.gain,0);
// UI/report specifications share all seven metrics and escape custom category labels.
p=basic();p.assets[0].type='<script>category</script>';const cards=R.summaryCards(p),html=R.build(p);
assert.deepEqual(cards.map(c=>c.key),['net-worth','invested','xirr','real-net-worth','returns','loans','available']);assert.equal((html.match(/data-metric=/g)||[]).length,7);assert.ok(html.includes('&lt;script&gt;category&lt;/script&gt;'));assert.ok(!html.includes('<script>category'));
p.assets[0].canWithdraw=false;p.loans=[{id:'loan',name:'Loan',balance:1000,annualRate:0,remainingMonths:1,source:'investments'}];assert.ok(R.build(p).includes('Unfunded cash flows:'));
console.log('Custom performance passed: published XIRR example, leap years, negative/zero/multiple/no returns, category reconciliation, loan separation, cash-flow inflation, withdrawals and shared seven-card reports.');
