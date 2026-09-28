const {defineConfig}=require('cypress');
const fs=require('fs'),path=require('path');
const rootOut=path.join(__dirname,'RESULTADOS',process.env.G28_REEVAL_V2_RUN_ID);
const out=path.join(rootOut,'cypress',process.env.G28_CYPRESS_ATTEMPT||'recorrido2');
const record=JSON.parse(fs.readFileSync(path.join(rootOut,'record.json'),'utf8'));
module.exports=defineConfig({
 video:false,screenshotOnRunFailure:false,trashAssetsBeforeRuns:false,retries:0,
 screenshotsFolder:path.join(out,'screenshots'),downloadsFolder:path.join(out,'downloads'),
 viewportWidth:1920,viewportHeight:1200,defaultCommandTimeout:20000,responseTimeout:30000,
 env:{record,email:process.env.TEST_ADMIN_EMAIL,password:process.env.TEST_ADMIN_PASSWORD,
 api:'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test'},
 e2e:{baseUrl:'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
 specPattern:'persistencia-v2.cy.js',supportFile:false,
 setupNodeEvents(on){on('task',{evidence(data){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'ui-evidence.json'),JSON.stringify(data,null,2));return null;}});}}
});
