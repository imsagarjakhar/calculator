'use strict';
// Run after editing any production script or inline script: node security-policy.js
// CI/review mode: node security-policy.js --check
const fs=require('node:fs'),crypto=require('node:crypto');
const pages=['index.html','custom-plan.html'];
function digest(text,algorithm='sha384'){return algorithm+'-'+crypto.createHash(algorithm).update(text).digest('base64');}
function securePage(source){
 let html=source.replace(/\r\n?/g,'\n');
 html=html.replace(/<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*">\s*/gi,'').replace(/<meta\s+name="referrer"\s+content="[^"]*">\s*/gi,'');
 const hashes=[];
 html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(tag,attrs,code)=>{
  const src=attrs.match(/\bsrc="([^"]+)"/i);
  if(!src){hashes.push(digest(code,'sha256'));return tag;}
  if(!/^[a-z0-9-]+\.js$/i.test(src[1]))throw new Error('Scripts must be local production JavaScript files: '+src[1]);
  const integrity=digest(fs.readFileSync(src[1]));hashes.push(integrity);
  attrs=attrs.replace(/\s+(?:integrity|crossorigin)="[^"]*"/gi,'');
  return '<script'+attrs+' integrity="'+integrity+'">'+code+'</script>';
 });
 const policy="default-src 'none'; script-src 'self' "+[...new Set(hashes)].map(h=>"'"+h+"'").join(' ')+"; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'";
 const metadata='<meta http-equiv="Content-Security-Policy" content="'+policy+'">\n<meta name="referrer" content="no-referrer">\n';
 const match=html.match(/<meta charset="utf-8">/i);if(!match)throw new Error('Missing early charset declaration.');
 return html.replace(/<meta charset="utf-8">\s*/i,match[0]+'\n'+metadata);
}
if(require.main===module){
 let failed=false;
 if(!process.argv.includes('--check')){
  const scripts=new Set(pages.flatMap(page=>[...fs.readFileSync(page,'utf8').matchAll(/<script\b[^>]*\bsrc="([a-z0-9-]+\.js)"/gi)].map(m=>m[1])));
  for(const script of scripts){const source=fs.readFileSync(script,'utf8');if(source.includes('\r'))fs.writeFileSync(script,source.replace(/\r\n?/g,'\n'));}
 }
 for(const page of pages){const source=fs.readFileSync(page,'utf8'),secured=securePage(source);if(process.argv.includes('--check')){if(source!==secured){console.error(page+': security hashes are stale; run node security-policy.js');failed=true;}}else fs.writeFileSync(page,secured);}
 if(failed)process.exitCode=1;else console.log(process.argv.includes('--check')?'Security policies and script integrity hashes are current.':'Security policies and script integrity hashes updated.');
}
module.exports={securePage,digest};
