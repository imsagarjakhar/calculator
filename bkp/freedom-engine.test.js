'use strict';
const assert=require('node:assert/strict'),E=require('./freedom-engine'),Life=require('./life-events');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-9),`${a} != ${b}`);
const annual=(q)=>(q**12-1)*100;
const basic=extra=>({...E.defaults,age:30,targetAge:35,endAge:40,salary:2000,expenses:1000,monthlyInvestment:1000,investmentGrowth:0,corpus:0,retirementExpense:1000,expectedReturn:annual(1.01),inflation:0,buffer:0,...extra});
const event=(extra={})=>({name:'College',amount:6000,year:1,month:6,enabled:true,inflate:false,...extra});
let a=basic(),o=E.project(a);const hit=Math.ceil(Math.log(2)/Math.log(1.01));assert.equal(o.freedomMonth,hit);near(o.requiredToday,100000);assert.ok(o.incomeAtFreedom>=o.monthlyNeedAtFreedom-1e-6);near(o.shortfall,0);assert.equal(o.rows[hit].investment,0);assert.ok(o.rows[hit].living>0);
o=E.project(basic({corpus:100000,monthlyInvestment:0}));assert.equal(o.freedomMonth,0);near(o.balance,100000);near(o.incomeNow,1000);
// The income pot maintains its purchasing power under the assumed constant return.
o=E.project(basic({corpus:201000,monthlyInvestment:0,inflation:annual(1.005)}));assert.equal(o.freedomMonth,0);near(o.requiredToday,201000);near(o.balance,201000*1.005**120);near(o.incomeAtFreedom,1005);
const reserve=6000/1.01**6;o=E.project(basic({corpus:100000+reserve,monthlyInvestment:0}),[event()]);assert.equal(o.freedomMonth,0);near(o.rows[5].balance,100000);near(o.balance,100000);near(o.incomeAtFreedom,1000);
o=E.project(basic(),[event()]);assert.ok(o.freedomMonth>hit);near(o.shortfall,0);
o=E.project(basic({retirementExpense:0,monthlyInvestment:100}),[event()]);assert.equal(o.freedomMonth,null);assert.ok(o.shortfall>0,'Unpaid expenses cannot disappear after their scheduled month');
o=E.project(basic({retirementExpense:0,monthlyInvestment:0}));assert.equal(o.freedomMonth,0);
for(const rate of [-5,0,5]){o=E.project(basic({expectedReturn:rate,inflation:5,corpus:1e10}));assert.equal(o.freedomMonth,null);assert.equal(o.incomePossible,false);assert.equal(o.requiredToday,Infinity);near(o.incomeNow,0);}
o=E.project(basic({monthlyInvestment:0}));assert.equal(o.freedomMonth,null);near(o.target.balance,0);
const highSalary=E.project(basic({salary:200000}));assert.equal(highSalary.freedomMonth,hit);near(highSalary.target.balance,E.project(basic()).target.balance);
o=E.project(basic({monthlyInvestment:1500}));assert.equal(o.budgetGap,500);near(o.rows[0].investment,1500,'Entered SIP is projected; salary is only an explicit current-budget check');
o=E.project(basic({retirementExpense:1e9,monthlyInvestment:100,investmentGrowth:20}));near(o.rows[11].investment,100);near(o.rows[12].investment,120);
o=E.project(basic({buffer:50}));assert.ok(o.freedomMonth>hit);
o=E.project(basic({minCorpus:200000}));assert.ok(o.freedomMonth>hit);near(o.atFreedom.required,200000);
o=E.project(basic(),[event({enabled:false}),event({year:15})]);assert.equal(o.freedomMonth,hit);assert.equal(o.outsideEvents,1);
// Independent accumulation and discounted cash-flow sums with an explicit terminal income pot.
let seed=10;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<50;i++){
 a=basic({corpus:random()*100000,monthlyInvestment:500+random()*2500,retirementExpense:100+random()*2000,expectedReturn:6+random()*9,inflation:random()*5,investmentGrowth:random()*8,buffer:random()*25,minCorpus:random()*30000});
 const events=[event({amount:1000,inflate:true}),event({year:4,month:3,amount:7000})],n=120,q=(1+a.expectedReturn/100)**(1/12),inf=(1+a.inflation/100)**(1/12);
 const due=m=>events.filter(e=>Life.monthIndex(e)===m).reduce((sum,e)=>sum+e.amount*(e.inflate?inf**m:1),0);
 const need=m=>{
  let pv=0;for(let k=m+1;k<=n;k++)pv+=(a.retirementExpense*inf**k+due(k))/q**(k-m);
  pv+=(a.retirementExpense*inf**(n+1)/(q-inf))/q**(n-m);
  return Math.max(pv*(1+a.buffer/100),a.minCorpus*inf**m);
 };
 let balance=a.corpus,missed=0,first=balance>=need(0)?0:null,atTarget;
 o=E.project(a,events);near(o.requiredToday,need(0));
 for(let m=1;m<=n;m++){
  const sip=a.monthlyInvestment*(1+a.investmentGrowth/100)**Math.floor((m-1)/12),funds=balance*q+sip;
  missed+=Math.max(0,due(m)-funds);balance=Math.max(0,funds-due(m));near(o.working[m].balance,balance);
  if(first===null&&m<n&&missed<1e-7&&balance>=need(m))first=m;
  if(m===60)atTarget=balance;
 }
 assert.equal(o.freedomMonth,first);near(o.target.balance,atTarget);near(o.target.required,need(60));
 if(first!==null){near(o.shortfall,0);assert.ok(o.incomeAtFreedom>=o.monthlyNeedAtFreedom-1e-5);}
 let previous=a.corpus;
 for(const row of o.rows){near(row.growth,previous*(q-1));near(row.balance,Math.max(0,previous+row.growth+row.investment-row.living-row.event));if(row.retired)assert.equal(row.investment,0);else near(row.living,0);previous=row.balance;}
 for(const changed of [{...a,expectedReturn:a.expectedReturn-2},{...a,inflation:a.inflation+1}]){const stress=E.project(changed,events);if(first===null)assert.equal(stress.freedomMonth,null);else assert.ok(stress.freedomMonth===null||stress.freedomMonth>=first);}
}
const legacy=basic();delete legacy.monthlyInvestment;delete legacy.investmentGrowth;delete legacy.expectedReturn;legacy.salaryGrowth=5;legacy.beforeReturn=12;legacy.afterReturn=8;
const migrated=E.migrate(legacy);assert.equal(migrated.monthlyInvestment,1000);assert.equal(migrated.investmentGrowth,5);assert.equal(migrated.expectedReturn,8);assert.deepEqual(E.migrate(basic({monthlyInvestment:0})),basic({monthlyInvestment:0}));
for(const bad of [{age:0},{targetAge:29},{endAge:30},{targetAge:40},{expectedReturn:Infinity},{inflation:-1},{currency:'<img>'},{age:30.5},{monthlyInvestment:-1},{investmentGrowth:31}])assert.throws(()=>E.project(basic(bad)));
assert.throws(()=>E.project(basic(),[event({amount:-1})]));const original=basic();E.project(original);assert.deepEqual(original,basic());
console.log('Financial freedom passed: ongoing monthly income, inflation-linked principal, event reserves, first crossing, SIP-only accumulation, budget separation, 50 independent cash-flow/PV scenarios, sensitivity, saved plans and impossible-income cases.');
