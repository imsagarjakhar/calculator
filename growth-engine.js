(function(root){
'use strict';
const LifeEvents=typeof module!=='undefined'&&module.exports?require('./life-events'):root.LifeEvents;
function validatePosition(position={}){
 const {assets=[],loans=[]}=position;
 if(!Array.isArray(assets)||!Array.isArray(loans)||assets.length>50||loans.length>50)throw new Error('Add up to 50 assets and 50 loans.');
 const name=e=>e&&typeof e.name==='string'&&e.name.trim()&&e.name.length<=80;
 for(const e of assets)if(!name(e)||!Number.isFinite(e.amount)||e.amount<=0||e.amount>1e12||!Number.isFinite(e.rate)||e.rate< -50||e.rate>40||typeof e.liquid!=='boolean')throw new Error('Assets need a name, positive current value (up to 1 trillion), annual return from -50% to 40%, and withdrawal availability.');
 for(const e of loans)if(!name(e)||!Number.isFinite(e.balance)||e.balance<=0||e.balance>1e12||!Number.isFinite(e.rate)||e.rate<0||e.rate>60||!Number.isFinite(e.emi)||e.emi<0||e.emi>1e10||!['income','portfolio'].includes(e.source))throw new Error('Loans need a name, positive outstanding balance (up to 1 trillion), interest from 0% to 60%, EMI from 0 to 10 billion, and a payment source.');
 return {assets:assets.map(e=>({...e})),loans:loans.map(e=>({...e}))};
}
function projectPlan(settings,entries=[],events=[],position={}){
 const {assets,loans}=validatePosition(position),horizon=settings.years*12,monthlyRate=settings.rate/1200;
 const planned=LifeEvents.scheduled(events,horizon,settings.inflation,'end'),expensesByMonth=new Map(),byMonth=new Map();
 for(const e of planned)expensesByMonth.set(e.index,(expensesByMonth.get(e.index)||0)+e.cost);
 const active=entries.filter(e=>e.year<=settings.years);
 for(const e of active){const m=(e.year-1)*12+e.month,item=byMonth.get(m)||{amount:0,notes:[]};item.amount+=e.amount;if(e.note)item.notes.push(e.note);byMonth.set(m,item);}
 const startingAssets=assets.reduce((sum,e)=>sum+e.amount,0),initialDebt=loans.reduce((sum,e)=>sum+e.balance,0);
 function state(){return {sip:0,assets:assets.map(e=>({...e,value:e.amount,growth:0,withdrawn:0,monthlyRate:Math.expm1(Math.log1p(e.rate/100)/12)})),loans:loans.map(e=>({...e,paid:0,interest:0,payoffMonth:null}))};}
 function snapshot(s){const assetValue=s.assets.reduce((sum,e)=>sum+e.value,0),debt=s.loans.reduce((sum,e)=>sum+e.balance,0),balance=s.sip+assetValue;return {balance,assetValue,sipBalance:s.sip,debt,netWorth:balance-debt,available:s.sip+s.assets.filter(e=>e.liquid).reduce((sum,e)=>sum+e.value,0)};}
 function withdraw(s,amount){let needed=amount,take=Math.min(s.sip,needed);s.sip-=take;needed-=take;for(const e of s.assets){if(!e.liquid||needed<=0)continue;take=Math.min(e.value,needed);e.value-=take;e.withdrawn+=take;needed-=take;}return amount-needed;}
 function advance(s,m,regular,extra,expenseDue){
  let growth=s.sip*monthlyRate,emiPaid=0,incomeEmi=0,portfolioEmi=0,loanInterest=0,loanShortfall=0;
  s.sip+=growth+regular+extra;
  for(const e of s.assets){const earned=e.value*e.monthlyRate;e.value+=earned;e.growth+=earned;growth+=earned;}
  for(const loan of s.loans){if(loan.balance<=0)continue;const interest=loan.balance*loan.rate/1200;loan.balance+=interest;loan.interest+=interest;loanInterest+=interest;
   const due=Math.min(loan.emi,loan.balance),paid=loan.source==='income'?due:withdraw(s,due);loan.balance=Math.max(0,loan.balance-paid);loan.paid+=paid;emiPaid+=paid;
   if(loan.source==='income')incomeEmi+=paid;else portfolioEmi+=paid;loanShortfall+=due-paid;
   if(loan.balance<1e-8){loan.balance=0;loan.payoffMonth=m;}
  }
  const expense=withdraw(s,expenseDue);
  return {...snapshot(s),growth,emiPaid,incomeEmi,portfolioEmi,loanInterest,loanShortfall,expenseDue,expense,shortfall:expenseDue-expense};
 }
 const main=state(),base=state();let regularTotal=0,extraTotal=0,hit=startingAssets-initialDebt>=settings.goal?0:null,annual=null;
 const months=[],years=[],path=[{year:0,balance:startingAssets,baseline:startingAssets,total:startingAssets,netWorth:startingAssets-initialDebt,debt:initialDebt}];
 const sums={growth:0,expenseDue:0,expense:0,shortfall:0,emiPaid:0,incomeEmi:0,portfolioEmi:0,loanInterest:0,loanShortfall:0};
 for(let m=1;m<=horizon;m++){
  const year=Math.floor((m-1)/12)+1,month=(m-1)%12+1,regular=settings.monthly*(1+settings.stepup/100)**(year-1),entry=byMonth.get(m),extra=entry?entry.amount:0,due=expensesByMonth.get(m)||0;
  const result=advance(main,m,regular,extra,due),baseline=advance(base,m,regular,0,due);
  regularTotal+=regular;extraTotal+=extra;
  if(hit===null&&result.netWorth>=settings.goal)hit=m;
  const row={...result,baseline:baseline.balance,baselineNetWorth:baseline.netWorth,index:m,year,month,regular,extra,deposit:regular+extra,total:startingAssets+regularTotal+extraTotal,stepup:month===1&&year>1?settings.stepup:null,notes:entry?entry.notes.join('; '):''};months.push(row);
  if(month===1)annual={year,regularMonthly:regular,regular:0,extra:0,deposit:0,...Object.fromEntries(Object.keys(sums).map(k=>[k,0]))};
  for(const k of Object.keys(sums)){sums[k]+=row[k];annual[k]+=row[k];}
  annual.regular+=regular;annual.extra+=extra;annual.deposit+=row.deposit;
  for(const k of ['total','balance','baseline','baselineNetWorth','netWorth','debt','available','assetValue','sipBalance'])annual[k]=row[k];
  if(month===12){years.push(annual);path.push({year,balance:row.balance,baseline:row.baseline,total:row.total,netWorth:row.netWorth,debt:row.debt});}
 }
 const final=snapshot(main),baseline=snapshot(base),assetResults=main.assets.map(e=>({...e})),loanResults=main.loans.map(e=>({...e}));
 if(hit===null){for(let m=horizon+1;m<=1200;m++){const regular=settings.monthly*(1+settings.stepup/100)**Math.floor((m-1)/12),row=advance(main,m,regular,0,0);if(row.netWorth>=settings.goal){hit=m;break;}}}
 return {...final,...sums,startingAssets,initialDebt,baseline:baseline.balance,baselineNetWorth:baseline.netWorth,expensePaid:sums.expense,expenseShortfall:sums.shortfall,regularTotal,extraTotal,total:startingAssets+regularTotal+extraTotal,last:months[months.length-1].regular,hit,months,years,path,activeCount:active.length,inactiveCount:entries.length-active.length,extraFuture:final.netWorth-baseline.netWorth,extraGrowth:final.netWorth-baseline.netWorth-extraTotal,assetResults,loanResults};
}
const api={projectPlan,validatePosition};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
