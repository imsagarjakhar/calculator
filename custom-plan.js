(function(){
 'use strict';
 const E=CustomPlan,$=id=>document.getElementById(id),KEY='intimetec-custom-plan-v1';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let plan=E.createPlan(),result,assetEdit=null,loanEdit=null,flowEdit=null,pending=null,year=0,selected=plan.startMonth,storage=true;
 const uid=prefix=>prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
 const money=value=>new Intl.NumberFormat(plan.currency==='INR'?'en-IN':'en-US',{style:'currency',currency:plan.currency,maximumFractionDigits:0}).format(value);
 const label=month=>new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
 const changeFor=(candidate,month)=>{let entry=candidate.overrides.find(o=>o.month===month);if(!entry){entry={month,sip:null,note:'',flows:[]};candidate.overrides.push(entry);}return entry;};
 const clone=()=>JSON.parse(E.exportPlan(plan));
 function error(message){$('error').textContent=message;$('error').hidden=!message;}
 function save(){try{localStorage.setItem(KEY,E.exportPlan(plan));storage=true;}catch{storage=false;}$('saveState').textContent=storage?'Saved in this browser':'Browser saving unavailable — save a plan file';}
 function apply(candidate,message='Plan updated.'){
  try{const clean=E.validate(candidate),projection=E.project(clean);plan=clean;result=projection;save();error('');render();$('status').textContent=message;return true;}catch(e){error('Change not applied. '+e.message);return false;}
 }
 function options(select,items,value){select.replaceChildren();for(const item of items)select.add(new Option(item.name,item.id));if(items.some(i=>i.id===value))select.value=value;}
 function resetAsset(){assetEdit=null;$('assetForm').reset();$('assetSubmit').textContent='Add asset';$('assetCancel').hidden=true;}
 function resetLoan(){loanEdit=null;$('loanForm').reset();$('loanSubmit').textContent='Add loan';$('loanCancel').hidden=true;$('loanEmi').value='';}
 function resetFlow(){flowEdit=null;$('flowForm').reset();$('flowSubmit').textContent='Add cash flow';$('flowCancel').hidden=true;renderFlowTargets();}
 function renderSettings(){
  for(const [id,key] of Object.entries({planName:'name',currency:'currency',startMonth:'startMonth',duration:'months',defaultSip:'monthlySip',stepup:'annualStepup',inflation:'inflation'}))$(id).value=plan[key];
  options($('sipTarget'),plan.assets,plan.sipAssetId);
 }
 function renderSummary(){
  const values=[['Projected net wealth',result.netWorth,'Assets minus remaining loans'],['Projected assets',result.balance,'Starting assets: '+money(result.initial.balance)],['Remaining loans',result.debt,'Starting debt: '+money(result.initial.debt)],['New investments',result.contributions,'SIP + extra investments'],['Available for withdrawals',result.available,'Excludes assets you keep untouched'],['Unfunded cash flows',result.shortfall,'Loan payments and one-time costs']];
  $('summary').innerHTML=values.map(([name,value,note],i)=>'<div class="metric '+(i===0?'featured':'')+'"><span>'+escape(name)+'</span><strong class="'+(value<0?'negative':'')+'">'+escape(money(value))+'</strong><small>'+escape(note)+'</small></div>').join('');
 }
 function buttons(kind,id){return '<div class="actions"><button type="button" data-action="edit-'+kind+'" data-id="'+escape(id)+'">Edit</button><button type="button" data-action="remove-'+kind+'" data-id="'+escape(id)+'">Remove</button></div>';}
 function renderAssets(){
  $('assetList').innerHTML=plan.assets.map(a=>{const projected=result.assets.find(x=>x.id===a.id);return '<div class="entry"><div><strong>'+escape(a.name)+'</strong><p class="helper">'+escape(a.type+' · '+money(a.value)+' at start · '+a.annualReturn+'% return · '+(a.canWithdraw?'Available for withdrawals':'Keep untouched')+(a.id===plan.sipAssetId?' · Default SIP account':''))+'</p><p class="helper">Projected value: '+escape(money(projected.value))+'</p></div>'+buttons('asset',a.id)+'</div>';}).join('');
  $('loanList').innerHTML=plan.loans.map(l=>{const projected=result.loans.find(x=>x.id===l.id);return '<div class="entry"><div><strong>'+escape(l.name)+'</strong><p class="helper">'+escape(money(l.balance)+' at start · '+l.annualRate+'% interest · '+l.remainingMonths+' months · EMI '+money(projected.emi)+' from '+l.source)+'</p><p class="helper">'+escape('Projected debt: '+money(projected.balance)+(projected.payoffMonth===null?' · Not paid off within plan':' · Paid off '+(projected.payoffMonth===0?'at start':'in '+label(E.monthKey(E.monthNumber(plan.startMonth)+projected.payoffMonth-1)))))+'</p></div>'+buttons('loan',l.id)+'</div>';}).join('')||'<p class="empty">No loans added.</p>';
 }
 function renderSchedule(){
  const count=Math.ceil(plan.months/12);year=Math.max(0,Math.min(year,count-1));
  options($('yearView'),Array.from({length:count},(_,i)=>({id:String(i),name:'Year '+(i+1)+' · '+label(E.monthKey(E.monthNumber(plan.startMonth)+i*12))})),String(year));
  const rows=result.rows.slice(year*12,(year+1)*12);
  $('monthlyRows').innerHTML=rows.map(r=>{const custom=plan.overrides.find(o=>o.month===r.month),defaultSip=plan.monthlySip*(1+plan.annualStepup/100)**Math.floor((r.index-1)/12);return '<tr class="'+(r.custom?'custom':'')+'"><th scope="row">'+escape(label(r.month))+'</th><td><input type="number" min="0" max="1000000000" step="any" data-sip-month="'+r.month+'" aria-label="SIP override for '+escape(label(r.month))+'" value="'+(custom?.sip??'')+'" placeholder="'+Math.round(defaultSip)+'"><small>Applied: '+escape(money(r.sip))+'</small></td>'+[r.extra,r.emiPaid,r.prepaid,r.expensePaid,r.shortfall,r.balance,r.debt,r.netWorth].map(n=>'<td class="'+(n<0?'negative':'')+'">'+escape(money(n))+'</td>').join('')+'<td><button type="button" data-edit-month="'+r.month+'">'+(custom?.flows.length?'Edit '+custom.flows.length+' cash flows':'Add cash flow')+'</button></td></tr>';}).join('');
  $('outsideNote').textContent=result.outsideMonths?result.outsideMonths+' saved month(s) fall outside this plan horizon and are excluded. Their dated entries remain in the plan file.':'';
 }
 function renderFlowTargets(){
  const type=$('flowType').value,old=$('flowTarget').value;
  $('flowTargetLabel').hidden=type==='expense';$('flowSourceLabel').hidden=type!=='prepayment';$('flowInflationLabel').hidden=type!=='expense';
  // Preserve the label's select rather than replacing label text.
  $('flowTargetLabel').firstChild.textContent=type==='prepayment'?'Pay this loan':'Invest into';
  options($('flowTarget'),type==='prepayment'?plan.loans:plan.assets,old);
  $('flowSubmit').disabled=type==='prepayment'&&!plan.loans.length;
 }
 function renderMonth(){
  $('editMonth').value=selected;const offset=E.monthNumber(selected)-E.monthNumber(plan.startMonth),entry=plan.overrides.find(o=>o.month===selected),row=result.rows.find(r=>r.month===selected);
  $('monthContext').textContent=label(selected)+(row?' · Applied SIP '+money(row.sip)+' · Add extra investments without changing the SIP.':' · Outside the current horizon. Changes will be saved but excluded from results until the horizon includes this month.');
  if(offset<0||offset>=plan.months)$('monthContext').className='helper';
  $('flowList').innerHTML=(entry?.flows||[]).map((f,index)=>{const target=f.type==='investment'?plan.assets.find(a=>a.id===f.assetId)?.name:f.type==='prepayment'?plan.loans.find(l=>l.id===f.loanId)?.name:'One-time expense';return '<div class="entry"><div><strong>'+escape((f.type==='investment'?'Extra investment':f.type==='prepayment'?'Extra loan payment':'Expense')+' · '+money(f.amount))+'</strong><p class="helper">'+escape(target+(f.type==='prepayment'?' · from '+f.source:'')+(f.type==='expense'&&f.inflate?' · today’s cost, adjusted for inflation':'')+(f.note?' · '+f.note:''))+'</p></div>'+buttons('flow',String(index))+'</div>';}).join('')||'<p class="empty">No extra cash flows for this month. For example: add ₹50,000 to Stocks while leaving the SIP at ₹20,000.</p>';
  renderFlowTargets();
 }
 function renderChart(){
  const w=1000,h=300,l=90,r=20,t=24,b=40,min=Math.min(0,...result.path.map(p=>p.netWorth)),max=Math.max(1,...result.path.map(p=>p.netWorth)),range=max-min||1;
  const x=i=>l+(w-l-r)*i/plan.months,y=v=>h-b-(h-t-b)*(v-min)/range;
  let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Projected net wealth by month"><title>Net wealth from '+escape(plan.startMonth)+' for '+plan.months+' months</title>';
  for(let i=0;i<=4;i++){const value=min+range*i/4,yy=y(value);svg+='<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" stroke="#24485c"/><text x="'+(l-10)+'" y="'+(yy+4)+'" fill="#b0c3cf" text-anchor="end" font-size="12">'+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value)+'</text>';}
  for(let i=0;i<=4;i++){const index=Math.round(plan.months*i/4);svg+='<text x="'+x(index)+'" y="'+(h-12)+'" fill="#b0c3cf" text-anchor="middle" font-size="12">'+index+' mo</text>';}
  svg+='<path d="'+result.path.map((p,i)=>(i?'L':'M')+x(p.index).toFixed(2)+' '+y(p.netWorth).toFixed(2)).join(' ')+'" fill="none" stroke="#2bdbb0" stroke-width="3"/></svg><p class="helper">Nominal future values in '+plan.currency+'. This is a fixed-return illustration; actual market returns vary.</p>';
  $('chart').innerHTML=svg;
  $('yearRows').innerHTML=result.years.map(r=>'<tr><th scope="row">Year '+r.year+'</th>'+[r.contributions,r.emiPaid+r.prepaid,r.expensePaid,r.balance,r.debt,r.netWorth].map(n=>'<td>'+escape(money(n))+'</td>').join('')+'</tr>').join('');
 }
 function render(){renderSettings();renderSummary();renderAssets();renderSchedule();renderMonth();renderChart();}
 function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function stage(candidate){pending=E.validate(candidate);$('importDescription').textContent=pending.name+' · '+pending.currency+' · starts '+pending.startMonth+' · '+pending.months+' months · '+pending.assets.length+' assets · '+pending.loans.length+' loans · '+pending.overrides.length+' monthly changes.';$('importPreview').hidden=false;$('importPreview').scrollIntoView({block:'center'});error('');}
 $('settingsForm').onsubmit=event=>{event.preventDefault();const p=clone();Object.assign(p,{name:$('planName').value,currency:$('currency').value,startMonth:$('startMonth').value,months:Number($('duration').value),monthlySip:Number($('defaultSip').value),annualStepup:Number($('stepup').value),inflation:Number($('inflation').value),sipAssetId:$('sipTarget').value});apply(p,'Plan defaults updated. Existing monthly overrides stay on their calendar dates.');};
 $('assetForm').onsubmit=event=>{event.preventDefault();const p=clone(),entry={id:assetEdit||uid('asset'),name:$('assetName').value.trim(),type:$('assetType').value,value:Number($('assetValue').value),annualReturn:Number($('assetReturn').value),canWithdraw:$('assetLiquid').value==='yes'},index=p.assets.findIndex(a=>a.id===entry.id);if(index<0)p.assets.push(entry);else p.assets[index]=entry;if(apply(p,'Asset saved.'))resetAsset();};
 $('assetCancel').onclick=resetAsset;$('assetType').onchange=()=>{$('assetLiquid').value=$('assetType').value==='Property'?'no':'yes';};
 function updateLoanEmi(){try{const balance=Number($('loanBalance').value),months=Number($('loanMonths').value);$('loanEmi').value=$('loanBalance').value===''||$('loanRate').value===''||$('loanMonths').value===''?'':balance===0?'0.00':GrowthEngine.calculateEmi(balance,Number($('loanRate').value),months).toFixed(2);}catch{$('loanEmi').value='';}}
 $('loanForm').addEventListener('input',updateLoanEmi);
 $('loanForm').onsubmit=event=>{event.preventDefault();const p=clone(),entry={id:loanEdit||uid('loan'),name:$('loanName').value.trim(),balance:Number($('loanBalance').value),annualRate:Number($('loanRate').value),remainingMonths:Number($('loanMonths').value),source:$('loanSource').value},index=p.loans.findIndex(l=>l.id===entry.id);if(index<0)p.loans.push(entry);else p.loans[index]=entry;if(apply(p,'Loan saved.'))resetLoan();};
 $('loanCancel').onclick=resetLoan;
 $('yearView').onchange=()=>{year=Number($('yearView').value);renderSchedule();};
 $('monthlyRows').addEventListener('change',event=>{const month=event.target.dataset.sipMonth;if(!month)return;const p=clone(),o=changeFor(p,month);o.sip=event.target.value.trim()===''?null:Number(event.target.value);p.overrides=p.overrides.filter(o=>o.sip!==null||o.flows.length||o.note);apply(p,'SIP for '+label(month)+' updated.');});
 $('monthlyRows').addEventListener('click',event=>{const button=event.target.closest('[data-edit-month]');if(!button)return;selected=button.dataset.editMonth;resetFlow();renderMonth();$('monthTitle').scrollIntoView({block:'start'});$('editMonth').focus({preventScroll:true});});
 $('editMonth').onchange=()=>{try{E.monthNumber($('editMonth').value);selected=$('editMonth').value;resetFlow();renderMonth();error('');}catch(e){error(e.message);}};
 $('flowType').onchange=renderFlowTargets;$('flowCancel').onclick=resetFlow;
 $('flowForm').onsubmit=event=>{event.preventDefault();try{E.monthNumber(selected);const p=clone(),o=changeFor(p,selected),type=$('flowType').value,flow={type,amount:Number($('flowAmount').value),note:$('flowNote').value};if(type==='investment')flow.assetId=$('flowTarget').value;else if(type==='prepayment'){flow.loanId=$('flowTarget').value;flow.source=$('flowSource').value;}else flow.inflate=$('flowInflation').value==='today';if(flowEdit===null)o.flows.push(flow);else o.flows[flowEdit]=flow;if(apply(p,'Cash flow saved for '+label(selected)+'.'))resetFlow();}catch(e){error(e.message);}};
 document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const [action,kind]=button.dataset.action.split('-'),id=button.dataset.id;
  if(kind==='flow'){const entry=plan.overrides.find(o=>o.month===selected),index=Number(id),flow=entry?.flows[index];if(!flow)return;if(action==='remove'){const p=clone();changeFor(p,selected).flows.splice(index,1);p.overrides=p.overrides.filter(o=>o.sip!==null||o.flows.length||o.note);if(apply(p,'Cash flow removed.'))resetFlow();}else{flowEdit=index;$('flowType').value=flow.type;renderFlowTargets();$('flowAmount').value=flow.amount;$('flowNote').value=flow.note;$('flowTarget').value=flow.assetId||flow.loanId||'';$('flowSource').value=flow.source||'income';$('flowInflation').value=flow.inflate?'today':'future';$('flowSubmit').textContent='Save cash flow';$('flowCancel').hidden=false;$('flowAmount').focus();}return;}
  const key=kind==='asset'?'assets':'loans',entry=plan[key].find(x=>x.id===id);if(!entry)return;
  if(action==='remove'){const p=clone();p[key]=p[key].filter(x=>x.id!==id);if(!apply(p,'Entry removed.'))error('Cannot remove this '+kind+' while it is used by the default SIP or a monthly cash flow. Reassign or remove those references first.');else{if(kind==='asset')resetAsset();else resetLoan();}return;}
  if(kind==='asset'){assetEdit=id;$('assetName').value=entry.name;$('assetType').value=entry.type;if(!$('assetType').value)$('assetType').value='Other';$('assetValue').value=entry.value;$('assetReturn').value=entry.annualReturn;$('assetLiquid').value=entry.canWithdraw?'yes':'no';$('assetSubmit').textContent='Save asset';$('assetCancel').hidden=false;$('assetName').focus();}
  else{loanEdit=id;$('loanName').value=entry.name;$('loanBalance').value=entry.balance;$('loanRate').value=entry.annualRate;$('loanMonths').value=entry.remainingMonths;$('loanSource').value=entry.source;$('loanSubmit').textContent='Save loan';$('loanCancel').hidden=false;updateLoanEmi();$('loanName').focus();}
 });
 $('exportPlan').onclick=()=>{download(E.exportPlan(plan),'application/json','Custom_plan_'+plan.startMonth+'.json');$('status').textContent='Plan file downloaded. Import this JSON later to continue editing. Form changes must be saved with their Apply/Add/Save button first.';};
 $('exportCsv').onclick=()=>{const fields=['month','sip','extra','contributions','growth','emiPaid','prepaid','loanInterest','expenseDue','expensePaid','incomePayments','portfolioPayments','shortfall','unusedPrepayment','balance','debt','netWorth','available'];const rows=[fields,...result.rows.map(r=>fields.map(k=>typeof r[k]==='number'?Number(r[k].toFixed(2)):r[k]))];download('\ufeff'+rows.map(row=>row.join(',')).join('\r\n'),'text/csv;charset=utf-8','Custom_schedule_'+plan.currency+'.csv');};
 $('importButton').onclick=()=>$('importFile').click();
 $('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;pending=null;$('importPreview').hidden=true;try{if(file.size>2*1024*1024)throw new Error('Choose a JSON plan file smaller than 2 MB.');stage(E.parse(await file.text()));}catch(e){error('Import not applied. '+e.message);}finally{$('importFile').value='';}};
 $('cancelImport').onclick=()=>{pending=null;$('importPreview').hidden=true;};
 $('confirmImport').onclick=()=>{if(!pending)return;const candidate=pending;if(apply(candidate,'Plan restored. You can edit any starting value or monthly entry.')){pending=null;year=0;selected=plan.startMonth;resetAsset();resetLoan();resetFlow();$('importPreview').hidden=true;render();}};
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
 selected=plan.startMonth;result=E.project(plan);render();$('saveState').textContent=storage?'Private · browser saved':'Save a plan file to keep your changes';
})();
