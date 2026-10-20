'use strict';
const assert=require('node:assert/strict');
const events=require('./life-events');
const {projectPlan}=require('./growth-engine');
const {projectSurvival}=require('./survival-engine');
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const expense=(overrides={})=>({name:'Education',amount:3000,year:1,month:6,inflate:false,enabled:true,...overrides});
const plan={monthly:1000,stepup:0,years:1,rate:0,goal:12000,inflation:10};
const start=new Date(2024,0,1);
// Keep the original end-of-month SIP convention when no expenses are scheduled.
near(projectPlan({...plan,rate:12}).balance,1000*((1.01**12-1)/.01));
let g=projectPlan(plan,[],[expense()]);
near(g.balance,9000);near(g.growth,0);near(g.expensePaid,3000);near(g.expenseShortfall,0);assert.equal(g.hit,15);
// Expenses consume cash after the same month's SIP; a shortfall never becomes debt.
g=projectPlan(plan,[],[expense({amount:5000,month:1})]);
near(g.expensePaid,1000);near(g.expenseShortfall,4000);near(g.months[0].balance,0);near(g.balance,11000);
// Same-month events aggregate; deposits can cover them without double-counting returns.
g=projectPlan(plan,[{year:1,month:1,amount:2000}], [expense({amount:2000,month:1}),expense({amount:2000,month:1})]);
near(g.expensePaid,3000);near(g.expenseShortfall,1000);near(g.growth,0);
const ignored=[expense({enabled:false}),expense({year:2})];
near(projectPlan(plan,[],ignored).balance,12000);
near(events.cost(expense({year:2,month:1,inflate:true}),10),3300);
near(events.cost(expense({year:2,month:1,inflate:false}),10),3000);
g=projectPlan({...plan,years:2,rate:8},[],[expense({year:2,inflate:true})]);
near(g.total+g.growth-g.expensePaid,g.balance,1e-5);
for(let i=0;i<g.months.length;i++){
 const row=g.months[i],opening=i?g.months[i-1].balance:0;
 near(opening+row.growth+row.deposit-row.expense,row.balance);
}
const retirement={corpus:24000,age:40,swp:1000,returns:0,inflation:0,endAge:42};
let s=projectSurvival(retirement,start,[expense({month:1})]);
near(s.expensePaid,3000);near(s.totalWithdrawn,21000);near(s.days,639);assert.equal(s.depleted,true);
// An immediate expense larger than the corpus depletes the plan before spending.
s=projectSurvival(retirement,start,[expense({amount:25000,month:1}),expense({year:2})]);
near(s.days,0);near(s.expensePaid,24000);near(s.expenseShortfall,4000);near(s.rows[0].shortfall,1000);assert.equal(s.eventFailure,true);
near(s.age,40);near(s.totalWithdrawn,0);
// Starting on a leap day: February month-end is clamped and paid once.
s=projectSurvival({...retirement,swp:0,corpus:1e6},new Date(2024,1,29),[expense({year:2,month:1,inflate:true})]);
near(s.expensePaid,3000);near(s.balance,997000);assert.equal(s.depleted,false);
s=projectSurvival({...retirement,swp:0,corpus:1e6,inflation:10},start,[expense({year:2,month:1,inflate:true})]);
near(s.expensePaid,3300);
s=projectSurvival({...retirement,corpus:1e6,returns:8,inflation:6},start,[expense(),expense({year:2,inflate:true})]);
for(const row of s.rows)near(row.opening+row.growth-row.withdrawals-row.expense,row.balance,1e-5);
near(s.expenseDue,s.expensePaid+s.expenseShortfall);
near(projectSurvival(retirement,start,[expense({enabled:false}),expense({year:3})]).expensePaid,0);
assert.throws(()=>events.validate([expense({amount:-1})]));assert.throws(()=>events.validate([expense({month:13})]));assert.throws(()=>events.validate([expense({year:1.5})]));
// Currency and calculator scenarios remain separate, including without browser storage.
events.save('growth','INR',[expense()]);events.save('survival','INR',[]);events.save('growth','USD',[]);
assert.equal(events.load('growth','INR').length,1);assert.equal(events.load('survival','INR').length,0);assert.equal(events.load('growth','USD').length,0);
console.log('Passed: life-event timing, inflation basis, same-month aggregation, pauses, horizon exclusions, shortfalls, cash-flow reconciliation, leap-day events, and scenario isolation.');
