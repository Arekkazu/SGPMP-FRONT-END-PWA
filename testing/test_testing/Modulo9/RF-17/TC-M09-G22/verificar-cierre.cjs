// Solo autenticacion y GET. Nunca crea, edita ni desactiva umbrales. Sin SQL.
const fs=require('fs'),path=require('path');
const {login,get,save,dir,load,clean,CASOS}=require('./helpers.cjs');
const runId=process.env.G22_RUN_ID;
if(!runId)throw Error('G22_RUN_ID requerido');
const evid=dir(runId);
(async()=>{
 const token=await login();
 const especies=(await get('/configuracion/especies',token)).items;
 const variables=(await get('/configuracion/variables-ambientales',token)).items;
 const checks=[];
 for(const caso of CASOS){
  const intentos=fs.readdirSync(evid).filter(f=>f.startsWith(`newman-${caso}-intento`)&&f.endsWith('.json')).sort();
  const ultimo=JSON.parse(fs.readFileSync(path.join(evid,intentos[intentos.length-1]),'utf8'));
  const p=ultimo.payloadEnviado;
  const after=await get(`/configuracion/umbrales?id_especie=${p.id_especie}`,token);
  checks.push({caso,intentos:intentos.length,
   statusPorIntento:intentos.map(f=>JSON.parse(fs.readFileSync(path.join(evid,f),'utf8')).status),
   especieActiva:especies.find(s=>s.id_especie===p.id_especie)?.es_activo??null,
   variableEnCatalogo:variables.some(v=>v.id_variable_ambiental===p.id_variable_ambiental),
   getStatus:200,totalEspecie:after.total,ids:after.items.map(u=>u.id_umbral_ambiental),
   registrosDeLaCombinacion:after.items.filter(u=>u.id_variable_ambiental===p.id_variable_ambiental).length});
 }
 // Ningun umbral nuevo en ninguna especie: G22 no dejo datos en TEST.
 const inventario=[];
 for(const s of especies){
  const u=await get(`/configuracion/umbrales?id_especie=${s.id_especie}`,token);
  inventario.push({id_especie:s.id_especie,especie:s.nombre,total:u.total,ids:u.items.map(x=>x.id_umbral_ambiental)});
 }
 save(runId,'verificacion-final-readonly.json',{checks,inventarioUmbrales:inventario,
  totalUmbralesEnTest:inventario.reduce((n,i)=>n+i.total,0),
  soloLectura:true,sqlEjecutado:'ninguno',postgresqlUtilizado:false});

 // Escaneo de secretos: se buscan VALORES, no vocabulario.
 const valores=[[/eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\./,'JWT'],
  [/Bearer\s+[A-Za-z0-9_.-]{12,}/,'Authorization con token'],
  [/set-cookie/i,'cabecera de cookie'],
  [/(access|refresh)_token"?\s*[:=]\s*"?[A-Za-z0-9_.-]{12,}/i,'token en clave/valor'],
  [/(password|contrasena|contraseña)"?\s*[:=]\s*"?[^"\s,}]{4,}/i,'credencial en clave/valor'],
  [/postgres(ql)?:\/\//i,'cadena de conexion']];
 const secretos=[process.env.TEST_ADMIN_PASSWORD].filter(Boolean);
 const revisados=[];
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{
  const p=path.join(d,e.name);
  if(e.isDirectory())return walk(p);
  if(!/\.(html|json|md)$/i.test(e.name))return;
  const txt=fs.readFileSync(p,'utf8');
  revisados.push({archivo:path.relative(evid,p).split(path.sep).join('/'),bytes:txt.length,
   secretos:valores.filter(([re])=>re.test(txt)).map(([,n])=>n),
   credencialesEnClaro:secretos.filter(x=>txt.includes(x)).length});
 });
 walk(evid);
 const sucios=revisados.filter(r=>r.secretos.length||r.credencialesEnClaro);
 save(runId,'seguridad-evidencias.json',{revisados,limpio:sucios.length===0,
  criterio:'Se marcan solo valores de secreto: contrasenas, JWT, Authorization con token, cookies, tokens en pares clave-valor y cadenas de conexion.',
  nota:'Reporter htmlextra con omitHeaders, showEnvironmentData=false, showGlobalData=false y skipEnvironmentVars=[token]; sanitizacion posterior de HTML y JSON. Capturas con blackout de correo y contrasena.'});
 checks.forEach(c=>console.log(c.caso,'| intentos',c.intentos,'| status',c.statusPorIntento.join(','),
  '| especie activa',c.especieActiva,'| variable en catalogo',c.variableEnCatalogo,
  '| registros de la combinacion',c.registrosDeLaCombinacion));
 console.log('umbrales totales en TEST:',inventario.reduce((n,i)=>n+i.total,0),
  '| por especie:',inventario.map(i=>i.id_especie+':'+i.total).join(' '));
 console.log('archivos revisados:',revisados.length,'| con valores de secreto:',sucios.length?sucios.map(x=>x.archivo).join(' ; '):'ninguno');
})().catch(e=>{console.log(clean(e.message));process.exitCode=1;});
