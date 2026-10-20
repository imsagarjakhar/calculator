'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./calculator-report'),B=require('./bucket-engine'),F=require('./freedom-engine'),G=require('./growth-engine'),S=require('./survival-engine'),Life=require('./life-events'),Custom=require('./custom-engine'),CR=require('./custom-report');
const canonical=value=>JSON.parse(JSON.stringify(value));
class Node{
 constructor(id){this.id=id;this.value='';this.hidden=false;this.textContent='';this.innerHTML='';this.dataset={};this.attrs={};this.options=[];this.listeners={};this.files=[];this.style={};this.classList={add(){},remove(){},toggle(){}};}
 get value(){return this._value;}set value(value){this._value=String(value);}
 addEventListener(key,fn){this.listeners[key]=fn;}setAttribute(key,value){this.attrs[key]=value;}
 replaceChildren(...items){this.innerHTML='';this.options=items;}append(){}add(item){this.options.push(item);}
 focus(){}scrollIntoView(){}click(){this.clicked=true;}reset(){}remove(){}
}
function environment(){
 const nodes=new Map(),stored=new Map([['unrelated-plan','keep-me']]),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
 const localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const editor=()=>({refresh(){},reset(){},impact(){}});
 const life={...Life,load:(mode,currency)=>Life.validate(JSON.parse(stored.get('life-events-v1-'+mode+'-'+currency)||'[]')),save:(mode,currency,items)=>{const clean=Life.validate(items);stored.set('life-events-v1-'+mode+'-'+currency,JSON.stringify(clean));return clean;},mount:editor};
 let download;
 const context=vm.createContext({CalculatorReport:{...R,download(html){download=html;}},BucketPlanner:B,FinancialFreedom:F,GrowthEngine:G,LifeEvents:life,
  GrowthHoldings:{load:currency=>G.validatePosition(JSON.parse(stored.get('growth-position-v1-'+currency)||'{}')),save:(currency,value)=>stored.set('growth-position-v1-'+currency,JSON.stringify(G.validatePosition(value))),mount:editor},
  window:{CorpusSurvival:S,addEventListener(){}},localStorage,location:{hash:'',pathname:'/',search:''},history:{pushState(){}},
  document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new Node('created'),createTextNode:text=>({textContent:text}),documentElement:{style:{setProperty(){}}},body:new Node('body')},
  Option:function(text,value){this.text=text;this.value=String(value);},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:()=>1,clearTimeout(){}});
 return {context,get,stored,download:()=>download};
}
async function upload(env,prefix,text,size=Buffer.byteLength(text)){
 env.get(prefix+'ImportFile').files=[{size,text:async()=>text}];await env.get(prefix+'ImportFile').onchange();
 return env.get(prefix+'ImportStatus').textContent;
}
function report(kind,inputs,events=[],rest={}){return R.build({kind,title:'Import fixture',currency:inputs.currency,inputs,snapshot:{inputs,events,...rest},metrics:[],points:[],sections:[],notes:[]});}
const event={name:'Repair <script>never run</script>',amount:5000,year:2,month:3,inflate:false,enabled:true};
async function main(){
 // Parse only the data block; hostile HTML and edited results are never executed.
 const bucketInputs={...B.defaults,startMonth:'2026-10',endAge:63,refillMonths:24},bucketEvents=[{id:'extra',name:event.name,amount:25000,month:5,inflate:false,refill:'scheduled'}];
 const bucketHtml=report('buckets',bucketInputs,bucketEvents,{inspection:{month:4,phase:'emergencyWithdrawal'},results:{ending:'untrusted'}});
 assert.deepEqual(R.read('<script>throw Error("must not run")</script>'+bucketHtml,'buckets').inputs,bucketInputs);
 assert.throws(()=>R.read(bucketHtml,'freedom'),/Bucket Plan report/);
 assert.throws(()=>R.read(bucketHtml+bucketHtml,'buckets'),/No valid saved/);
 assert.throws(()=>R.read('<html>PDF or CSV has no data</html>','buckets'),/original downloaded HTML/);
 const raw=R.read(bucketHtml,'buckets');assert.deepEqual(R.read('\ufeff'+JSON.stringify(raw),'buckets'),raw);
 assert.throws(()=>R.read(JSON.stringify({...raw,version:99}),'buckets'),/not supported/);
 assert.throws(()=>R.read(JSON.stringify({...raw,events:null}),'buckets'),/expense list/);
 assert.throws(()=>R.read(' '.repeat(R.MAX_FILE_BYTES+1),'buckets'),/10 MB/);
 const custom=Custom.createPlan();assert.deepEqual(CR.read(CR.build(custom)),Custom.validate(custom));
 // Bucket import restores start date, one-off withdrawals, refill policy and selected playback step.
 const bucket=environment();bucket.get('extraWithdrawalPanel').hidden=true;vm.runInContext(fs.readFileSync('bucket-plan.js','utf8'),bucket.context);
 assert.match(await upload(bucket,'bucket',bucketHtml),/^Report imported/);
 const bucketSaved=JSON.parse(bucket.stored.get('intimetec-bucket-preview-v1'));assert.deepEqual(bucketSaved.settings,bucketInputs);assert.deepEqual(bucketSaved.events,bucketEvents);
 assert.equal(bucket.get('bucketDate').value,'2027-02');assert.match(bucket.get('bucketStageStatus').textContent,/extra withdrawal paid/);assert.match(bucket.get('bucketEvents').innerHTML,/&lt;script&gt;/);
 const previous=bucket.stored.get('intimetec-bucket-preview-v1');
 assert.match(await upload(bucket,'bucket',report('buckets',{...bucketInputs,monthly:-1},bucketEvents)),/^Import not applied/);assert.equal(bucket.stored.get('intimetec-bucket-preview-v1'),previous);
 assert.match(await upload(bucket,'bucket',bucketHtml,R.MAX_FILE_BYTES+1),/10 MB/);assert.equal(bucket.stored.get('intimetec-bucket-preview-v1'),previous);
 bucket.get('bucketImport').onclick();assert.equal(bucket.get('bucketImportFile').clicked,true);
 // Freedom restores every assumption and paused / outside-horizon expenses, then exports again.
 const freedom=environment();vm.runInContext(fs.readFileSync('freedom.js','utf8'),freedom.context);
 const fa={...F.defaults,currency:'USD',age:35,targetAge:40,endAge:50,monthlyInvestment:500,corpus:120000};
 const expenses=[event,{...event,name:'Paused',enabled:false},{...event,name:'Later',year:120}];
 const fh=R.freedom({a:fa,events:expenses,o:F.project(fa,expenses)});
 assert.match(await upload(freedom,'freedom',fh),/^Report imported/);assert.deepEqual(JSON.parse(freedom.stored.get('intimetec-freedom-v1')),fa);
 assert.deepEqual(JSON.parse(freedom.stored.get('life-events-v1-freedom-USD')),expenses);
 freedom.get('freedomReport').onclick();assert.deepEqual(R.read(freedom.download(),'freedom').inputs,fa);
 const freedomBefore=JSON.stringify([...freedom.stored]);assert.match(await upload(freedom,'freedom',bucketHtml),/Bucket Plan report/);assert.equal(JSON.stringify([...freedom.stored]),freedomBefore);
 // Execute real Growth validation/restoration and recalculation, including assets, debt and extras.
 const growth=environment(),inline=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(inline.slice(0,inline.indexOf("for(let m=1;m<=12;m++)el('extraMonth')")),growth.context);
 vm.runInContext(inline.slice(inline.indexOf('CalculatorReport.bindImport('),inline.indexOf("el('growthReport').onclick")),growth.context);
 const ga={monthly:1200,stepup:5,years:3,rate:8,goal:500000,inflation:4},position={assets:[{name:'Fund',amount:50000,rate:5,liquid:true}],loans:[{name:'Loan',balance:20000,rate:6,emi:700,source:'income'}]},extras=[{year:1,month:4,amount:10000,note:'Bonus'},{year:5,month:1,amount:4000,note:'Later'}];
 const gh=R.growth({a:ga,o:G.projectPlan(ga,extras,expenses,position),extras,events:expenses,position,currency:'SAR',scenario:'Gold'});
 assert.match(await upload(growth,'growth',gh),/^Report imported/);assert.equal(growth.get('error').hidden,true,growth.get('error').textContent);
 const growthSaved=JSON.parse(growth.stored.get('InTimeTec-investment-planner-v2'));assert.equal(growthSaved.currency,'SAR');assert.equal(growthSaved.selected,'Gold');assert.deepEqual(growthSaved.inputs,ga);assert.equal(growthSaved.extras.length,2);
 assert.deepEqual(JSON.parse(growth.stored.get('growth-position-v1-SAR')),G.validatePosition(position));assert.deepEqual(JSON.parse(growth.stored.get('life-events-v1-growth-SAR')),expenses);
 const importedResult=canonical(vm.runInContext('current.o',growth.context));assert.deepEqual(importedResult,canonical(G.projectPlan(ga,extras,expenses,position)));
 const growthBefore=JSON.stringify([...growth.stored]);assert.match(await upload(growth,'growth',report('growth',{...ga,currency:'SAR'},expenses,{scenario:'Gold',extras,position:{assets:[{name:'Bad',amount:-1}],loans:[]}})),/^Import not applied/);assert.equal(JSON.stringify([...growth.stored]),growthBefore);
 // Survival retains original dates (including leap-day), rather than shifting events to today.
 const survival=environment();vm.runInContext(fs.readFileSync('survival.js','utf8'),survival.context);assert.equal(survival.get('survivalError').textContent,'');
 const sa={currency:'EUR',corpus:900000,age:45,swp:1500,inflation:3,returns:5,endAge:49},start=new Date(2024,1,29),so=S.projectSurvival(sa,start,expenses);
 const sh=R.survival({a:sa,o:so,events:expenses,needed:S.requiredCorpus(sa,start,expenses)});
 assert.match(await upload(survival,'survival',sh),/^Report imported/);assert.equal(survival.get('survivalError').textContent,'');
 assert.equal(JSON.parse(survival.stored.get('corpus-survival-v1')).projectionStart,'2024-02-29T00:00:00.000Z');assert.match(survival.get('survivalStartStatus').textContent,/29 Feb 2024/);
 survival.get('survivalReport').onclick();const restored=R.read(survival.download(),'survival');assert.deepEqual(restored.inputs,sa);assert.equal(restored.projectionStart,'2024-02-29T00:00:00.000Z');assert.deepEqual(restored.results,canonical(so));
 const beforeDate=JSON.stringify([...survival.stored]);assert.match(await upload(survival,'survival',report('survival',sa,expenses,{projectionStart:'invalid'})),/^Import not applied/);assert.equal(JSON.stringify([...survival.stored]),beforeDate);
 survival.get('s-swp').value=1600;survival.get('survivalForm').listeners.input();assert.equal(JSON.parse(survival.stored.get('corpus-survival-v1')).projectionStart,'2024-02-29T00:00:00.000Z');
 for(const env of [bucket,freedom,growth,survival])assert.equal(env.stored.get('unrelated-plan'),'keep-me');
 // Every calculator exposes its import entry point; Custom Plan keeps its existing reviewed import.
 for(const [file,id] of [['index.html','growthImport'],['survival.js','survivalImport'],['freedom.html','freedomImport'],['bucket-plan.html','bucketImport'],['custom-plan.html','importButton']])assert.ok(fs.readFileSync(file,'utf8').includes('id="'+id+'"'));
 console.log('Report imports passed: all calculators, round trips, original dates, assets/loans/extras, paused/outside expenses, bucket refill policies, wrong files, hostile HTML, invalid data, size limits and isolated storage.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
