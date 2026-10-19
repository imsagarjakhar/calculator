'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('./growth-engine');
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-5,Math.abs(b)*1e-9),`${a} != ${b}`);
const loan=(extra={})=>({name:'Original loan',balanceMode:'original',originalAmount:60000,rate:0,totalMonths:60,paidMonths:24,source:'income',...extra});
let result=engine.calculateLoanFromOriginal(60000,0,60,24);
near(result.balance,36000);near(result.emi,1000);assert.equal(result.remainingMonths,36);
// Independently accumulate interest and monthly repayments from origination.
for(const amount of [10000,1e7])for(const annual of [0,6,12])for(const total of [12,120,360])for(const paid of [0,total/2,total]){
 const r=annual/1200,emi=r===0?amount/total:amount*r*(1+r)**total/((1+r)**total-1);
 let balance=amount;for(let m=0;m<paid;m++)balance=balance*(1+r)-emi;
 const actual=engine.calculateLoanFromOriginal(amount,annual,total,paid);
 near(actual.balance,Math.max(0,balance));near(actual.originalEmi,emi);assert.equal(actual.remainingMonths,total-paid);
 if(paid===total){assert.equal(actual.balance,0);assert.equal(actual.emi,0);}else near(actual.emi,emi);
}
// Derived fields are recalculated; rounded/stale display fields cannot change debt.
result=engine.validatePosition({loans:[loan({balance:1,remainingMonths:1,emi:1})]}).loans[0];
near(result.balance,36000);near(result.emi,1000);assert.equal(result.remainingMonths,36);
const plan={monthly:0,stepup:0,years:1,rate:0,goal:1e9,inflation:0};
let projection=engine.projectPlan(plan,[],[],{loans:[loan()]});
near(projection.initialDebt,36000);near(projection.debt,24000);near(projection.emiPaid,12000);assert.equal(projection.loanResults[0].remainingMonthsAtEnd,24);
projection=engine.projectPlan(plan,[],[],{loans:[loan({paidMonths:60})]});
near(projection.initialDebt,0);near(projection.debt,0);near(projection.emiPaid,0);assert.equal(projection.loanResults[0].payoffMonth,0);
for(const paid of [-1,61,1.5,NaN])assert.throws(()=>engine.calculateLoanFromOriginal(60000,0,60,paid));
assert.throws(()=>engine.calculateLoanFromOriginal(60000,0,0,0));
assert.throws(()=>engine.validatePosition({loans:[loan({originalAmount:0})]}));
// Stable even when the usual subtraction formula loses precision.
result=engine.calculateLoanFromOriginal(1e9,60,1200,1199);assert.ok(Number.isFinite(result.balance));near(result.balance*(1+60/1200),result.emi);
// Run the actual form calculator with original details and additional months.
const source=fs.readFileSync('growth-holdings.js','utf8'),fields=new Map();
const field=id=>{if(!fields.has(id))fields.set(id,{value:'',textContent:'',setCustomValidity(message){this.validationMessage=message;}});return fields.get(id);};
const ctx=vm.createContext({field,GrowthEngine:engine});
vm.runInContext(source.slice(source.indexOf('  function updateEmi()'),source.indexOf("  form('loans').addEventListener")),ctx);
for(const [id,value] of Object.entries({'loan-mode':'original','loan-original':'60000','loan-rate':'0','loan-years':'5','loan-extra-months':'0','loan-paid-years':'2','loan-paid-months':'0'}))field(id).value=value;
vm.runInContext('updateEmi()',ctx);
assert.equal(field('loan-balance').value,'36000.00');assert.equal(field('loan-emi').value,'1000.00');assert.equal(field('loan-remaining').value,'36');
assert.equal(field('loan-balance').readOnly,true);assert.equal(field('loan-original').required,true);assert.equal(field('loan-total').disabled,true);
field('loan-extra-months').value='6';field('loan-paid-months').value='3';vm.runInContext('updateEmi()',ctx);
assert.equal(field('loan-total').value,'66');assert.equal(field('loan-remaining').value,'39');assert.equal(field('loan-balance').value,'35454.55');assert.equal(field('loan-emi').value,'909.09');
field('loan-paid-years').value='6';vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-balance').value,'');assert.ok(field('loan-paid-months').validationMessage);
field('loan-paid-years').value='5';field('loan-paid-months').value='6';vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-balance').value,'0.00');assert.equal(field('loan-emi').value,'0.00');assert.equal(field('loan-paid-months').validationMessage,'');
field('loan-mode').value='current';field('loan-balance').value='12000';field('loan-total').value='24';field('loan-remaining').value='12';vm.runInContext('updateEmi()',ctx);
assert.equal(field('loan-balance').readOnly,false);assert.equal(field('loan-original').disabled,true);assert.equal(field('loan-total').disabled,false);assert.equal(field('loan-emi').value,'1000.00');
console.log('Passed: original-loan balance vs 54 independent amortisation scenarios, zero interest, fully paid loans, derived debt/EMI, partial years, validation, stable long terms, and both live form modes.');
