'use strict';
const assert=require('node:assert/strict'),E=require('./custom-engine');
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-6,Math.abs(b)*1e-9),`${a} != ${b}`);
// Count completed monthly anniversaries, including clamped month ends and leap days.
for(const [start,current,paid] of [
 ['2024-10-19','2026-10-18',23],['2024-10-19','2026-10-19',24],
 ['2024-10-19','2024-10-19',0],['2024-01-31','2024-02-28',0],
 ['2024-01-31','2024-02-29',1],['2024-01-31','2024-03-30',1],
 ['2024-01-31','2024-03-31',2],['2025-01-31','2025-02-28',1],
 ['2024-02-29','2025-02-28',12],['2020-01-01','2026-10-19',60]
]){
 const d=E.calculateLoanDetails(60000,0,60,start,current);
 assert.equal(d.paidMonths,paid);assert.equal(d.remainingMonths,60-paid);
 near(d.balance,(60-paid)*1000);near(d.emi,paid===60?0:1000);
}
// Compare outstanding balances with independent month-by-month amortisation.
for(const rate of [0,0.001,6,12,60])for(const total of [12,60,360])for(const paid of [0,1,Math.floor(total/2),total]){
 const principal=125000,r=rate/1200,emi=r?principal*r/(1-(1+r)**-total):principal/total;
 let balance=principal;for(let i=0;i<paid;i++)balance=balance*(1+r)-emi;
 const current=E.monthKey(2020*12+paid)+'-15';
 const actual=E.calculateLoanDetails(principal,rate,total,'2020-01-15',current);
 near(actual.balance,paid===total?0:balance);near(actual.emi,paid===total?0:emi);
}
for(const [start,current] of [['2026-02-30','2026-10-19'],['2026-01-01','bad'],['2026-10-20','2026-10-19'],['1800-01-01','2026-10-19']])assert.throws(()=>E.calculateLoanDetails(60000,6,60,start,current));
for(const total of [0,1.5,1201])assert.throws(()=>E.calculateLoanDetails(60000,6,total,'2024-01-01','2026-10-19'));
const plan=E.createPlan(new Date(2026,9,19));plan.months=60;
plan.loans=[{id:'dated',name:'Home',source:'income',balanceMode:'original',originalAmount:60000,annualRate:6,totalMonths:60,startDate:'2024-10-19',currentDate:'2026-10-19',balance:1,remainingMonths:1}];
const clean=E.validate(plan),d=E.calculateLoanDetails(60000,6,60,'2024-10-19','2026-10-19');
near(clean.loans[0].balance,d.balance);assert.equal(clean.loans[0].remainingMonths,36);
assert.deepEqual(E.parse(E.exportPlan(clean)),clean);
const projected=E.project(clean);near(projected.loans[0].emi,d.emi);assert.equal(projected.loans[0].payoffMonth,36);near(projected.debt,0);
plan.loans[0].currentDate='2030-10-19';assert.equal(E.project(plan).loans[0].emi,0);near(E.project(plan).debt,0);
console.log('Custom loans passed: date anniversaries, leap days, 60 independent amortisation scenarios, payoff, invalid inputs, derived-value validation and JSON round-trip.');
