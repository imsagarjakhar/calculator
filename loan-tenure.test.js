'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {calculateEmi,monthsToRepay,validatePosition,projectPlan}=require('./growth-engine');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-10),`${a} != ${b}`);
const plan={monthly:0,stepup:0,years:1,rate:0,goal:1e9,inflation:0};
const loan=(extra={})=>({name:'Home loan',balance:100000,rate:12,totalMonths:24,remainingMonths:12,source:'income',...extra});
near(calculateEmi(60000,0,60),1000);
near(calculateEmi(100000,12,12),8884.878867834168);
// Independently solve a level-payment annuity across different terms/rates.
for(const principal of [1000,100000,1e9])for(const annual of [0,3.5,12,60])for(const months of [1,12,180,1200]){
 const r=annual/1200,expected=r===0?principal/months:principal*r*(1+r)**months/((1+r)**months-1);
 const emi=calculateEmi(principal,annual,months);near(emi,expected);
 // At very high rates and long terms, EMI rounds to interest-only in a double;
 // contractual metadata is retained rather than trying to invert that rounded value.
 if(r===0||principal*r/emi<1-1e-6)assert.equal(monthsToRepay(principal,annual,emi),months);
}
// Original tenure is informational; only remaining tenure affects the new EMI.
near(validatePosition({loans:[loan()]}).loans[0].emi,validatePosition({loans:[loan({totalMonths:360})]}).loans[0].emi);
near(validatePosition({loans:[loan({emi:1})]}).loans[0].emi,calculateEmi(100000,12,12));
let o=projectPlan(plan,[],[],{loans:[loan()]});
near(o.debt,0);near(o.emiPaid,12*calculateEmi(100000,12,12));near(o.loanInterest,o.emiPaid-100000);
assert.equal(o.loanResults[0].payoffMonth,12);assert.equal(o.loanResults[0].remainingMonthsAtEnd,0);assert.equal(o.loanResults[0].scheduledMonthsAtEnd,0);
o=projectPlan(plan,[],[],{loans:[loan({totalMonths:60,remainingMonths:36})]});
assert.equal(o.loanResults[0].remainingMonthsAtEnd,24);assert.equal(o.loanResults[0].scheduledMonthsAtEnd,24);
o=projectPlan({...plan,years:2},[],[],{loans:[loan({remainingMonths:6,rate:0,balance:6000})]});
near(o.emiPaid,6000);near(o.debt,0);assert.equal(o.loanResults[0].payoffMonth,6);near(o.months[6].emiPaid,0);
// Without sufficient funds, the original term never silently cancels debt.
o=projectPlan(plan,[],[],{loans:[loan({source:'portfolio'})]});
near(o.debt,100000*1.01**12);assert.equal(o.loanResults[0].scheduledMonthsAtEnd,0);assert.ok(o.loanResults[0].remainingMonthsAtEnd>12);
o=projectPlan(plan,[],[],{loans:[loan({source:'portfolio',remainingMonths:120,totalMonths:240,rate:60})]});
assert.equal(o.loanResults[0].remainingMonthsAtEnd,null);
// Legacy manual loans remain unchanged until tenure is explicitly supplied.
const old={name:'Saved loan',balance:12000,rate:0,emi:1000,source:'income'};
near(validatePosition({loans:[old]}).loans[0].emi,1000);
assert.equal(projectPlan(plan,[],[],{loans:[old]}).loanResults[0].remainingMonthsAtEnd,0);
for(const extra of [{remainingMonths:25},{totalMonths:0},{remainingMonths:0},{remainingMonths:1.5},{totalMonths:1201},{remainingMonths:undefined}])assert.throws(()=>validatePosition({loans:[loan(extra)]}));
assert.throws(()=>calculateEmi(100000,12,0));assert.throws(()=>calculateEmi(100000,-1,12));
o=projectPlan({...plan,years:60},[],[],{loans:[loan({totalMonths:1200,remainingMonths:1200,rate:60,balance:1e9})]});
assert.equal(o.loanResults[0].remainingMonthsAtEnd,480);assert.ok(o.debt>0);near(o.initialDebt+o.loanInterest-o.emiPaid,o.debt);
// Run the actual live form calculator, including invalid and changing tenures.
const source=fs.readFileSync('growth-holdings.js','utf8'),fields=new Map();
const field=id=>{if(!fields.has(id))fields.set(id,{value:'',textContent:'',setCustomValidity(message){this.validationMessage=message;}});return fields.get(id);};
const ctx=vm.createContext({field,GrowthEngine:require('./growth-engine')});
vm.runInContext(source.slice(source.indexOf('  function updateEmi()'),source.indexOf("  form('loans').addEventListener")),ctx);
for(const [id,value] of Object.entries({'loan-balance':'100000','loan-rate':'12','loan-total':'24','loan-remaining':'12'}))field(id).value=value;
vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-emi').value,'8884.88');assert.equal(field('loan-remaining').validationMessage,'');
field('loan-rate').value='0';vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-emi').value,'8333.33');
field('loan-remaining').value='25';vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-emi').value,'');assert.ok(field('loan-remaining').validationMessage);
field('loan-remaining').value='24';vm.runInContext('updateEmi()',ctx);assert.equal(field('loan-emi').value,'4166.67');assert.equal(field('loan-remaining').validationMessage,'');
console.log('Passed: automatic EMI, zero interest, 48 independent formula cases, original vs remaining tenure, payoff, projected months, missed payments, legacy loans, and tenure validation.');
