(function(){
 'use strict';
 const E=FinancialFreedom,$=id=>document.getElementById(id),KEY='intimetec-freedom-v1';
 const labels={age:'current age',salary:'take-home salary',expenses:'working expenses',monthlyInvestment:'monthly investment',investmentGrowth:'annual investment increase',corpus:'available investments',retirementExpense:'retirement spending',targetAge:'preferred stop-work age',endAge:'planning end age',expectedReturn:'expected annual return',inflation:'inflation',buffer:'buffer',minCorpus:'minimum corpus'};
 let current=null,editor=null,migrationMessage='',investmentView='yearly';
 const money=(n,currency)=>new Intl.NumberFormat(currency==='INR'?'en-IN':'en-US',{style:'currency',currency,maximumFractionDigits:0}).format(n);
 const ageLabel=(a,m)=>'Age '+(a.age+Math.floor(m/12))+(m%12?' + '+m%12+' mo':'');
 const timeLabel=m=>m===0?'Already funded in this model':Math.floor(m/12)+' years'+(m%12?' and '+m%12+' months':'')+' more work';
 function restore(a){for(const key of Object.keys(E.defaults))$('f-'+key).value=a[key];$('returnSlider').value=a.expectedReturn;}
 function read(){
  const a={currency:$('f-currency').value};
  for(const [key,[min,max]] of Object.entries(E.ranges)){
   const input=$('f-'+key),n=input.value.trim()===''?(['salary','expenses'].includes(key)?0:NaN):Number(input.value),bad=!Number.isFinite(n)||n<min||n>max||(['age','targetAge','endAge'].includes(key)&&!Number.isInteger(n));
   input.setAttribute('aria-invalid',String(bad));if(bad)throw new Error('Enter '+labels[key]+' between '+min.toLocaleString()+' and '+max.toLocaleString()+(['age','targetAge','endAge'].includes(key)?' in whole years.':'.'));a[key]=n;
  }
  return E.validate(a);
 }
 function renderChart(o,a){
  const w=1000,h=320,l=100,r=20,t=24,b=42,requiredPoints=(o.freedomMonth===null?o.path.slice(0,-1):o.path.slice(0,o.freedomMonth+1)).filter(p=>Number.isFinite(p.required)),max=Math.max(1,...o.path.map(p=>p.balance),...requiredPoints.map(p=>p.required))*1.08;
  const x=index=>l+(w-l-r)*index/o.months,y=value=>h-b-(h-t-b)*value/max;
  let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Projected investments and required freedom capital by age"><title>Financial freedom projection through age '+a.endAge+'</title>';
  for(let i=0;i<=4;i++){const value=max*i/4;svg+='<line x1="'+l+'" y1="'+y(value)+'" x2="'+(w-r)+'" y2="'+y(value)+'" stroke="#24485c"/><text x="'+(l-10)+'" y="'+(y(value)+4)+'" text-anchor="end" fill="#b0c3cf" font-size="12">'+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value)+'</text>';}
  for(let i=0;i<=5;i++){const index=Math.round(o.months*i/5);svg+='<text x="'+x(index)+'" y="'+(h-12)+'" text-anchor="middle" fill="#b0c3cf" font-size="12">Age '+(a.age+index/12).toFixed(0)+'</text>';}
  const line=(points,key)=>points.map((p,i)=>(i?'L':'M')+x(p.index).toFixed(2)+' '+y(p[key]).toFixed(2)).join(' ');
  svg+='<path d="'+line(o.path,'balance')+'" fill="none" stroke="#2bdbb0" stroke-width="3"/><path d="'+line(requiredPoints,'required')+'" fill="none" stroke="#ffce96" stroke-width="2" stroke-dasharray="6 4"/>';
  if(o.freedomMonth!==null)svg+='<circle cx="'+x(o.freedomMonth)+'" cy="'+y(o.atFreedom.balance)+'" r="5" fill="#2bdbb0"/>';
  svg+='</svg><div class="freedom-chart-legend"><span>Investments · SIP stops at freedom</span><span>Capital needed for monthly income · until freedom</span></div><p class="helper">Hover, tap, or use arrow keys on the chart for full amounts. New investments stop at freedom; the chart runs through age '+a.endAge+'. The target line stops at freedom. A smooth projection does not model market volatility.</p>';
  $('freedomChart').innerHTML=svg;
  if(typeof ChartHover!=='undefined')ChartHover.attach($('freedomChart'),{currency:a.currency,top:t,bottom:h-b,points:o.path.map(p=>({x:x(p.index),ys:[y(p.balance)],title:ageLabel(a,p.index)+(o.freedomMonth!==null&&p.index>o.freedomMonth?' · After work':''),rows:[['Projected investments',p.balance],...(p.index<o.months&&Number.isFinite(p.required)&&(o.freedomMonth===null||p.index<=o.freedomMonth)?[['Capital needed to stop work',p.required]]:[])]}))});
 }
 function renderInvestmentSchedule(o,a){
  const rows=o.rows.filter(row=>!row.retired),format=n=>new Intl.NumberFormat(a.currency==='INR'?'en-IN':'en-US',{style:'currency',currency:a.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  const first=rows[0]?.investment||0,last=rows.at(-1)?.investment||0;
  $('investmentScheduleNote').textContent=rows.length?'Starting monthly investment: '+format(first)+' → final working-year monthly investment: '+format(last)+'. '+rows.length+' monthly contributions. '+(o.freedomMonth===null?'Freedom is not reached; the schedule continues through age '+a.endAge+'.':'New investments stop after '+ageLabel(a,o.freedomMonth)+'.'):'The current corpus already meets this model’s target. No new monthly investments are needed.';
  $('investmentMonthly').setAttribute('aria-pressed',String(investmentView==='monthly'));$('investmentYearly').setAttribute('aria-pressed',String(investmentView==='yearly'));
  const monthly=investmentView==='monthly',headers=monthly?['Month','Age at month end','Monthly investment','Total invested so far']:['Plan year','Age at year start','Investment per month','Months invested','Invested this year','Total invested so far'];
  $('investmentScheduleHead').innerHTML='<tr>'+headers.map(title=>'<th scope="col">'+title+'</th>').join('')+'</tr>';
  let total=0;
  if(monthly){
   $('investmentScheduleRows').innerHTML=rows.map(row=>{total+=row.investment;return '<tr><th scope="row">Month '+row.index+'</th><td>'+ageLabel(a,row.index)+'</td><td>'+format(row.investment)+'</td><td>'+format(total)+'</td></tr>';}).join('');
  }else{
   const years=[];
   for(const row of rows){const index=Math.floor((row.index-1)/12);if(!years[index])years[index]={year:index+1,monthly:row.investment,count:0,invested:0};years[index].count++;years[index].invested+=row.investment;}
   $('investmentScheduleRows').innerHTML=years.map(year=>{total+=year.invested;return '<tr><th scope="row">Year '+year.year+'</th><td>'+(a.age+year.year-1)+'</td><td>'+format(year.monthly)+'</td><td>'+year.count+'</td><td>'+format(year.invested)+'</td><td>'+format(total)+'</td></tr>';}).join('');
  }
  if(!rows.length)$('investmentScheduleRows').innerHTML='<tr><td colspan="'+headers.length+'">No contributions after financial freedom.</td></tr>';
  $('investmentScheduleTotal').textContent='Total new investments: '+format(total)+'. This excludes the starting corpus, investment growth and expenses.';
 }
 function render(o,a,events){
  const m=n=>Number.isFinite(n)?money(n,a.currency):'No finite target',metric=(name,value,note)=>'<div class="metric"><span>'+name+'</span><strong>'+m(value)+'</strong><small>'+note+'</small></div>';
  for(const node of document.querySelectorAll('.f-code'))node.textContent=a.currency;
  $('returnSlider').value=a.expectedReturn;
  renderInvestmentSchedule(o,a);
  $('surplusHint').textContent='Today’s salary '+m(a.salary)+' − spending '+m(a.expenses)+' = '+m(o.startingSurplus)+' available. Planned investment: '+m(a.monthlyInvestment)+'. '+(o.budgetGap>0?'This exceeds today’s budget by '+m(o.budgetGap)+'. The estimate assumes you can fund it; revise the SIP or budget.':'Any remaining salary stays outside this retirement plan.')+' This is a check of today’s budget; future salary is not projected.';
  if($('f-salary').value.trim()===''||$('f-expenses').value.trim()==='')$('surplusHint').textContent='Enter salary and working expenses here if you want to check today’s SIP budget. These optional entries do not change the projection.';
  const reached=o.freedomMonth!==null;
  const investmentRows=o.rows.filter(row=>!row.retired),totalInvested=a.corpus+investmentRows.reduce((sum,row)=>sum+row.investment,0),totalGrowth=investmentRows.reduce((sum,row)=>sum+row.growth,0);
  const investmentPeriod=reached?'by freedom':'by age '+a.endAge;
  $('freedomOutput').innerHTML='<p class="helper"><strong>Goal: ongoing income while preserving purchasing power.</strong> This target can be higher than funding expenses only until a selected age in Survival.</p><div class="freedom-value">'+(reached?ageLabel(a,o.freedomMonth):'Not reached by age '+a.endAge)+'</div><p>'+ (reached?timeLabel(o.freedomMonth)+'. At that age, the corpus could support the monthly amount below after allowing for inflation and included future expenses.':'Your corpus does not meet the ongoing monthly-income target before the search end age under these assumptions.')+'</p>'+
   '<div class="summary">'+metric(reached?'Corpus at freedom':'Your current corpus',reached?o.atFreedom.balance:a.corpus,'Existing investments plus planned SIPs, after future costs')+metric(reached?'Corpus needed at that age':'Corpus needed to stop now',reached?o.atFreedom.required:o.requiredToday,'Includes an inflation allowance and future-expense reserve')+metric('Total invested '+investmentPeriod,totalInvested,'Starting savings '+m(a.corpus)+' + new monthly investments '+m(totalInvested-a.corpus)+'. Before future-expense withdrawals.')+metric('Investment growth / loss '+investmentPeriod,totalGrowth,'Projected return earned on starting savings and monthly investments. Excludes your contributions; future expenses reduce the remaining corpus.')+metric(reached?'Monthly amount needed after freedom':'Monthly amount you want today',reached?o.monthlyNeedAtFreedom:a.retirementExpense,reached?'First month after freedom, adjusted for inflation':'Your chosen spending in today’s money')+metric(reached?'Monthly amount the corpus could support':'Monthly support from your current corpus',reached?o.incomeAtFreedom:o.incomeNow,'After inflation, included future expenses and optional buffer')+'</div>'+
   (!o.incomePossible?'<p class="freedom-warning">Expected return must be higher than inflation to support ongoing positive monthly spending while preserving purchasing power in this model. Change the return or inflation to explore another scenario. A finite retirement drawdown is a different calculation.</p>':'')+
   (o.shortfall>1e-7?'<p class="freedom-warning">Unfunded future expenses total '+m(o.shortfall)+'. These unpaid costs disqualify later freedom dates; review the SIP, corpus or expense plan.</p>':'')+
   '<p class="helper">Monthly SIP '+m(a.monthlyInvestment)+' · Yearly step-up '+a.investmentGrowth+'% · Inflation '+a.inflation+'% · Expected annual return '+a.expectedReturn+'% · Extra savings cushion '+a.buffer+'%.</p><p class="helper">Future expenses included: <strong>'+o.includedEvents+'</strong> · Total future cost '+m(o.totalFutureExpenses)+'. Freedom and Survival keep separate expense lists. This is modelled portfolio support, not guaranteed monthly interest.</p>';
  $('freedomTarget').innerHTML='<div class="freedom-goal"><h3>Your preferred stop-work age: '+a.targetAge+'</h3><p>If contributions continue to that age: projected corpus <strong>'+m(o.target.balance)+'</strong>; required capital <strong>'+m(o.target.required)+'</strong>.</p><p>'+(!o.incomePossible?'No finite ongoing-income target at these return and inflation assumptions.':o.target.shortfall>1e-7?'Earlier unfunded commitments: '+m(o.target.shortfall)+'. Those costs must be addressed.':o.target.gap>0?'Funding gap: '+m(o.target.gap)+'. Try increasing your planned SIP or step-up, reducing future costs, or adjusting your preferred age.':'This goal age is funded in the constant-return model.')+'</p></div>';
  const lower={...a,expectedReturn:Math.max(-50,a.expectedReturn-2)},higher={...a,inflation:Math.min(30,a.inflation+1)};
  const scenarios=[['Your assumptions',o],['Lower returns',E.project(lower,events)],['Higher inflation',E.project(higher,events)]];
  $('freedomScenarios').innerHTML=scenarios.map(([title,result])=>'<div><span>'+title+'</span><strong>'+(result.freedomMonth===null?'Not reached':ageLabel(a,result.freedomMonth))+'</strong><span>'+(title==='Lower returns'?lower.expectedReturn+'% return':title==='Higher inflation'?higher.inflation+'% inflation':a.expectedReturn+'% return')+'</span></div>').join('');
  renderChart(o,a);
  $('freedomRows').innerHTML=o.years.map(row=>'<tr><th scope="row">'+row.age+'</th>'+['investment','living','event','growth','shortfall','balance'].map(key=>'<td>'+m(row[key])+'</td>').join('')+'<td>'+row.retiredMonths+'</td></tr>').join('');
 }
 function update(){
  try{
   const a=read(),events=LifeEvents.load('freedom',a.currency),o=E.project(a,events);current={a,o};
   if(editor){editor.refresh({currency:a.currency,months:o.months,inflation:a.inflation,age:a.age});editor.impact('Included future one-off costs: '+money(o.totalFutureExpenses,a.currency)+'. '+(o.outsideEvents?o.outsideEvents+' enabled expense(s) are outside the planning horizon and excluded. ':'')+'Costs before freedom are paid while working; later costs remain in the retirement target.');}
   render(o,a,events);$('freedomError').textContent='';$('freedomCsv').disabled=false;
   try{localStorage.setItem(KEY,JSON.stringify(a));$('freedomSave').textContent='Saved privately in this browser. Each calculator and currency has its own future-expense list.'+migrationMessage;}catch{$('freedomSave').textContent='Browser saving is unavailable. Keep a downloaded schedule.';}
  }catch(e){
   current=null;$('freedomError').textContent=e.message;$('freedomCsv').disabled=true;$('freedomOutput').textContent='Complete valid inputs to see your freedom estimate.';
   for(const id of ['freedomTarget','freedomScenarios','freedomChart','freedomRows','investmentScheduleHead','investmentScheduleRows'])$(id).replaceChildren();$('surplusHint').textContent='';$('investmentScheduleNote').textContent='Complete valid inputs to see the investment schedule.';$('investmentScheduleTotal').textContent='';
   if(editor)editor.impact('Correct your inputs to update the freedom estimate.');
  }
 }
 try{const saved=localStorage.getItem(KEY);if(saved){const raw=JSON.parse(saved);if(raw.expectedReturn===undefined||raw.monthlyInvestment===undefined||raw.investmentGrowth===undefined)migrationMessage=' Your saved plan now uses one expected return and an ongoing-income target. Please review the assumptions; the estimate may differ from the older drawdown calculation.';restore(E.migrate(raw));}else restore(E.defaults);}catch{restore(E.defaults);migrationMessage='';}
 $('freedomForm').addEventListener('submit',event=>{event.preventDefault();update();});$('freedomForm').addEventListener('input',event=>{
  if(event?.target?.id==='returnSlider')$('f-expectedReturn').value=$('returnSlider').value;
  if(event?.target?.id==='f-age'){
   const age=Number($('f-age').value);if(Number.isInteger(age)&&age>=18&&age<=100){if(Number($('f-endAge').value)<=age)$('f-endAge').value=age+1;if(Number($('f-targetAge').value)<age)$('f-targetAge').value=age;}
  }
  update();
 });$('f-currency').onchange=update;
 for(const id of ['freedomReset','freedomResetTop'])$(id).onclick=()=>{migrationMessage='';restore(E.defaults);update();};
 for(const [id,view] of [['investmentMonthly','monthly'],['investmentYearly','yearly']])$(id).onclick=()=>{investmentView=view;if(current)renderInvestmentSchedule(current.o,current.a);};
 $('freedomCsv').onclick=()=>{
  if(!current)return;const {a,o}=current,headers=['Month','Age at month end','Stage','Investment ('+a.currency+')','Living withdrawals','Future expenses','Return or loss','Unfunded costs','Closing corpus'];
  const rows=[headers,...o.rows.map(row=>[row.index,Number(row.age.toFixed(4)),row.retired?'After work':'Working',...['investment','living','event','growth','shortfall','balance'].map(key=>Number(row[key].toFixed(2)))])];
  const csv='\ufeff'+rows.map(row=>row.join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Financial_freedom_'+a.currency+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 editor=LifeEvents.mount($('freedomEvents'),'freedom',{currency:$('f-currency').value,months:(Number($('f-endAge').value)-Number($('f-age').value))*12,inflation:Number($('f-inflation').value),age:Number($('f-age').value)},update);
 update();
})();
