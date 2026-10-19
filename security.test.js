'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{securePage,digest}=require('./security-policy'),E=require('./custom-engine'),R=require('./custom-report');
for(const page of ['index.html','custom-plan.html']){
 const html=fs.readFileSync(page,'utf8');assert.equal(securePage(html),html,'Security metadata must be current and deterministic: '+page);
 const policy=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
 for(const directive of ["default-src 'none'","connect-src 'none'","base-uri 'none'","object-src 'none'","form-action 'none'","frame-src 'none'","worker-src 'none'","script-src-attr 'none'"])assert.ok(policy.includes(directive),directive);
 const scripts=policy.match(/script-src ([^;]+)/)[1];assert.ok(!scripts.includes('unsafe-inline'));assert.ok(!scripts.includes('unsafe-eval'));assert.ok(!scripts.includes('https:'));
 assert.ok(html.indexOf('Content-Security-Policy')<html.indexOf('<script'));assert.ok(html.includes('name="referrer" content="no-referrer"'));
 for(const [,attrs,code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const src=attrs.match(/src="([^"]+)"/);
  if(src){const actual=digest(fs.readFileSync(src[1]));assert.ok(attrs.includes('integrity="'+actual+'"'));assert.ok(policy.includes(actual));}
  else assert.ok(policy.includes(digest(code,'sha256')),'Inline script must be hash-authorized');
 }
 assert.ok(!/\son(?:click|load|error|submit)\s*=/i.test(html));
 const altered=html.replace('sha384-','sha384-TAMPERED');assert.notEqual(securePage(altered),altered,'Modified integrity hashes must fail freshness checks');
}
const html=fs.readFileSync('index.html','utf8'),csvSource=html.match(/^function csvCell\(.*$/m)[0],ctx=vm.createContext({});vm.runInContext(csvSource,ctx);
for(const value of ['=1+1','  =1+1','\n=1+1','\t@SUM(1,2)',' +1','\r-1','@SUM(1,2)']){ctx.value=value;assert.ok(vm.runInContext('csvCell(value)',ctx).startsWith('"\''),'CSV formula neutralization: '+JSON.stringify(value));}
ctx.value=-123.45;assert.equal(vm.runInContext('csvCell(value)',ctx),'-123.45');
const plan=E.createPlan();plan.name='</script><svg onload=alert(1)>';
const raw=JSON.parse(E.exportPlan(plan));Object.defineProperty(raw,'__proto__',{value:{polluted:true},enumerable:true});const clean=E.validate(raw);assert.equal(clean.polluted,undefined);assert.equal({}.polluted,undefined);
const report=R.build(plan);assert.equal((report.match(/<script\b/g)||[]).length,1);assert.ok(!report.includes('<svg onload='));
assert.deepEqual(R.read('<script>throw new Error("never execute imported HTML")</script>'+report),E.validate(plan));
for(const change of [p=>p.assets[0].id='" onclick="evil',p=>p.months=Infinity,p=>p.overrides=[{month:p.startMonth,sip:0,note:'',flows:[{type:'script',amount:1,note:''}]}]]){const bad=E.createPlan();change(bad);assert.throws(()=>E.validate(bad));}
console.log('Security checks passed: CSP and SRI freshness, no inline handlers/eval permission, referrer policy, CSV formulas, prototype keys, hostile labels, inert report imports and invalid plans.');
