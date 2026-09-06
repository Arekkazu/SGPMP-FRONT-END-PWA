const fs=require('fs'),path=require('path'),newman=require('newman');
require.resolve('newman-reporter-htmlextra');
const {BASE,FRONT,settings,dir,save,load,clean,get,login,discover,cuerpo}=require('./helpers.cjs');
const {caso,runId,intento}=settings();
const archivo=`newman-${caso}-intento${intento}`;
const evid=dir(runId),htmlDir=dir(runId,'newman');
if(fs.existsSync(path.join(evid,archivo+'.json'))||fs.existsSync(path.join(htmlDir,archivo+'.html')))
 throw Error('No sobrescribir la evidencia de este intento');
if(intento===2&&!fs.existsSync(path.join(evid,`newman-${caso}-intento1.json`)))
 throw Error('El intento 2 requiere el intento 1 registrado');
if(fs.existsSync(path.join(evid,`newman-${caso}-intento2.json`)))
 throw Error(`Maximo 2 POST por original: ${caso} ya consumio su presupuesto`);
// Un PASS nunca se reintenta.
const previo=load(runId,`newman-${caso}-intento1.json`);
if(intento===2&&previo&&previo.resultado==='PASS')throw Error('No se reintenta un PASS');
if(intento===2&&previo&&previo.persistencia&&previo.persistencia.idCreado)
 throw Error('El intento 1 persistio: no se realiza un segundo POST con la misma combinacion');
