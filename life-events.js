(function(root){
  'use strict';
  const categories=['Child education','Child wedding','Buy a home','Buy a car','Hospital / medical','Home renovation','International trip','Emergency / unexpected','Custom expense'];
  const memory=new Map();
  const key=(mode,currency)=>'life-events-v1-'+mode+'-'+currency;
  function validate(items){
    if(!Array.isArray(items)||items.length>200)throw new Error('Keep up to 200 life expenses per plan.');
    return items.map(e=>{
      if(!e||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!Number.isFinite(e.amount)||e.amount<=0||e.amount>1e12||!Number.isInteger(e.year)||e.year<1||e.year>120||!Number.isInteger(e.month)||e.month<1||e.month>12||typeof e.inflate!=='boolean'||typeof e.enabled!=='boolean')throw new Error('Enter a valid expense name, positive amount, plan year (1–120), and month (1–12).');
      return {...e,name:e.name.trim()};
    });
  }
  function load(mode,currency){const k=key(mode,currency);try{if(memory.has(k))return validate(memory.get(k));const saved=JSON.parse(localStorage.getItem(k)||'[]');const result=validate(saved);memory.set(k,result);return result;}catch{return [];}}
  function save(mode,currency,items){const valid=validate(items),k=key(mode,currency);memory.set(k,valid);try{localStorage.setItem(k,JSON.stringify(valid));}catch{}return valid;}
  const monthIndex=e=>(e.year-1)*12+e.month;
  const cost=(e,inflation,timing='start')=>e.amount*Math.pow(1+inflation/100,e.inflate?(monthIndex(e)-(timing==='end'?0:1))/12:0);
  function scheduled(items,months,inflation,timing='start'){return validate(items).filter(e=>e.enabled&&monthIndex(e)<=months).map(e=>({...e,index:monthIndex(e),cost:cost(e,inflation,timing)}));}
  function mount(host,mode,context,onChange){
    let ctx=context,editing=null;
    const prefix='events-'+mode;
    host.className='panel life-events';
    host.innerHTML=`<div class="section-top"><div><div class="eyebrow">LIFE HAPPENS / PLAN FOR IT</div><h2 style="margin-top:8px">Life events &amp; unexpected expenses</h2><p class="helper">Add costs beyond your regular ${mode==='growth'?'investments':mode==='freedom'?'living expenses':'SWP budget'}. Try an emergency as a what-if scenario.</p></div><span class="badge">Optional</span></div>
    <form novalidate><div class="event-fields"><label for="${prefix}-type">Expense type<select id="${prefix}-type">${categories.map(c=>'<option>'+c+'</option>').join('')}</select></label><label for="${prefix}-name">Name / note<input id="${prefix}-name" type="text" maxlength="80" placeholder="e.g. Daughter's university"></label><label for="${prefix}-amount">Amount (<span class="event-currency"></span>)<input id="${prefix}-amount" type="number" min="0.01" max="1000000000000" step="any" inputmode="decimal" placeholder="Enter cost"></label><label for="${prefix}-year">Expense year (counting from plan start)<input id="${prefix}-year" type="number" min="1" max="120" step="1" value="5"></label><label for="${prefix}-month">Month within that expense year<input id="${prefix}-month" type="number" min="1" max="12" step="1" value="1"></label><label for="${prefix}-basis">Is this today’s price or the future price?<select id="${prefix}-basis"><option value="today">Today's price — add inflation</option><option value="future">Future price — already includes inflation</option></select></label></div><p class="helper event-timing"></p><p class="helper">Year 1 = the first 12 plan months; Year 2 = months 13–24 from plan start. Year 5, month 1 is about 4 years after plan start. This is not a calendar year. Inflation uses the calculator's assumption. Add separate entries for costs in several years. Expenses outside your plan are kept but excluded. Each calculator and currency has its own saved list.</p><div class="survival-actions"><button class="primary" type="submit">Add expense</button><button class="ghost event-cancel" type="button" hidden>Cancel edit</button></div><p class="error event-error" role="alert"></p></form><div class="event-list"></div><p class="event-status helper" role="status"></p><div class="event-impact hint" aria-live="polite"></div>`;
    const find=s=>host.querySelector(s),field=name=>find('#'+prefix+'-'+name),submit=find('[type=submit]');
    function money(n){return new Intl.NumberFormat(ctx.currency==='INR'?'en-IN':'en-US',{style:'currency',currency:ctx.currency,maximumFractionDigits:0}).format(n);}
    function cancel(){editing=null;submit.textContent='Add expense';find('.event-cancel').hidden=true;field('amount').value='';field('name').value='';}
    function render(){
      find('.event-currency').textContent=ctx.currency;
      find('.event-timing').textContent=mode==='survival'?'Current age '+ctx.age+'. Year 5, month 1 is approximately age '+(ctx.age+4)+'. Expenses are paid at the start of their selected plan month.':mode==='freedom'?'Current age '+ctx.age+'. Year 5, month 1 is approximately age '+(ctx.age+4)+'. Expenses are paid at month-end and included before and after freedom.':'Expenses are paid at the end of their selected month, after SIP and extra deposits.';
      const list=find('.event-list');list.replaceChildren();
      const items=load(mode,ctx.currency);
      if(!items.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No life expenses yet. Add a goal or test an unexpected cost.';list.append(empty);}
      for(const [index,e] of items.entries()){
        const row=document.createElement('div');row.className='event-row';
        const detail=document.createElement('div'),title=document.createElement('strong'),note=document.createElement('p');title.textContent=e.name;
        const outside=monthIndex(e)>ctx.months;
        note.className='helper';note.textContent='Year '+e.year+', month '+e.month+' · '+money(e.amount)+(e.inflate?' today → '+money(cost(e,ctx.inflation,mode==='growth'?'end':'start'))+' at event':' at event')+(['survival','freedom'].includes(mode)?' · Approx. age '+(ctx.age+e.year-1+(e.month-1)/12).toFixed(1):'')+(outside?' · Outside plan, excluded':'')+(!e.enabled?' · Paused':'');
        detail.append(title,note);row.append(detail);
        const actions=document.createElement('div');actions.className='event-row-actions';
        for(const action of ['Edit',e.enabled?'Pause':'Include','Remove']){
          const button=document.createElement('button');button.type='button';button.className='tiny ghost';button.textContent=action;button.setAttribute('aria-label',action+' '+e.name);
          button.onclick=()=>{
            if(action==='Edit'){editing=index;field('type').value=categories.includes(e.category)?e.category:'Custom expense';field('name').value=e.name;field('amount').value=e.amount;field('year').value=e.year;field('month').value=e.month;field('basis').value=e.inflate?'today':'future';submit.textContent='Save expense';find('.event-cancel').hidden=false;field('name').focus();return;}
            const next=load(mode,ctx.currency);if(action==='Remove')next.splice(index,1);else next[index]={...next[index],enabled:!next[index].enabled};save(mode,ctx.currency,next);cancel();render();onChange();find('.event-status').textContent=action==='Remove'?'Expense removed.':'Scenario updated.';
          };actions.append(button);
        }row.append(actions);list.append(row);
      }
    }
    find('form').onsubmit=event=>{
      event.preventDefault();try{
        const items=load(mode,ctx.currency),expense={name:field('name').value.trim()||field('type').value,category:field('type').value,amount:Number(field('amount').value),year:Number(field('year').value),month:Number(field('month').value),inflate:field('basis').value==='today',enabled:editing===null?true:items[editing].enabled};
        if(editing===null)items.push(expense);else items[editing]=expense;save(mode,ctx.currency,items);cancel();find('.event-error').textContent='';render();onChange();find('.event-status').textContent='Expense saved. Projections updated.';
      }catch(e){find('.event-error').textContent=e.message;}
    };
    find('.event-cancel').onclick=cancel;render();
    return {refresh(next){if(next.currency!==ctx.currency)cancel();ctx=next;render();},impact(text){find('.event-impact').textContent=text;},reset(next){ctx=next;find('form').reset();cancel();find('.event-error').textContent='';find('.event-status').textContent='';find('.event-impact').textContent='';render();}};
  }
  const api={validate,load,save,monthIndex,cost,scheduled,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LifeEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this);
