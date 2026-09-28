const fs=require('fs'),path=require('path');
const out=path.join(__dirname,'RESULTADOS',process.env.G28_REEVAL_V2_RUN_ID,'cypress',process.env.G28_CYPRESS_ATTEMPT||'recorrido2');
if(fs.existsSync(path.join(out,'result.json')))throw Error('Attempt already exists; preserve evidence');
fs.mkdirSync(out,{recursive:true});
function sanitize(text){
 for(const secret of [process.env.TEST_ADMIN_PASSWORD,process.env.G28_DB_PASSWORD].filter(Boolean))text=text.split(secret).join('[REDACTED]');
 return text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/Bearer\s+[A-Za-z0-9_.-]+/g,'Bearer [REDACTED]');
}
require('cypress').run({project:__dirname,browser:'electron',configFile:path.join(__dirname,'cypress.config.cjs')}).then(r=>{
 const result={status:r.status,totalTests:r.totalTests,totalPassed:r.totalPassed,totalFailed:r.totalFailed,browser:r.browserName,browserVersion:r.browserVersion,cypressVersion:r.cypressVersion,message:r.message,runs:r.runs?.map(x=>({spec:x.spec.name,screenshots:x.screenshots.map(s=>path.relative(out,s.path)),tests:x.tests.map(t=>({title:t.title,state:t.state,error:t.displayError}))}))};
 fs.writeFileSync(path.join(out,'result.json'),sanitize(JSON.stringify(result,null,2)));
 console.log(sanitize(JSON.stringify(result)));
 process.exitCode=r.totalPassed===1&&r.totalFailed===0?0:1;
}).catch(e=>{console.log(sanitize(e.message));process.exitCode=1;});
