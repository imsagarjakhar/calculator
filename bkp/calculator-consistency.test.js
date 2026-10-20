'use strict';
const assert=require('node:assert/strict'),S=require('./survival-engine'),F=require('./freedom-engine'),Life=require('./life-events');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(0.01,Math.abs(b)*1e-9),`${a} != ${b}`);
const event=(amount,year,month=1)=>({name:'Screenshot expense',amount,year,month,inflate:true,enabled:true});
const events=[event(3000000,25),event(5000000,25),event(200000,4),event(300000,6),event(500000,10)];
const start=new Date(2026,9,19),a={currency:'INR',corpus:30000000,age:45,swp:90000,inflation:5,returns:9,endAge:100};
// Exact inputs and visible expenses from the user's Survival screenshots.
const s=S.projectSurvival(a,start,events),needed=S.requiredCorpus(a,start,events);
assert.equal(s.depleted,false);assert.equal(s.days,20089);near(s.balance,156323926.12409788);near(s.expensePaid,27190873.126448885);near(s.totalWithdrawn,294529627.7936763);near(s.totalGrowth,448044427.04422253);
near(a.corpus+s.totalGrowth-s.totalWithdrawn-s.expensePaid,s.balance);near(s.balance/1.05**55,10681051.402383167);near(needed,28633630.78928227);
const extended=S.projectSurvival({...a,endAge:120},start,events);assert.equal(extended.depleted,true);near(extended.age,112.72928663940654);
// Same present-age assumptions can pass finite Survival but fail the stricter ongoing-income target.
const matched=F.project({...F.defaults,age:45,corpus:30000000,monthlyInvestment:0,investmentGrowth:0,retirementExpense:90000,expectedReturn:9,inflation:5,targetAge:45,endAge:100,buffer:0},events);
assert.ok(a.corpus>needed);assert.ok(a.corpus<matched.requiredToday);near(matched.requiredToday,32875186.25505905);assert.notEqual(matched.freedomMonth,0);assert.ok(matched.incomeNow<90000*1.05**(1/12));assert.equal(matched.includedEvents,5);
// One configuration reproduces every visible Freedom number; this is a regression
// fixture, not an assertion that hidden screenshot fields were read from the browser.
const f=F.project({...F.defaults,age:30,corpus:9000000,monthlyInvestment:75000,investmentGrowth:5,retirementExpense:70000,expectedReturn:10,inflation:6,targetAge:45,endAge:100,buffer:15},[]);
assert.equal(f.freedomMonth,141);near(f.atFreedom.balance,51862223.61790917);near(f.atFreedom.required,51637439.4193353);near(f.monthlyNeedAtFreedom,139492.47467855443);near(f.incomeAtFreedom,140099.70277662243);assert.equal(f.includedEvents,0);
// Verify inverse present value against the complete daily engine, including losses,
// zero interest, leap starts, month-end starts and mid-year life expenses.
for(const date of [new Date(2024,1,29),new Date(2025,0,31)])for(const returns of [-10,0,9]){
 const settings={...a,age:40,endAge:47,returns,swp:3000,inflation:3},costs=[event(20000,1),event(50000,3,7)];
 const p=S.requiredCorpus(settings,date,costs),funded=S.projectSurvival({...settings,corpus:p*(1+1e-8)},date,costs),under=S.projectSurvival({...settings,corpus:p*0.999},date,costs);
 assert.equal(funded.depleted,false);near(funded.expenseShortfall,0);assert.equal(under.depleted,true);
 if(returns===0){const annual=Array.from({length:7},(_,i)=>3000*12*1.03**i).reduce((sum,n)=>sum+n,0),extra=Life.scheduled(costs,84,3).reduce((sum,e)=>sum+e.cost,0);near(p,annual+extra);}
}
console.log('Calculator consistency passed: both screenshots reproduced, complete cash-flow ledger, nominal/real ending money, finite vs ongoing targets, active buffer/expenses, and daily-PV inverse checks.');
