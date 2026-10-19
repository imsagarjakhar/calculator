'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {projectPlan}=require('./growth-engine');
const {projectSurvival}=require('./survival-engine');
const expense=(overrides={})=>({name:'Audit event',amount:1000,year:1,month:1,inflate:true,enabled:true,...overrides});
const close=(a,b,label='value')=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-10),`${label}: ${a} != ${b}`);
let seed=1847;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
// Independent future-value sum: each contribution / withdrawal compounds only
// for the months after its end-of-month payment, without using engine helpers.
function growthFormula(a,extras,events){
 let value=0,paid=0,total=0;
 for(let m=1;m<=a.years*12;m++){
  const sip=a.monthly*(1+a.stepup/100)**Math.floor((m-1)/12);
  const additional=extras.filter(e=>(e.year-1)*12+e.month===m).reduce((sum,e)=>sum+e.amount,0);
  const cost=events.filter(e=>e.enabled&&(e.year-1)*12+e.month===m).reduce((sum,e)=>sum+e.amount*(e.inflate?(1+a.inflation/100)**(m/12):1),0);
  value+=(sip+additional-cost)*(1+a.rate/1200)**(a.years*12-m);paid+=cost;total+=sip+additional;
 }
 return {value,paid,total};
}
const base={monthly:5000,stepup:10,years:5,rate:8,goal:1e8,inflation:6};
const endCost=projectPlan({...base,years:1,rate:0},[],[expense({month:12,amount:10000})]);
close(endCost.expenseDue,10600,'end-of-year inflation');
close(endCost.balance,49400,'end-of-year withdrawal');
for(let i=0;i<100;i++){
 const a={...base,years:1+Math.floor(random()*10),rate:-20+random()*50,stepup:random()*25,inflation:random()*12};
 const extras=[{year:1,month:3,amount:1200},{year:a.years,month:12,amount:2500},{year:a.years+1,month:1,amount:999999}];
 const events=[expense(),expense({year:a.years,month:12,inflate:false}),expense({enabled:false,amount:999999}),expense({year:a.years+1,amount:999999})];
 const actual=projectPlan(a,extras,events),expected=growthFormula(a,extras,events);
 close(actual.balance,expected.value,'growth formula');close(actual.expensePaid,expected.paid);close(actual.total,expected.total);
 close(actual.total+actual.growth-actual.expensePaid,actual.balance,'growth reconciliation');
 const noExtras=growthFormula(a,[],events);close(actual.baseline,noExtras.value,'without extras');
 for(const year of actual.years){const months=actual.months.filter(m=>m.year===year.year);
  for(const field of ['growth','regular','extra','expense','shortfall','expenseDue'])close(year[field],months.reduce((sum,m)=>sum+m[field],0),'annual '+field);
 }
}
// Independent monthly closed-form annuity calculation for Survival. The engine
// iterates daily; this reference applies a geometric sum to each complete month.
function boundary(start,index){
 const target=new Date(Date.UTC(start.getFullYear(),start.getMonth()+index,1));
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(start.getDate(),last));return Number(target);
}
function survivalFormula(a,start,events){
 let balance=a.corpus,paid=0,withdrawn=0;
 for(let y=0;y<a.endAge-a.age;y++){
  const yearDays=(boundary(start,(y+1)*12)-boundary(start,y*12))/86400000;
  const factor=(1+a.returns/100)**(1/yearDays),rate=factor-1;
  for(let m=0;m<12;m++){
   const index=y*12+m,days=(boundary(start,index+1)-boundary(start,index))/86400000;
   const cost=events.filter(e=>e.enabled&&(e.year-1)*12+e.month-1===index).reduce((s,e)=>s+e.amount*(e.inflate?(1+a.inflation/100)**(index/12):1),0);
   const budget=a.swp*(1+a.inflation/100)**y;
   const accumulated=rate===0?days:(factor**days-1)/rate;
   balance=(balance-cost)*factor**days-budget/days*accumulated;paid+=cost;withdrawn+=budget;
  }
 }
 return {balance,paid,withdrawn};
}
const starts=[new Date(2024,1,29),new Date(2023,0,31),new Date(2026,9,19),new Date(2024,2,10)];
for(const start of starts){
 const a={corpus:100000,age:40,endAge:42,swp:1000,returns:0,inflation:10};
 const actual=projectSurvival(a,start);close(actual.rows[0].withdrawals,12000);close(actual.rows[1].withdrawals,13200);close(actual.balance,74800);
}
for(let i=0;i<60;i++){
 const a={corpus:1e8,age:40,endAge:42+Math.floor(random()*5),swp:1000+random()*2000,returns:-20+random()*40,inflation:random()*10};
 const start=starts[i%starts.length],events=[expense(),expense({year:2,month:4,amount:5000}),expense({enabled:false}),expense({year:20})];
 const actual=projectSurvival(a,start,events),expected=survivalFormula(a,start,events);
 close(actual.balance,expected.balance,'survival monthly formula');close(actual.expensePaid,expected.paid);close(actual.totalWithdrawn,expected.withdrawn);
 close(a.corpus+actual.totalGrowth-actual.totalWithdrawn-actual.expensePaid,actual.balance,'survival reconciliation');
 for(const row of actual.rows)close(row.opening+row.growth-row.withdrawals-row.expense,row.balance,'survival row');
 assert.equal(actual.depleted,false);close(actual.days,(boundary(start,(a.endAge-a.age)*12)-boundary(start,0))/86400000);
}
// Explicit unfunded event, fractional final day, step-up boundary, and goal timing.
let g=projectPlan({...base,years:2,rate:0,goal:65000});
close(g.months[11].regular,5000);close(g.months[12].regular,5500);assert.equal(g.hit,13);
g=projectPlan({...base,years:1,rate:0,goal:5000},[],[expense({amount:8000,inflate:false})]);
assert.equal(g.hit,2);close(g.expenseShortfall,3000);close(g.months[0].balance,0);
const partial=projectSurvival({corpus:500,age:40,endAge:41,swp:1000,returns:0,inflation:0},new Date(2024,0,31));
close(partial.days,14.5,'partial plan-month day');

