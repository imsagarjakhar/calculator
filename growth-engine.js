(function(root){
'use strict';
const LifeEvents=typeof module!=='undefined'&&module.exports?require('./life-events'):root.LifeEvents;
function projectPlan(settings,entries=[],events=[]){
 const horizon=settings.years*12,monthlyRate=settings.rate/100/12,step=settings.stepup/100;
 const planned=LifeEvents.scheduled(events,horizon,settings.inflation,'end'),expensesByMonth=new Map();
 for(const e of planned)expensesByMonth.set(e.index,(expensesByMonth.get(e.index)||0)+e.cost);
 let expensePaid=0,expenseShortfall=0,earned=0;
 const active=entries.filter(e=>e.year<=settings.years),byMonth=new Map();
 for(const e of active){const m=(e.year-1)*12+e.month;const item=byMonth.get(m)||{amount:0,notes:[]};item.amount+=e.amount;if(e.note)item.notes.push(e.note);byMonth.set(m,item);}
 let balance=0,baseline=0,extraBalance=0,regularTotal=0,extraTotal=0,hit=null;const months=[],years=[],path=[{year:0,balance:0,baseline:0,total:0}];let annual=null;
 for(let m=1;m<=horizon;m++){
  const year=Math.floor((m-1)/12)+1,month=(m-1)%12+1,regular=settings.monthly*Math.pow(1+step,year-1),entry=byMonth.get(m),extra=entry?entry.amount:0,growth=balance*monthlyRate;
  balance+=growth+regular+extra;baseline+=baseline*monthlyRate+regular;extraBalance=extraBalance*(1+monthlyRate)+extra;regularTotal+=regular;extraTotal+=extra;
  const expenseDue=expensesByMonth.get(m)||0,expense=Math.min(balance,expenseDue),shortfall=expenseDue-expense;balance-=expense;baseline=Math.max(0,baseline-expenseDue);expensePaid+=expense;expenseShortfall+=shortfall;earned+=growth;
  if(hit===null&&balance>=settings.goal)hit=m;
  const row={expenseDue,expense,shortfall,index:m,year,month,regular,extra,deposit:regular+extra,growth,total:regularTotal+extraTotal,balance,baseline,stepup:month===1&&year>1?settings.stepup:null,notes:entry?entry.notes.join('; '):''};months.push(row);
  if(month===1)annual={expenseDue:0,expense:0,shortfall:0,year,regularMonthly:regular,regular:0,extra:0,deposit:0,growth:0,total:0,balance:0,baseline:0};
  annual.expenseDue+=expenseDue;annual.expense+=expense;annual.shortfall+=shortfall;annual.regular+=regular;annual.extra+=extra;annual.deposit+=row.deposit;annual.growth+=growth;annual.total=row.total;annual.balance=balance;annual.baseline=baseline;
  if(month===12){years.push(annual);path.push({year,balance,baseline,total:row.total});}
 }
 if(hit===null){let extended=balance;for(let m=horizon+1;m<=1200;m++){const pay=settings.monthly*Math.pow(1+step,Math.floor((m-1)/12));extended=extended*(1+monthlyRate)+pay;if(extended>=settings.goal){hit=m;break;}}}
 return {expensePaid,expenseShortfall,expenseDue:expensePaid+expenseShortfall,balance,baseline,regularTotal,extraTotal,total:regularTotal+extraTotal,growth:earned,last:months[months.length-1].regular,hit,months,years,path,activeCount:active.length,inactiveCount:entries.length-active.length,extraFuture:balance-baseline,extraGrowth:balance-baseline-extraTotal};
}

const api={projectPlan};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
