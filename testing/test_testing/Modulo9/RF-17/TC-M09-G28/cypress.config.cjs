// NODE_PATH debe apuntar al node_modules del frontend (cypress + typescript).
// ELECTRON_RUN_AS_NODE debe estar AUSENTE: con esa variable el binario arranca
// como Node y Cypress rechaza su propio bytecode (cachedDataRejected).
const {defineConfig}=require('cypress');
const path=require('path'),fs=require('fs');
const FRONT='https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io';
const BASE='https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const runId=process.env.G28_RUN_ID;
const recorrido=process.env.G28_RECORRIDO;
if(!runId||!/^[\w-]+$/.test(runId))throw Error('G28_RUN_ID requerido');
if(!recorrido||!/^[\w-]+$/.test(recorrido))throw Error('G28_RECORRIDO requerido (ej. recorrido1)');
const evid=path.join(__dirname,'RESULTADOS',runId);
const screenshots=path.join(evid,'screenshots',recorrido);
if(fs.existsSync(screenshots))throw Error('G28_RECORRIDO ya utilizado: no se sobrescriben ejecuciones historicas');
const seleccion=path.join(evid,'TC-M09-61-registro-seleccionado.json');
if(!fs.existsSync(seleccion))throw Error('Falta TC-M09-61-registro-seleccionado.json: ejecutar primero la seleccion de registro');
const registro=JSON.parse(fs.readFileSync(seleccion,'utf8'));

function limpiar(texto){
 for(const secreto of [process.env.TEST_ADMIN_PASSWORD,process.env.TEST_ADMIN_EMAIL].filter(Boolean))texto=texto.split(secreto).join('[REDACTED]');
 return texto.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT REDACTED]')
             .replace(/Bearer\s+[A-Za-z0-9_.-]+/g,'Bearer [REDACTED]');
}

module.exports=defineConfig({
 video:false,screenshotOnRunFailure:true,trashAssetsBeforeRuns:false,
 screenshotsFolder:screenshots,viewportWidth:1920,viewportHeight:1200,
 retries:0,defaultCommandTimeout:15000,requestTimeout:25000,responseTimeout:30000,
 env:{runId,recorrido,api:BASE,registro,email:process.env.TEST_ADMIN_EMAIL,password:process.env.TEST_ADMIN_PASSWORD},
 e2e:{baseUrl:FRONT,specPattern:'tc-m09-g28-persistencia.cy.ts',supportFile:false,
  setupNodeEvents(on){
   on('task',{
    evidencia(datos){
     fs.mkdirSync(evid,{recursive:true});
     fs.writeFileSync(path.join(evid,`TC-M09-61-ui-${recorrido}.json`),
      limpiar(JSON.stringify({grupo:'TC-M09-G28',caso:'TC-M09-61',recorrido,fecha:new Date().toISOString(),registro,...datos},null,2)));
     return null;
    },
   });
   on('after:run',resultados=>{
    fs.mkdirSync(evid,{recursive:true});
    fs.writeFileSync(path.join(evid,`cypress-TC-M09-61-${recorrido}.json`),limpiar(JSON.stringify({
     caso:'TC-M09-61',recorrido,
     estado:resultados.totalFailed===0&&resultados.totalPassed===1?'PASS':'FAIL',
     tests:resultados.totalTests,passed:resultados.totalPassed,failed:resultados.totalFailed,
     browser:resultados.browserName,browserVersion:resultados.browserVersion,cypressVersion:resultados.cypressVersion,
     runs:resultados.runs?.map(r=>({spec:r.spec.name,
      screenshots:r.screenshots.map(s=>({path:path.relative(evid,s.path).split(path.sep).join('/'),testFailure:s.testFailure})),
      tests:r.tests.map(t=>({title:t.title,state:t.state,
       errors:[t.displayError,...t.attempts.map(a=>a.error?.message)].filter(Boolean)}))})),
    },null,2)));
   });
  }
 }
});
