(function(root){
 'use strict';
 // Search the plotted samples rather than interpolating amounts between them.
 function nearest(points,x,y){
  let best=0,dx=Infinity,dy=Infinity;
  points.forEach((point,i)=>{const horizontal=Math.abs(point.x-x),vertical=y===undefined?0:Math.min(...point.ys.map(value=>Math.abs(value-y)));if(horizontal<dx-1e-6||(Math.abs(horizontal-dx)<=1e-6&&vertical<dy)){best=i;dx=horizontal;dy=vertical;}});
  return best;
 }
 const mounts=new WeakMap();let nextId=0;
 function attach(container,{points,currency,top,bottom}){
  mounts.get(container)?.();
  const svg=container.tagName.toLowerCase()==='svg'?container:container.querySelector('svg');
  if(!svg||!points.length)return;
  const host=svg.parentElement;host.classList.add('chart-hover-host');
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.id='chartTooltip'+(++nextId);tooltip.hidden=true;tooltip.setAttribute('role','status');tooltip.setAttribute('aria-live','polite');host.append(tooltip);
  const svgNode=tag=>document.createElementNS('http://www.w3.org/2000/svg',tag),overlay=svgNode('g'),line=svgNode('line');
  overlay.setAttribute('pointer-events','none');overlay.setAttribute('aria-hidden','true');overlay.style.display='none';line.setAttribute('class','chart-hover-line');line.setAttribute('y1',top);line.setAttribute('y2',bottom);overlay.append(line);svg.append(overlay);
  const circles=points[0].ys.map(()=>{const circle=svgNode('circle');circle.setAttribute('r','4');circle.setAttribute('class','chart-hover-dot');overlay.append(circle);return circle;});
  const formatter=new Intl.NumberFormat(currency==='INR'?'en-IN':'en-US',{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2});
  let index=0;
  function geometry(){const rect=svg.getBoundingClientRect(),box=svg.viewBox.baseVal,scale=Math.min(rect.width/box.width,rect.height/box.height);return {rect,scale,offsetX:(rect.width-box.width*scale)/2,offsetY:(rect.height-box.height*scale)/2};}
  function hide(){tooltip.hidden=true;overlay.style.display='none';}
  function show(i){
   index=Math.max(0,Math.min(points.length-1,i));const point=points[index];
   tooltip.replaceChildren();const title=document.createElement('strong');title.textContent=point.title;tooltip.append(title);
   for(const [name,value] of point.rows){const row=document.createElement('div'),label=document.createElement('span'),amount=document.createElement('b');label.textContent=name;amount.textContent=formatter.format(value);row.append(label,amount);tooltip.append(row);}
   const note=document.createElement('small');note.textContent='Projected amounts · '+currency;tooltip.append(note);tooltip.hidden=false;overlay.style.display='';
   line.setAttribute('x1',point.x);line.setAttribute('x2',point.x);
   circles.forEach((circle,j)=>{circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.ys[j]);});
   const {rect,scale,offsetX,offsetY}=geometry(),bounds=host.getBoundingClientRect(),tip=tooltip.getBoundingClientRect();
   const left=rect.left-bounds.left+offsetX+point.x*scale+12,above=rect.top-bounds.top+offsetY+Math.min(...point.ys)*scale-tip.height-12;
   tooltip.style.left=Math.max(8,Math.min(left,host.clientWidth-tip.width-8))+'px';
   tooltip.style.top=Math.max(0,Math.min(above,rect.bottom-bounds.top-tip.height))+'px';
  }
  function pointer(event){const {rect,scale,offsetX,offsetY}=geometry();if(!scale)return;show(nearest(points,(event.clientX-rect.left-offsetX)/scale,(event.clientY-rect.top-offsetY)/scale));}
  function keydown(event){const delta={ArrowLeft:-1,ArrowRight:1}[event.key];if(event.key==='Escape'){hide();return;}if(delta===undefined&&!['Home','End'].includes(event.key))return;event.preventDefault();show(event.key==='Home'?0:event.key==='End'?points.length-1:index+delta);}
  const focus=()=>show(index),leave=event=>{if(event.pointerType!=='touch')hide();};
  svg.setAttribute('tabindex','0');svg.setAttribute('aria-describedby',tooltip.id);svg.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End Escape');
  svg.setAttribute('aria-description','Hover or tap for projected amounts. Use left and right arrow keys to inspect points; Home and End for the first and last point. Escape closes the details.');
  const events={pointermove:pointer,pointerdown:pointer,pointerleave:leave,pointercancel:hide,keydown,focus,blur:hide};
  for(const [name,handler] of Object.entries(events))svg.addEventListener(name,handler);
  mounts.set(container,()=>{for(const [name,handler] of Object.entries(events))svg.removeEventListener(name,handler);tooltip.remove();overlay.remove();});
 }
 const api={attach,nearest};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartHover=api;
})(typeof globalThis!=='undefined'?globalThis:this);
