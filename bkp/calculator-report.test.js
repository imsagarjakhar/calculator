'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),R=require('./calculator-report'),G=require('./growth-engine'),F=require('./freedom-engine'),S=require('./survival-engine');
const now=new Date('2026-10-19T12:34:56Z'),event={name:'</script><img src=x onerror=alert(1)>',amount:10000,year:2,month:3,inflate:true,enabled:true};
const events=[event,{...event,name:'Paused',enabled:false},{...event,name:'Later',year:120}];
const raw=html=>JSON.parse(html.match(/<script id="money-planner-calculation-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const canonical=value=>JSON.parse(JSON.stringify(value,(_key,n)=>typeof n==='number'&&!Number.isFinite(n)?String(n):n));
function check(html,kind,inputs,results){
 assert.ok(!/intimetec/i.test(html),'New reports must not contain old branding');
 assert.deepEqual(R.read(html.replaceAll('money-planner-calculation','intimetec-calculation'),kind).inputs,inputs,'Legacy reports remain importable');
 const saved=raw(html);assert.equal(saved.calculator,kind);assert.equal(saved.savedAt,now.toISOString());assert.deepEqual(saved.inputs,inputs);assert.deepEqual(saved.results,canonical(results));assert.deepEqual(saved.events,events);
 assert.equal((html.match(/<script\b/g)||[]).length,1);assert.ok(html.includes("script-src 'none'"));assert.ok(!html.includes('<img src='));assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<script src='));assert.ok(!html.includes('<link rel='));assert.ok(html.includes('@media print'));assert.ok(html.includes('Saved calculation data'));assert.ok(!html.includes('NaN'));
 for(const row of html.matchAll(/<tr>(.*?)<\/tr>/g))assert.ok((row[1].match(/<t[dh][\s>]/g)||[]).length>=2);
 return saved;
}
const a={monthly:5000,stepup:5,years:3,rate:8,goal:1000000,inflation:5},position=G.validatePosition({assets:[{name:'Existing gold',type:'Gold',amount:500000,rate:3,liquid:false}],loans:[{name:'Loan',balance:20000,rate:6,emi:1500,source:'income'}]}),extras=[{year:1,month:2,amount:15000,note:'Bonus <b>private</b>'},{year:5,month:1,amount:30000,note:'Later'}];
const g=G.projectPlan(a,extras,events,position),gh=R.growth({a,o:g,extras,events,position,currency:'INR',scenario:'Equity Mutual Fund'},now),gs=check(gh,'growth',{...a,currency:'INR'},g);
assert.deepEqual(gs.position,position);assert.deepEqual(gs.extras,extras);assert.ok(gh.includes('Complete monthly schedule'));assert.ok(gh.includes('Outside horizon'));assert.ok(gh.includes('Bonus &lt;b&gt;private&lt;/b&gt;'));
assert.equal((gh.split('<h2>Complete monthly schedule</h2>')[1].split('</section>')[0].match(/<tr>/g)||[]).length,37);
const sipOnly=G.projectPlan(a,extras,events,{assets:[],loans:[]});
const sipReport=R.growth({a,o:sipOnly,extras,events,currency:'INR',scenario:'Equity Mutual Fund',includePosition:false},now);
check(sipReport,'growth',{...a,currency:'INR'},sipOnly);
const sipVisible=sipReport.replace(/<details class="backup">[\s\S]*?<\/details>/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<[^>]*>/g,' ');
assert.ok(sipVisible.includes('Projected investment value'));
assert.ok(!/net wealth|existing assets|current loans|remaining debt|EMIs paid|available to withdraw/i.test(sipVisible),'SIP-only reports must not describe the disabled position feature');
const fInputs={...F.defaults,age:30,corpus:9000000,monthlyInvestment:75000,investmentGrowth:5,retirementExpense:70000,expectedReturn:10,inflation:6,endAge:100,buffer:15},f=F.project(fInputs,events),fh=R.freedom({a:fInputs,o:f,events},now);
check(fh,'freedom',fInputs,f);assert.ok(fh.includes('Total invested by freedom'));assert.ok(fh.includes('After work'));assert.ok(fh.includes('Working'));
const losses={...F.defaults,expectedReturn:-2,endAge:40,targetAge:39},unreached=F.project(losses,events),lh=R.freedom({a:losses,o:unreached,events},now);check(lh,'freedom',losses,unreached);assert.ok(lh.includes('No finite target'));assert.equal(raw(lh).results.requiredToday,'Infinity');
const sInputs={corpus:30000000,age:45,swp:90000,inflation:5,returns:9,endAge:100,currency:'INR'},start=new Date(2024,1,29),s=S.projectSurvival(sInputs,start,events),needed=S.requiredCorpus(sInputs,start,events),sh=R.survival({a:sInputs,o:s,events,needed},now),ss=check(sh,'survival',sInputs,s);
assert.equal(ss.requiredStartingCorpus,needed);assert.equal(ss.projectionStart,canonical(s.start));assert.ok(sh.includes('2024-02-29'));assert.ok(sh.includes('Complete year-by-year schedule'));
for(const currency of ['INR','SAR','USD','AED','EUR','GBP']){const inputs={...F.defaults,currency},o=F.project(inputs);assert.ok(R.freedom({a:inputs,o},now).includes('All money amounts in '+currency));}
for(const [file,id] of [['index.html','growthReport'],['freedom.html','freedomReport'],['custom-plan.html','exportReport']]){const source=fs.readFileSync(file,'utf8');assert.ok(source.includes('id="'+id+'"'));assert.ok(source.includes('src="calculator-report.js"'));}
assert.ok(fs.readFileSync('survival.js','utf8').includes('id="survivalReport"'));
console.log('Calculator reports passed: full inputs/results preservation, all schedules, growth assets/loans/extras, paused/outside expenses, freedom losses/infinite targets, dated Survival, all currencies and inert hostile text.');
