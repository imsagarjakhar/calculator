(function(){
 'use strict';
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const pad=n=>String(n).padStart(2,'0'),key=(y,m,d)=>y+'-'+pad(m+1)+(d===undefined?'':'-'+pad(d));
 const today=()=>{const d=new Date();return key(d.getFullYear(),d.getMonth(),d.getDate());};
 const fields=[],dialog=document.createElement('dialog');
 dialog.className='calendar-dialog';dialog.setAttribute('aria-labelledby','calendarTitle');
 dialog.innerHTML='<div class="calendar-top"><div><p class="calendar-eyebrow">CHOOSE YOUR DATE</p><h2 id="calendarTitle"></h2></div><button type="button" class="calendar-close" aria-label="Close calendar">×</button></div><p class="calendar-help" id="calendarHelp"></p><div class="calendar-controls"><button type="button" data-nav="-1" aria-label="Previous">‹</button><label class="calendar-month-label"><span class="sr-only">Month</span><select class="calendar-month"></select></label><label class="calendar-year-label"><span class="sr-only">Year</span><input class="calendar-year" type="number" min="1900" max="2250" step="1" aria-label="Year"></label><button type="button" data-nav="1" aria-label="Next">›</button></div><p class="calendar-period" aria-live="polite"></p><div class="calendar-weekdays" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="calendar-grid"></div><p class="calendar-message" role="status"></p><div class="calendar-footer"><button type="button" class="calendar-today">Today</button><button type="button" class="calendar-cancel">Cancel</button></div>';
 document.body.append(dialog);
 const get=s=>dialog.querySelector(s),yearInput=get('.calendar-year'),monthSelect=get('.calendar-month'),grid=get('.calendar-grid');
 months.forEach((month,i)=>monthSelect.add(new Option(month,String(i))));
 let active=null,year,month;
 const limit=(field,which)=>field.input[which]|| (which==='min'?'1900-01'+(field.kind==='date'?'-01':''):'2250-12'+(field.kind==='date'?'-31':''));
 const allowed=value=>value>=limit(active,'min')&&value<=limit(active,'max');
 function format(field){
  const value=field.input.value;if(!value)return field.kind==='month'?'Select month & year':'Select date';
  const [y,m,d]=value.split('-').map(Number);return (field.kind==='date'?d+' ':'')+months[m-1]+' '+y;
 }
 function refresh(){for(const field of fields){field.text.textContent=format(field);field.button.disabled=field.input.disabled;field.button.setAttribute('aria-label',field.name+': '+format(field));field.button.classList.toggle('calendar-empty',!field.input.value);}}
 function choose(value){
  if(!allowed(value))return;
  active.input.value=value;
  active.input.dispatchEvent(new Event('input',{bubbles:true}));
  active.input.dispatchEvent(new Event('change',{bubbles:true}));
  refresh();dialog.close();
 }
 function render(){
  const isMonth=active.kind==='month',min=limit(active,'min'),max=limit(active,'max');
  if(!isMonth){
   if(key(year,month)<min.slice(0,7))month=Number(min.slice(5,7))-1;
   if(key(year,month)>max.slice(0,7))month=Number(max.slice(5,7))-1;
  }
  yearInput.value=year;yearInput.min=Number(min.slice(0,4));yearInput.max=Number(max.slice(0,4));monthSelect.value=month;
  get('.calendar-month-label').hidden=isMonth;get('.calendar-weekdays').hidden=isMonth;
  grid.className='calendar-grid '+(isMonth?'calendar-month-grid':'calendar-day-grid');grid.replaceChildren();
  get('.calendar-period').textContent=isMonth?String(year):months[month]+' '+year;
  const count=isMonth?12:new Date(Date.UTC(year,month+1,0)).getUTCDate();
  const offset=isMonth?0:(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
  for(let i=0;i<offset;i++){const space=document.createElement('span');space.setAttribute('aria-hidden','true');grid.append(space);}
  for(let i=0;i<count;i++){
   const value=isMonth?key(year,i):key(year,month,i+1),button=document.createElement('button');
   button.type='button';button.textContent=isMonth?months[i].slice(0,3):i+1;button.dataset.value=value;button.disabled=!allowed(value);
   button.setAttribute('aria-label',isMonth?months[i]+' '+year:(i+1)+' '+months[month]+' '+year);
   button.setAttribute('aria-pressed',String(value===active.input.value));
   if(value===today().slice(0,isMonth?7:10))button.setAttribute('aria-current','date');
   button.onclick=()=>choose(value);grid.append(button);
  }
  const buttons=[...grid.querySelectorAll('button:not(:disabled)')],selected=buttons.find(b=>b.dataset.value===active.input.value);
  for(const button of buttons)button.tabIndex=button===(selected||buttons[0])?0:-1;
  for(const button of dialog.querySelectorAll('[data-nav]')){
   const delta=Number(button.dataset.nav),next=new Date(Date.UTC(year+(isMonth?delta:0),month+(isMonth?0:delta),1));
   const first=key(next.getUTCFullYear(),isMonth?0:next.getUTCMonth(),isMonth?undefined:1),last=isMonth?key(next.getUTCFullYear(),11):key(next.getUTCFullYear(),next.getUTCMonth(),new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate());
   button.disabled=last<min||first>max;button.setAttribute('aria-label',(delta<0?'Previous ':'Next ')+(isMonth?'year':'month'));
  }
  const now=today().slice(0,isMonth?7:10);get('.calendar-today').textContent=isMonth?'This month':'Today';get('.calendar-today').disabled=!allowed(now);
 }
 function open(field){
  if(field.input.disabled)return;active=field;
  const value=field.input.value||today().slice(0,field.kind==='month'?7:10),bounded=value<limit(field,'min')?limit(field,'min'):value>limit(field,'max')?limit(field,'max'):value;
  [year,month]=bounded.split('-').map(Number);month--;
  get('#calendarTitle').textContent=field.name;get('.calendar-eyebrow').textContent=field.kind==='month'?'CHOOSE A MONTH':'CHOOSE A DATE';
  get('#calendarHelp').textContent=field.kind==='month'?'Enter a year, then select a month.':'Choose a month and year, then select a day.';
  get('.calendar-message').textContent='';field.button.setAttribute('aria-expanded','true');render();dialog.showModal();
  (grid.querySelector('[aria-pressed="true"]:not(:disabled)')||grid.querySelector('button:not(:disabled)')||yearInput).focus();
 }
 for(const input of document.querySelectorAll('input[type="month"],input[type="date"]')){
  const label=input.closest('label'),name=label?.firstChild.textContent.trim()||'Select date',kind=input.type;
  const wrapper=document.createElement('span'),button=document.createElement('button'),text=document.createElement('span');
  wrapper.className='calendar-field';button.type='button';button.className='calendar-trigger';button.append(text);
  const icon=document.createElement('span');icon.className='calendar-icon';icon.setAttribute('aria-hidden','true');button.append(icon);
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
  input.before(wrapper);wrapper.append(input,button);input.classList.add('calendar-native');input.tabIndex=-1;
  const field={input,button,text,kind,name};fields.push(field);button.onclick=()=>open(field);
  input.addEventListener('invalid',event=>{event.preventDefault();if(!dialog.open){open(field);get('.calendar-message').textContent=input.validationMessage;}});
  input.addEventListener('focus',()=>{if(!dialog.open)open(field);});
  input.addEventListener('input',refresh);input.addEventListener('change',refresh);
 }
 get('.calendar-close').onclick=get('.calendar-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(active){active.button.setAttribute('aria-expanded','false');active.button.focus();}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 get('.calendar-today').onclick=()=>choose(today().slice(0,active.kind==='month'?7:10));
 for(const button of dialog.querySelectorAll('[data-nav]'))button.onclick=()=>{const delta=Number(button.dataset.nav);if(active.kind==='month')year+=delta;else{const date=new Date(Date.UTC(year,month+delta,1));year=date.getUTCFullYear();month=date.getUTCMonth();}render();};
 function changeYear(report){const value=Number(yearInput.value);if(Number.isInteger(value)&&value>=Number(yearInput.min)&&value<=Number(yearInput.max)){get('.calendar-message').textContent='';if(year!==value){year=value;render();}}else if(report){get('.calendar-message').textContent='Enter a year from '+yearInput.min+' to '+yearInput.max+'.';}}
 yearInput.oninput=()=>changeYear(false);
 yearInput.onchange=()=>changeYear(true);
 monthSelect.onchange=()=>{month=Number(monthSelect.value);render();};
 grid.addEventListener('keydown',event=>{
  const columns=active.kind==='month'?3:7,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
  if(delta===undefined)return;event.preventDefault();
  const buttons=[...grid.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);let next=index+delta;
  while(next>=0&&next<buttons.length&&buttons[next].disabled)next+=delta;
  if(buttons[next]&&!buttons[next].disabled){buttons[index].tabIndex=-1;buttons[next].tabIndex=0;buttons[next].focus();}
 });
 window.PlannerCalendar={refresh};refresh();
})();
