(function(root) {
'use strict';
  const LifeEvents=typeof module!=='undefined'&&module.exports?require('./life-events'):root.LifeEvents;
  function planMonth(start, months) {
    const offset=start.getUTCMonth()+months,year=start.getUTCFullYear()+Math.floor(offset/12),month=offset%12;
    return new Date(Date.UTC(year,month,Math.min(start.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate())));
  }
  // Present value of the exact daily spending/start-of-day event schedule.
  function requiredCorpus(a,start=new Date(),events=[]){
    const origin=new Date(Date.UTC(start.getFullYear(),start.getMonth(),start.getDate())),dueByDay=new Map();
    for(const e of LifeEvents.scheduled(events,(a.endAge-a.age)*12,a.inflation)){
      const date=planMonth(origin,e.index-1).getTime();dueByDay.set(date,(dueByDay.get(date)||0)+e.cost);
    }
    let required=0,discount=1;
    for(let year=0;year<a.endAge-a.age;year++){
      const from=planMonth(origin,year*12),to=planMonth(origin,(year+1)*12),days=(to-from)/86400000,q=Math.exp(Math.log1p(a.returns/100)/days),budget=a.swp*Math.pow(1+a.inflation/100,year);
      let month=year*12,monthEnd=planMonth(origin,month+1).getTime(),monthDays=(monthEnd-from.getTime())/86400000;
      for(let day=0;day<days;day++){
        const date=from.getTime()+day*86400000;
        if(date>=monthEnd){month++;const monthStart=monthEnd;monthEnd=planMonth(origin,month+1).getTime();monthDays=(monthEnd-monthStart)/86400000;}
        required+=(dueByDay.get(date)||0)*discount;
        discount/=q;required+=budget/monthDays*discount;
      }
    }
    return required;
  }
  function projectSurvival(a, start = new Date(), events = []) {
    const origin=new Date(Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()));
    const planned=LifeEvents.scheduled(events,(a.endAge-a.age)*12,a.inflation),dueByDay=new Map();
    for(const e of planned){const date=planMonth(origin,e.index-1).getTime();dueByDay.set(date,(dueByDay.get(date)||0)+e.cost);}
    let balance=a.corpus,days=0,totalWithdrawn=0,totalGrowth=0,depleted=balance===0,expensePaid=0,eventFailure=false;
    const expenseDue=planned.reduce((sum,e)=>sum+e.cost,0);
    const rows=[],path=[{age:a.age,balance}];
    for(let year=0;year<a.endAge-a.age&&!depleted;year++) {
      const from=planMonth(origin,year*12),to=planMonth(origin,(year+1)*12),yearDays=(to-from)/86400000;
      const dailyRate=Math.expm1(Math.log1p(a.returns/100)/yearDays),budget=a.swp*Math.pow(1+a.inflation/100,year);
      const row={age:a.age+year,opening:balance,budget,withdrawals:0,growth:0,balance:0,days:0,expenseDue:0,expense:0,shortfall:0};
      let month=year*12,monthEnd=planMonth(origin,month+1).getTime(),monthDays=(monthEnd-from.getTime())/86400000;
      for(let day=0;day<yearDays;day++) {
        const date=new Date(from.getTime()+day*86400000);
        if(date.getTime()>=monthEnd){month++;const monthStart=monthEnd;monthEnd=planMonth(origin,month+1).getTime();monthDays=(monthEnd-monthStart)/86400000;}
        const due=dueByDay.get(date.getTime())||0;
        if(due){const age=a.age+year+day/yearDays;path.push({age,balance});const paid=Math.min(balance,due);balance-=paid;row.expenseDue+=due;row.expense+=paid;row.shortfall+=due-paid;expensePaid+=paid;path.push({age,balance});
          if(balance===0){depleted=true;eventFailure=due>paid;break;}}
        const spend=budget/monthDays,growth=balance*dailyRate,available=balance+growth;
        const funded=Math.min(available,spend),fraction=spend>0?Math.min(1,available/spend):1;
        balance=Math.max(0,available-funded);row.withdrawals+=funded;row.growth+=growth;row.days+=fraction;days+=fraction;
        if(fraction<1||(spend>0&&balance===0)){depleted=true;break;}
      }
      row.balance=balance;rows.push(row);totalWithdrawn+=row.withdrawals;totalGrowth+=row.growth;
      path.push({age:depleted?a.age+year+row.days/yearDays:a.age+year+1,balance});
    }
    return {expenseDue,expensePaid,expenseShortfall:Math.max(0,expenseDue-expensePaid),eventFailure,balance,days,totalWithdrawn,totalGrowth,depleted,rows,path,age:path[path.length-1].age,start:origin};
  }

const api={projectSurvival,requiredCorpus};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.CorpusSurvival=api;
})(typeof globalThis!=='undefined'?globalThis:this);
