'use strict';
const assert=require('node:assert/strict');
const E=require('./custom-engine');
const near=(a,b,label='value')=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-9),`${label}: ${a} != ${b}`);
function basic(){const p=E.createPlan(new Date(2026,9,19));p.months=12;p.assets[0].annualReturn=0;return p;}
const stock={id:'stocks',name:'Stocks',type:'Stocks',value:0,annualReturn:0,canWithdraw:true};
const loan={id:'home',name:'Home loan',balance:12000,annualRate:0,remainingMonths:12,source:'income'};
let p=basic();p.assets.push(stock);p.overrides=[{month:'2026-11',sip:30000,note:'Higher salary',flows:[{type:'investment',assetId:'stocks',amount:50000,note:'Bonus'}]}];
let o=E.project(p);
near(o.rows[0].sip,20000);near(o.rows[1].sip,30000);near(o.rows[2].sip,20000);near(o.rows[1].extra,50000);near(o.assets.find(a=>a.id==='stocks').value,50000);near(o.contributions,300000);near(o.balance,300000);
p.overrides[0].sip=0;o=E.project(p);near(o.rows[1].sip,0);near(o.contributions,270000);
// The complete editable state survives export/import, not just the final balance.
const restored=E.parse(E.exportPlan(p));assert.deepEqual(restored,E.validate(p));assert.deepEqual(E.project(restored),E.project(p));
restored.assets[1].annualReturn=10;restored.loans.push(loan);restored.overrides[0].flows.push({type:'prepayment',loanId:'home',amount:5000,source:'income',note:'Extra loan payment'});
assert.ok(E.project(restored).balance>E.project(p).balance);assert.ok(E.project(restored).loans[0].payoffMonth<12);
// Per-asset returns and end-of-month deposits match independent future-value sums.
p=basic();p.months=24;p.assets[0].value=100000;p.assets[0].annualReturn=12;p.annualStepup=10;
p.assets.push({...stock,annualReturn:8,value:10000});p.overrides=[{month:'2026-11',sip:0,note:'',flows:[{type:'investment',assetId:'stocks',amount:50000,note:''}]}];
o=E.project(p);const q=1.12**(1/12);let core=100000*q**24;
for(let i=0;i<24;i++)core+=(i===1?0:20000*(i<12?1:1.1))*q**(23-i);
near(o.assets[0].value,core,'SIP future value');near(o.assets[1].value,10000*1.08**2+50000*1.08**(22/12),'extra future value');
// Prepayments reduce principal after scheduled EMI and shorten payoff at the same EMI.
p=basic();p.monthlySip=0;p.loans=[loan];p.overrides=[{month:p.startMonth,sip:null,note:'',flows:[{type:'prepayment',loanId:'home',amount:5000,source:'income',note:''}]}];
o=E.project(p);near(o.prepaid,5000);near(o.emiPaid,7000);assert.equal(o.loans[0].payoffMonth,7);near(o.debt,0);near(o.balance,0);
p.overrides[0].flows[0].amount=50000;o=E.project(p);near(o.prepaid,11000);near(o.unusedPrepayment,39000);near(o.incomePayments,12000);near(o.contributions,0);
// Investment-funded debt payments draw from available assets, never a retained home.
p=basic();p.monthlySip=0;p.assets[0].value=100000;p.assets[0].canWithdraw=false;p.loans=[{...loan,source:'investments'}];p.overrides=[{month:p.startMonth,sip:null,note:'',flows:[{type:'expense',amount:5000,inflate:false,note:'Medical cost'}]}];
o=E.project(p);near(o.balance,100000);near(o.available,0);near(o.debt,12000);near(o.shortfall,17000);near(o.netWorth,88000);
p.assets[0].canWithdraw=true;o=E.project(p);near(o.debt,0);near(o.shortfall,0);near(o.balance,83000);
// Changing the plan start preserves calendar dates instead of replaying past changes.
p=basic();p.overrides=[{month:'2026-10',sip:0,note:'past',flows:[{type:'investment',assetId:'core',amount:999999,note:''}]},{month:'2026-12',sip:30000,note:'future',flows:[]}];p.startMonth='2026-11';o=E.project(p);assert.equal(o.outsideMonths,1);near(o.rows[0].sip,20000);near(o.rows[1].sip,30000);near(o.balance,250000);assert.equal(E.parse(E.exportPlan(p)).overrides.length,2);
// Inflation uses the actual payment month-end and only applies when requested.
p=basic();p.monthlySip=0;p.assets[0].value=100000;p.inflation=10;p.overrides=[{month:'2027-09',sip:null,note:'',flows:[{type:'expense',amount:10000,inflate:true,note:''},{type:'expense',amount:1000,inflate:false,note:''}]}];o=E.project(p);near(o.expensePaid,12000);near(o.balance,88000);
// SIP step-up is annual; an override in month 13 never changes month 14.
p=basic();p.months=24;p.annualStepup=10;p.overrides=[{month:'2027-10',sip:50000,note:'',flows:[]}];o=E.project(p);near(o.rows[11].sip,20000);near(o.rows[12].sip,50000);near(o.rows[13].sip,22000);
// Cash-flow conservation over a mix of assets, loans, missed payments and expenses.
for(let i=0;i<40;i++){
 p=basic();p.months=24;p.monthlySip=i*500;p.assets[0].value=i*1000;p.assets[0].annualReturn=-10+i/2;p.assets.push({...stock,value:5000,annualReturn:5,canWithdraw:i%2===0});p.loans=[{...loan,annualRate:i,source:i%2===0?'income':'investments'}];
 p.overrides=[{month:'2026-11',sip:i%3===0?0:null,note:'',flows:[{type:'investment',assetId:'stocks',amount:5000,note:''},{type:'prepayment',loanId:'home',amount:2000,source:i%2===0?'investments':'income',note:''},{type:'expense',amount:20000,inflate:true,note:''}]}];
 o=E.project(p);near(o.initial.balance+o.contributions+o.growth-o.portfolioPayments-o.expensePaid,o.balance,'asset conservation');near(o.initial.debt+o.loanInterest-o.emiPaid-o.prepaid,o.debt,'loan conservation');near(o.balance-o.debt,o.netWorth);
 for(const year of o.years){const rows=o.rows.slice((year.year-1)*12,year.year*12);for(const key of ['contributions','extra','growth','emiPaid','prepaid','expensePaid','shortfall'])near(year[key],rows.reduce((s,r)=>s+r[key],0),'year '+key);}
 assert.ok(o.assets.every(a=>a.value>=0));assert.ok(o.loans.every(l=>l.balance>=0));
}
// Validation rejects bad data before it can replace the current plan.
assert.throws(()=>E.parse('not json'));assert.throws(()=>E.parse('{"schema":"wrong","version":1}'));assert.throws(()=>E.parse(' '.repeat(2*1024*1024+1)));
p=basic();p.version=2;assert.throws(()=>E.validate(p));p=basic();p.overrides=[{month:'2026-13',sip:0,note:'',flows:[]}];assert.throws(()=>E.validate(p));
p=basic();p.overrides=[{month:p.startMonth,sip:-1,note:'',flows:[]}];assert.throws(()=>E.validate(p));
p=basic();p.overrides=[{month:p.startMonth,sip:null,note:'',flows:[{type:'investment',assetId:'missing',amount:1000,note:''}]}];assert.throws(()=>E.validate(p));
p=basic();p.assets.push({...stock,id:'core'});assert.throws(()=>E.validate(p));
p=basic();p.assets[0].value=Infinity;assert.throws(()=>E.validate(p));
p=basic();p.overrides=[{month:p.startMonth,sip:0,note:'',flows:[]},{month:p.startMonth,sip:1,note:'',flows:[]}];assert.throws(()=>E.validate(p));
p=basic();p.assets=[null];assert.throws(()=>E.validate(p),/Invalid asset/);
p=basic();const before=JSON.stringify(p);E.project(p);assert.equal(JSON.stringify(p),before,'Projection must not mutate exported inputs');
p.name='<script>alert(1)</script>';assert.equal(E.parse(E.exportPlan(p)).name,p.name,'Imported text is data; the UI must escape it');
console.log('Custom Plan passed: monthly overrides, per-asset extras, prepayments/payoff, retained assets, inflation, date preservation, JSON round-trip, 40 mixed cash-flow reconciliations, and invalid-file rejection.');
