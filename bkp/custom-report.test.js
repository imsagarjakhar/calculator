'use strict';
const assert=require('node:assert/strict'),E=require('./custom-engine'),R=require('./custom-report');
const plan=E.createPlan(new Date(2026,9,19));plan.months=24;
plan.name='Family plan </script><img src="https://example.invalid/test"> & savings';
plan.assets.push({id:'home',name:'Home & land',type:'Property',value:1000000,annualReturn:2,canWithdraw:false});
plan.loans=[{id:'loan',name:'House loan',balanceMode:'original',originalAmount:60000,annualRate:6,totalMonths:60,startDate:'2024-10-19',currentDate:'2026-10-19',source:'income'}];
plan.overrides=[{month:'2026-11',sip:12345,note:'Skip <this> & keep data',flows:[{type:'prepayment',amount:5000,loanId:'loan',source:'income',note:'Bonus'},{type:'expense',amount:2500,inflate:true,note:'Education'}]},{month:'2030-01',sip:null,note:'Outside horizon',flows:[{type:'investment',assetId:'core',amount:100,note:'Later'}]}];
const clean=E.validate(plan),html=R.build(plan,new Date('2026-10-19T12:00:00Z')),restored=R.read(html),o=E.project(clean);
assert.deepEqual(restored,clean);assert.deepEqual(E.project(restored),o);
assert.deepEqual(R.read(E.exportPlan(clean)),clean);assert.deepEqual(R.read('\ufeff'+html),clean);
assert.ok(html.includes('2026-10-19 (UTC)'));assert.ok(html.includes('Year-by-year results'));assert.ok(html.includes('Monthly schedule'));assert.ok(html.includes('Outside plan'));assert.ok(html.includes('Lender balance')===false);
assert.equal((html.match(/<script\b/g)||[]).length,1,'Only the inert plan-data block is included');
assert.equal((html.match(/<\/script>/g)||[]).length,1);assert.ok(!html.includes('<img src='));assert.ok(html.includes('&lt;img src='));assert.ok(html.includes('\\u003c/script\\u003e'));
assert.ok(html.includes('Content-Security-Policy'));assert.ok(!html.includes('<script src='));assert.ok(!html.includes('<link rel="stylesheet"'));assert.ok(html.includes('@media print'));
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
assert.ok(html.includes(money(o.netWorth)));assert.ok(html.includes(money(o.rows.at(-1).netWorth)));assert.ok(html.includes('36'));
for(const currency of ['INR','USD','SAR','AED','EUR','GBP'])for(const wealth of [-1000000,8000000,10000000,12000000,10000000.01]){
 const comparison=R.targetComparison(wealth,currency),name=currency==='INR'?'1 crore':'10 million';
 assert.equal(comparison.target,10000000);assert.equal(comparison.difference,Math.round((wealth-10000000)*100)/100);
 assert.equal(comparison.heading,(wealth<10000000?'Below ':wealth>10000000?'Above ':'Target reached: ')+name+' ('+currency+')');
 const sample=E.createPlan(new Date(2026,9,19));sample.currency=currency;sample.months=1;sample.monthlySip=0;sample.assets[0].value=Math.max(0,wealth);sample.assets[0].annualReturn=0;
 const report=R.build(sample),actual=R.targetComparison(E.project(sample).netWorth,currency);
 assert.ok(report.includes('Projected net worth'));assert.ok(report.includes('Combined XIRR'));assert.ok(report.includes('Inflation-adjusted gain'));assert.equal((report.match(/data-metric=/g)||[]).length,7);assert.deepEqual(R.read(report),E.validate(sample));
}
for(const bad of ['<html>No data</html>',html.replace('custom-plan-data','wrong-data'),html+html,html.replace(/"version": 1/,'"version": 999'),'{bad json'])assert.throws(()=>R.read(bad));
assert.throws(()=>R.read('x'.repeat(R.MAX_FILE_BYTES+1)));
const long=E.createPlan(new Date(2026,9,19));long.months=720;const large=R.build(long);assert.deepEqual(R.read(large),E.validate(long));assert.ok(large.length<R.MAX_FILE_BYTES);
console.log('Custom report passed: full HTML/JSON round-trip, dated loans, overrides outside horizon, exact totals, print/offline assets, escaped user text, invalid files and 720-month plans.');
