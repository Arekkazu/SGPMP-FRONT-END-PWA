// NODE_PATH debe apuntar al node_modules del frontend (cypress + typescript).
// ELECTRON_RUN_AS_NODE debe estar AUSENTE: con esa variable el binario arranca
// como Node y Cypress rechaza su propio bytecode (cachedDataRejected).
const {defineConfig}=require('cypress');
const path=require('path'),fs=require('fs');
const {FRONT,BASE,CASOS,clean}=require('./helpers.cjs');
const caso=process.env.G22_CASE,runId=process.env.G22_RUN_ID,recorrido=process.env.G22_RECORRIDO;
if(!CASOS.includes(caso))throw Error('G22_CASE requerido');
if(!runId||!/^[\w-]+$/.test(runId))throw Error('G22_RUN_ID requerido');
if(!recorrido||!/^[\w-]+$/.test(recorrido))throw Error('G22_RECORRIDO requerido (ej. recorrido1)');
const evid=path.join(__dirname,'RESULTADOS',runId);
const screenshots=path.join(evid,'screenshots',caso,recorrido);
if(fs.existsSync(screenshots))throw Error('G22_RECORRIDO ya utilizado para este caso');
// Cypress verifica lo que Newman creo: nunca crea un segundo umbral por su cuenta.
const intentos=fs.existsSync(evid)?fs.readdirSync(evid).filter(f=>f.startsWith(`newman-${caso}-intento`)&&f.endsWith('.json')).sort():[];
if(!intentos.length)throw Error('Falta la evidencia Newman de '+caso+': ejecutar primero el POST');
const ultimo=JSON.parse(fs.readFileSync(path.join(evid,intentos[intentos.length-1]),'utf8'));

module.exports=defineConfig({
 video:false,screenshotOnRunFailure:true,trashAssetsBeforeRuns:false,
 screenshotsFolder:screenshots,viewportWidth:1920,viewportHeight:1200,
 retries:0,defaultCommandTimeout:15000,requestTimeout:25000,responseTimeout:30000,
 env:{caso,runId,recorrido,api:BASE,
      evidencia:{especie:ultimo.especie,variable:ultimo.variable,
                 idCreado:ultimo.persistencia?.idCreado??null,
                 status:ultimo.status,payload:ultimo.payloadEnviado},
      email:process.env.TEST_ADMIN_EMAIL,password:process.env.TEST_ADMIN_PASSWORD},
 e2e:{baseUrl:FRONT,specPattern:'tc-m09-g22-umbrales-validos.cy.ts',supportFile:false,
  setupNodeEvents(on){
   on('task',{
    evidenciaUi(datos){
     fs.mkdirSync(evid,{recursive:true});
     fs.writeFileSync(path.join(evid,`ui-${caso}-${recorrido}.json`),
      clean(JSON.stringify({grupo:'TC-M09-G22',caso,recorrido,fecha:new Date().toISOString(),
       idCreadoPorNewman:ultimo.persistencia?.idCreado??null,...datos},null,2)));
     return null;
    },
   });
   on('after:run',resultados=>{
    fs.mkdirSync(evid,{recursive:true});
    fs.writeFileSync(path.join(evid,`cypress-${caso}-${recorrido}.json`),clean(JSON.stringify({
     caso,recorrido,estado:resultados.totalFailed===0&&resultados.totalPassed===1?'PASS':'FAIL',
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
