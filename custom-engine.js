(function(root){
 'use strict';
 const Growth=typeof module!=='undefined'&&module.exports?require('./growth-engine'):root.GrowthEngine;
 const SCHEMA='intimetec-custom-plan',VERSION=1;
 const currencies=['INR','SAR','USD','AED','EUR','GBP'];
 const monthNumber=value=>{if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw new Error('Use a valid month in YYYY-MM format.');const [year,month]=value.split('-').map(Number);if(year<2000||year>2250)throw new Error('Plan months must be between 2000 and 2250.');return year*12+month-1;};
 const monthKey=number=>Math.floor(number/12)+'-'+String(number%12+1).padStart(2,'0');
 function number(value,min,max,label,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error(label+' must be '+(integer?'a whole number ':'')+'between '+min+' and '+max+'.');return value;}
 function string(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Enter a valid '+label+' (up to '+max+' characters).');return value.trim();}
 function list(value,max,label){if(!Array.isArray(value)||value.length>max)throw new Error(label+' must contain at most '+max+' entries.');return value;}
 function id(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,60}$/.test(value))throw new Error('Invalid asset or loan identifier.');return value;}
 function note(value){if(value===undefined)return '';if(typeof value!=='string'||value.length>200)throw new Error('Notes must be text up to 200 characters.');return value;}
 function loanDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose valid loan start and current dates.');
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value||date.getUTCFullYear()<1900||date.getUTCFullYear()>2250)throw new Error('Loan dates must be valid dates between 1900 and 2250.');
  return date;
 }
 function calculateLoanDetails(originalAmount,annualRate,totalMonths,startDate,currentDate){
  const start=loanDate(startDate),current=loanDate(currentDate);
  if(current<start)throw new Error('Current date must be on or after the loan start date.');
  let elapsed=(current.getUTCFullYear()-start.getUTCFullYear())*12+current.getUTCMonth()-start.getUTCMonth();
  const dueDay=Math.min(start.getUTCDate(),new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+1,0)).getUTCDate());
  if(current.getUTCDate()<dueDay)elapsed--;
  return Growth.calculateLoanFromOriginal(originalAmount,annualRate,totalMonths,Math.min(totalMonths,Math.max(0,elapsed)));
 }
 function validate(raw){
  if(!raw||typeof raw!=='object'||raw.schema!==SCHEMA||raw.version!==VERSION)throw new Error('This file is not a supported Custom Plan (version 1).');
  const start=monthNumber(raw.startMonth);if(start>2150*12+11)throw new Error('The start month must be no later than 2150.');
  if(!currencies.includes(raw.currency))throw new Error('Choose a supported currency.');
  const assets=list(raw.assets,50,'Assets').map(a=>{if(!a||typeof a!=='object')throw new Error('Invalid asset entry.');if(typeof a.canWithdraw!=='boolean')throw new Error('Choose whether each asset can fund withdrawals.');return {id:id(a.id),name:string(a.name,80,'asset name'),type:string(a.type,40,'asset class'),value:number(a.value,0,1e12,'Asset value'),annualReturn:number(a.annualReturn,-50,60,'Asset annual return'),canWithdraw:a.canWithdraw};});
  if(!assets.length)throw new Error('Keep at least one asset for your SIP.');
  const assetIds=new Set(assets.map(a=>a.id));if(assetIds.size!==assets.length)throw new Error('Asset identifiers must be unique.');
  if(!assetIds.has(raw.sipAssetId))throw new Error('Choose an existing asset to receive the monthly SIP.');
  const loans=list(raw.loans,50,'Loans').map(l=>{
   if(!l||typeof l!=='object')throw new Error('Invalid loan entry.');
   if(!['income','investments'].includes(l.source))throw new Error('Choose an EMI payment source.');
   const common={id:id(l.id),name:string(l.name,80,'loan name'),annualRate:number(l.annualRate,0,60,'Loan interest'),source:l.source};
   if(l.balanceMode!==undefined&&!['original','current'].includes(l.balanceMode))throw new Error('Choose a valid loan entry method.');
   if(l.balanceMode==='original'){
    const originalAmount=number(l.originalAmount,0.01,1e12,'Original loan amount'),totalMonths=number(l.totalMonths,1,1200,'Total loan tenure',true);
    const details=calculateLoanDetails(originalAmount,common.annualRate,totalMonths,l.startDate,l.currentDate);
    return {...common,balanceMode:'original',originalAmount,totalMonths,startDate:l.startDate,currentDate:l.currentDate,balance:details.balance,paidMonths:details.paidMonths,remainingMonths:details.remainingMonths};
   }
   const balance=number(l.balance,0,1e12,'Loan balance'),remainingMonths=number(l.remainingMonths,balance===0?0:1,1200,'Loan remaining months',true);
   return {...common,balance,remainingMonths};
  });
  const loanIds=new Set(loans.map(l=>l.id));if(loanIds.size!==loans.length)throw new Error('Loan identifiers must be unique.');
  let flowCount=0;
  const overrides=list(raw.overrides,720,'Monthly changes').map(o=>{
   if(!o||typeof o!=='object')throw new Error('Invalid month entry.');monthNumber(o.month);
   const flows=list(o.flows,200,'Month cash flows').map(f=>{if(!f||typeof f!=='object')throw new Error('Invalid cash flow entry.');flowCount++;const common={type:f.type,amount:number(f.amount,0.01,1e12,'Cash flow amount'),note:note(f.note)};
    if(f.type==='investment'){if(!assetIds.has(f.assetId))throw new Error('An extra investment refers to a missing asset.');return {...common,assetId:f.assetId};}
    if(f.type==='prepayment'){if(!loanIds.has(f.loanId))throw new Error('A prepayment refers to a missing loan.');if(!['income','investments'].includes(f.source))throw new Error('Choose a prepayment source.');return {...common,loanId:f.loanId,source:f.source};}
    if(f.type==='expense'){if(typeof f.inflate!=='boolean')throw new Error('Choose whether expenses need inflation.');return {...common,inflate:f.inflate};}
    throw new Error('Unknown monthly cash flow type.');
   });
   return {month:o.month,sip:o.sip===null?null:number(o.sip,0,1e9,'Monthly SIP override'),note:note(o.note),flows};
  });
  if(flowCount>2000)throw new Error('Keep at most 2,000 cash flows in a plan.');
  if(new Set(overrides.map(o=>o.month)).size!==overrides.length)throw new Error('Each month can have only one override record.');
  return {schema:SCHEMA,version:VERSION,name:string(raw.name,80,'plan name'),currency:raw.currency,startMonth:raw.startMonth,months:number(raw.months,1,720,'Plan duration in months',true),monthlySip:number(raw.monthlySip,0,1e9,'Default monthly SIP'),annualStepup:number(raw.annualStepup,0,30,'Annual SIP step-up'),inflation:number(raw.inflation,0,30,'Inflation'),sipAssetId:raw.sipAssetId,assets,loans,overrides:overrides.sort((a,b)=>a.month.localeCompare(b.month))};
 }
 function createPlan(now=new Date()){return {schema:SCHEMA,version:VERSION,name:'My custom plan',currency:'INR',startMonth:now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'),months:120,monthlySip:20000,annualStepup:0,inflation:6,sipAssetId:'core',assets:[{id:'core',name:'Monthly SIP fund',type:'Mutual fund',value:0,annualReturn:8,canWithdraw:true}],loans:[],overrides:[]};}
 function parse(text){if(typeof text!=='string'||text.length>2*1024*1024)throw new Error('Choose a plan JSON file smaller than 2 MB.');let raw;try{raw=JSON.parse(text.replace(/^\ufeff/,''));}catch{throw new Error('The selected file is not valid JSON.');}return validate(raw);}
 const exportPlan=plan=>JSON.stringify(validate(plan),null,2);
 function project(raw){
  const plan=validate(raw),start=monthNumber(plan.startMonth),changes=new Map(plan.overrides.map(o=>[o.month,o]));
  const assets=plan.assets.map(a=>({...a,growth:0,contributions:0,withdrawn:0,monthlyRate:Math.expm1(Math.log1p(a.annualReturn/100)/12)}));
  const loans=plan.loans.map(l=>({...l,emi:l.balance?Growth.calculateEmi(l.balance,l.annualRate,l.remainingMonths):0,interest:0,paid:0,prepaid:0,missed:0,scheduled:true,payoffMonth:l.balance===0?0:null}));
  const assetMap=new Map(assets.map(a=>[a.id,a])),loanMap=new Map(loans.map(l=>[l.id,l]));
  function snapshot(){const balance=assets.reduce((s,a)=>s+a.value,0),debt=loans.reduce((s,l)=>s+l.balance,0),available=assets.filter(a=>a.canWithdraw).reduce((s,a)=>s+a.value,0);return {balance,debt,available,netWorth:balance-debt};}
  function withdraw(amount){let needed=amount;const ordered=[...assets].sort((a,b)=>Number(b.id===plan.sipAssetId)-Number(a.id===plan.sipAssetId));for(const a of ordered){if(!a.canWithdraw)continue;const used=Math.min(a.value,needed);a.value-=used;a.withdrawn+=used;needed-=used;if(needed<=0)break;}return amount-needed;}
  const initial=snapshot(),rows=[],years=[],path=[{index:0,...initial}],totals={contributions:0,growth:0,loanInterest:0,emiPaid:0,prepaid:0,expensePaid:0,expenseDue:0,incomePayments:0,portfolioPayments:0,shortfall:0,unusedPrepayment:0};
  for(let i=0;i<plan.months;i++){
   const month=monthKey(start+i),override=changes.get(month),sip=override?.sip??plan.monthlySip*(1+plan.annualStepup/100)**Math.floor(i/12),flows=override?.flows||[];
   const row={month,index:i+1,sip,extra:0,contributions:sip,growth:0,loanInterest:0,emiPaid:0,prepaid:0,expensePaid:0,expenseDue:0,incomePayments:0,portfolioPayments:0,shortfall:0,unusedPrepayment:0,custom:!!override};
   for(const a of assets){const growth=a.value*a.monthlyRate;a.value+=growth;a.growth+=growth;row.growth+=growth;}
   const sipAsset=assetMap.get(plan.sipAssetId);sipAsset.value+=sip;sipAsset.contributions+=sip;
   for(const f of flows.filter(f=>f.type==='investment')){const a=assetMap.get(f.assetId);a.value+=f.amount;a.contributions+=f.amount;row.extra+=f.amount;row.contributions+=f.amount;}
   for(const l of loans){if(l.balance<=0)continue;const interest=l.balance*l.annualRate/1200;l.balance+=interest;l.interest+=interest;row.loanInterest+=interest;
    const due=l.balance<=l.emi*(1+1e-10)+1e-8?l.balance:l.emi,paid=l.source==='income'?due:withdraw(due);l.balance=Math.max(0,l.balance-paid);l.paid+=paid;l.missed+=due-paid;row.emiPaid+=paid;row.shortfall+=due-paid;
    row[l.source==='income'?'incomePayments':'portfolioPayments']+=paid;
    if(due>paid)l.scheduled=false;
    if(l.scheduled&&l.annualRate>0){const remaining=Math.max(0,l.remainingMonths-i-1),r=l.annualRate/1200,expected=l.emi*(-Math.expm1(-remaining*Math.log1p(r)))/r,correction=expected-l.balance;l.balance=expected;l.interest+=correction;row.loanInterest+=correction;}
    if(l.balance<1e-8){l.balance=0;l.payoffMonth=i+1;}
   }
   for(const f of flows.filter(f=>f.type==='prepayment')){const l=loanMap.get(f.loanId),due=Math.min(f.amount,l.balance),paid=f.source==='income'?due:withdraw(due);l.balance=Math.max(0,l.balance-paid);l.prepaid+=paid;row.prepaid+=paid;row.shortfall+=due-paid;row.unusedPrepayment+=f.amount-due;row[f.source==='income'?'incomePayments':'portfolioPayments']+=paid;
    if(paid>0)l.scheduled=false;if(l.balance<1e-8){l.balance=0;if(l.payoffMonth===null)l.payoffMonth=i+1;}
   }
   for(const f of flows.filter(f=>f.type==='expense')){const due=f.amount*(f.inflate?(1+plan.inflation/100)**((i+1)/12):1),paid=withdraw(due);row.expenseDue+=due;row.expensePaid+=paid;row.shortfall+=due-paid;}
   Object.assign(row,snapshot());rows.push(row);for(const key of Object.keys(totals))totals[key]+=row[key];path.push({index:i+1,...snapshot()});
   const year=Math.floor(i/12);if(!years[year])years[year]={year:year+1,contributions:0,extra:0,growth:0,emiPaid:0,prepaid:0,expensePaid:0,shortfall:0};for(const key of ['contributions','extra','growth','emiPaid','prepaid','expensePaid','shortfall'])years[year][key]+=row[key];Object.assign(years[year],snapshot());
  }
  return {initial,...snapshot(),...totals,rows,years,path,assets,loans,outsideMonths:plan.overrides.filter(o=>monthNumber(o.month)<start||monthNumber(o.month)>=start+plan.months).length};
 }
 const api={validate,createPlan,parse,exportPlan,project,monthNumber,monthKey,calculateLoanDetails};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CustomPlan=api;
})(typeof globalThis!=='undefined'?globalThis:this);