const events=[];
(async()=>{
 const preflight=[];
 for(const url of [FRONT+'/login',BASE+'/health',BASE+'/openapi.json']){
  const r=await fetch(url,{signal:AbortSignal.timeout(25000)});preflight.push({url,status:r.status});
  if(r.status!==200)throw Error('ENVIRONMENT_ERROR preflight HTTP '+r.status);
  if(url.endsWith('openapi.json')){
   const j=await r.json();
   const op=j.paths['/configuracion/umbrales']?.post;
   if(!op)throw Error('Contrato ausente: POST /configuracion/umbrales');
   // El contrato debe confirmar 201 antes de fijar la assertion de exito.
   const exitos=Object.keys(op.responses).filter(s=>s.startsWith('2'));
   preflight.push({contrato:'POST /configuracion/umbrales',respuestasDeclaradas:Object.keys(op.responses),
    exitoDeclarado:exitos});
   if(!exitos.includes('201'))throw Error('CONTRATO: el exito declarado no es 201, revisar antes de ejecutar: '+exitos.join(','));
  }
 }
 const token=await login();
 const plan=await discover(token,caso);
 const texto=cuerpo(plan.payload);
 const {payload,...contexto}=plan;
 save(runId,`datos-${caso}-intento${intento}.json`,{preflight,loginStatus:200,plan,cuerpoEnviado:texto});

 const collection=JSON.parse(fs.readFileSync(path.join(__dirname,'TC-M09-G22.postman_collection.json')));
 collection.item=collection.item.filter(item=>item.name===caso);
 if(collection.item.length!==1)throw Error('Una invocacion ejecuta un unico original');
 const summary=await new Promise((resolve,reject)=>{
  const run=newman.run({collection,reporters:['htmlextra'],timeoutRequest:25000,
   reporter:{htmlextra:{export:path.join(htmlDir,archivo+'.html'),omitHeaders:true,showEnvironmentData:false,
    showGlobalData:false,skipEnvironmentVars:['token'],logs:false,silentProgressBar:true,
    title:`${caso} G22 RF-17 TEST intento ${intento}`}},
   environment:{values:Object.entries({base_url:BASE,token,id_especie:payload.id_especie,
    payload:texto,contexto:JSON.stringify(contexto)}).map(([key,value])=>({key,value:String(value),enabled:true}))}},
   (err,s)=>err?reject(Error('Newman execution error')):resolve(s));
  run.on('request',(err,args)=>{
   let body;try{body=args.response?.json();}catch{}
   args.request.headers.remove('Authorization');args.response?.headers?.remove('set-cookie');
   events.push({caso,metodo:args.request.method,status:args.response?.code??null,
    cuerpo:args.request.method==='POST'?texto:undefined,
    respuesta:args.request.method==='POST'?body:undefined,transportError:!!err});
  });
 });

 const despues=await get(`/configuracion/umbrales?id_especie=${payload.id_especie}`,token);
 const post=events.find(e=>e.metodo==='POST');
 const idCreado=post?.status===201?post.respuesta?.id_umbral_ambiental??null:null;
 const deLaCombinacion=despues.items.filter(u=>u.id_variable_ambiental===payload.id_variable_ambiental);
 // Un caso positivo debe crear exactamente un registro; sin creacion, no hay PASS.
 const persistio=deLaCombinacion.length===1&&(idCreado===null||deLaCombinacion[0].id_umbral_ambiental===idCreado);
 const failed=summary.run.failures.length>0||!idCreado||!persistio;
 const html=path.join(htmlDir,archivo+'.html');
 if(!fs.existsSync(html))throw Error('HTML reporter no generado');
 fs.writeFileSync(html,clean(fs.readFileSync(html,'utf8')));

 save(runId,archivo+'.json',{caso,intento,resultado:failed?'FAIL':'PASS',
  metodo:'POST',endpoint:'/configuracion/umbrales',
  especie:plan.especie,variable:plan.variable,rangoElegido:plan.rangoElegido,
  combinacionLibrePrevia:plan.combinacionLibre,umbralesPrevios:plan.umbralesPrevios,
  payloadEnviado:payload,cuerpoEnviado:texto,
  status:post?.status??null,errorCode:post?.respuesta?.error_code??null,respuesta:post?.respuesta??null,
  eventos:events,
  getPosterior:{status:200,total:despues.total,ids:despues.items.map(u=>u.id_umbral_ambiental)},
  persistencia:{idCreado,registrosDeLaCombinacion:deLaCombinacion.length,
   detalle:deLaCombinacion.map(u=>({id:u.id_umbral_ambiental,valor_min:u.valor_min,valor_max:u.valor_max,es_activo:u.es_activo}))},
  assertions:summary.run.stats.assertions,
  failures:summary.run.failures.map(f=>({test:f.error?.test||f.error?.name,message:clean(f.error?.message||'')})),
  newman:'6.2.2',reporter:'newman-reporter-htmlextra 1.23.1',html:path.relative(evid,html).split(path.sep).join('/')});

 // Registro acumulado de combinaciones usadas por G22 en este run.
 const usadas=load(runId,'combinaciones-usadas.json')||{combinaciones:[]};
 usadas.combinaciones=[...usadas.combinaciones.filter(x=>x.caso!==caso),
  {caso,intento,id_especie:plan.especie.id,especie:plan.especie.nombre,
   id_variable_ambiental:plan.variable.id,variable:plan.variable.nombre,
   idUmbralCreado:idCreado,status:post?.status??null,fecha:new Date().toISOString()}];
 save(runId,'combinaciones-usadas.json',usadas);

 console.log(caso,'intento',intento,failed?'FAIL':'PASS','| POST',post?.status,post?.respuesta?.error_code??'-',
  '| idCreado',idCreado,'| registros de la combinacion',deLaCombinacion.length,
  '| assertions',summary.run.stats.assertions.total,'failures',summary.run.failures.length);
 if(summary.run.failures.length)summary.run.failures.slice(0,4).forEach(f=>console.log('   FAIL:',f.error?.test,'->',clean(f.error?.message||'').slice(0,120)));
 process.exitCode=failed?1:0;
})().catch(e=>{save(runId,archivo+'.json',{caso,intento,resultado:'ERROR',motivo:clean(e.message),eventos:events});console.log(clean(e.message));process.exitCode=1;});
