'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./freedom-engine'),Life=require('./life-events');
class Node{
 constructor(id){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.listeners={};this.attrs={};}
 get value(){return this._value;}set value(value){this._value=String(value);}
 addEventListener(type,fn){this.listeners[type]=fn;}setAttribute(k,v){this.attrs[k]=v;}replaceChildren(){this.innerHTML='';}click(){}remove(){}
}
const nodes=new Map([...fs.readFileSync('freedom.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Node(m[1])]));
const get=id=>{assert.ok(nodes.has(id),'Missing '+id);return nodes.get(id);},saved=new Map([['intimetec-custom-plan-v1','custom-preserved'],['corpus-survival-v1','survival-preserved'],['InTimeTec-investment-planner-v2','growth-preserved']]),downloads=[];
let change,latestChart,latestContext;
const ctx=vm.createContext({FinancialFreedom:E,LifeEvents:{load:(mode,currency)=>Life.validate(JSON.parse(saved.get('life-events-v1-'+mode+'-'+currency)||'[]')),mount(host,mode,context,callback){assert.equal(mode,'freedom');change=callback;return {refresh(next){latestContext=next;},impact(text){host.textContent=text;}};}},ChartHover:{attach(host,options){latestChart=options;}},
 localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new Node('download'),body:{append(){}}},Blob,URL:{createObjectURL(blob){downloads.push(blob);return 'test-url';},revokeObjectURL(){}},setTimeout:fn=>fn()});
vm.runInContext(fs.readFileSync('freedom.js','utf8'),ctx);
assert.equal(get('freedomError').textContent,'');assert.ok(get('freedomOutput').innerHTML.includes('Age '));assert.ok(get('freedomScenarios').innerHTML.includes('Lower returns'));assert.equal(latestChart.currency,'INR');assert.equal(latestChart.points.length,(E.defaults.endAge-E.defaults.age)*12+1);
assert.ok(get('freedomOutput').innerHTML.includes('preserving purchasing power'));assert.ok(get('freedomOutput').innerHTML.includes('Extra savings cushion 0%'));assert.ok(get('freedomOutput').innerHTML.includes('Future expenses included: <strong>0</strong>'));
const set=(id,value)=>get('f-'+id).value=String(value),submit=()=>get('freedomForm').listeners.submit({preventDefault(){}}),read=()=>JSON.parse(saved.get('intimetec-freedom-v1'));
// The contribution table covers the start, step-up boundary and partial last year.
const scheduleCells=()=>[...get('investmentScheduleRows').innerHTML.matchAll(/<tr>(.*?)<\/tr>/g)].map(row=>[...row[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(cell=>cell[1]));
const money2=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
for(const [key,value] of Object.entries({...E.defaults,age:30,corpus:9000000,monthlyInvestment:75000,investmentGrowth:5,retirementExpense:70000,expectedReturn:10,inflation:6,endAge:100,buffer:15}))set(key,value);submit();
let schedule=scheduleCells();assert.equal(schedule.length,12);assert.equal(schedule[0][2],money2(75000));assert.equal(schedule[1][2],money2(78750));assert.equal(schedule.at(-1)[3],'9');assert.equal(schedule.at(-1)[2],money2(75000*1.05**11));
const fullPlan=E.project(read());assert.equal(fullPlan.freedomMonth,141);const contributed=fullPlan.rows.reduce((sum,row)=>sum+row.investment,0);assert.equal(schedule.at(-1)[5],money2(contributed));
// Summary separates principal from earned returns, ending at freedom (not the retirement horizon).
const money0=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const summaryValue=title=>{const match=get('freedomOutput').innerHTML.match(new RegExp('<span>'+title+'</span><strong>(.*?)</strong>'));assert.ok(match,'Missing summary card: '+title);return match[1];};
assert.equal(summaryValue('Total invested by freedom'),money0(read().corpus+contributed));
assert.equal(summaryValue('Investment growth / loss by freedom'),money0(fullPlan.rows.filter(row=>!row.retired).reduce((sum,row)=>sum+row.growth,0)));
get('investmentMonthly').onclick();schedule=scheduleCells();assert.equal(schedule.length,141);assert.equal(schedule[11][2],money2(75000));assert.equal(schedule[12][2],money2(78750));assert.equal(schedule.at(-1)[0],'Month 141');assert.equal(get('investmentMonthly').attrs['aria-pressed'],'true');
get('investmentYearly').onclick();assert.equal(scheduleCells().length,12);assert.equal(get('investmentYearly').attrs['aria-pressed'],'true');
for(const [key,value] of Object.entries({...E.defaults,corpus:1e12}))set(key,value);submit();assert.ok(get('investmentScheduleRows').innerHTML.includes('No contributions after financial freedom'));assert.ok(get('investmentScheduleTotal').textContent.includes(money2(0)));
assert.equal(summaryValue('Total invested by freedom'),money0(1e12));assert.equal(summaryValue('Investment growth / loss by freedom'),money0(0));
// A future expense is a withdrawal, not a negative investment return.
const summaryEvent={name:'Planned expense',amount:500000,year:2,month:1,enabled:true,inflate:false};
saved.set('life-events-v1-freedom-INR',JSON.stringify([summaryEvent]));
for(const [key,value] of Object.entries({...E.defaults,expectedReturn:-2,endAge:40,targetAge:39}))set(key,value);submit();
const lossPlan=E.project(read(),[summaryEvent]),principal=read().corpus+lossPlan.rows.reduce((sum,row)=>sum+row.investment,0),growth=lossPlan.rows.reduce((sum,row)=>sum+row.growth,0);
assert.equal(lossPlan.freedomMonth,null);assert.ok(growth<0);
assert.equal(summaryValue('Total invested by age 40'),money0(principal));assert.equal(summaryValue('Investment growth / loss by age 40'),money0(growth));
assert.ok(Math.abs(principal+growth-lossPlan.rows.reduce((sum,row)=>sum+row.event,0)-lossPlan.balance)<0.01);
saved.delete('life-events-v1-freedom-INR');
get('freedomReset').onclick();
const originalFreedom=E.project(read()).freedomMonth;
set('salary',200000);submit();assert.equal(read().salary,200000);const richer=E.project(read());assert.ok(get('freedomOutput').innerHTML.includes('Age '+Math.floor(richer.freedomAge)));
assert.equal(richer.freedomMonth,originalFreedom,'Salary increases alone must not invest the unused surplus');
set('expectedReturn',12);submit();assert.equal(read().expectedReturn,12);assert.ok(E.project(read()).freedomMonth<originalFreedom);
get('returnSlider').value='6';get('freedomForm').listeners.input({target:get('returnSlider')});assert.equal(read().expectedReturn,6);assert.ok(get('freedomOutput').innerHTML.includes('No finite target'));assert.ok(!get('freedomChart').innerHTML.includes('NaN'));assert.ok(latestChart.points.every(p=>Number.isFinite(p.x)&&p.ys.every(Number.isFinite)));set('expectedReturn',E.defaults.expectedReturn);submit();
set('monthlyInvestment',10000);submit();assert.equal(read().monthlyInvestment,10000);assert.ok(get('surplusHint').textContent.includes('outside this retirement plan'));
set('monthlyInvestment',300000);submit();assert.ok(get('surplusHint').textContent.includes('exceeds today’s budget'));set('monthlyInvestment',30000);submit();
set('currency','USD');get('f-currency').onchange();assert.equal(read().currency,'USD');assert.equal(read().salary,200000);assert.equal(latestChart.currency,'USD');assert.equal(latestContext.currency,'USD');
get('freedomCsv').onclick();
async function check(){
 const csv=await downloads[0].text();assert.ok(csv.includes('Investment (USD)'));assert.equal(csv.trim().split('\r\n').length,richer.months+1);
 assert.ok(csv.includes('Closing corpus'));assert.ok(csv.includes('Living withdrawals'));
 saved.set('life-events-v1-freedom-USD',JSON.stringify([{name:'<img onerror=alert(1)>',amount:1e12,year:1,month:1,enabled:true,inflate:false}]));change();assert.ok(get('freedomOutput').innerHTML.includes('Unfunded future expenses'));assert.ok(get('freedomOutput').innerHTML.includes('Not reached'));assert.ok(!get('freedomOutput').innerHTML.includes('<img'));
 set('age','');submit();assert.ok(get('freedomError').textContent.includes('current age'));assert.equal(get('freedomCsv').disabled,true);assert.equal(get('freedomRows').innerHTML,'');
 assert.equal(get('investmentScheduleRows').innerHTML,'');assert.equal(get('investmentScheduleTotal').textContent,'');
 set('age',30);set('targetAge',20);submit();assert.ok(get('freedomError').textContent.includes('preferred stop-work'));
 get('freedomResetTop').onclick();assert.deepEqual(read(),E.defaults);assert.equal(get('freedomError').textContent,'');assert.equal(get('freedomCsv').disabled,false);assert.ok(saved.has('life-events-v1-freedom-USD'),'Reset inputs retains future expenses');
 set('age',100);get('freedomForm').listeners.input({target:get('f-age')});assert.equal(read().endAge,101);assert.equal(read().targetAge,100);get('freedomReset').onclick();
 assert.equal(saved.get('intimetec-custom-plan-v1'),'custom-preserved');assert.equal(saved.get('corpus-survival-v1'),'survival-preserved');assert.equal(saved.get('InTimeTec-investment-planner-v2'),'growth-preserved');
 assert.ok(fs.readFileSync('index.html','utf8').includes('class="choice freedom-choice" href="freedom.html"'));
 set('salary','');set('expenses','');submit();assert.equal(get('freedomError').textContent,'');assert.ok(get('surplusHint').textContent.includes('optional entries'));
 const legacy={...E.defaults,salary:80000,expenses:30000,salaryGrowth:5};delete legacy.monthlyInvestment;delete legacy.investmentGrowth;saved.set('intimetec-freedom-v1',JSON.stringify(legacy));
 vm.runInContext(fs.readFileSync('freedom.js','utf8'),ctx);assert.equal(read().monthlyInvestment,50000);assert.equal(read().investmentGrowth,5);assert.ok(get('freedomSave').textContent.includes('Please review'));
 set('monthlyInvestment',0);submit();assert.equal(read().monthlyInvestment,0);vm.runInContext(fs.readFileSync('freedom.js','utf8'),ctx);assert.equal(get('f-monthlyInvestment').value,'0');
 console.log('Financial freedom UI passed: new home card, results/stress cases, currency, chart data, expense updates, invalid/stale results, CSV, input reset and isolated storage.');
}
check().catch(e=>{console.error(e);process.exitCode=1;});
