(function(root){
 'use strict';
 const today=new Date(),defaultMonth=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
 const defaults={currency:'INR',startMonth:defaultMonth,corpus:30000000,monthly:90000,inflation:5,emergency:1500000,age:60,endAge:95,spendingReturn:6,emergencyReturn:5,equityReturn:10,refillMonths:12,shockPercent:0,shockYear:1};
 const monthIndex=value=>Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
 function monthKey(start,offset=0){const n=monthIndex(start)+offset;return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0');}
 const ranges={corpus:[0,1e12],monthly:[0,1e9],inflation:[0,30],emergency:[0,1e12],age:[18,119],endAge:[19,120],spendingReturn:[-50,40],emergencyReturn:[-50,40],equityReturn:[-50,40],shockPercent:[0,80],shockYear:[1,102]};
 function validate(raw){
  if(!raw||!['INR','SAR','USD','AED','EUR','GBP'].includes(raw.currency))throw new Error('Choose a supported currency.');
  const startMonth=raw.startMonth===undefined?defaults.startMonth:raw.startMonth;
  if(typeof startMonth!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)||startMonth<'1900-01'||startMonth>'2150-12')throw new Error('Choose a withdrawal start month from January 1900 to December 2150.');
  const a={currency:raw.currency,startMonth};
  for(const [key,[min,max]] of Object.entries(ranges)){const n=raw[key];if(!Number.isFinite(n)||n<min||n>max||(['age','endAge','shockYear'].includes(key)&&!Number.isInteger(n)))throw new Error('Check '+key+': enter '+min+' to '+max+'.');a[key]=n;}
  if(a.endAge<=a.age)throw new Error('Plan until an age later than your current age.');
  if(![1,12,60].includes(raw.refillMonths))throw new Error('Choose monthly, yearly or five-yearly refills.');a.refillMonths=raw.refillMonths;
  if(a.shockPercent>0&&a.shockYear>a.endAge-a.age)throw new Error('Choose a market-fall year within your plan.');return a;
 }
 function validateEvents(events,months){
  if(!Array.isArray(events)||events.length>100)throw new Error('Keep up to 100 emergency expenses.');
  return events.map(e=>{if(!e||typeof e.id!=='string'||!e.id||e.id.length>80||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!Number.isFinite(e.amount)||e.amount<=0||e.amount>1e12||!Number.isInteger(e.month)||e.month<1||e.month>1224||typeof e.inflate!=='boolean')throw new Error('Emergency expenses need a name, positive amount and a plan month from 1 to 1224.');return {...e,name:e.name.trim()};});
 }
 const spendingAt=(a,month)=>a.monthly*Math.pow(1+a.inflation/100,Math.floor(month/12));
 // Undiscounted spending reserve: future fund returns do not reduce the initial five-year amount.
 function spendingTarget(a,month=0){let total=0;for(let i=month;i<month+60;i++)total+=spendingAt(a,i);return total;}
 function spendingWindow(a,month=0){
  const rows=[];for(let i=month;i<month+60;i++){const monthly=spendingAt(a,i),last=rows.at(-1);if(last&&Math.floor(last.from/12)===Math.floor(i/12)){last.to=i;last.months++;last.total+=monthly;}else rows.push({from:i,to:i,months:1,monthly,total:monthly});}return rows;
 }
 function project(raw,rawEvents=[]){
  const a=validate(raw),months=(a.endAge-a.age)*12,events=validateEvents(rawEvents,months),target1=spendingTarget(a),target2=a.emergency;
  const initial={spending:Math.min(a.corpus,target1),emergency:Math.min(Math.max(0,a.corpus-target1),target2),equity:Math.max(0,a.corpus-target1-target2)};
  let b1=initial.spending,b2=initial.emergency,b3=initial.equity,firstShortfall=null,totalGrowth=0,totalLiving=0,totalEmergency=0,totalUnfunded=0;
  const factors=[a.spendingReturn,a.emergencyReturn,a.equityReturn].map(r=>Math.pow(1+r/100,1/12)),rows=[],years=[],transfers=[],path=[{month:0,age:a.age,...initial,total:a.corpus}];
  const costs=new Map();for(const e of events)costs.set(e.month,(costs.get(e.month)||0)+e.amount*Math.pow(1+a.inflation/100,e.inflate?(e.month-1)/12:0));
  for(let m=1;m<=months;m++){
   const index=m-1,year=Math.floor(index/12),opening=b1+b2+b3,shock=a.shockPercent>0&&b3>0&&m===(a.shockYear-1)*12+1?-b3*a.shockPercent/100:0;
   const openingSpending=b1,openingEmergency=b2,openingEquity=b3,phases=[];
   function capture(key,label,force=false,missing=0){const previous=phases.at(-1),changed=!previous||previous.spending!==b1||previous.emergency!==b2||previous.equity!==b3;if(changed||force)phases.push({key,label,spending:b1,emergency:b2,equity:b3,total:b1+b2+b3,nextSpendIndex:['withdrawal','emergencyRefill','closing'].includes(key)?index+1:index,missing});}
   capture('opening','Opening balances');b3+=shock;if(shock)capture('market','Equity market fall');let toSpending=0,toEmergency=0;
   const targetSpending=spendingTarget(a,index),targetEmergency=a.emergency*Math.pow(1+a.inflation/100,year),review=m>1&&index%a.refillMonths===0;
   function fillSpending(amount){const transfer=Math.min(b3,Math.max(0,amount));b3-=transfer;b1+=transfer;toSpending+=transfer;}
   function fillEmergency(amount){const transfer=Math.min(b3,Math.max(0,amount));b3-=transfer;b2+=transfer;toEmergency+=transfer;}
   if(review){fillSpending(targetSpending-b1);fillEmergency(targetEmergency-b2);capture('review',toSpending+toEmergency>.005?'Scheduled refill':'Scheduled review · no transfer',true);}
   const dueEmergency=costs.get(m)||0;
   if(dueEmergency>b2){fillEmergency(dueEmergency-b2);capture('emergencyTopup','Emergency top-up before payment');}
   const paidEmergency=Math.min(b2,dueEmergency);b2-=paidEmergency;if(dueEmergency>0)capture('emergencyWithdrawal','Emergency expense paid',true,dueEmergency-paidEmergency);
   const dueLiving=spendingAt(a,index);if(dueLiving>b1){fillSpending(dueLiving-b1);capture('spendingTopup','Living-cost top-up before withdrawal');}
   const paidLiving=Math.min(b1,dueLiving);b1-=paidLiving;capture('withdrawal','Monthly living withdrawal',true,dueLiving-paidLiving);
   if(dueEmergency>0){fillEmergency(targetEmergency-b2);capture('emergencyRefill','Emergency reserve replenished');}
   const growth1=b1*(factors[0]-1),growth2=b2*(factors[1]-1),growth3=b3*(factors[2]-1),growth=shock+growth1+growth2+growth3;
   b1=Math.max(0,b1+growth1);b2=Math.max(0,b2+growth2);b3=Math.max(0,b3+growth3);
   capture('closing','Month end · returns applied',true);
   const unfunded=Math.max(0,dueLiving-paidLiving)+Math.max(0,dueEmergency-paidEmergency),total=b1+b2+b3;
   if(unfunded>0.005&&firstShortfall===null)firstShortfall=m;
   totalGrowth+=growth;totalLiving+=paidLiving;totalEmergency+=paidEmergency;totalUnfunded+=unfunded;
   const row={month:m,date:monthKey(a.startMonth,index),age:a.age+m/12,year:year+1,opening,openingSpending,openingEmergency,openingEquity,targetSpending,targetEmergency,phases,dueLiving,living:paidLiving,dueEmergency,emergencyPaid:paidEmergency,growth,shock,toSpending,toEmergency,spending:b1,emergency:b2,equity:b3,total,unfunded,review};rows.push(row);path.push({month:m,age:row.age,spending:b1,emergency:b2,equity:b3,total});
   if(toSpending+toEmergency>0.005)transfers.push({month:m,age:a.age+index/12,toSpending,toEmergency,reason:dueEmergency>0?'Emergency expense / reserve refill':review?'Scheduled review':'Spending top-up'});
   if(!years[year])years[year]={year:year+1,age:a.age+year,opening,living:0,emergencyPaid:0,growth:0,toSpending:0,toEmergency:0,unfunded:0};
   const annual=years[year];for(const k of ['living','emergencyPaid','growth','toSpending','toEmergency','unfunded'])annual[k]+=row[k];for(const k of ['spending','emergency','equity','total'])annual[k]=row[k];
  }
  return {settings:a,events,months,initial,target1,target2,setupGap:Math.max(0,target1+target2-a.corpus),firstFiveYears:Array.from({length:5},(_,i)=>({year:i+1,monthly:spendingAt(a,i*12),annual:spendingAt(a,i*12)*12})),rows,years,transfers,path,firstShortfall,totalGrowth,totalLiving,totalEmergency,totalUnfunded,ending:b1+b2+b3};
 }
 const api={defaults,ranges,validate,validateEvents,monthIndex,monthKey,spendingAt,spendingTarget,spendingWindow,project};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BucketPlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this);
