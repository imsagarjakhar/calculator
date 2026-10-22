(function(root){
 'use strict';
 const Life=typeof module!=='undefined'&&module.exports?require('./life-events'):root.LifeEvents;
 const defaults={currency:'INR',age:30,salary:100000,expenses:50000,monthlyInvestment:30000,investmentGrowth:6,corpus:1000000,retirementExpense:50000,targetAge:50,endAge:95,expectedReturn:8,inflation:6,buffer:0,minCorpus:0,withdrawalRate:3,incomeMode:'spending'};
 const ranges={age:[18,100],salary:[0,1e9],expenses:[0,1e9],monthlyInvestment:[0,1e9],investmentGrowth:[0,30],corpus:[0,1e15],retirementExpense:[0,1e9],targetAge:[18,119],endAge:[19,120],expectedReturn:[-50,40],inflation:[0,30],buffer:[0,100],minCorpus:[0,1e15],withdrawalRate:[2,6]};
 function validate(raw){
  if(!raw||!['INR','SAR','USD','AED','EUR','GBP'].includes(raw.currency))throw new Error('Choose a supported currency.');
  const a={currency:raw.currency,incomeMode:raw.incomeMode===undefined?'spending':raw.incomeMode};
  if(!['spending','corpus'].includes(a.incomeMode))throw new Error('Choose a supported income goal.');
  for(const [key,[min,max]] of Object.entries(ranges)){
   const value=key==='withdrawalRate'&&raw[key]===undefined?3:raw[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(['age','targetAge','endAge'].includes(key)&&!Number.isInteger(value)))throw new Error('Enter a valid '+key+' between '+min+' and '+max+'.');a[key]=value;
  }
  if(a.endAge<=a.age)throw new Error('Plan until an age later than your current age.');
  if(a.targetAge<a.age||a.targetAge>=a.endAge)throw new Error('Your preferred stop-work age must be between your current age and the year before the planning end age.');
  return a;
 }
 function migrate(raw){
  if(!raw||typeof raw!=='object')return validate(raw);
  return validate({...raw,expectedReturn:raw.expectedReturn===undefined?(raw.afterReturn===undefined?(raw.beforeReturn===undefined?defaults.expectedReturn:raw.beforeReturn):raw.afterReturn):raw.expectedReturn,monthlyInvestment:raw.monthlyInvestment===undefined?Math.max(0,raw.salary-raw.expenses):raw.monthlyInvestment,investmentGrowth:raw.investmentGrowth===undefined?Math.max(0,raw.salaryGrowth===undefined?0:raw.salaryGrowth):raw.investmentGrowth});
 }
 function project(raw,events=[]){
  const a=validate(raw),months=(a.endAge-a.age)*12,rate=Math.pow(1+a.expectedReturn/100,1/12),inflation=1+a.inflation/100,inflationRate=Math.pow(inflation,1/12);
  const allEvents=Life.validate(events),active=Life.scheduled(allEvents,months,a.inflation,'end'),eventCosts=Array(months+1).fill(0);
  for(const event of active)eventCosts[event.index]+=event.cost;
  const expense=Array(months+1).fill(0),required=Array(months+1).fill(0),eventReserve=Array(months+1).fill(0);
  for(let m=1;m<=months;m++)expense[m]=a.retirementExpense*Math.pow(inflation,m/12);
  // Reserve scheduled one-offs separately from the ongoing, inflation-linked income pot.
  const fromCorpus=a.incomeMode==='corpus',incomePossible=fromCorpus||a.retirementExpense===0||rate>inflationRate;
  for(let m=months-1;m>=0;m--){
   eventReserve[m]=(eventReserve[m+1]+eventCosts[m+1])/rate;
   const incomeNeed=a.retirementExpense===0?0:incomePossible?expense[m+1]/(rate-inflationRate):Infinity;
   required[m]=Math.max(((fromCorpus?0:incomeNeed)+eventReserve[m])*(1+a.buffer/100),a.minCorpus*Math.pow(inflation,m/12));
  }
  function incomeAt(funds,m){return Math.max(0,funds/(1+a.buffer/100)-eventReserve[m])*(fromCorpus?a.withdrawalRate/1200:Math.max(0,rate-inflationRate));}
  let balance=a.corpus,shortfall=0,freedomMonth=null;
  const working=[{index:0,age:a.age,balance,required:required[0],shortfall:0}],workingRows=[];
  const covers=(funds,need)=>Number.isFinite(need)&&funds>=need-Math.max(1e-7,Math.abs(need)*1e-12);
  if(covers(balance,required[0]))freedomMonth=0;
  for(let m=1;m<=months;m++){
   const year=Math.floor((m-1)/12),growth=balance*(rate-1),investment=a.monthlyInvestment*Math.pow(1+a.investmentGrowth/100,year),available=balance+growth+investment,missing=Math.max(0,eventCosts[m]-available);
   shortfall+=missing;balance=Math.max(0,available-eventCosts[m]);
   workingRows.push({index:m,event:eventCosts[m],growth,investment,shortfall:missing,balance});
   working.push({index:m,age:a.age+m/12,balance,required:required[m],shortfall});
   if(freedomMonth===null&&m<months&&shortfall<=1e-7&&covers(balance,required[m]))freedomMonth=m;
  }
  const selectedMonth=(a.targetAge-a.age)*12;
  if(fromCorpus)freedomMonth=working[selectedMonth].shortfall<=1e-7&&covers(working[selectedMonth].balance,required[selectedMonth])?selectedMonth:null;
  const withdrawalIncome=incomeAt(working[selectedMonth].balance,selectedMonth);
  // Stop contributions after the selected age or income target; withdrawals then begin.
  let actual=a.corpus;const rows=[],years=[],path=[{index:0,age:a.age,balance:actual,required:required[0]}];
  for(let m=1;m<=months;m++){
   const retired=freedomMonth!==null&&m>freedomMonth,source=workingRows[m-1],living=retired?(fromCorpus?withdrawalIncome*Math.pow(inflation,(m-selectedMonth-1)/12):expense[m]):0,growth=actual*(rate-1),investment=retired?0:source.investment,drawn=living+eventCosts[m],missing=Math.max(0,drawn-actual-growth-investment);
   actual=Math.max(0,actual+growth+investment-drawn);
   const row={index:m,age:a.age+m/12,retired,living,event:eventCosts[m],growth,balance:actual,shortfall:missing,investment,drawn};rows.push(row);path.push({index:m,age:row.age,balance:actual,required:required[m]});
   const year=Math.floor((m-1)/12);if(!years[year])years[year]={year:year+1,age:a.age+year,living:0,event:0,growth:0,investment:0,shortfall:0,retiredMonths:0,balance:0};
   for(const key of ['living','event','growth','investment','shortfall'])years[year][key]+=row[key];years[year].retiredMonths+=Number(retired);years[year].balance=actual;
  }
  const targetMonth=(a.targetAge-a.age)*12,target=working[targetMonth],atFreedom=freedomMonth===null?null:working[freedomMonth];
  return {settings:a,months,incomePossible,freedomMonth,freedomAge:freedomMonth===null?null:a.age+freedomMonth/12,atFreedom,target:{age:a.targetAge,balance:target.balance,required:target.required,gap:Math.max(0,target.required-target.balance),shortfall:target.shortfall},startingSurplus:a.salary-a.expenses,unallocatedMonthly:Math.max(0,a.salary-a.expenses-a.monthlyInvestment),budgetGap:Math.max(0,a.monthlyInvestment-Math.max(0,a.salary-a.expenses)),incomeNow:incomeAt(a.corpus,0),incomeAtFreedom:atFreedom?incomeAt(atFreedom.balance,freedomMonth):null,monthlyNeedAtFreedom:atFreedom?(fromCorpus?withdrawalIncome:a.retirementExpense*Math.pow(inflation,(freedomMonth+1)/12)):null,withdrawalIncome,withdrawalIncomeToday:withdrawalIncome/Math.pow(inflation,selectedMonth/12),firstShortfallMonth:rows.find(r=>r.shortfall>1e-7)?.index??null,includedEvents:active.length,totalFutureExpenses:active.reduce((sum,e)=>sum+e.cost,0),outsideEvents:allEvents.filter(e=>e.enabled&&Life.monthIndex(e)>months).length,workingShortfall:shortfall,shortfall:rows.reduce((sum,r)=>sum+r.shortfall,0),balance:actual,requiredToday:required[0],working,rows,years,path};
 }
 const api={defaults,ranges,validate,migrate,project};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FinancialFreedom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
