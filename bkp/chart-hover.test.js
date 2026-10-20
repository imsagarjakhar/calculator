'use strict';
const assert=require('node:assert/strict'),H=require('./chart-hover');
const points=[
 {x:100,ys:[300],title:'Start',rows:[['Net wealth',123456.789]]},
 {x:400,ys:[200],title:'Middle',rows:[['Net wealth',-2345.678]]},
 {x:700,ys:[100],title:'End',rows:[['Net wealth',987654.321]]}
];
assert.equal(H.nearest(points,-10),0);assert.equal(H.nearest(points,900),2);assert.equal(H.nearest(points,380),1);
assert.equal(H.nearest([{x:200,ys:[200]},{x:200,ys:[300]}],200,290),1,'Expense before/after points share an age but differ in balance');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.classList={add(){}};this.clientWidth=400;}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
 replaceChildren(){this.children=[];}
 setAttribute(name,value){this.attrs[name]=String(value);}
 addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);}
 removeEventListener(name,handler){this.listeners[name]=this.listeners[name].filter(x=>x!==handler);}
 getBoundingClientRect(){return this.tagName==='div'?{left:0,top:0,bottom:200,width:250,height:100}:{left:0,top:0,bottom:200,width:400,height:200};}
 fire(name,event={}){for(const handler of this.listeners[name]||[])handler(event);}
}
const host=new Element('section'),svg=new Element('svg');svg.viewBox={baseVal:{width:800,height:400}};host.append(svg);
global.document={createElement:tag=>new Element(tag),createElementNS:(ns,tag)=>new Element(tag)};
function flatten(node){return [node.textContent||'',...node.children.map(flatten)].join(' ');}
const attach=currency=>H.attach(svg,{points,currency,top:25,bottom:350});
attach('INR');let tip=host.children.find(n=>n.className==='chart-tooltip');assert.equal(tip.hidden,true);
svg.fire('focus');assert.ok(flatten(tip).includes('1,23,456.79'));assert.equal(tip.hidden,false);
svg.fire('pointermove',{clientX:200,clientY:100});assert.ok(flatten(tip).includes('Middle'));assert.ok(flatten(tip).includes('-INR'));assert.ok(flatten(tip).includes('2,345.68'));
svg.fire('pointerleave',{pointerType:'mouse'});assert.equal(tip.hidden,true);
svg.fire('pointerdown',{clientX:350,clientY:50});svg.fire('pointerleave',{pointerType:'touch'});assert.equal(tip.hidden,false);assert.ok(flatten(tip).includes('End'));
let prevented=false;svg.fire('keydown',{key:'Home',preventDefault(){prevented=true;}});assert.ok(prevented);assert.ok(flatten(tip).includes('Start'));
svg.fire('keydown',{key:'ArrowRight',preventDefault(){}});assert.ok(flatten(tip).includes('Middle'));
svg.fire('keydown',{key:'End',preventDefault(){}});assert.ok(flatten(tip).includes('End'));
svg.fire('keydown',{key:'Escape'});assert.equal(tip.hidden,true);
attach('USD');tip=host.children.find(n=>n.className==='chart-tooltip');assert.equal(host.children.filter(n=>n.className==='chart-tooltip').length,1);assert.equal(svg.listeners.pointermove.length,1);
svg.fire('focus');assert.ok(flatten(tip).includes('USD'));assert.ok(flatten(tip).includes('123,456.79'));
assert.equal(svg.attrs.tabindex,'0');assert.equal(svg.attrs['aria-describedby'],tip.id);assert.ok(Number.isFinite(parseFloat(tip.style.left)));
svg.fire('blur');assert.equal(tip.hidden,true);delete global.document;
console.log('Chart hover passed: nearest samples, expense jumps, responsive coordinates, full INR/USD amounts, negatives, touch, keyboard, focus and redraw cleanup.');
