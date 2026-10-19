'use strict';
// Run the picker against a minimal DOM surface; browser layout needs separate visual QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let document;
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.value='';this.disabled=false;this.open=false;this.className='';this.classList={add:c=>{this.className+=' '+c;},toggle:(c,on)=>{this.className=this.className.split(' ').filter(x=>x!==c).concat(on?[c]:[]).join(' ');}};}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=v;if(k==='type')this.type=v;if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;}
 append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(c=>c!==item);item.parent=this;this.children.push(item);}}
 before(node){const parent=this.parent,index=parent.children.indexOf(this);parent.children.splice(index,0,node);node.parent=parent;}
 closest(tag){let item=this.parent;while(item&&item.tag!==tag)item=item.parent;return item;}
 matches(selector){
  if(selector.includes(':not(:disabled)')&&this.disabled)return false;
  selector=selector.replace(':not(:disabled)','');
  if(selector==='button')return this.tag==='button';
  if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
  if(selector.startsWith('#'))return this.attrs.id===selector.slice(1);
  if(selector.startsWith('input['))return this.tag==='input'&&this.type===selector.match(/"(.*?)"/)[1];
  const attr=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if(!attr)return false;
  const value=attr[1].startsWith('data-')?this.dataset[attr[1].slice(5)]:this.attrs[attr[1]];
  return value!==undefined&&(attr[2]===undefined||value===attr[2]);
 }
 querySelectorAll(selector){const found=[];const visit=node=>{for(const child of node.children){if(selector.split(',').some(s=>child.matches(s.trim())))found.push(child);visit(child);}};visit(this);return found;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 set innerHTML(html){
  this.children=[];let stack=[this];
  for(const match of html.matchAll(/<\/?[^>]+>/g)){
   if(match[0].startsWith('</')){stack.pop();continue;}
   const tag=match[0].match(/^<(\w+)/)[1],node=new Element(tag);
   for(const a of match[0].matchAll(/([\w-]+)="([^"]*)"/g))node.setAttribute(a[1],a[2]);
   stack.at(-1).append(node);if(!['input'].includes(tag))stack.push(node);
  }
 }
 add(option){this.append(option);}
 replaceChildren(){this.children=[];}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);if(event.type==='input')this.oninput?.(event);if(event.type==='change')this.onchange?.(event);}
 focus(){document.activeElement=this;}
 showModal(){this.open=true;}
 close(){this.open=false;this.dispatchEvent({type:'close'});}
}
const body=new Element('body');document={body,createElement:t=>new Element(t),querySelectorAll:s=>body.querySelectorAll(s)};
function input(kind,value,min,max){const label=new Element('label');label.firstChild={textContent:kind==='month'?'End month':'Loan start date'};const node=new Element('input');node.type=kind;Object.assign(node,{value,min,max});label.append(node);body.append(label);return node;}
const end=input('month','2026-10','2026-10','2027-09'),date=input('date','2024-02-29','1900-01-01','2250-12-31');
const window={};vm.runInNewContext(fs.readFileSync('calendar.js','utf8'),{document,window,Date,Event,Option:function(name,value){const e=new Element('option');e.value=value;return e;}});
const dialog=body.querySelector('.calendar-dialog'),get=s=>dialog.querySelector(s),trigger=node=>node.parent.querySelector('button');
assert.equal(trigger(end).children[0].textContent,'October 2026');trigger(end).onclick();assert.equal(dialog.open,true);
assert.equal(get('.calendar-period').textContent,'2026');assert.equal(get('.calendar-month-label').hidden,true);
assert.equal(get('[data-value="2026-09"]').disabled,true);assert.equal(get('[data-value="2026-10"]').disabled,false);
get('[data-nav="1"]').onclick();assert.equal(get('.calendar-period').textContent,'2027');assert.equal(get('[data-value="2027-10"]').disabled,true);
let changes=0;end.addEventListener('change',()=>changes++);get('[data-value="2027-09"]').onclick();assert.equal(end.value,'2027-09');assert.equal(changes,1);assert.equal(dialog.open,false);assert.equal(document.activeElement,trigger(end));
trigger(end).onclick();get('.calendar-cancel').onclick();assert.equal(end.value,'2027-09');
// Updating a plan/import refreshes the displayed value and dynamic bounds.
end.value='2028-02';end.min='2028-01';end.max='2028-12';window.PlannerCalendar.refresh();assert.equal(trigger(end).children[0].textContent,'February 2028');trigger(end).onclick();assert.equal(get('[data-nav="-1"]').disabled,true);get('.calendar-close').onclick();
trigger(date).onclick();assert.equal(get('.calendar-month-label').hidden,false);assert.equal(get('.calendar-grid').querySelectorAll('button').length,29);
get('.calendar-year').value='2025';get('.calendar-year').onchange();assert.equal(get('.calendar-grid').querySelectorAll('button').length,28);
get('.calendar-month').value='0';get('.calendar-month').onchange();assert.equal(get('.calendar-grid').querySelectorAll('button').length,31);
get('[data-value="2025-01-15"]').focus();let prevented=false;get('.calendar-grid').dispatchEvent({type:'keydown',key:'ArrowDown',preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(document.activeElement.dataset.value,'2025-01-22');
get('[data-value="2025-01-22"]').onclick();assert.equal(date.value,'2025-01-22');assert.equal(dialog.open,false);
date.disabled=true;window.PlannerCalendar.refresh();assert.equal(trigger(date).disabled,true);
console.log('Calendar passed: month/year selection, dynamic limits, cancel/focus return, change events, restored values, leap-year days, keyboard movement and disabled fields.');
