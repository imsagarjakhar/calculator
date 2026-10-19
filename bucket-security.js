'use strict';
// Standalone preview only: never rewrites security policies or scripts of existing pages.
const fs=require('node:fs'),{securePage}=require('./security-policy'),page='bucket-plan.html';
const before=fs.readFileSync(page,'utf8'),secured=securePage(before);
if(process.argv.includes('--check')){if(before!==secured){console.error('Bucket preview security hashes are stale. Run node bucket-security.js');process.exitCode=1;}else console.log('Bucket preview policy and integrity hashes are current.');}
else{fs.writeFileSync(page,secured);console.log('Standalone bucket preview secured. Existing pages were not changed.');}
