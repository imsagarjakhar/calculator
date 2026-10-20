(function(){
 'use strict';
 const E=BucketPlanner,$=id=>document.getElementById(id),KEY='intimetec-bucket-preview-v1';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fieldLabels={corpus:'total retirement savings',monthly:'monthly spending',inflation:'inflation',emergency:'emergency reserve',age:'current age',endAge:'plan end age',spendingReturn:'Bucket 1 return',emergencyReturn:'Bucket 2 return',equityReturn:'Bucket 3 return',shockPercent:'market fall',shockYear:'market-fall year'};
 let events=[],current=null,view='yearly',selectedMonth=0,selectedPhase=0,playTimer=null,historyBucket=null,historyView='monthly',refillPaused=false,refillPreview=null;
 const previousLevels={};
 const money=(n,currency,digits=0)=>new Intl.NumberFormat(currency==='INR'?'en-IN':'en-US',{style:'currency',currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
 const ageAt=(a,month)=>'Age '+(a.age+Math.floor(month/12))+(month%12?' + '+month%12+' mo':'');
 const monthLabel=value=>new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z'));
 const canAnimate=()=>typeof window!=='undefined'&&window.matchMedia&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function restore(a){for(const key of Object.keys(E.defaults))$('b-'+key).value=a[key];}
 function read(){
  const a={currency:$('b-currency').value,startMonth:$('b-startMonth').value,refillMonths:Number($('b-refillMonths').value)};
  for(const [key,[min,max]] of Object.entries(E.ranges)){
   const field=$('b-'+key),value=field.value.trim()===''?NaN:Number(field.value),bad=!Number.isFinite(value)||value<min||value>max||(['age','endAge','shockYear'].includes(key)&&!Number.isInteger(value));
   field.setAttribute('aria-invalid',String(bad));if(bad)throw new Error('Enter '+fieldLabels[key]+' between '+min.toLocaleString()+' and '+max.toLocaleString()+'.');a[key]=value;
  }
  return E.validate(a);
 }
 function renderEvents(a){
  const horizon=(a.endAge-a.age)*12;
  $('bucketEvents').innerHTML=events.length?events.map((e,i)=>'<div class="bucket-event"><div><strong>'+escape(e.name)+'</strong><p class="helper">Year '+(Math.floor((e.month-1)/12)+1)+', month '+((e.month-1)%12+1)+' · '+escape(money(e.amount,a.currency))+(e.inflate?' at today’s prices':' at future prices')+' · '+(e.refill==='scheduled'?'Refill at next review':'Refill immediately')+(e.month>horizon?' · Outside this plan; excluded':'')+'</p></div><button type="button" data-remove-event="'+i+'" aria-label="Remove '+escape(e.name)+'">Remove</button></div>').join(''):'<p class="empty-events">No one-off expenses added. Your emergency reserve stays available for unexpected needs.</p>';
 }
 function bucketIllustration(kind,share,description){
  const id='bucket-'+kind,level=228-128*Math.max(0,Math.min(100,share))/100,height=share>0?250-level:0,previous=previousLevels[kind]||{level,height};
  previousLevels[kind]={level,height};
  const motion=canAnimate()?'<animate attributeName="y" from="'+previous.level.toFixed(2)+'" to="'+level.toFixed(2)+'" dur="0.65s"/><animate attributeName="height" from="'+previous.height.toFixed(2)+'" to="'+height.toFixed(2)+'" dur="0.65s"/>':'';
  const body='M38 90 Q120 113 202 90 L183 222 Q120 248 57 222 Z';
  const icons={spending:'<rect x="97" y="139" width="46" height="38" rx="6"/><path d="M97 151h46 M108 134v10 M132 134v10 M108 161h4 M120 161h4 M132 161h1 M108 168h4 M120 168h4"/>',emergency:'<path d="M120 133l25 10v18c0 17-25 28-25 28s-25-11-25-28v-18z"/><path d="M120 146v25 M108 158h24"/>',equity:'<path d="M97 180h48 M100 174l14-15 12 7 20-26 M132 140h14v14"/>'};
  return '<figure class="bucket-illustration"><svg viewBox="0 0 240 270" aria-hidden="true" focusable="false"><defs><linearGradient id="'+id+'-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".18"/><stop offset=".5" stop-color="currentColor" stop-opacity=".04"/><stop offset="1" stop-color="currentColor" stop-opacity=".24"/></linearGradient><linearGradient id="'+id+'-water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".55"/><stop offset="1" stop-color="currentColor" stop-opacity=".2"/></linearGradient><clipPath id="'+id+'-clip"><path d="'+body+'"/></clipPath></defs><ellipse cx="120" cy="247" rx="64" ry="8" fill="currentColor" opacity=".09"/><path d="M56 92C51 2 189 2 184 92" fill="none" stroke="currentColor" stroke-width="5" opacity=".65"/><path d="M61 90C58 14 182 14 179 90" fill="none" stroke="currentColor" stroke-width="1" opacity=".2"/><path d="'+body+'" fill="url(#'+id+'-body)" stroke="currentColor" stroke-width="2.5" stroke-opacity=".75"/><g clip-path="url(#'+id+'-clip)"><rect x="35" y="'+level.toFixed(2)+'" width="170" height="'+height.toFixed(2)+'" fill="url(#'+id+'-water)">'+motion+'</rect>'+(share>0?'<path d="M34 '+level.toFixed(2)+' Q78 '+(level-5).toFixed(2)+' 120 '+level.toFixed(2)+' T206 '+level.toFixed(2)+'" fill="none" stroke="currentColor" stroke-width="2" opacity=".9"/>':'')+'<path d="M55 112l15 101" stroke="white" stroke-width="7" stroke-linecap="round" opacity=".07"/></g><ellipse cx="120" cy="90" rx="83" ry="14" fill="#0b2230" stroke="currentColor" stroke-width="2.5"/><ellipse cx="120" cy="90" rx="70" ry="7" fill="currentColor" opacity=".08"/><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+icons[kind]+'</g><circle cx="49" cy="93" r="5" fill="currentColor"/><circle cx="191" cy="93" r="5" fill="currentColor"/></svg><figcaption><strong>'+share.toFixed(1)+'%</strong> '+escape(description)+'</figcaption></figure>';
 }
 function renderAllocation(a,o){
  const m=n=>money(n,a.currency),pct=n=>a.corpus>0?n/a.corpus*100:0;
  $('allocationSummary').innerHTML='<p><strong>'+escape(m(a.corpus))+'</strong> starting savings · monthly spending starts at <strong>'+escape(m(a.monthly))+'</strong></p><div class="allocation-bar" aria-hidden="true"><span style="background:var(--spending);width:'+pct(o.initial.spending)+'%"></span><span style="background:var(--emergency);width:'+pct(o.initial.emergency)+'%"></span><span style="background:var(--equity);width:'+pct(o.initial.equity)+'%"></span></div><div class="allocation-breakdown"><span>Living costs '+pct(o.initial.spending).toFixed(1)+'%</span><span>Emergency '+pct(o.initial.emergency).toFixed(1)+'%</span><span>Long term '+pct(o.initial.equity).toFixed(1)+'%</span></div>'+(o.setupGap>0.005?'<p class="allocation-warning">You need '+escape(m(o.setupGap))+' more to fully fund this starting setup. Available savings are allocated to living costs first, then emergencies.</p>':'');
  $('refillRule').textContent='Review '+(a.refillMonths===1?'monthly':a.refillMonths===12?'every year':'every '+a.refillMonths/12+' years');
  const failed=o.firstShortfall!==null;
  $('bucketOutcome').className='bucket-outcome'+(failed?' shortfall':'');
  $('bucketOutcome').innerHTML='<span class="outcome-kicker">YOUR RETIREMENT PROJECTION</span><h3>'+(failed?'First unpaid withdrawal in '+ageAt(a,o.firstShortfall-1):'Withdrawals covered through age '+a.endAge)+'</h3><p>'+(failed?'At least one living or emergency cost cannot be fully paid. Bucket 2 remains reserved for emergencies, even if living costs are short.':'All planned living and emergency withdrawals are funded within this horizon under your assumptions.')+'</p><div class="outcome-metrics"><div><span>Ending savings · future money</span><strong>'+escape(m(o.ending))+'</strong></div><div><span>Living withdrawals funded</span><strong>'+escape(m(o.totalLiving))+'</strong></div><div><span>Emergency expenses funded</span><strong>'+escape(m(o.totalEmergency))+'</strong></div><div><span>Unfunded withdrawals</span><strong>'+escape(m(o.totalUnfunded))+'</strong></div></div><p>'+(a.shockPercent>0?a.shockPercent+'% one-off equity fall in year '+a.shockYear+'. ':'')+'This covers the selected horizon only. It is a projection, not a guarantee.</p>';
 }
 function renderTable(){
  if(!current)return;const {a,o}=current,monthly=view==='monthly',rows=monthly?o.rows:o.years,m=n=>money(n,a.currency);
  $('bucketYearly').setAttribute('aria-pressed',String(!monthly));$('bucketMonthly').setAttribute('aria-pressed',String(monthly));
  $('bucketTableHead').innerHTML='<tr>'+[monthly?'Plan month':'Plan year','Age at start','Living costs paid','Emergency costs paid','Return / loss','3 → Living costs','3 → Emergency','Living bucket','Emergency bucket','Long-term bucket','Total remaining','Unfunded'].map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr>';
  $('bucketTableRows').innerHTML=rows.map(r=>'<tr><th scope="row"><button class="inspect-period" type="button" data-inspect-month="'+(monthly?r.month-1:(r.year-1)*12)+'">'+(monthly?'Month '+r.month:'Year '+r.year)+'<small>'+escape(monthLabel(monthly?r.date:E.monthKey(a.startMonth,(r.year-1)*12)))+'</small></button></th><td>'+(monthly?ageAt(a,r.month-1):r.age)+'</td>'+['living','emergencyPaid','growth','toSpending','toEmergency','spending','emergency','equity','total','unfunded'].map(key=>'<td'+(key==='unfunded'&&r[key]>.005?' class="negative"':'')+'>'+escape(m(r[key]))+'</td>').join('')+'</tr>').join('');
  $('transferRows').innerHTML=o.transfers.length?o.transfers.map(r=>'<tr><th scope="row">Month '+r.month+'</th><td>'+escape(r.reason)+'</td><td>'+escape(m(r.toSpending))+'</td><td>'+escape(m(r.toEmergency))+'</td></tr>').join(''):'<tr><td colspan="4">No transfers from Bucket 3 in this projection.</td></tr>';
 }
 function inspection(){
  const {a,o}=current,row=o.rows[selectedMonth],phase=row.phases[selectedPhase],index=phase.nextSpendIndex;
  return {a,o,row,phase,index,target:E.spendingTarget(a,index),reserve:a.emergency*Math.pow(1+a.inflation/100,Math.floor(index/12)),window:E.spendingWindow(a,index)};
 }
 function renderRefill(){
  const {a,o}=current,row=o.rows.find((r,i)=>i>=selectedMonth&&r.review),host=$('refillDiagram');
  $('refillMotion').setAttribute('aria-pressed',String(refillPaused));$('refillMotion').textContent=refillPaused?'▶ Animate':'Ⅱ Pause animation';$('refillMotion').setAttribute('aria-label',refillPaused?'Play refill animation':'Pause refill animation');
  host.dataset.paused=String(refillPaused);
  if(!row){refillPreview=null;host.replaceChildren();$('refillDate').textContent='No more scheduled reviews';$('refillVisualStatus').textContent='No further scheduled refill within this plan.';$('refillInspect').disabled=true;$('refillMotion').disabled=true;return;}
  const phaseIndex=row.phases.findIndex(p=>p.key==='review'),before=row.phases[phaseIndex-1],after=row.phases[phaseIndex],in1=after.spending-before.spending,in2=after.emergency-before.emergency,total=in1+in2,m=n=>escape(money(n,a.currency)),level=(value,target)=>Math.max(0,Math.min(1,target>0?value/target:0)),gap=Math.max(0,row.targetSpending-after.spending)+Math.max(0,row.targetEmergency-after.emergency);
  refillPreview={month:row.month-1,phase:phaseIndex};$('refillInspect').disabled=false;$('refillMotion').disabled=total<.005;
  $('refillDate').textContent=(row.month-1===selectedMonth?'This review · ':'Next review · ')+monthLabel(row.date);
  const tank=(kind,value,goal)=>'<span class="refill-tank '+kind+'" aria-hidden="true"><span style="--fill:'+level(value,goal)+';--filled:'+level(kind==='spending'?after.spending:after.emergency,goal)+'"></span><i></i></span>';
  const destination=(kind,num,title,goal,transfer)=>'<div class="refill-destination '+kind+'"><div class="refill-destination-heading"><span class="refill-number">'+num+'</span><div><strong>'+title+'</strong><small>'+(kind==='spending'?'Next 5 years':'Emergency reserve')+'</small><span class="refill-mobile-amount">'+(transfer>.005?'+ '+m(transfer)+' refill':goal-before[kind]>.005?'No funds available':'No top-up needed')+'</span></div>'+tank(kind,before[kind],goal)+'</div><div class="refill-balance"><span>'+m(before[kind])+'</span><span aria-hidden="true">→</span><strong>'+m(after[kind])+'</strong></div><div class="refill-target"><span>Target '+m(goal)+'</span><span>'+(goal-after[kind]>.005?'Still short '+m(goal-after[kind]):'✓ Target covered')+'</span></div></div>';
  host.innerHTML='<div class="refill-flow'+(total<.005?' no-transfer':'')+'"><div class="refill-source"><span class="refill-number">03</span><strong>Long-term growth</strong><div class="refill-source-icon" aria-hidden="true">↗</div><small>Available before refill</small><b>'+m(before.equity)+'</b><div class="refill-source-total">'+(total>.005?'− '+m(total)+' transferred':gap>.005?'No funds available':'No transfer needed')+'</div><small>Remaining '+m(after.equity)+'</small></div><div class="refill-routes" aria-hidden="true"><svg viewBox="0 0 100 200" preserveAspectRatio="none"><path class="refill-track" d="M0 100H38V45H100M38 100V155H100"/><path class="refill-stream spending'+(in1>.005?' active':'')+'" d="M0 100H38V45H100"/><path class="refill-stream emergency'+(in2>.005?' active':'')+'" d="M0 100H38V155H100"/></svg><span class="refill-transfer spending">'+(in1>.005?'+ '+m(in1):row.targetSpending-before.spending>.005?'No funds available':'Already covered')+'</span><span class="refill-transfer emergency">'+(in2>.005?'+ '+m(in2):row.targetEmergency-before.emergency>.005?'No funds available':'Already covered')+'</span></div><div class="refill-destinations">'+destination('spending','01','Living costs',row.targetSpending,in1)+destination('emergency','02','Emergency',row.targetEmergency,in2)+'</div></div>';
  $('refillVisualStatus').textContent=gap>.005?'Available money used · targets still short by '+money(gap,a.currency):total>.005?'✓ Targets covered · money moved, not new income':'✓ Both targets already covered · no money moved';
 }
 function historyMonth(row,key){
  const opening=row.phases[0][key],closing=row[key],incoming=key==='spending'?row.toSpending:key==='emergency'?row.toEmergency:0,outgoing=key==='equity'?row.toSpending+row.toEmergency:0,withdrawals=key==='spending'?row.living:key==='emergency'?row.emergencyPaid:0,market=key==='equity'?row.shock:0;
  const credit=row.phases.findIndex(p=>p.key==='closing'),returns=credit>0?row.phases[credit][key]-row.phases[credit-1][key]:0;
  return {opening,closing,incoming,outgoing,withdrawals,market,returns};
 }
 function renderHistory(){
  const panel=$('bucketHistory');panel.hidden=!current||!historyBucket;if(panel.hidden)return;
  const {a,o}=current,key=historyBucket,names={spending:'01 · Living costs',emergency:'02 · Emergency reserve',equity:'03 · Long-term growth'},monthly=historyView==='monthly',m=n=>escape(money(n,a.currency,2)),signed=n=>Math.abs(n)<.005?'—':(n>0?'+':'−')+m(Math.abs(n));
  $('bucketHistoryTitle').textContent='Bucket '+names[key];
  $('bucketHistoryMonthly').setAttribute('aria-pressed',String(monthly));$('bucketHistoryYearly').setAttribute('aria-pressed',String(!monthly));
  $('bucketHistoryTabs').innerHTML=Object.entries(names).map(([kind,name])=>'<button type="button" data-history-bucket="'+kind+'" aria-pressed="'+(kind===key)+'">'+escape(name)+'</button>').join('');
  const groups=monthly?o.rows.map(row=>[row]):o.years.map(year=>o.rows.slice((year.year-1)*12,year.year*12));
  $('bucketHistoryRows').innerHTML=groups.map(rows=>{
   const first=rows[0],last=rows.at(-1),values=rows.map(row=>historyMonth(row,key)),totals={opening:values[0].opening,closing:values.at(-1).closing};
   for(const field of ['incoming','outgoing','withdrawals','market','returns'])totals[field]=values.reduce((sum,value)=>sum+value[field],0);
   const selected=selectedMonth>=first.month-1&&selectedMonth<last.month;
   const events=[];for(const row of rows){const v=historyMonth(row,key),date=monthLabel(row.date);if(row.month%12===0)events.push('Year-end return · '+date);if(v.incoming+v.outgoing>.005)events.push((row.review?'Scheduled refill':'Immediate refill')+' · '+date);else if(row.review)events.push('Review · no transfer · '+date);if(key==='emergency'&&row.dueEmergency>0)events.push('Emergency expense · '+date);if(v.market)events.push('Market fall · '+date);}
   if(key==='emergency')for(const expense of o.events.filter(e=>e.month>=first.month&&e.month<=last.month))events.push(expense.name+' · '+(expense.refill==='scheduled'?'Refill at next review':'Refill immediately'));
   const unpaid=rows.reduce((sum,row)=>sum+(key==='spending'?row.dueLiving-row.living:key==='emergency'?row.dueEmergency-row.emergencyPaid:0),0);
   if(unpaid>.005)events.push('Unpaid withdrawals: '+money(unpaid,a.currency,2));
   const label=monthly?monthLabel(first.date):'Year '+first.year,range=monthly?'Plan month '+first.month:monthLabel(first.date)+' – '+monthLabel(last.date);
   return '<tr'+(selected?' class="history-selected" aria-current="true"':'')+'><th scope="row"><button class="inspect-period" type="button" data-history-month="'+(first.month-1)+'">'+escape(label)+'<small>'+escape(range)+'</small></button>'+events.map(event=>'<span class="history-event">'+escape(event)+'</span>').join('')+'</th><td>'+m(totals.opening)+'</td><td>'+signed(totals.incoming)+'</td><td>'+signed(-totals.outgoing)+'</td><td>'+signed(-totals.withdrawals)+'</td><td>'+signed(totals.market)+'</td><td class="history-return">'+signed(totals.returns)+'</td><td><strong>'+m(totals.closing)+'</strong></td></tr>';
  }).join('');
  const row=o.rows[selectedMonth];
  $('bucketHistoryStatus').textContent='Playback: '+monthLabel(row.date)+' · '+row.phases[selectedPhase].label+'. Highlighted row contains the selected month. Figures include the whole period.';
  $('bucketHistoryDetailTitle').textContent=monthLabel(row.date)+' · playback movements';
  $('bucketHistoryDetails').innerHTML=row.phases.map((phase,i)=>'<tr'+(i===selectedPhase?' class="inspected-step" aria-current="true"':'')+'><th scope="row"><button class="inspect-period" type="button" data-history-phase="'+i+'">'+escape(phase.label)+'</button></th><td>'+(i?signed(phase[key]-row.phases[i-1][key]):'—')+'</td><td>'+m(phase[key])+'</td></tr>').join('')+'<tr class="ledger-closing"><th scope="row">Closing balance</th><td>—</td><td>'+m(row[key])+'</td></tr>';
 }
 function renderExplorer(){
  if(!current)return;
  $('bucketDateError').textContent='';
  const {a,o}=current;selectedMonth=Math.max(0,Math.min(o.months-1,selectedMonth));const row=o.rows[selectedMonth];selectedPhase=Math.max(0,Math.min(row.phases.length-1,selectedPhase));
  const {phase,index,target,reserve,window}=inspection(),m=n=>money(n,a.currency),exact=n=>money(n,a.currency,2),percent=(balance,goal)=>goal>0?balance/goal*100:0;
  $('bucketDate').min=a.startMonth;$('bucketDate').max=E.monthKey(a.startMonth,o.months-1);$('bucketDate').value=row.date;
  $('bucketSlider').max=o.months-1;$('bucketSlider').value=selectedMonth;$('bucketSlider').setAttribute('aria-valuetext',monthLabel(row.date)+', plan month '+row.month);
  $('bucketTimelineLabel').textContent=monthLabel(row.date)+' · Plan month '+row.month+' of '+o.months+' · '+ageAt(a,selectedMonth);
  $('bucketStages').innerHTML=row.phases.map((p,i)=>'<button type="button" data-inspect-phase="'+i+'" aria-pressed="'+(i===selectedPhase)+'">'+(i+1)+'. '+escape(p.label)+'</button>').join('');
  $('bucketStageStatus').textContent=phase.label+'. '+(phase.missing>.005?'Unfunded at this step: '+exact(phase.missing)+'. ':'')+'Balances are projected at this step, not live investment values. Choose Next step to see the movement.';
  $('bucketPrevious').disabled=selectedMonth===0;$('bucketNext').disabled=selectedMonth===o.months-1;$('bucketStep').disabled=selectedMonth===o.months-1&&selectedPhase===row.phases.length-1;
  $('bucketNextRefill').disabled=!findNextRefill();
  const cards=[['spending','01','Living costs','Next 60 withdrawals · '+monthLabel(E.monthKey(a.startMonth,index)),phase.spending,'Hybrid funds','5-year target: '+m(target)+' · '+a.spendingReturn+'% assumed return',target,'of next 5-year target'],['emergency','02','Emergency reserve','Medical needs & unexpected costs',phase.emergency,'Bonds / hybrid funds','Inflation-adjusted target: '+m(reserve)+' · '+a.emergencyReturn+'% assumed return',reserve,'of emergency target'],['equity','03','Long-term growth','Refills the other buckets',phase.equity,'Equity funds',a.equityReturn+'% assumed return · balances change when refilling',o.initial.equity,'of starting long-term amount']];
  $('bucketCards').innerHTML=cards.map(([kind,bucket,title,role,amount,type,caption,goal,description])=>'<article class="bucket-card '+kind+'"><div class="bucket-index"><span>BUCKET '+bucket+'</span><button class="bucket-view" type="button" data-history-open="'+kind+'" aria-controls="bucketHistory" aria-expanded="'+(historyBucket===kind)+'" aria-label="View Bucket '+bucket+' transaction history"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span></button></div><h3>'+title+'</h3><p class="bucket-role">'+escape(role)+'</p><p class="bucket-value">'+escape(m(amount))+'</p>'+bucketIllustration(kind,percent(amount,goal),description)+'<p class="bucket-caption">'+escape(caption)+'</p><span class="fund-type">'+type+'</span>'+(kind==='emergency'?'<button class="extra-withdrawal-button" type="button" data-extra-withdrawal="true" aria-controls="extraWithdrawalPanel" aria-expanded="'+!$('extraWithdrawalPanel').hidden+'">＋ Extra withdrawal</button>':'')+'</article>').join('');
  $('rollingSummary').innerHTML=[['Next 5-year cost',target],['Living bucket at this step',phase.spending],['Top-up needed',Math.max(0,target-phase.spending)]].map(([label,value])=>'<div><span>'+label+'</span><strong>'+escape(exact(value))+'</strong></div>').join('');
  $('rollingWindow').textContent='Next 60 withdrawals: '+monthLabel(E.monthKey(a.startMonth,index))+' to '+monthLabel(E.monthKey(a.startMonth,index+59))+'. Next monthly budget: '+exact(E.spendingAt(a,index))+'. At plan start the five-year target was '+exact(o.target1)+'. This target moves forward after a withdrawal; it is not refilled automatically at every step.';
  $('fiveYearRows').innerHTML=window.map(r=>'<tr><th scope="row">'+escape(monthLabel(E.monthKey(a.startMonth,r.from))+' – '+monthLabel(E.monthKey(a.startMonth,r.to)))+'</th><td>'+r.months+'</td><td>'+escape(exact(r.monthly))+'</td><td>'+escape(exact(r.total))+'</td></tr>').join('');
  $('fiveYearTotal').innerHTML='<tr><th scope="row">Full rolling reserve</th><td>60 months</td><td>Inflation adjusted</td><td>'+escape(exact(target))+'</td></tr>';
  const signed=n=>Math.abs(n)<.005?'—':(n>0?'+':'−')+exact(Math.abs(n));
  $('bucketMonthLedger').innerHTML=row.phases.map((p,i)=>{const prev=row.phases[i-1],balance=i===0,cells=['spending','emergency','equity','total'].map(k=>balance?exact(p[k]):signed(p[k]-prev[k]));return '<tr'+(i===selectedPhase?' class="inspected-step"':'')+'><th scope="row">'+escape(p.label)+(p.missing>.005?' · unpaid '+escape(exact(p.missing)):'')+'</th>'+cells.map(value=>'<td>'+escape(value)+'</td>').join('')+'</tr>';}).join('')+'<tr class="ledger-closing"><th scope="row">Closing balances</th>'+['spending','emergency','equity','total'].map(k=>'<td>'+escape(exact(row[k]))+'</td>').join('')+'</tr>';
  renderHistory();renderRefill();
 }
 function findNextRefill(){
  if(!current)return null;
  for(let m=selectedMonth;m<current.o.months;m++){
   const row=current.o.rows[m];for(let p=m===selectedMonth?selectedPhase+1:1;p<row.phases.length;p++){
    const phase=row.phases[p],prev=row.phases[p-1];if(['review','spendingTopup','emergencyTopup','emergencyRefill'].includes(phase.key)&&(phase.spending>prev.spending+.005||phase.emergency>prev.emergency+.005))return {month:m,phase:p};
   }
  }return null;
 }
 function pausePlayback(){if(playTimer!==null){clearTimeout(playTimer);playTimer=null;}$('bucketPlay').textContent='▶ Play';$('bucketPlay').setAttribute('aria-pressed','false');}
 function advance(){
  if(!current)return false;const phases=current.o.rows[selectedMonth].phases;
  if(selectedPhase<phases.length-1)selectedPhase++;else if(selectedMonth<current.o.months-1){selectedMonth++;selectedPhase=0;}else return false;
  renderExplorer();return true;
 }
 function play(){
  if(!current)return;if(playTimer!==null){pausePlayback();return;}
  if($('bucketStep').disabled){selectedMonth=0;selectedPhase=0;renderExplorer();}
  $('bucketPlay').textContent='Ⅱ Pause';$('bucketPlay').setAttribute('aria-pressed','true');
  const tick=()=>{if(!advance()){pausePlayback();return;}playTimer=setTimeout(tick,1400);};playTimer=setTimeout(tick,900);
 }
 function selectMonth(index){pausePlayback();if(!current)return;selectedMonth=index;selectedPhase=0;renderExplorer();}
 function renderChart(a,o){
  const w=1100,h=310,l=95,r=25,t=25,b=40,max=Math.max(1,...o.path.map(p=>p.total))*1.07,x=n=>l+(w-l-r)*n/o.months,y=n=>h-b-(h-t-b)*n/max;
  let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Stacked balances of all three retirement buckets"><title>Three bucket balances through age '+a.endAge+'</title>';
  for(let i=0;i<=4;i++){const n=max*i/4;svg+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+y(n)+'" y2="'+y(n)+'" stroke="#24485c"/><text x="'+(l-12)+'" y="'+(y(n)+4)+'" fill="#b0c3cf" font-size="12" text-anchor="end">'+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(n)+'</text>';}
  for(let i=0;i<=5;i++){const n=o.months*i/5;svg+='<text x="'+x(n)+'" y="'+(h-10)+'" fill="#b0c3cf" font-size="12" text-anchor="middle">Age '+(a.age+n/12).toFixed(0)+'</text>';}
  const edges=[p=>0,p=>p.spending,p=>p.spending+p.emergency,p=>p.total],colors=['#55ddc3','#ffc68c','#b6a1ff'];
  for(let layer=0;layer<3;layer++){const upper=o.path.map((p,i)=>(i?'L':'M')+x(p.month).toFixed(2)+' '+y(edges[layer+1](p)).toFixed(2)).join(' '),lower=o.path.slice().reverse().map(p=>'L'+x(p.month).toFixed(2)+' '+y(edges[layer](p)).toFixed(2)).join(' ');svg+='<path d="'+upper+' '+lower+' Z" fill="'+colors[layer]+'" fill-opacity=".18"/><path d="'+upper+'" fill="none" stroke="'+colors[layer]+'" stroke-width="2"/>';}
  svg+='</svg>';$('bucketChart').innerHTML=svg;
  if(typeof ChartHover!=='undefined')ChartHover.attach($('bucketChart'),{currency:a.currency,top:t,bottom:h-b,points:o.path.map(p=>({x:x(p.month),ys:[y(p.spending),y(p.spending+p.emergency),y(p.total)],title:ageAt(a,p.month)+' · '+(p.month?'End of month '+p.month:'Starting allocation'),rows:[['Bucket 1 · Living costs',p.spending],['Bucket 2 · Emergency',p.emergency],['Bucket 3 · Long term',p.equity],['Total savings',p.total]]}))});
 }
 function update(){
  pausePlayback();selectedPhase=0;
  try{
   const a=read(),o=E.project(a,events);current={a,o};events=o.events;
   for(const n of document.querySelectorAll('.b-code'))n.textContent=a.currency;
   renderEvents(a);renderAllocation(a,o);renderExplorer();renderChart(a,o);renderTable();$('bucketError').textContent='';$('bucketReport').disabled=false;for(const id of ['bucketDate','bucketSlider','bucketPlay'])$(id).disabled=false;
   try{localStorage.setItem(KEY,JSON.stringify({version:1,settings:a,events}));$('bucketSave').textContent='Saved privately · Separate from all other planners';}catch{$('bucketSave').textContent='Browser saving unavailable. Download a report to keep this plan.';}
  }catch(e){
   current=null;refillPreview=null;$('refillDiagram').replaceChildren();$('refillDate').textContent='';$('refillVisualStatus').textContent='';$('refillInspect').disabled=true;$('refillMotion').disabled=true;renderHistory();$('bucketError').textContent=e.message;$('bucketReport').disabled=true;$('bucketSave').textContent='Correct the inputs to update your plan.';
   for(const id of ['allocationSummary','bucketCards','bucketOutcome','bucketChart','bucketTableHead','bucketTableRows','transferRows','fiveYearRows','fiveYearTotal','rollingSummary','bucketMonthLedger','bucketStages'])$(id).replaceChildren();$('refillRule').textContent='Complete valid inputs to see refill rules.';$('rollingWindow').textContent='';$('bucketStageStatus').textContent='';for(const id of ['bucketDate','bucketSlider','bucketPrevious','bucketNext','bucketPlay','bucketStep','bucketNextRefill'])$(id).disabled=true;
  }
 }
 function downloadReport(){
  if(!current)return;try{
   const {a,o}=current,m=n=>money(n,a.currency,2),inputValues={'Plan currency':a.currency,'Withdrawal start month':monthLabel(a.startMonth),'Inspected calendar month':monthLabel(o.rows[selectedMonth].date),'Inspected step':o.rows[selectedMonth].phases[selectedPhase].label,'Starting retirement savings':m(a.corpus),'Starting monthly spending':m(a.monthly),'Current age':a.age,'Plan until age':a.endAge,'Annual inflation':a.inflation+'%','Emergency reserve':m(a.emergency),'Bucket 1 annual return':a.spendingReturn+'%','Bucket 2 annual return':a.emergencyReturn+'%','Bucket 3 annual return':a.equityReturn+'%','Scheduled refill interval':a.refillMonths+' months','One-off equity fall':a.shockPercent+'%','Equity fall in plan year':a.shockYear};
   const sections=[{title:'Starting bucket allocation',headers:['Bucket','Starting amount','Purpose'],rows:[['1 · Hybrid funds',m(o.initial.spending),'Next 60 months of inflation-adjusted spending'],['2 · Bonds / hybrid funds',m(o.initial.emergency),'Emergency reserve'],['3 · Equity',m(o.initial.equity),'Long-term growth and refills']]},{title:'First five years of spending',headers:['Plan year','Monthly spending','Annual cost'],rows:o.firstFiveYears.map(r=>[r.year,m(r.monthly),m(r.annual)])},{title:'Saved emergency expenses',headers:['Name','Plan month','Entered amount','Price basis','Refill reserve','Status'],rows:events.map(e=>[e.name,e.month,m(e.amount),e.inflate?'Today’s prices':'Future prices',e.refill==='scheduled'?'At next scheduled review':'Immediately',e.month>o.months?'Outside horizon':'Included'])}];
   const inspected=inspection(),selectedRow=inspected.row;
   sections.unshift({title:'Inspected month and step',headers:['Setting','Value'],rows:[['Calendar month',monthLabel(selectedRow.date)],['Selected step',inspected.phase.label],['Living bucket balance',m(inspected.phase.spending)],['Emergency bucket balance',m(inspected.phase.emergency)],['Long-term bucket balance',m(inspected.phase.equity)],['Next 60-month spending target',m(inspected.target)],['Top-up needed',m(Math.max(0,inspected.target-inspected.phase.spending))],['Reserve window',monthLabel(E.monthKey(a.startMonth,inspected.index))+' to '+monthLabel(E.monthKey(a.startMonth,inspected.index+59))]]},{title:'Rolling five-year spending window',headers:['From','Through','Months','Monthly spending','Period cost'],rows:inspected.window.map(r=>[monthLabel(E.monthKey(a.startMonth,r.from)),monthLabel(E.monthKey(a.startMonth,r.to)),r.months,m(r.monthly),m(r.total)])},{title:'Steps in the inspected month',headers:['Step','Living balance','Emergency balance','Long-term balance','Combined balance','Unfunded at step'],rows:selectedRow.phases.map(p=>[p.label,m(p.spending),m(p.emergency),m(p.equity),m(p.total),m(p.missing)])});
   const headers=['Period','Calendar month','Age','Living costs paid','Emergency costs paid','Return / loss','3 → Living','3 → Emergency','Living bucket','Emergency bucket','Long-term bucket','Total remaining','Unfunded'];
   for(const [title,rows,monthly] of [['Year-by-year plan',o.years,false],['Complete monthly schedule',o.rows,true]])sections.push({title,headers,rows:rows.map(r=>[monthly?'Month '+r.month:'Year '+r.year,monthLabel(monthly?r.date:E.monthKey(a.startMonth,(r.year-1)*12)),monthly?ageAt(a,r.month-1):r.age,...['living','emergencyPaid','growth','toSpending','toEmergency','spending','emergency','equity','total','unfunded'].map(k=>m(r[k]))])});
   sections.push({title:'Transfers from Bucket 3',headers:['Plan month','Reason','To living costs','To emergency'],rows:o.transfers.map(r=>[r.month,r.reason,m(r.toSpending),m(r.toEmergency)])});
   const html=CalculatorReport.build({kind:'buckets',title:'Three-bucket retirement report',currency:a.currency,inputs:inputValues,snapshot:{inputs:a,events,inspection:{month:selectedMonth,date:selectedRow.date,phase:inspected.phase.key,nextSpendingIndex:inspected.index},results:o},metrics:[['Starting savings',m(a.corpus)],['Starting setup shortfall',m(o.setupGap)],['First unfunded withdrawal',o.firstShortfall===null?'None through age '+a.endAge:ageAt(a,o.firstShortfall-1)],['Ending savings',m(o.ending)],['Living withdrawals funded',m(o.totalLiving)],['Emergency costs funded',m(o.totalEmergency)],['Investment growth / loss',m(o.totalGrowth)],['Unfunded withdrawals',m(o.totalUnfunded)]],points:o.path.map(p=>[p.age,p.total]),xLabel:'Age',sections,notes:['Standalone preview. No income or new investment contributions are added. Bucket 1 holds five years of undiscounted, inflation-adjusted spending; Bucket 2 is an emergency reserve; Bucket 3 holds the remainder. Fund categories are model labels, not recommendations.', 'Monthly order: equity shock, scheduled review/refills, emergency and living withdrawals, optional replenishment of a used emergency reserve, then return accrual. Each expense can refill immediately or wait for the next scheduled review. Deferred withdrawals remain deducted until a review; immediate withdrawals in the meantime do not restore those deferred amounts. Returns are credited only at the end of every 12 plan months from the withdrawal start month. Transfers are limited to Bucket 3 and cannot create money. Bucket 2 does not pay regular living costs.', 'Scheduled refills top up the next 60 months of spending and the inflation-adjusted emergency target. If a withdrawal cannot be covered, an immediate refill is attempted. Planned emergency expenses at today’s prices inflate to their event month. Outside-horizon expenses are preserved but excluded.', 'The selected month and step are preserved in this report. The five-year reserve means the next 60 unpaid living withdrawals at that step, including future inflation increases; its window can extend beyond the projection horizon.', 'Spending and the emergency reserve target step up with inflation annually. Returns are credited at the end of every 12 plan months, measured from your withdrawal start month. Each bucket uses its average of the 12 monthly balances after withdrawals and transfers. Uncredited returns cannot be spent and do not compound within the year. Negative returns are limited to the available bucket balance at year end. The market-fall scenario applies once before transfers in its selected year. Returns can be negative. A positive ending balance only funds the selected horizon.']});
   CalculatorReport.download(html,'buckets',a.currency);$('bucketSave').textContent='Report downloaded. Open it offline or use Print → Save as PDF.';
  }catch(e){$('bucketError').textContent='Report could not be created. '+e.message;}
 }
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&saved.version===1){const a=E.validate(saved.settings);events=E.validateEvents(saved.events,(a.endAge-a.age)*12);restore(a);}else restore(E.defaults);}catch{events=[];restore(E.defaults);}
 $('bucketForm').addEventListener('input',update);$('bucketForm').addEventListener('change',update);$('bucketForm').addEventListener('submit',e=>{e.preventDefault();update();});$('b-currency').onchange=update;
 $('bucketReset').onclick=()=>{events=[];selectedMonth=0;selectedPhase=0;restore(E.defaults);$('emergencyForm').reset();$('eventRefill').value='immediate';$('extraWithdrawalPanel').hidden=true;$('extraReason').value='';$('extraAmount').value='';$('extraDate').value='';$('extraRefill').value='scheduled';$('extraWithdrawalError').textContent='';$('extraWithdrawalSaved').textContent='';$('eventError').textContent='';update();};
 $('bucketPrevious').onclick=()=>selectMonth(selectedMonth-1);$('bucketNext').onclick=()=>selectMonth(selectedMonth+1);$('bucketSlider').oninput=()=>selectMonth(Number($('bucketSlider').value));
 $('bucketStep').onclick=()=>{pausePlayback();advance();};$('bucketPlay').onclick=play;
 $('refillMotion').onclick=()=>{refillPaused=!refillPaused;const host=$('refillDiagram');host.dataset.paused=String(refillPaused);$('refillMotion').setAttribute('aria-pressed',String(refillPaused));$('refillMotion').textContent=refillPaused?'▶ Animate':'Ⅱ Pause animation';$('refillMotion').setAttribute('aria-label',refillPaused?'Play refill animation':'Pause refill animation');};
 $('refillInspect').onclick=()=>{if(current&&refillPreview){pausePlayback();selectedMonth=refillPreview.month;selectedPhase=refillPreview.phase;renderExplorer();$('bucketNavigator').scrollIntoView?.({block:'start',behavior:canAnimate()?'smooth':'auto'});}};
 $('bucketNextRefill').onclick=()=>{pausePlayback();const next=findNextRefill();if(next){selectedMonth=next.month;selectedPhase=next.phase;renderExplorer();}};
 $('bucketDate').onchange=()=>{pausePlayback();if(!current)return;const date=$('bucketDate').value,index=E.monthIndex(date)-E.monthIndex(current.a.startMonth);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(date)||index<0||index>=current.o.months){$('bucketDateError').textContent='Choose a month from '+monthLabel(current.a.startMonth)+' to '+monthLabel(E.monthKey(current.a.startMonth,current.o.months-1))+'.';$('bucketDate').value=E.monthKey(current.a.startMonth,selectedMonth);return;}$('bucketDateError').textContent='';selectMonth(index);};
 $('bucketStages').addEventListener('click',e=>{const button=e.target.closest('[data-inspect-phase]');if(button&&current){pausePlayback();selectedPhase=Number(button.dataset.inspectPhase);renderExplorer();}});
 $('bucketCards').addEventListener('click',e=>{
  const extra=e.target.closest('[data-extra-withdrawal]');
  if(extra?.dataset.extraWithdrawal&&current){pausePlayback();$('extraWithdrawalPanel').hidden=false;$('extraDate').min=current.a.startMonth;$('extraDate').max=E.monthKey(current.a.startMonth,current.o.months-1);$('extraDate').value=current.o.rows[selectedMonth].date;$('extraRefill').value='scheduled';$('extraWithdrawalError').textContent='';$('extraWithdrawalSaved').textContent='';renderExplorer();$('extraWithdrawalPanel').scrollIntoView?.({block:'nearest',behavior:canAnimate()?'smooth':'auto'});$('extraReason').focus?.();return;}
  const button=e.target.closest('[data-history-open]');if(button&&current){pausePlayback();historyBucket=button.dataset.historyOpen;renderExplorer();$('bucketHistory').scrollIntoView?.({block:'nearest',behavior:canAnimate()?'smooth':'auto'});}
 });
 $('extraWithdrawalClose').onclick=()=>{$('extraWithdrawalPanel').hidden=true;if(current)renderExplorer();};
 $('extraWithdrawalForm').addEventListener('submit',e=>{
  e.preventDefault();try{
   const a=read(),date=$('extraDate').value,offset=E.monthIndex(date)-E.monthIndex(a.startMonth),horizon=(a.endAge-a.age)*12;
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(date)||!Number.isInteger(offset)||offset<0||offset>=horizon)throw new Error('Choose a withdrawal month within your plan.');
   const entry={id:'extra_'+Date.now()+'_'+events.length,name:$('extraReason').value.trim(),amount:Number($('extraAmount').value),month:offset+1,inflate:false,refill:$('extraRefill').value};
   events=E.validateEvents([...events,entry],horizon);selectedMonth=offset;historyBucket='emergency';historyView='monthly';update();
   if(!current)return;
   selectedPhase=current.o.rows[offset].phases.findIndex(p=>p.key==='emergencyWithdrawal');renderExplorer();
   $('extraWithdrawalError').textContent='';$('extraWithdrawalSaved').textContent='Added '+money(entry.amount,a.currency)+' · '+monthLabel(date)+'. Recorded in Bucket 2 history. You can remove it from the one-off expenses list.';$('extraReason').value='';$('extraAmount').value='';
  }catch(error){$('extraWithdrawalError').textContent=error.message;$('extraWithdrawalSaved').textContent='';}
 });
 $('bucketHistoryClose').onclick=()=>{historyBucket=null;renderExplorer();};
 $('bucketHistoryTabs').addEventListener('click',e=>{const button=e.target.closest('[data-history-bucket]');if(button&&current){historyBucket=button.dataset.historyBucket;renderExplorer();}});
 $('bucketHistoryMonthly').onclick=()=>{historyView='monthly';renderHistory();};
 $('bucketHistoryYearly').onclick=()=>{historyView='yearly';renderHistory();};
 $('bucketHistoryRows').addEventListener('click',e=>{const button=e.target.closest('[data-history-month]');if(button&&current)selectMonth(Number(button.dataset.historyMonth));});
 $('bucketHistoryDetails').addEventListener('click',e=>{const button=e.target.closest('[data-history-phase]');if(button&&current){pausePlayback();selectedPhase=Number(button.dataset.historyPhase);renderExplorer();}});
 $('bucketTableRows').addEventListener('click',e=>{const button=e.target.closest('[data-inspect-month]');if(button){selectMonth(Number(button.dataset.inspectMonth));$('bucketNavigator').scrollIntoView({block:'start',behavior:canAnimate()?'smooth':'auto'});}});
 if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if(document.hidden)pausePlayback();});
 if(typeof window!=='undefined')window.addEventListener('pagehide',pausePlayback);
 $('bucketYearly').onclick=()=>{view='yearly';renderTable();};$('bucketMonthly').onclick=()=>{view='monthly';renderTable();};$('bucketReport').onclick=downloadReport;
 $('emergencyForm').addEventListener('submit',e=>{
  e.preventDefault();try{
   const a=read(),year=Number($('eventYear').value),month=Number($('eventMonth').value),amount=Number($('eventAmount').value),name=$('eventName').value.trim();
   if(!Number.isInteger(year)||year<1||year>a.endAge-a.age||!Number.isInteger(month)||month<1||month>12)throw new Error('Choose a whole plan year within your horizon and month 1–12.');
   const entry={id:'event_'+Date.now()+'_'+events.length,name,amount,month:(year-1)*12+month,inflate:$('eventBasis').value==='today',refill:$('eventRefill').value||'immediate'};
   const candidate=E.validateEvents([...events,entry],(a.endAge-a.age)*12);events=candidate;$('eventName').value='';$('eventAmount').value='';$('eventError').textContent='';update();
  }catch(error){$('eventError').textContent=error.message;}
 });
 $('bucketEvents').addEventListener('click',e=>{const button=e.target.closest('[data-remove-event]');if(button){const index=Number(button.dataset.removeEvent);if(Number.isInteger(index)&&index>=0&&index<events.length){events.splice(index,1);update();}}});
 CalculatorReport.bindImport({button:$('bucketImport'),input:$('bucketImportFile'),status:$('bucketImportStatus'),kind:'buckets',restore(saved){
  const a=E.validate(saved.inputs),clean=E.validateEvents(saved.events,(a.endAge-a.age)*12),projection=E.project(a,clean);
  pausePlayback();events=clean;restore(a);historyBucket=null;$('extraWithdrawalPanel').hidden=true;
  selectedMonth=Number.isInteger(saved.inspection?.month)&&saved.inspection.month>=0&&saved.inspection.month<projection.months?saved.inspection.month:0;
  update();selectedPhase=Math.max(0,projection.rows[selectedMonth].phases.findIndex(p=>p.key===saved.inspection?.phase));renderExplorer();
 }});
 update();
})();
