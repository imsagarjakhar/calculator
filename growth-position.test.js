'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {projectPlan,validatePosition}=require('./growth-engine');
const base={monthly:0,stepup:0,years:1,rate:0,goal:1e9,inflation:0};
const asset=(changes={})=>({name:'Existing fund',type:'Equity mutual fund',amount:100000,rate:10,liquid:true,...changes});
const loan=(changes={})=>({name:'Loan',balance:12000,rate:0,emi:1000,source:'income',...changes});
const expense=(changes={})=>({name:'Life cost',amount:1000,year:1,month:1,inflate:false,enabled:true,...changes});
const near=(a,b,label='value')=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-10),`${label}: ${a} != ${b}`);
// Own return assumptions compound from day one; they do not use the SIP rate.
let o=projectPlan({...base,years:2,rate:30},[],[],{assets:[asset(),asset({name:'Cash',amount:5000,rate:0}),asset({name:'Car',amount:10000,rate:-10,liquid:false})]});
near(o.balance,100000*1.1**2+5000+10000*.9**2);near(o.startingAssets,115000);near(o.netWorth,o.balance);near(o.assetResults[0].value,121000);near(o.available,126000);
// A standard loan matches the independent reducing-balance formula.
const principal=100000,rate=.12/12,payment=5000;
o=projectPlan(base,[],[],{loans:[loan({balance:principal,rate:12,emi:payment})]});
const expected=principal*(1+rate)**12-payment*((1+rate)**12-1)/rate;
near(o.debt,expected);near(o.netWorth,-expected);near(o.incomeEmi,60000);near(o.balance,0);
near(o.loanInterest,o.debt-principal+o.emiPaid);
// Zero-interest payoff and a smaller final instalment; no extra EMI after payoff.
o=projectPlan(base,[],[],{loans:[loan({balance:2500})]});
near(o.debt,0);near(o.emiPaid,2500);assert.equal(o.loanResults[0].payoffMonth,3);near(o.months[2].emiPaid,500);near(o.months[3].emiPaid,0);
// Loan deducted from assets only for the investment-funded option.
const options={assets:[asset({rate:0})],loans:[loan()]};
let income=projectPlan({...base,monthly:2000},[],[],options);
let portfolio=projectPlan({...base,monthly:2000},[],[],{...options,loans:[loan({source:'portfolio'})]});
near(income.balance,124000);near(portfolio.balance,112000);near(income.debt,0);near(portfolio.debt,0);near(income.incomeEmi,12000);near(portfolio.portfolioEmi,12000);
// SIP pool is spent first. A retained property is never sold to pay EMIs/costs.
o=projectPlan(base,[],[expense({amount:6000})],{assets:[asset({name:'Home',rate:0,liquid:false})],loans:[loan({source:'portfolio'})]});
near(o.balance,100000);near(o.debt,12000);near(o.available,0);near(o.expenseShortfall,6000);near(o.loanShortfall,12000);near(o.netWorth,88000);
// EMI shortfall remains in debt; regular and asset contributions cannot be double-counted.
o=projectPlan(base,[],[],{loans:[loan({rate:12,source:'portfolio'})]});
near(o.debt,12000*1.01**12);near(o.loanShortfall,12000);near(o.emiPaid,0);
// Withdrawable assets are used in listed order only after the SIP pool is exhausted.
o=projectPlan({...base,monthly:500},[],[expense({amount:2000})],{assets:[asset({name:'First',amount:1000,rate:0}),asset({name:'Second',amount:5000,rate:0})]});
near(o.assetResults[0].withdrawn,1000);near(o.assetResults[1].withdrawn,500);near(o.expensePaid,2000);near(o.balance,10000);
// Underpayment causes negative amortisation, not an imaginary paid-off loan.
o=projectPlan(base,[],[],{loans:[loan({balance:100000,rate:12,emi:500})]});
assert.ok(o.debt>100000);assert.equal(o.loanResults[0].payoffMonth,null);near(o.incomeEmi,6000);
// New contributions, returns, costs, loan interest and loan payments reconcile.
const mixed={assets:[asset(),asset({name:'Home',rate:3,liquid:false})],loans:[loan({rate:8,source:'portfolio'}),loan({balance:50000,rate:10,emi:2500})]};
const settings={...base,years:3,monthly:2000,rate:12,stepup:5};
o=projectPlan(settings,[{year:1,month:3,amount:10000}], [expense({year:2,amount:50000})],mixed);
near(o.total+o.growth-o.expensePaid-o.portfolioEmi,o.balance,'asset reconciliation');
near(o.initialDebt+o.loanInterest-o.emiPaid,o.debt,'loan reconciliation');
near(o.balance-o.debt,o.netWorth,'net wealth');
near(o.regularTotal+o.extraTotal+o.startingAssets+o.growth-o.expensePaid-o.initialDebt-o.loanInterest+o.incomeEmi,o.netWorth,'combined reconciliation');
const without=projectPlan(settings,[],[expense({year:2,amount:50000})],mixed);
near(o.baseline,without.balance);near(o.baselineNetWorth,without.netWorth);near(o.extraFuture,o.netWorth-without.netWorth);
for(const year of o.years){const rows=o.months.filter(r=>r.year===year.year);for(const field of ['emiPaid','incomeEmi','portfolioEmi','loanInterest','loanShortfall','growth','expense'])near(year[field],rows.reduce((sum,r)=>sum+r[field],0),field);}
// Net wealth goal can be reached today; loans count against it from the start.
assert.equal(projectPlan({...base,goal:90000},[],[],{assets:[asset()]}).hit,0);
assert.notEqual(projectPlan({...base,goal:90000},[],[],{assets:[asset()],loans:[loan({balance:100000,emi:0})]}).hit,0);
// Target extension must continue asset compounding and loan repayments.
assert.equal(projectPlan({...base,goal:121000},[],[],{assets:[asset()]}).hit,24);
assert.throws(()=>validatePosition({assets:[asset({rate:-100})]}));assert.throws(()=>validatePosition({loans:[loan({emi:-1})]}));assert.throws(()=>validatePosition({loans:[loan({balance:NaN})]}));
// Existing HTML output functions must expose all added values in both CSV views.
const html=fs.readFileSync('index.html','utf8'),nodes=new Map();
const el=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='yearFilter'?'all':id==='pageSize'?'12':'',innerHTML:'',setAttribute(){}});return nodes.get(id);};
const ctx=vm.createContext({current:{a:settings,o},view:'yearly',page:1,el,currency:'INR',selected:'MF',presets:{MF:{name:'MF'}},pct:n=>n+'%',amountText:String});
vm.runInContext(html.slice(html.indexOf('function yearHeader()'),html.indexOf('function focusExtra(')),ctx);
vm.runInContext(html.slice(html.indexOf('function csvCell('),html.indexOf('function downloadCSV(')),ctx);
for(const view of ['yearly','monthly']){ctx.view=view;vm.runInContext('renderTable()',ctx);
 const csv=vm.runInContext(`makeCSV('${view}')`,ctx).replace(/^\ufeff/,'').split('\r\n').map(r=>r.split(',').map(c=>c.replace(/^"|"$/g,'')));
 const rows=view==='yearly'?o.years:o.months;
 for(const [header,field] of [['Net wealth','netWorth'],['Outstanding debt','debt'],['EMIs paid from investments','portfolioEmi'],['EMIs paid from income','incomeEmi'],['Available for withdrawals','available']]){
  const index=csv[0].indexOf(header);assert.ok(index>=0,header);rows.forEach((row,i)=>near(Number(csv[i+1][index]),Number(row[field].toFixed(2)),header));
 }
 for(const row of el('tableBody').innerHTML.matchAll(/<tr[^>]*>(.*?)<\/tr>/g))assert.equal((row[1].match(/<t[dh][\s>]/g)||[]).length,13);
}
// Execute the real Growth update to check headline/net-wealth integration.
const output=new Map();
const node=id=>{if(!output.has(id))output.set(id,{value:String(settings[id]??(id==='yearFilter'?'all':id==='pageSize'?'12':'')),options:[],style:{},classList:{toggle(){}},setAttribute(){},replaceChildren(...items){this.options=items;},add(item){this.options.push(item);},innerHTML:'',textContent:''});return output.get(id);};
const ui=vm.createContext({GrowthEngine:require('./growth-engine'),GrowthHoldings:{load:()=>mixed},LifeEvents:{load:()=>[expense({year:2,amount:50000})]},
 document:{getElementById:node,querySelectorAll:()=>[],documentElement:{style:{setProperty(){}}},body:{classList:{remove(){},add(){}}}},
 localStorage:{getItem:()=>null,setItem(){}},Option:function(text,value){this.text=text;this.value=value;}});
const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(inline.slice(0,inline.indexOf("for(let m=1;m<=12;m++)el('extraMonth')")),ui);
vm.runInContext('update()',ui);
assert.equal(node('error').hidden,true,node('error').textContent);
const actual=vm.runInContext('current.o',ui),format=vm.runInContext('shortMoney',ui);
near(actual.netWorth,projectPlan(settings,[],[expense({year:2,amount:50000})],mixed).netWorth);
assert.equal(node('value').textContent,format(actual.netWorth));
assert.ok(node('exactValue').textContent.includes('remaining debt'));
console.log('Passed: existing asset CAGR/depreciation, loan amortisation/payoff, income vs portfolio EMIs, illiquid assets, shortfalls, net wealth/goal timing, cash-flow reconciliation, and new table/CSV values.');
