(function(){
 'use strict';
 const E=CustomPlan,$=id=>document.getElementById(id),KEY='intimetec-custom-plan-v1';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let plan=E.createPlan(),result,assetEdit=null,loanEdit=null,flowEdit=null,transactionEdit=null,pending=null,year=0,selected=plan.startMonth,storage=true,importVersion=0;
 const uid=prefix=>prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
 const money=value=>new Intl.NumberFormat(plan.currency==='INR'?'en-IN':'en-US',{style:'currency',currency:plan.currency,maximumFractionDigits:0}).format(value);
 const label=month=>new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
 const changeFor=(candidate,month)=>{let entry=candidate.overrides.find(o=>o.month===month);if(!entry){entry={month,sip:null,note:'',flows:[]};candidate.overrides.push(entry);}return entry;};
 const clone=()=>JSON.parse(E.exportPlan(plan));
 function error(message){$('error').textContent=message;$('error').hidden=!message;}
 function save(){try{localStorage.setItem(KEY,E.exportPlan(plan));storage=true;}catch{storage=false;}$('saveState').textContent=storage?'Saved in this browser':'Browser saving unavailable — save a plan file';}
 function apply(candidate,message='Plan updated.',keepSettings=false){
  try{const clean=E.validate(candidate),projection=E.project(clean);plan=clean;result=projection;save();error('');render(!keepSettings);$('status').textContent=message;return true;}catch(e){error('Change not applied. '+e.message);return false;}
 }
 function options(select,items,value){select.replaceChildren();for(const item of items)select.add(new Option(item.name,item.id));if(items.some(i=>i.id===value))select.value=value;}
 function resetAsset(){assetEdit=null;$('assetForm').reset();$('assetSubmit').textContent='Add asset';$('assetCancel').hidden=true;}
 function resetLoan(){loanEdit=null;$('loanForm').reset();$('loanMode').value='original';$('loanYears').value='0';$('loanExtraMonths').value='0';const now=new Date();$('loanCurrentDate').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');$('loanSubmit').textContent='Add loan';$('loanCancel').hidden=true;setLoanMode();}
 function resetFlow(){flowEdit=null;$('flowForm').reset();$('flowSubmit').textContent='Add cash flow';$('flowCancel').hidden=true;renderFlowTargets();}
 function resetTransaction(clearAccount=false){
  transactionEdit=null;$('transactionAmount').value='';$('transactionNote').value='';$('transactionSubmit').textContent='Add transaction';$('transactionCancel').hidden=true;$('transactionError').textContent='';
  if(clearAccount){$('transactionAsset').value='';$('transactionDate').value=plan.startMonth+'-01';$('transactionNewCategory').value='Other';$('transactionNewReturn').value='0';$('transactionMonthFilter').value='';$('transactionAssetFilter').value='all';}
  syncTransactionAccount();
 }
 function transactionRows(){const month=$('transactionMonthFilter').value,asset=$('transactionAssetFilter').value;return plan.transactions.filter(t=>(!month||t.date.slice(0,7)===month)&&(!asset||asset==='all'||t.assetId===asset)).slice().sort((a,b)=>b.date.localeCompare(a.date));}
 function transactionAccountMatches(){const name=$('transactionAsset').value.trim().toLowerCase();return plan.assets.filter(a=>a.name.toLowerCase()===name||(a.name+' · '+a.type).toLowerCase()===name);}
 function syncTransactionAccount(){
  const matches=transactionAccountMatches(),isNew=$('transactionAsset').value.trim()!==''&&matches.length===0;
  $('transactionNewFields').hidden=!isNew;$('transactionNewCategory').required=isNew;$('transactionNewReturn').required=isNew;
  $('transactionAccountHint').textContent=matches.length===1?'Using existing account: '+matches[0].name+' · '+matches[0].type+'.':matches.length>1?'Several accounts match. Use distinct account names in Assets & investment accounts.':isNew?'New investment: an account will be created when you save this transaction.':'Type where you invested. An existing name reuses that account; a new name creates one.';
 }
 function renderTransactions(){
  const transactionMoney=value=>new Intl.NumberFormat(plan.currency==='INR'?'en-IN':'en-US',{style:'currency',currency:plan.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const filter=$('transactionAssetFilter').value;
  if($('transactionNewReturn').value==='')$('transactionNewReturn').value='0';
  if($('transactionNewCategory').value==='')$('transactionNewCategory').value='Other';
  syncTransactionAccount();
  options($('transactionAssetFilter'),[{id:'all',name:'All accounts'},...plan.assets],filter||'all');
  if(!$('transactionDate').value)$('transactionDate').value=plan.startMonth+'-01';
  const rows=transactionRows(),start=E.monthNumber(plan.startMonth),inside=t=>{const m=E.monthNumber(t.date.slice(0,7));return m>=start&&m<start+plan.months;},categories=new Map();
  for(const t of rows){const category=plan.assets.find(a=>a.id===t.assetId).type;categories.set(category,(categories.get(category)||0)+t.amount);}
  $('transactionTotals').textContent=rows.length+' transaction'+(rows.length===1?'':'s')+' · Recorded '+transactionMoney(rows.reduce((sum,t)=>sum+t.amount,0))+' · Included in this plan '+transactionMoney(rows.filter(inside).reduce((sum,t)=>sum+t.amount,0));
  $('transactionCategories').innerHTML=[...categories].map(([category,amount])=>'<span>'+escape(category)+' <strong>'+escape(transactionMoney(amount))+'</strong></span>').join('');
  $('transactionRows').innerHTML=rows.map(t=>{const asset=plan.assets.find(a=>a.id===t.assetId);return '<tr><th scope="row">'+escape(t.date)+'</th><td>'+escape(asset.name)+'</td><td>'+escape(asset.type)+'</td><td>'+escape(transactionMoney(t.amount))+'</td><td class="transaction-note">'+escape(t.note)+'</td><td>'+ (inside(t)?'Recorded · replaces forecast':'Outside plan · kept in history')+'</td><td>'+buttons('transaction',t.id)+'</td></tr>';}).join('')||'<tr><td colspan="7">No transactions in this view. Add an entry for each investment you made.</td></tr>';
  
 }
 function renderSettings(){
  for(const [id,key] of Object.entries({planName:'name',currency:'currency',startMonth:'startMonth',targetToday:'targetToday',defaultSip:'monthlySip',stepup:'annualStepup',inflation:'inflation'}))$(id).value=plan[key];
  $('endMonth').value=E.monthKey(E.monthNumber(plan.startMonth)+plan.months-1);
  updateEndMonth();
  options($('sipTarget'),plan.assets,plan.sipAssetId);
  baselineStatus(true);
 }
 function baselineStatus(valid){
  $('settingsUpdateStatus').textContent=valid?'Calculations update automatically. Valid changes are saved in this browser.':'Complete valid starting-plan inputs to update results. The figures below show your last saved plan.';
  for(const id of ['exportPlan','exportReport','exportCsv'])$(id).disabled=!valid;
 }
 function readSettings(){
  for(const [id,name] of [['targetToday','Target amount in today’s value'],['defaultSip','Default monthly SIP'],['stepup','Annual SIP step-up'],['inflation','Expense inflation']])if($(id).value.trim()==='')throw new Error('Enter '+name+'.');
  const p=clone();Object.assign(p,{name:$('planName').value,currency:$('currency').value,startMonth:$('startMonth').value,months:selectedDuration(),targetToday:Number($('targetToday').value),monthlySip:Number($('defaultSip').value),annualStepup:Number($('stepup').value),inflation:Number($('inflation').value),sipAssetId:$('sipTarget').value});return E.validate(p);
 }
 function updateSettings(){
  try{
   const p=readSettings();
   baselineStatus(apply(p,'Starting plan updated. Existing monthly overrides stay on their calendar dates.',true));
  }catch(e){baselineStatus(false);error('Change not applied. '+e.message);}
 }
 function selectedDuration(){
  const months=E.monthNumber($('endMonth').value)-E.monthNumber($('startMonth').value)+1;
  if(months<1)throw new Error('End month must be on or after the starting month.');
  if(months>720)throw new Error('Choose an end month within 60 years (720 months) of the starting month.');
  return months;
 }
 function updateEndMonth(){
  try{
   const start=E.monthNumber($('startMonth').value);
   $('endMonth').min=$('startMonth').value;
   $('endMonth').max=E.monthKey(start+719);
   const months=selectedDuration();
   $('durationHint').textContent=months+' month'+(months===1?'':'s')+' · includes the end month';
  }catch(e){$('durationHint').textContent=e.message;}
  
 }
 $('startMonth').oninput=updateEndMonth;
 $('endMonth').oninput=updateEndMonth;
 function renderSummary(){
  const cards=CustomReport.summaryCards(plan,result,money);
  const target=plan.targetToday*(1+plan.inflation/100)**(plan.months/12);
  $('targetFutureHint').textContent=plan.targetToday>0?'In '+label(plan.startMonth)+' prices → '+money(target)+' needed by '+label(E.monthKey(E.monthNumber(plan.startMonth)+plan.months-1))+'.':'0 means no target comparison.';
  $('summary').innerHTML=cards.map((card,i)=>'<article class="metric '+(i===0?'featured':'')+'" data-metric="'+card.key+'"><span>'+escape(card.label)+'</span><strong'+(card.negative?' class="negative"':'')+'>'+escape(card.value)+'</strong>'+(card.details?'<dl class="metric-breakdown" tabindex="0" aria-label="'+escape(card.label)+' breakdown">'+card.details.map(detail=>'<div><dt>'+escape(detail.label)+'</dt><dd>'+escape(detail.value)+'</dd></div>').join('')+'</dl>':'')+'<small>'+escape(card.note)+'</small></article>').join('')+(result.shortfall>.005?'<p class="summary-shortfall" role="status">Unfunded cash flows: '+escape(money(result.shortfall))+'. Some loan payments or one-time costs cannot be covered.</p>':'');
 }
 function buttons(kind,id){return '<div class="actions"><button type="button" data-action="edit-'+kind+'" data-id="'+escape(id)+'">Edit</button><button type="button" data-action="remove-'+kind+'" data-id="'+escape(id)+'">Remove</button></div>';}
 function renderAssets(){
  $('assetList').innerHTML=plan.assets.map(a=>{const projected=result.assets.find(x=>x.id===a.id);return '<div class="entry"><div><strong>'+escape(a.name)+'</strong><p class="helper">'+escape(a.type+' · '+money(a.value)+' at start · '+a.annualReturn+'% return · '+(a.canWithdraw?'Available for withdrawals':'Keep untouched')+(a.id===plan.sipAssetId?' · Default SIP account':''))+'</p><p class="helper">Projected value: '+escape(money(projected.value))+'</p></div>'+buttons('asset',a.id)+'</div>';}).join('');
  $('loanList').innerHTML=plan.loans.map(l=>{const projected=result.loans.find(x=>x.id===l.id);return '<div class="entry"><div><strong>'+escape(l.name)+'</strong><p class="helper">'+escape(money(l.balance)+' at start'+(l.balanceMode==='original'?' (as of '+l.currentDate+')':'')+' · '+l.annualRate+'% interest · '+l.remainingMonths+' months · EMI '+money(projected.emi)+' from '+l.source)+'</p>'+(l.balanceMode==='original'?'<p class="helper">'+escape('Original '+money(l.originalAmount)+' · '+l.totalMonths+' months total · Started '+l.startDate+' · '+l.paidMonths+' paid / '+l.remainingMonths+' remaining')+'</p>':'')+'<p class="helper">'+escape('Projected debt: '+money(projected.balance)+(projected.payoffMonth===null?' · Not paid off within plan':' · Paid off '+(projected.payoffMonth===0?'at start':'in '+label(E.monthKey(E.monthNumber(plan.startMonth)+projected.payoffMonth-1)))))+'</p></div>'+buttons('loan',l.id)+'</div>';}).join('')||'<p class="empty">No loans added.</p>';
 }
 function renderSchedule(){
  const count=Math.ceil(plan.months/12);year=Math.max(0,Math.min(year,count-1));
  options($('yearView'),Array.from({length:count},(_,i)=>({id:String(i),name:'Year '+(i+1)+' · '+label(E.monthKey(E.monthNumber(plan.startMonth)+i*12))})),String(year));
  const rows=result.rows.slice(year*12,(year+1)*12);
  $('monthlyRows').innerHTML=rows.map(r=>{const custom=plan.overrides.find(o=>o.month===r.month),defaultSip=plan.monthlySip*(1+plan.annualStepup/100)**Math.floor((r.index-1)/12);return '<tr class="'+(r.custom||r.usesRecorded?'custom':'')+'"><th scope="row">'+escape(label(r.month))+'<small class="investment-source">'+(r.usesRecorded?'Recorded':'Forecast')+'</small></th><td><input type="number" min="0" max="1000000000" step="any" '+(r.usesRecorded?'disabled ':'')+'data-sip-month="'+r.month+'" aria-label="SIP override for '+escape(label(r.month))+'" value="'+(custom?.sip??'')+'" placeholder="'+Math.round(defaultSip)+'"><small>'+(r.usesRecorded?'Replaced by records':'Applied: '+escape(money(r.sip)))+'</small></td>'+[r.extra,r.recorded,r.emiPaid,r.prepaid,r.expensePaid,r.shortfall,r.balance,r.debt,r.netWorth].map(n=>'<td class="'+(n<0?'negative':'')+'">'+escape(money(n))+'</td>').join('')+'<td><div class="monthly-row-actions"><button type="button" data-record-month="'+r.month+'">'+(r.usesRecorded?'View / add records':'Record investments')+'</button><button type="button" data-edit-month="'+r.month+'">'+(custom?.flows.length?'Edit '+custom.flows.length+' cash flows':'Add cash flow')+'</button></div></td></tr>';}).join('');
  $('outsideNote').textContent=result.outsideMonths?result.outsideMonths+' saved month(s) fall outside this plan horizon and are excluded. Their dated entries remain in the plan file.':'';
 }
 function renderFlowTargets(){
  const type=$('flowType').value,old=$('flowTarget').value;
  $('flowTargetLabel').hidden=type==='expense';$('flowSourceLabel').hidden=type!=='prepayment';$('flowInflationLabel').hidden=type!=='expense';
  // Preserve the label's select rather than replacing label text.
  $('flowTargetLabel').firstChild.textContent=type==='prepayment'?'Pay this loan':'Invest into';
  options($('flowTarget'),type==='prepayment'?plan.loans:plan.assets,old);
  $('flowSubmit').disabled=(type==='prepayment'&&!plan.loans.length)||(type==='investment'&&plan.transactions.some(t=>t.date.slice(0,7)===selected));
 }
 function renderMonth(){
  $('editMonth').value=selected;const offset=E.monthNumber(selected)-E.monthNumber(plan.startMonth),entry=plan.overrides.find(o=>o.month===selected),row=result.rows.find(r=>r.month===selected);
  $('monthContext').textContent=label(selected)+(row?' · Applied SIP '+money(row.sip)+' · Add extra investments without changing the SIP.':' · Outside the current horizon. Changes will be saved but excluded from results until the horizon includes this month.');
  if(offset<0||offset>=plan.months)$('monthContext').className='helper';
  $('flowList').innerHTML=(entry?.flows||[]).map((f,index)=>{const target=f.type==='investment'?plan.assets.find(a=>a.id===f.assetId)?.name:f.type==='prepayment'?plan.loans.find(l=>l.id===f.loanId)?.name:'One-time expense';return '<div class="entry"><div><strong>'+escape((f.type==='investment'?'Extra investment':f.type==='prepayment'?'Extra loan payment':'Expense')+' · '+money(f.amount))+'</strong><p class="helper">'+escape(target+(f.type==='prepayment'?' · from '+f.source:'')+(f.type==='expense'&&f.inflate?' · today’s cost, adjusted for inflation':'')+(f.note?' · '+f.note:''))+'</p></div>'+buttons('flow',String(index))+'</div>';}).join('')||'<p class="empty">No extra cash flows for this month. For example: add ₹50,000 to Stocks while leaving the SIP at ₹20,000.</p>';
  if(plan.transactions.some(t=>t.date.slice(0,7)===selected))$('monthContext').textContent+=' Recorded investments replace the planned SIP and extra deposits for this month. Add investment transactions in the history section.';
  renderFlowTargets();
 }
 function renderChart(){
  const w=1000,h=300,l=90,r=20,t=24,b=40,min=Math.min(0,...result.path.map(p=>p.netWorth)),max=Math.max(1,...result.path.map(p=>p.netWorth)),range=max-min||1;
  const x=i=>l+(w-l-r)*i/plan.months,y=v=>h-b-(h-t-b)*(v-min)/range;
  let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Projected net wealth by month"><title>Net wealth from '+escape(plan.startMonth)+' for '+plan.months+' months</title>';
  for(let i=0;i<=4;i++){const value=min+range*i/4,yy=y(value);svg+='<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" stroke="#24485c"/><text x="'+(l-10)+'" y="'+(yy+4)+'" fill="#b0c3cf" text-anchor="end" font-size="12">'+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value)+'</text>';}
  for(let i=0;i<=4;i++){const index=Math.round(plan.months*i/4);svg+='<text x="'+x(index)+'" y="'+(h-12)+'" fill="#b0c3cf" text-anchor="middle" font-size="12">'+index+' mo</text>';}
  svg+='<path d="'+result.path.map((p,i)=>(i?'L':'M')+x(p.index).toFixed(2)+' '+y(p.netWorth).toFixed(2)).join(' ')+'" fill="none" stroke="#2bdbb0" stroke-width="3"/></svg><p class="helper">Hover, tap, or use arrow keys on the chart for full monthly amounts. Nominal future values in '+plan.currency+'. This is a fixed-return illustration; actual market returns vary.</p>';
  $('chart').innerHTML=svg;
  if(typeof ChartHover!=='undefined')ChartHover.attach($('chart'),{currency:plan.currency,top:t,bottom:h-b,points:result.path.map(p=>({x:x(p.index),ys:[y(p.netWorth)],title:p.index?'End of '+label(E.monthKey(E.monthNumber(plan.startMonth)+p.index-1)):'Starting position',rows:[['Net wealth',p.netWorth],['Total assets',p.balance],['Remaining loans',p.debt],['Available for withdrawals',p.available]]}))});
  $('yearRows').innerHTML=result.years.map(r=>'<tr><th scope="row">Year '+r.year+'</th>'+[r.contributions,r.emiPaid+r.prepaid,r.expensePaid,r.balance,r.debt,r.netWorth].map(n=>'<td>'+escape(money(n))+'</td>').join('')+'</tr>').join('');
 }
 function render(settings=true){if(settings)renderSettings();else updateEndMonth();renderSummary();renderAssets();renderSchedule();renderMonth();renderChart();renderTransactions();}
 function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function stage(candidate){pending=E.validate(candidate);$('importDescription').textContent=pending.name+' · '+pending.currency+' · starts '+pending.startMonth+' · '+pending.months+' months · '+pending.assets.length+' assets · '+pending.loans.length+' loans · '+pending.overrides.length+' monthly changes · '+pending.transactions.length+' recorded investment transactions.';$('importPreview').hidden=false;$('importPreview').scrollIntoView({block:'center'});error('');}
 $('settingsForm').onsubmit=event=>{event.preventDefault();updateSettings();};
 for(const type of ['input','change'])$('settingsForm').addEventListener(type,event=>{if(event?.target?.id==='currency')return;updateSettings();});
 $('currency').onchange=()=>{
  const draft=Object.fromEntries(['planName','startMonth','endMonth','targetToday','defaultSip','stepup','inflation','sipTarget'].map(id=>[id,$(id).value]));
  const p=clone();p.currency=$('currency').value;
  if(apply(p,'Plan currency changed to '+p.currency+'. Amounts retain their entered values; no exchange-rate conversion was applied.')){
   for(const [id,value] of Object.entries(draft))$(id).value=value;
   updateEndMonth();
   try{readSettings();}catch{baselineStatus(false);}
  }else $('currency').value=plan.currency;
 };
 $('assetForm').onsubmit=event=>{event.preventDefault();const p=clone(),entry={id:assetEdit||uid('asset'),name:$('assetName').value.trim(),type:$('assetType').value,value:Number($('assetValue').value),annualReturn:Number($('assetReturn').value),canWithdraw:$('assetLiquid').value==='yes'},index=p.assets.findIndex(a=>a.id===entry.id);if(index<0)p.assets.push(entry);else p.assets[index]=entry;if(apply(p,'Asset saved.'))resetAsset();};
 $('assetCancel').onclick=resetAsset;$('assetType').onchange=()=>{$('assetLiquid').value=$('assetType').value==='Property'?'no':'yes';};
 function loanDetails(){
  const original=$('loanMode').value==='original';
  const required=original?['loanOriginal','loanRate','loanYears','loanExtraMonths','loanStartDate','loanCurrentDate']:['loanBalance','loanRate','loanMonths'];
  if(required.some(id=>$(id).value.trim()===''))throw new Error('Complete the loan details to calculate the EMI.');
  if(original){
   const years=Number($('loanYears').value),extra=Number($('loanExtraMonths').value);
   if(!Number.isInteger(years)||years<0||!Number.isInteger(extra)||extra<0||extra>11)throw new Error('Enter whole tenure years and 0–11 additional months.');
   return E.calculateLoanDetails(Number($('loanOriginal').value),Number($('loanRate').value),years*12+extra,$('loanStartDate').value,$('loanCurrentDate').value);
  }
  const balance=Number($('loanBalance').value),remainingMonths=Number($('loanMonths').value),rate=Number($('loanRate').value);
  if(!Number.isFinite(balance)||balance<0||balance>1e12||!Number.isInteger(remainingMonths)||remainingMonths<0||remainingMonths>1200||!Number.isFinite(rate)||rate<0||rate>60)throw new Error('Enter a valid balance, interest rate and remaining tenure.');
  return {balance,remainingMonths,emi:balance===0?0:GrowthEngine.calculateEmi(balance,rate,remainingMonths)};
 }
 function updateLoanEmi(){
  const original=$('loanMode').value==='original';
  try{
   const details=loanDetails();
   if(original){$('loanBalance').value=details.balance.toFixed(2);$('loanMonths').value=details.remainingMonths;$('loanPaidMonths').value=details.paidMonths;}
   $('loanEmi').value=details.emi.toFixed(2);
   $('loanRemainingTotal').value=(details.emi*details.remainingMonths).toFixed(2);
   $('loanCalculation').textContent=original?details.paidMonths+' of '+details.totalMonths+' EMIs paid · '+details.remainingMonths+' remaining'+(details.remainingMonths===0?' · Fully repaid':'')+'. Balance estimated as of '+$('loanCurrentDate').value+'.':'EMI calculated from your outstanding balance and remaining months.';
  }catch(e){
   if(original)for(const id of ['loanBalance','loanMonths','loanPaidMonths'])$(id).value='';
   $('loanEmi').value='';$('loanRemainingTotal').value='';$('loanCalculation').textContent=e.message;
  }
  
 }
 function setLoanMode(){
  const original=$('loanMode').value==='original';
  for(const [id,labelId] of [['loanOriginal','loanOriginalLabel'],['loanYears','loanYearsLabel'],['loanExtraMonths','loanExtraMonthsLabel'],['loanStartDate','loanStartLabel'],['loanCurrentDate','loanCurrentLabel']]){$(id).disabled=!original;$(id).required=original;$(labelId).hidden=!original;}
  $('loanPaidLabel').hidden=!original;$('loanBalance').readOnly=original;$('loanMonths').readOnly=original;
  updateLoanEmi();
 }
 $('loanMode').onchange=setLoanMode;
 $('loanForm').addEventListener('input',updateLoanEmi);
 $('loanForm').onsubmit=event=>{event.preventDefault();try{const details=loanDetails(),p=clone(),entry={id:loanEdit||uid('loan'),name:$('loanName').value.trim(),balance:details.balance,annualRate:Number($('loanRate').value),remainingMonths:details.remainingMonths,source:$('loanSource').value};if($('loanMode').value==='original')Object.assign(entry,{balanceMode:'original',originalAmount:Number($('loanOriginal').value),totalMonths:details.totalMonths,startDate:$('loanStartDate').value,currentDate:$('loanCurrentDate').value});const index=p.loans.findIndex(l=>l.id===entry.id);if(index<0)p.loans.push(entry);else p.loans[index]=entry;if(apply(p,'Loan saved.'))resetLoan();}catch(e){error('Loan not saved. '+e.message);}};
 $('loanCancel').onclick=resetLoan;
 $('yearView').onchange=()=>{year=Number($('yearView').value);renderSchedule();};
 $('monthlyRows').addEventListener('change',event=>{const month=event.target.dataset.sipMonth;if(!month)return;const p=clone(),o=changeFor(p,month);o.sip=event.target.value.trim()===''?null:Number(event.target.value);p.overrides=p.overrides.filter(o=>o.sip!==null||o.flows.length||o.note);apply(p,'SIP for '+label(month)+' updated.');});
 $('transactionForm').onsubmit=event=>{
  event.preventDefault();try{
   const p=clone(),name=$('transactionAsset').value.trim(),matches=transactionAccountMatches();
   if(!name)throw new Error('Enter where you invested.');
   if(matches.length>1)throw new Error('Several accounts have that name. Use distinct names in Assets & investment accounts.');
   let account=matches[0];
   if(!account){if($('transactionNewReturn').value.trim()==='')throw new Error('Enter an expected return for the new investment account.');account={id:uid('asset'),name,type:$('transactionNewCategory').value.trim(),value:0,annualReturn:Number($('transactionNewReturn').value),canWithdraw:true};p.assets.push(account);}
   const entry={id:transactionEdit||uid('transaction'),date:$('transactionDate').value,assetId:account.id,amount:Number($('transactionAmount').value),note:$('transactionNote').value},index=p.transactions.findIndex(t=>t.id===entry.id);if(index<0)p.transactions.push(entry);else p.transactions[index]=entry;
   if(apply(p,'Transaction saved. Recorded investments replace that month’s forecast.'))resetTransaction();else $('transactionError').textContent=$('error').textContent;
  }catch(e){$('transactionError').textContent=e.message;}
 };
 $('transactionAsset').oninput=syncTransactionAccount;$('transactionAsset').onchange=syncTransactionAccount;
 $('transactionCancel').onclick=()=>resetTransaction();
 $('transactionMonthFilter').onchange=renderTransactions;$('transactionAssetFilter').onchange=renderTransactions;
 $('transactionClearFilters').onclick=()=>{$('transactionMonthFilter').value='';$('transactionAssetFilter').value='all';renderTransactions();};
 $('transactionCsv').onclick=()=>{const cell=value=>{if(typeof value==='number')return String(value);let text=String(value);if(/^[\s]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};const start=E.monthNumber(plan.startMonth),rows=[['Date','Account','Category','Amount ('+plan.currency+')','Note','Included in plan'],...transactionRows().map(t=>{const asset=plan.assets.find(a=>a.id===t.assetId),month=E.monthNumber(t.date.slice(0,7));return [t.date,asset.name,asset.type,t.amount,t.note,month>=start&&month<start+plan.months?'Yes':'No'];})];download('\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8','Investment_transactions_'+plan.currency+'.csv');};
 $('monthlyRows').addEventListener('click',event=>{const record=event.target.closest('[data-record-month]');if(record?.dataset.recordMonth){resetTransaction();$('transactionDate').value=record.dataset.recordMonth+'-01';$('transactionMonthFilter').value=record.dataset.recordMonth;$('transactionAssetFilter').value='all';renderTransactions();$('transactionHistory').scrollIntoView({block:'start'});$('transactionDate').focus({preventScroll:true});return;}const button=event.target.closest('[data-edit-month]');if(!button)return;selected=button.dataset.editMonth;resetFlow();renderMonth();$('monthTitle').scrollIntoView({block:'start'});$('editMonth').focus({preventScroll:true});});
 $('editMonth').onchange=()=>{try{E.monthNumber($('editMonth').value);selected=$('editMonth').value;resetFlow();renderMonth();error('');}catch(e){error(e.message);}};
 $('flowType').onchange=renderFlowTargets;$('flowCancel').onclick=resetFlow;
 $('flowForm').onsubmit=event=>{event.preventDefault();try{E.monthNumber(selected);const p=clone(),o=changeFor(p,selected),type=$('flowType').value,flow={type,amount:Number($('flowAmount').value),note:$('flowNote').value};if(type==='investment')flow.assetId=$('flowTarget').value;else if(type==='prepayment'){flow.loanId=$('flowTarget').value;flow.source=$('flowSource').value;}else flow.inflate=$('flowInflation').value==='today';if(flowEdit===null)o.flows.push(flow);else o.flows[flowEdit]=flow;if(apply(p,'Cash flow saved for '+label(selected)+'.'))resetFlow();}catch(e){error(e.message);}};
 document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const [action,kind]=button.dataset.action.split('-'),id=button.dataset.id;
  if(kind==='transaction'){const entry=plan.transactions.find(t=>t.id===id);if(!entry)return;if(action==='remove'){const p=clone();p.transactions=p.transactions.filter(t=>t.id!==id);if(apply(p,'Transaction removed. Months without records use their saved forecast again.'))resetTransaction();}else{transactionEdit=id;$('transactionDate').value=entry.date;$('transactionAsset').value=plan.assets.find(a=>a.id===entry.assetId).name+' · '+plan.assets.find(a=>a.id===entry.assetId).type;syncTransactionAccount();$('transactionAmount').value=entry.amount;$('transactionNote').value=entry.note;$('transactionSubmit').textContent='Save transaction';$('transactionCancel').hidden=false;$('transactionError').textContent='';$('transactionHistory').scrollIntoView({block:'start'});$('transactionAmount').focus();}return;}
  if(kind==='flow'){const entry=plan.overrides.find(o=>o.month===selected),index=Number(id),flow=entry?.flows[index];if(!flow)return;if(action==='remove'){const p=clone();changeFor(p,selected).flows.splice(index,1);p.overrides=p.overrides.filter(o=>o.sip!==null||o.flows.length||o.note);if(apply(p,'Cash flow removed.'))resetFlow();}else{flowEdit=index;$('flowType').value=flow.type;renderFlowTargets();$('flowAmount').value=flow.amount;$('flowNote').value=flow.note;$('flowTarget').value=flow.assetId||flow.loanId||'';$('flowSource').value=flow.source||'income';$('flowInflation').value=flow.inflate?'today':'future';$('flowSubmit').textContent='Save cash flow';$('flowCancel').hidden=false;$('flowAmount').focus();}return;}
  const key=kind==='asset'?'assets':'loans',entry=plan[key].find(x=>x.id===id);if(!entry)return;
  if(action==='remove'){const p=clone();p[key]=p[key].filter(x=>x.id!==id);if(!apply(p,'Entry removed.'))error('Cannot remove this '+kind+' while it is used by the default SIP or a monthly cash flow. Reassign or remove monthly cash flows and investment transactions that use it first.');else{if(kind==='asset')resetAsset();else resetLoan();}return;}
  if(kind==='asset'){assetEdit=id;$('assetName').value=entry.name;$('assetType').value=entry.type;if(!$('assetType').value)$('assetType').value='Other';$('assetValue').value=entry.value;$('assetReturn').value=entry.annualReturn;$('assetLiquid').value=entry.canWithdraw?'yes':'no';$('assetSubmit').textContent='Save asset';$('assetCancel').hidden=false;$('assetName').focus();}
  else{loanEdit=id;$('loanName').value=entry.name;$('loanMode').value=entry.balanceMode==='original'?'original':'current';$('loanBalance').value=entry.balance;$('loanRate').value=entry.annualRate;$('loanMonths').value=entry.remainingMonths;$('loanSource').value=entry.source;if(entry.balanceMode==='original'){$('loanOriginal').value=entry.originalAmount;$('loanYears').value=Math.floor(entry.totalMonths/12);$('loanExtraMonths').value=entry.totalMonths%12;$('loanStartDate').value=entry.startDate;$('loanCurrentDate').value=entry.currentDate;}$('loanSubmit').textContent='Save loan';$('loanCancel').hidden=false;setLoanMode();$('loanName').focus();}
 });
 $('exportPlan').onclick=()=>{download(E.exportPlan(plan),'application/json','Custom_plan_'+plan.startMonth+'.json');$('status').textContent='Plan file downloaded. Import this JSON later to continue editing. Starting-plan inputs update automatically. Asset, loan and cash-flow form entries must be saved first.';};
 $('exportReport').onclick=()=>{try{download(CustomReport.build(plan),'text/html;charset=utf-8','Custom_plan_report_'+plan.startMonth+'.html');$('status').textContent='Report downloaded. Open it in a browser to read or print. Import this original HTML report to continue editing. Only applied/saved changes are included.';error('');}catch(e){error('Report could not be created. '+e.message);}};
 $('resetPlan').onclick=()=>{$('resetPreview').hidden=false;$('resetPreview').scrollIntoView({block:'center'});$('cancelReset').focus({preventScroll:true});};
 $('cancelReset').onclick=()=>{$('resetPreview').hidden=true;$('resetPlan').focus({preventScroll:true});};
 $('confirmReset').onclick=()=>{
  if(apply(E.createPlan(),'Custom Plan reset to defaults. Growth and Survival are unchanged.')){
   importVersion++;pending=null;year=0;selected=plan.startMonth;$('importFile').value='';$('importPreview').hidden=true;$('resetPreview').hidden=true;
   resetAsset();resetLoan();resetFlow();resetTransaction(true);render();$('planName').focus({preventScroll:true});
  }
 };
 $('exportCsv').onclick=()=>{const fields=['month','usesRecorded','sip','extra','recorded','contributions','growth','emiPaid','prepaid','loanInterest','expenseDue','expensePaid','incomePayments','portfolioPayments','shortfall','unusedPrepayment','balance','debt','netWorth','available'];const rows=[fields,...result.rows.map(r=>fields.map(k=>typeof r[k]==='number'?Number(r[k].toFixed(2)):r[k]))];download('\ufeff'+rows.map(row=>row.join(',')).join('\r\n'),'text/csv;charset=utf-8','Custom_schedule_'+plan.currency+'.csv');};
 $('importButton').onclick=()=>$('importFile').click();
 $('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;const version=++importVersion;pending=null;$('importPreview').hidden=true;try{if(file.size>CustomReport.MAX_FILE_BYTES)throw new Error('Choose a JSON plan or HTML report smaller than 10 MB.');const text=await file.text();if(version!==importVersion)return;stage(CustomReport.read(text));}catch(e){if(version===importVersion)error('Import not applied. '+e.message);}finally{if(version===importVersion)$('importFile').value='';}};
 $('cancelImport').onclick=()=>{importVersion++;pending=null;$('importFile').value='';$('importPreview').hidden=true;};
 $('confirmImport').onclick=()=>{if(!pending)return;const candidate=pending;if(apply(candidate,'Plan restored. You can edit any starting value or monthly entry.')){pending=null;year=0;selected=plan.startMonth;resetAsset();resetLoan();resetFlow();resetTransaction(true);$('importPreview').hidden=true;render();}};
 $('copyGrowth').onclick=()=>{try{
  const saved=JSON.parse(localStorage.getItem('InTimeTec-investment-planner-v2')||'null');if(!saved?.inputs)throw new Error('No saved Growth setup was found in this browser. Open Growth and save a calculation first.');
  const currency=saved.currency||'INR',position=GrowthEngine.validatePosition(JSON.parse(localStorage.getItem('growth-position-v1-'+currency)||'{}')),candidate=E.createPlan();candidate.name='My Growth setup — custom plan';candidate.currency=currency;candidate.months=Number(saved.inputs.years)*12;candidate.monthlySip=Number(saved.inputs.monthly);candidate.annualStepup=Number(saved.inputs.stepup);candidate.inflation=Number(saved.inputs.inflation);candidate.assets[0].annualReturn=((1+Number(saved.inputs.rate)/1200)**12-1)*100;
  candidate.assets.push(...position.assets.map((a,i)=>({id:'growth_asset_'+i,name:a.name,type:a.type||'Other',value:a.amount,annualReturn:a.rate,canWithdraw:a.liquid})));
  candidate.loans=position.loans.map((l,i)=>{if(l.remainingMonths===undefined)throw new Error('Edit saved manual-EMI loans in Growth and enter their remaining tenure before copying.');return {id:'growth_loan_'+i,name:l.name,balance:l.balance,annualRate:l.rate,remainingMonths:l.remainingMonths,source:l.source==='income'?'income':'investments'};});
  const month=(year,within)=>E.monthKey(E.monthNumber(candidate.startMonth)+(Number(year)-1)*12+Number(within)-1);
  for(const extra of saved.extras||[])changeFor(candidate,month(extra.year,extra.month)).flows.push({type:'investment',assetId:'core',amount:Number(extra.amount),note:extra.note||''});
  const expenses=JSON.parse(localStorage.getItem('life-events-v1-growth-'+currency)||'[]');for(const e of expenses.filter(e=>e.enabled))changeFor(candidate,month(e.year,e.month)).flows.push({type:'expense',amount:e.amount,inflate:e.inflate,note:e.name});
  stage(candidate);
 }catch(e){error('Growth setup not copied. '+e.message);}};
 try{const saved=localStorage.getItem(KEY);if(saved)plan=E.parse(saved);}catch(e){storage=false;error('Saved Custom Plan could not be restored. You can import a plan file. '+e.message);}
 selected=plan.startMonth;result=E.project(plan);render();resetLoan();$('saveState').textContent=storage?'Private · browser saved':'Save a plan file to keep your changes';
})();
