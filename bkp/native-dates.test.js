'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
for(const [page,script,fields] of [
 ['custom-plan.html','custom-plan.js',{startMonth:'month',endMonth:'month',loanStartDate:'date',loanCurrentDate:'date',transactionDate:'date',transactionMonthFilter:'month',editMonth:'month'}],
 ['bucket-plan.html','bucket-plan.js',{'b-startMonth':'month',bucketDate:'month',extraDate:'month'}]
]){
 const html=fs.readFileSync(page,'utf8'),source=fs.readFileSync(script,'utf8');
 assert.ok(!html.includes('src="calendar.js"'),page+' must not open custom picker dialogs');
 assert.ok(!html.includes('href="calendar.css"'),page+' must keep standard inputs visible');
 assert.ok(!html.includes('calendar-native'));assert.ok(!source.includes('PlannerCalendar'));assert.ok(!source.includes('showModal('));
 for(const [id,type] of Object.entries(fields)){
  const input=html.match(new RegExp('<input\\b[^>]*\\bid="'+id+'"[^>]*>'));assert.ok(input,id);
  assert.ok(input[0].includes('type="'+type+'"'),id+' remains directly editable');
  assert.ok(!/\b(?:hidden|readonly)\b/.test(input[0]),id+' is not hidden behind a trigger');
  assert.ok(input[0].includes('placeholder="'+(type==='date'?'YYYY-MM-DD':'YYYY-MM')+'"'));
 }
}
console.log('Native dates passed: directly editable date/month fields, no custom modal or hidden native controls, preserved input types and format hints on Custom Plan and Bucket Plan.');