// Run the actual Growth table and CSV functions in a small output harness.
// This checks generated values/column counts without requiring browser rendering.
const html=fs.readFileSync('index.html','utf8');
const nodes=new Map();
const el=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='yearFilter'?'all':id==='pageSize'?'12':'',setAttribute(){},innerHTML:'',textContent:''});return nodes.get(id);};
const a={...base,years:2};const o=projectPlan(a,[{year:1,month:3,amount:1500,note:'Note, with "quotes"'}],[expense(),expense({year:2,month:12})]);
const context=vm.createContext({current:{a,o},view:'yearly',page:1,el,currency:'INR',selected:'MF',presets:{MF:{name:'Equity Mutual Fund'}},pct:n=>n+'%',amountText:n=>String(Math.round(n))});
vm.runInContext(html.slice(html.indexOf('function yearHeader()'),html.indexOf('function focusExtra(')),context);
vm.runInContext(html.slice(html.indexOf('function csvCell('),html.indexOf('function downloadCSV(')),context);
function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;text=text.replace(/^\ufeff/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;
 }row.push(cell);rows.push(row);return rows;
}
for(const which of ['yearly','monthly']){
 context.view=which;vm.runInContext('renderTable()',context);
 const headColumns=(el('tableHead').innerHTML.match(/scope="col"/g)||[]).length;
 assert.equal(headColumns,13);
 for(const row of el('tableBody').innerHTML.matchAll(/<tr[^>]*>(.*?)<\/tr>/g))assert.equal((row[1].match(/<t[dh][\s>]/g)||[]).length,headColumns);
 const csv=parseCSV(vm.runInContext(`makeCSV('${which}')`,context));
 for(const row of csv.slice(1))assert.equal(row.length,csv[0].length);
 const rows=which==='yearly'?o.years:o.months;
 for(let i=0;i<rows.length;i++)for(const [header,field] of [['Life expenses due','expenseDue'],['Life expenses funded','expense'],['Life expenses unfunded','shortfall']])close(Number(csv[i+1][csv[0].indexOf(header)]),Number(rows[i][field].toFixed(2)));
}
// Exercise the actual Survival update and download handler with captured outputs.
async function checkSurvivalOutput(){
 const source=fs.readFileSync('survival.js','utf8'),sNodes=new Map();let captured;
 const input={corpus:100000,age:40,swp:1000,inflation:6,returns:8,endAge:42,currency:'INR'};
 const get=id=>{if(!sNodes.has(id))sNodes.set(id,{value:String(input[id.slice(2)]??''),setAttribute(){},replaceChildren(){this.innerHTML='';},innerHTML:'',textContent:''});return sNodes.get(id);};
 const testEvents=[expense({month:3}),expense({year:2,month:4})];
 const ctx=vm.createContext({get,ranges:{corpus:[0,1e12],age:[18,119],swp:[0,1e9],inflation:[0,30],returns:[-50,40],endAge:[19,120]},labels:{},last:null,eventsEditor:null,
  projectSurvival:(a,unused,events)=>projectSurvival(a,new Date(2024,1,29),events),requiredCorpus:(a,unused,events)=>require('./survival-engine').requiredCorpus(a,new Date(2024,1,29),events),LifeEvents:{load:()=>testEvents},format:n=>String(Math.round(n)),
  localStorage:{setItem(){}},document:{querySelectorAll:()=>[],body:{append(){}},createElement:()=>({click(){},remove(){}})},
  Blob,URL:{createObjectURL(blob){captured=blob;return 'test-download';},revokeObjectURL(){}},setTimeout:fn=>fn()});
 vm.runInContext(source.slice(source.indexOf('  function read()'),source.indexOf('  function restore(')),ctx);
 vm.runInContext('update()',ctx);assert.equal(get('survivalError').textContent,'');
 for(const row of get('survivalRows').innerHTML.matchAll(/<tr[^>]*>(.*?)<\/tr>/g))assert.equal((row[1].match(/<t[dh][\s>]/g)||[]).length,8);
 const from=source.indexOf("  get('survivalExport').onclick="),to=source.indexOf('  function showScreen(',from);
 vm.runInContext(source.slice(from,to),ctx);get('survivalExport').onclick();assert.ok(captured);
 const csv=parseCSV(await captured.text()),expected=ctx.last.o.rows;
 assert.equal(csv.length,expected.length+1);
 for(const row of csv.slice(1))assert.equal(row.length,csv[0].length);
 for(let i=0;i<expected.length;i++)for(const [header,field] of [['Closing corpus','balance'],['Life expenses due','expenseDue'],['Life expenses funded','expense'],['Event shortfall','shortfall'],['Funded withdrawals','withdrawals']])close(Number(csv[i+1][csv[0].indexOf(header)]),Number(expected[i][field].toFixed(2)));
 console.log('Audit passed: 100 independent Growth scenarios, 60 monthly-formula Survival scenarios, leap/month-end starts, timing boundaries, balances, and both calculators’ table/CSV output.');
}
checkSurvivalOutput().catch(error=>{console.error(error);process.exitCode=1;});
