/* Corpus survival uses daily cash flows; it does not use historical market data. */
(function () {
  'use strict';
  const defaults = {corpus:10000000,age:45,swp:50000,inflation:6,returns:8,endAge:100,currency:'INR'};
  const ranges = {corpus:[0,1e12],age:[18,119],swp:[0,1e9],inflation:[0,30],returns:[-50,40],endAge:[19,120]};
  const labels = {corpus:'Current corpus',age:'Current age',swp:'Monthly SWP amount',inflation:'Annual inflation',returns:'Expected annual return',endAge:'Plan until age'};
  const get = id => document.getElementById(id);
  const screen = get('survivalScreen');
  screen.innerHTML = `
    <header class="survival-header"><div><div class="eyebrow">MAKE IT LAST / CORPUS SURVIVAL</div><h1 id="survivalTitle" tabindex="-1">How long will your money last?</h1><p class="subtitle">Your savings, your monthly needs, and the years ahead.</p></div><div class="header-actions survival-currency"><label for="s-currency">Plan currency<select id="s-currency"><option>INR</option><option>SAR</option><option>USD</option><option>AED</option><option>EUR</option><option>GBP</option></select></label><span class="currency-note">Amounts are entered directly in this currency. No conversion.</span></div></header>
    <div class="layout"><section class="panel"><div class="eyebrow">01 / YOUR STARTING POINT</div><h2 style="margin-top:8px">Set your survival plan</h2><p class="helper">Start today. Your SWP is the monthly spending you want your corpus to fund.</p><form id="survivalForm" novalidate><div class="controls">
    ${Object.keys(ranges).map(key=>`<label for="s-${key}">${labels[key]} ${key==='corpus'||key==='swp'?'(<span class="s-currency-code">INR</span>)':key==='age'||key==='endAge'?'(years)':'(%)'}<input id="s-${key}" type="number" min="${ranges[key][0]}" max="${ranges[key][1]}" step="${key==='age'||key==='endAge'?'1':'any'}" value="${defaults[key]}" inputmode="decimal"></label>`).join('')}
    </div><div id="survivalError" class="error survival-error" role="alert"></div><div class="survival-actions"><button class="primary" type="submit">Calculate survival</button><button id="survivalReset" class="ghost" type="button">Reset example</button></div></form><p class="helper">Inflation increases the SWP budget once per year. Use a return assumption after any expected taxes and costs.</p></section>
    <section class="panel result-panel survival-results" aria-labelledby="survivalResultTitle"><div class="result-top"><h2 id="survivalResultTitle">Your corpus runway</h2><span class="badge">Daily spending model</span></div><div id="survivalOutput" aria-live="polite"></div></section></div>
    <section id="survivalLifeEvents"></section>
    <section class="panel survival-chart" aria-labelledby="survivalChartTitle"><div class="section-top"><div><div class="eyebrow">02 / THE BIG PICTURE</div><h2 id="survivalChartTitle" style="margin-top:8px">Your corpus over time</h2></div><span class="badge">Future money values</span></div><div id="survivalPlot"></div></section>
    <section class="panel schedule" aria-labelledby="survivalScheduleTitle"><div class="schedule-head"><div class="section-top"><div><div class="eyebrow">03 / FOLLOW THE NUMBERS</div><h2 id="survivalScheduleTitle" style="margin-top:8px">Year-by-year breakdown</h2></div><button id="survivalExport" class="ghost" type="button">Download CSV</button></div><p class="helper" id="survivalTableNote"></p></div><div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable corpus survival schedule"><table><caption class="sr-only">Yearly corpus balances and funded withdrawals in the selected currency</caption><thead><tr><th scope="col">Age at start</th><th scope="col">Opening corpus</th><th scope="col">Monthly SWP budget</th><th scope="col">Funded withdrawals</th><th scope="col">Return / loss</th><th scope="col">Life expenses funded</th><th scope="col">Event shortfall</th><th scope="col">Closing corpus</th></tr></thead><tbody id="survivalRows"></tbody></table></div></section>
    <details class="details survival-method"><summary>Calculation method &amp; assumptions</summary><p>This is a forward projection from today, not a historical backtest. The monthly SWP budget is spread evenly across each plan month's days. Life expenses are paid at the start of the selected plan month, before daily returns and regular spending. The plan stops if the corpus is exhausted; future scheduled costs are included in the unfunded total. Amounts entered in today’s money are inflated to the event month. Each day, the remaining corpus earns the daily equivalent of your effective annual return, then that day's spending is deducted. Inflation increases the monthly budget on each anniversary of the start date. Age is assumed to change on those anniversaries because no date of birth is requested.</p><p>Daily return = (1 + annual return / 100) ^ (1 / days in the current plan year) − 1. Spending per day = current monthly budget / days in that plan month. Returns continue through the final partially funded day. Funded days include the fraction of that day's spending covered by the remaining corpus; the headline rounds down to whole days. Plan months run between monthly anniversaries of the start date, clamped to month-end when necessary, so every full plan year includes exactly twelve monthly budgets. Leap days are included. The model stops at depletion or your selected end age; a positive ending balance only means it lasts through that horizon.</p><p>Fixed returns do not model volatility or sequence-of-returns risk. Actual SWP payments taken as monthly lump sums will give different results. All balances are nominal future amounts. This model excludes other income and separate tax calculations. The result is an illustration, not a guarantee.</p><p>Inspired by the retirement stress-testing approach at <a href="https://tools.amitupadhyaya.com/retirement-corpus/" target="_blank" rel="noopener">Amit Upadhyaya's retirement corpus calculator</a>.</p></details>`;

  const {projectSurvival,requiredCorpus}=window.CorpusSurvival;
  let last=null,eventsEditor=null;
  const format = (n,code) => new Intl.NumberFormat(code==='INR'?'en-IN':'en-US',{style:'currency',currency:code,maximumFractionDigits:0}).format(n);
  function read() {
    const a={currency:get('s-currency').value};let error='';
    if(!['INR','SAR','USD','AED','EUR','GBP'].includes(a.currency))throw new Error('Choose a supported currency.');
    for(const [key,[min,max]] of Object.entries(ranges)) {
      const input=get('s-'+key),value=Number(input.value),invalid=input.value.trim()===''||!Number.isFinite(value)||value<min||value>max||((key==='age'||key==='endAge')&&!Number.isInteger(value));
      input.setAttribute('aria-invalid',String(invalid));
      if(invalid&&!error)error=labels[key]+' must be '+(key==='age'||key==='endAge'?'a whole number ':'')+'between '+min.toLocaleString()+' and '+max.toLocaleString()+'.';
      a[key]=value;
    }
    if(!error&&a.endAge<=a.age){get('s-endAge').setAttribute('aria-invalid','true');error='Plan until age must be greater than your current age.';}
    if(error)throw new Error(error);return a;
  }
  function renderChart(o,a) {
    const w=900,h=300,l=90,r=24,t=25,b=40,max=Math.max(1,...o.path.map(p=>p.balance))*1.08;
    const x=age=>l+(w-l-r)*(age-a.age)/(a.endAge-a.age),y=value=>h-b-(h-t-b)*value/max;
    let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Projected corpus by age"><title>Corpus projection from age '+a.age+' to '+a.endAge+'</title>';
    for(let i=0;i<=4;i++){const value=max*i/4,yy=y(value);svg+='<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" stroke="#24485c"/><text x="'+(l-12)+'" y="'+(yy+4)+'" text-anchor="end" fill="#b0c3cf" font-size="12">'+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value)+'</text>';}
    for(let i=0;i<=5;i++){const age=a.age+(a.endAge-a.age)*i/5;svg+='<text x="'+x(age)+'" y="'+(h-12)+'" text-anchor="middle" fill="#b0c3cf" font-size="12">'+age.toFixed(0)+'</text>';}
    const line=o.path.map((p,i)=>(i?'L':'M')+x(p.age).toFixed(2)+' '+y(p.balance).toFixed(2)).join(' ');
    svg+='<path d="'+line+' L'+x(o.age)+' '+y(0)+' L'+x(a.age)+' '+y(0)+' Z" fill="#ffce96" opacity=".07"/><path d="'+line+'" fill="none" stroke="#ffce96" stroke-width="3"/><circle cx="'+x(o.age)+'" cy="'+y(o.balance)+'" r="5" fill="#ffce96"/></svg><p class="helper">Hover, tap, or use arrow keys on the chart for full amounts. Horizontal axis: age · Vertical axis: corpus ('+a.currency+'). '+(o.depleted?'The line ends when the corpus is depleted.':'Projection ends at your selected age.')+'</p>';
    get('survivalPlot').innerHTML=svg;
    if(typeof ChartHover!=='undefined')ChartHover.attach(get('survivalPlot'),{currency:a.currency,top:t,bottom:h-b,points:o.path.map((p,i)=>({x:x(p.age),ys:[y(p.balance)],title:'Age '+p.age.toFixed(2)+(o.path[i+1]?.age===p.age?' · Before expense':o.path[i-1]?.age===p.age?' · After expense':''),rows:[['Remaining corpus',p.balance]]}))});
  }
  function update() {
    try {
      const a=read(),events=LifeEvents.load('survival',a.currency),start=new Date(),o=projectSurvival(a,start,events),without=projectSurvival(a,start,[]),needed=requiredCorpus(a,start,events),money=n=>format(n,a.currency);last={a,o};
      if(eventsEditor){eventsEditor.refresh({currency:a.currency,months:(a.endAge-a.age)*12,inflation:a.inflation,age:a.age});eventsEditor.impact('Scheduled expenses: '+money(o.expenseDue)+'. Funded: '+money(o.expensePaid)+'. Unfunded: '+money(o.expenseShortfall)+', including scheduled costs after depletion. Funded time is '+Math.max(0,Math.floor(without.days-o.days)).toLocaleString()+' days shorter within this horizon than the same plan without life expenses. Ending corpus is '+money(Math.max(0,without.balance-o.balance))+' lower.');}
      get('survivalError').textContent='';get('survivalExport').disabled=false;
      document.querySelectorAll('.s-currency-code').forEach(n=>n.textContent=a.currency);
      const depletionTiming=o.age>=a.endAge-1e-8?'at':'before';
      const dayCount=Math.floor(o.days+1e-8),elapsedYears=Math.floor(o.age-a.age+1e-8),months=Math.floor((o.age-a.age-elapsedYears)*12+1e-7);
      get('survivalOutput').innerHTML='<p class="helper"><strong>Goal: fund expenses through age '+a.endAge+'. Using the starting corpus is allowed.</strong></p><div class="result-label" style="margin-top:24px">'+(o.depleted?'ESTIMATED FUNDED TIME':'FUNDED THROUGH YOUR SELECTED HORIZON')+'</div><div class="survival-value">'+(o.depleted?'': 'At least ')+dayCount.toLocaleString()+' days</div><p class="muted">About '+elapsedYears+' years'+(months?' and '+months+' months':'')+' of spending covered.</p><div class="stats"><div class="stat"><span>'+(o.depleted?'Estimated age at depletion':'Plan end age')+'</span><strong>'+o.age.toFixed(1)+' years</strong></div><div class="stat"><span>Remaining corpus · future money</span><strong>'+money(o.balance)+'</strong></div><div class="stat"><span>Total funded withdrawals</span><strong>'+money(o.totalWithdrawn)+'</strong></div><div class="stat"><span>Investment growth / loss</span><strong>'+money(o.totalGrowth)+'</strong></div></div><p class="survival-notice">'+(o.depleted?(a.corpus===0?'There is no starting corpus to fund withdrawals.':(o.eventFailure?'A life expense cannot be fully funded. Your corpus runs out '+depletionTiming+' age ':'Your corpus runs out '+depletionTiming+' age ')+a.endAge+'. Try lowering the SWP amount or adjusting your assumptions.'):'Your corpus covers the plan through age '+a.endAge+'. This does not establish how long it will last beyond that age.')+'</p><p class="helper">Starting corpus needed for this horizon: <strong>'+money(needed)+'</strong>. '+(!o.depleted?'The remaining '+money(o.balance)+' is future money; its buying power is about <strong>'+money(o.balance/Math.pow(1+a.inflation/100,o.age-a.age))+'</strong> at today’s prices. ':'')+'Financial Freedom’s ongoing-income goal also aims to preserve purchasing power, so the targets can differ. The two calculators have separate future-expense lists.</p>';
      get('survivalRows').innerHTML=o.rows.map(row=>'<tr><th scope="row">'+row.age+'</th>'+[row.opening,row.budget,row.withdrawals,row.growth,row.expense,row.shortfall,row.balance].map(n=>'<td>'+money(n)+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="8">No funded period: the starting corpus is zero.</td></tr>';
      get('survivalTableNote').textContent='All amounts in '+a.currency+'. '+(o.depleted?'The final row may be a partially funded year. ':'')+'SWP budget rises on each plan anniversary; withdrawals show only regular spending funded. Life expenses are separate; event shortfall shows costs due in that row. Later costs after depletion appear in the unfunded summary.';
      renderChart(o,a);
      try{localStorage.setItem('corpus-survival-v1',JSON.stringify(a));}catch{}
    } catch(e) {
      last=null;if(eventsEditor)eventsEditor.impact('Correct the calculator inputs to update the expense impact.');get('survivalError').textContent=e.message;get('survivalExport').disabled=true;
      get('survivalOutput').innerHTML='<p class="survival-empty">Correct your inputs to see your corpus runway.</p>';
      get('survivalPlot').replaceChildren();get('survivalRows').replaceChildren();get('survivalTableNote').textContent='';
    }
  }
  function restore(a){for(const key of Object.keys(defaults))get('s-'+key).value=a[key]??defaults[key];}
  try{const saved=JSON.parse(localStorage.getItem('corpus-survival-v1'));restore(saved&&typeof saved==='object'?{...defaults,...saved}:defaults);}catch{restore(defaults);}
  get('survivalForm').addEventListener('submit',event=>{event.preventDefault();update();});
  get('survivalForm').addEventListener('input',update);get('s-currency').addEventListener('change',update);
  get('survivalReset').onclick=()=>{restore(defaults);update();};
  get('survivalExport').onclick=()=>{
    if(!last)return;const {a,o}=last;
    const rows=[['Age at start','Opening corpus ('+a.currency+')','Monthly SWP budget','Funded withdrawals','Return or loss','Life expenses due','Life expenses funded','Event shortfall','Closing corpus','Funded days'],...o.rows.map(r=>[r.age,r.opening,r.budget,r.withdrawals,r.growth,r.expenseDue,r.expense,r.shortfall,r.balance,r.days].map(n=>Number(n.toFixed(2))))];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='Corpus_survival_'+a.currency+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function showScreen(name,focus=false){
    if(!['home','growth','survival'].includes(name))name='home';
    for(const item of ['home','growth','survival'])get(item+'Screen').hidden=item!==name;
    get('plannerNav').hidden=name==='home';
    document.querySelectorAll('#plannerNav [aria-pressed]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.screen===name)));
    if(name==='home')document.documentElement.style.setProperty('--accent','#2bdbb0');
    if(name==='growth')document.documentElement.style.setProperty('--accent',presets[selected].color);
    if(focus){const target=name==='home'?get('welcomeTitle'):name==='survival'?get('survivalTitle'):get('growthScreen').querySelector('h1');target.setAttribute('tabindex','-1');target.focus({preventScroll:true});window.scrollTo(0,0);}
  }
  document.querySelectorAll('[data-screen]').forEach(button=>button.onclick=()=>{const name=button.dataset.screen;history.pushState(null,'',name==='home'?location.pathname+location.search:'#'+name);showScreen(name,true);});
  window.addEventListener('popstate',()=>showScreen(location.hash.slice(1),true));
  eventsEditor=LifeEvents.mount(get('survivalLifeEvents'),'survival',{currency:get('s-currency').value,months:(Number(get('s-endAge').value)-Number(get('s-age').value))*12,inflation:Number(get('s-inflation').value),age:Number(get('s-age').value)},update);
  update();showScreen(location.hash.slice(1));
})();
