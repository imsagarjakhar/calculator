(function(){
 'use strict';
 const tracked=new WeakSet();let pending=false;
 function schedule(){if(!pending){pending=true;requestAnimationFrame(refresh);}}
 const resize=new ResizeObserver(schedule);
 function refresh(){
  pending=false;
  for(const wrap of document.querySelectorAll('.table-wrap')){
   if(!tracked.has(wrap)){
    tracked.add(wrap);resize.observe(wrap);
    const hint=document.createElement('p');hint.className='table-scroll-hint';hint.hidden=true;
    hint.textContent='This table has more columns. Swipe or scroll sideways; keyboard users can focus the table and use the arrow keys.';
    wrap.before(hint);
   }
   const table=wrap.querySelector('table');if(table)resize.observe(table);
   const overflowing=wrap.scrollWidth>wrap.clientWidth+1;
   wrap.classList.toggle('is-scrollable',overflowing);wrap.previousElementSibling.hidden=!overflowing;
   if(overflowing){wrap.setAttribute('tabindex','0');if(!wrap.hasAttribute('role'))wrap.setAttribute('role','region');if(!wrap.hasAttribute('aria-label'))wrap.setAttribute('aria-label','Scrollable data table');}
   else wrap.removeAttribute('tabindex');
  }
 }
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('resize',schedule);schedule();
})();
