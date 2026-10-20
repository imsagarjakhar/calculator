'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let frame,mutation,resize;
const table={},attrs=new Map(),classes=new Set(),wrap={clientWidth:400,scrollWidth:700,querySelector:()=>table,classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}},setAttribute:(k,v)=>attrs.set(k,v),hasAttribute:k=>attrs.has(k),removeAttribute:k=>attrs.delete(k),before(node){this.previousElementSibling=node;}};
const wrappers=[wrap],observed=new Set();
vm.runInNewContext(fs.readFileSync('table-layout.js','utf8'),{
 document:{body:{},querySelectorAll:()=>wrappers,createElement:()=>({})},window:{addEventListener(){}},
 requestAnimationFrame(fn){frame=fn;},ResizeObserver:class{constructor(fn){resize=fn;}observe(n){observed.add(n);}},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}}
});
frame();assert.ok(classes.has('is-scrollable'));assert.equal(attrs.get('tabindex'),'0');assert.equal(wrap.previousElementSibling.hidden,false);assert.ok(observed.has(table));
const hint=wrap.previousElementSibling;
wrap.clientWidth=900;resize();frame();assert.ok(!classes.has('is-scrollable'));assert.equal(attrs.has('tabindex'),false);assert.equal(hint.hidden,true);assert.equal(wrap.previousElementSibling,hint);
wrap.scrollWidth=1200;mutation();frame();assert.equal(attrs.get('tabindex'),'0');assert.equal(hint.hidden,false);
for(const name of ['index.html','custom-plan.html','freedom.html']){const html=fs.readFileSync(name,'utf8');assert.ok(html.includes('href="table-layout.css"'));assert.ok(html.includes('src="table-layout.js"'));}
console.log('Responsive tables passed: overflow-only scroll hints and keyboard focus, resize/content updates, shared styles on every calculator.');
