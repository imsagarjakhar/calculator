'use strict';
const assert=require('node:assert/strict'),E=require('./bucket-engine');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-10),`${a} != ${b}`);
const base={...E.defaults,corpus:1000000,monthly:1000,emergency:100000,inflation:0,spendingReturn:0,emergencyReturn:0,equityReturn:0,age:60,endAge:70};
let p=E.project(base);
assert.deepEqual(p.initial,{spending:60000,emergency:100000,equity:840000});near(p.ending,880000);assert.equal(p.firstShortfall,null);assert.equal(p.rows[11].toSpending,0);near(p.rows[12].toSpending,12000);near(p.rows[12].toEmergency,0);
// First reserve is the gross sum of inflation-adjusted budgets, never reduced by assumed returns.
const inflation={...base,inflation:5},inflated=E.project(inflation);near(inflated.target1,12000*(1+1.05+1.05**2+1.05**3+1.05**4));near(inflated.rows[11].dueLiving,1000);near(inflated.rows[12].dueLiving,1050);
near(E.project({...inflation,spendingReturn:20}).target1,inflated.target1);
// The rolling window removes paid withdrawals and adds new inflated ones at its far end.
const seventy={...base,startMonth:'2026-10',monthly:70000,inflation:5};
near(E.spendingTarget(seventy,12),E.spendingTarget(seventy,0)*1.05);
near(E.spendingTarget(seventy,1),E.spendingTarget(seventy,0)-70000+70000*1.05**5);
for(const offset of [0,1,11,12,13,59,60,121]){const window=E.spendingWindow(seventy,offset);assert.equal(window.reduce((s,r)=>s+r.months,0),60);assert.equal(window[0].from,offset);assert.equal(window.at(-1).to,offset+59);near(window.reduce((s,r)=>s+r.total,0),E.spendingTarget(seventy,offset));for(const r of window)near(r.total,r.months*r.monthly);}
assert.equal(E.spendingWindow(seventy,1)[0].months,11);assert.equal(E.spendingWindow(seventy,1).length,6);
assert.equal(E.monthKey('2026-10',3),'2027-01');assert.equal(E.monthKey('2026-10',12),'2027-10');
const steps=E.project({...seventy,corpus:20000000,emergency:0});
assert.equal(steps.rows[12].date,'2027-10');assert.equal(steps.rows[0].phases[0].key,'opening');
const withdrawn=steps.rows[0].phases.find(p=>p.key==='withdrawal');near(withdrawn.spending,steps.initial.spending-70000);assert.equal(withdrawn.nextSpendIndex,1);
const review=steps.rows[12].phases.find(p=>p.key==='review');near(review.spending,E.spendingTarget(seventy,12));assert.equal(review.nextSpendIndex,12);near(steps.rows[12].phases.find(p=>p.key==='withdrawal').spending,review.spending-73500);
// Planned emergency consumes real capital; refilling it is a transfer, not fresh money.
const event={id:'medical',name:'Medical',amount:25000,month:15,inflate:false},withEvent=E.project(base,[event]);near(withEvent.rows[14].emergencyPaid,25000);near(withEvent.rows[14].toEmergency,25000);near(withEvent.rows[14].emergency,100000);near(withEvent.ending,p.ending-25000);
const big=E.project(base,[{...event,amount:150000,month:1}]);near(big.rows[0].emergencyPaid,150000);near(big.rows[0].toEmergency,150000);
const inflatedEvent=E.project(inflation,[{...event,amount:10000,month:13,inflate:true}]);near(inflatedEvent.rows[12].dueEmergency,10500);
const outside=E.project(base,[{...event,month:121}]);near(outside.totalEmergency,0);assert.equal(outside.events.length,1);
// Annual / monthly / five-year reviews and immediate withdrawals all respect available equity.
near(E.project({...base,refillMonths:1}).rows[1].toSpending,1000);const five=E.project({...base,refillMonths:60});near(five.rows[59].toSpending,0);near(five.rows[60].toSpending,60000);
const small=E.project({...base,corpus:50000});assert.equal(small.setupGap,110000);assert.equal(small.initial.equity,0);assert.equal(small.firstShortfall,51);near(small.totalUnfunded,70000);near(small.ending,0);
const noEquity=E.project({...base,corpus:160000});assert.equal(noEquity.firstShortfall,61);near(noEquity.ending,100000,'Emergency reserve is not spent on living costs');
const empty=E.project({...base,corpus:0,monthly:0,emergency:0});assert.equal(empty.firstShortfall,null);near(empty.ending,0);
const fall=E.project({...base,shockPercent:30,shockYear:1});near(fall.rows[0].shock,-840000*.3);near(fall.totalGrowth,-252000);near(fall.ending,628000);
// Independent compound-interest and annuity-due formulas verify return timing.
for(const equityReturn of [-40,-10,0,6,20]){const onlyEquity={...base,monthly:0,emergency:0,equityReturn},o=E.project(onlyEquity);near(o.ending,onlyEquity.corpus*(1+equityReturn/100)**10);}
for(const spendingReturn of [0,6,20]){const onlyLiving={...base,corpus:60000,emergency:0,endAge:65,spendingReturn},o=E.project(onlyLiving),q=(1+spendingReturn/100)**(1/12),expected=q===1?0:60000*q**60-1000*q*(q**60-1)/(q-1);near(o.ending,expected);}
// Independent deterministic cash-flow checks across returns, inflation, shocks, reviews and shortfalls.
let seed=876;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<100;i++){
 const a={...base,corpus:50000+random()*2000000,monthly:random()*10000,emergency:random()*300000,inflation:random()*10,spendingReturn:-20+random()*40,emergencyReturn:-10+random()*25,equityReturn:-30+random()*60,refillMonths:[1,12,60][i%3],shockPercent:i%2?30:0,shockYear:2};
 const events=[{...event,amount:10000+random()*100000,month:18,inflate:true},{...event,id:'later',month:70,amount:50000}],o=E.project(a,events);
 near(o.initial.spending+o.initial.emergency+o.initial.equity,a.corpus);
 near(a.corpus+o.totalGrowth-o.totalLiving-o.totalEmergency,o.ending);
 for(const r of o.rows){near(r.opening+r.growth-r.living-r.emergencyPaid,r.total);assert.ok([r.spending,r.emergency,r.equity,r.toSpending,r.toEmergency,r.unfunded].every(n=>n>=0&&Number.isFinite(n)));near(r.total,r.spending+r.emergency+r.equity);near(r.phases[0].total,r.opening);near(r.phases.at(-1).total,r.total);near(r.phases.reduce((s,p)=>s+p.missing,0),r.unfunded);for(const p of r.phases){near(p.total,p.spending+p.emergency+p.equity);assert.ok([p.spending,p.emergency,p.equity].every(n=>n>=0));}}
 for(const year of o.years){const months=o.rows.filter(r=>r.year===year.year);for(const key of ['living','emergencyPaid','growth','toSpending','toEmergency','unfunded'])near(year[key],months.reduce((s,r)=>s+r[key],0));near(year.total,months.at(-1).total);}
 near(o.totalUnfunded,o.rows.reduce((s,r)=>s+r.unfunded,0));
 // With zero returns and no shock, every funded expense reduces total capital by exactly its cost.
 const zero=E.project({...a,spendingReturn:0,emergencyReturn:0,equityReturn:0,shockPercent:0},events);near(zero.ending,a.corpus-zero.totalLiving-zero.totalEmergency);
}
for(const bad of [{...base,corpus:-1},{...base,endAge:60},{...base,monthly:NaN},{...base,refillMonths:6},{...base,shockYear:50,shockPercent:10},{...base,currency:'__proto__'}])assert.throws(()=>E.project(bad));
assert.throws(()=>E.project(base,[{...event,month:0}]));assert.throws(()=>E.project(base,[{...event,amount:Infinity}]));
for(const startMonth of ['','2026-13','2026-00','1800-01','2151-01',123])assert.throws(()=>E.project({...base,startMonth}));
assert.equal(E.validate({...base,startMonth:undefined}).startMonth,E.defaults.startMonth);
console.log('Bucket engine passed: gross five-year allocation, annual inflation, return-independent targets, refill timing/priority, emergency costs, equity shocks, outside events, zero/negative returns, 100 cash-flow reconciliations and invalid inputs.');
