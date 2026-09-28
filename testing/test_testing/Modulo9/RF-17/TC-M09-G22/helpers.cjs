const fs=require('fs'),path=require('path');
const BASE='https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const FRONT='https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io';
const CASOS=['TC-M09-46','TC-M09-47','TC-M09-48','TC-M09-49'];
const META={grupo:'TC-M09-G22',rf:'RF-17',cu:'CU-03',cuOriginal:'CU-07',rol:'Administrador',
 rama:'qa/juan-esteban-m09',frontendSHA:'966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56',
 backendSHA:'adc3932b9f0293a76ebec7e89ed877274791b6a1',base:BASE};

// Semantica exigida por cada original. TC-M09-46 prueba la configuracion base de
// una especie activa: prefiere Temperatura por cercania con el ejemplo academico,
// pero admite cualquier variable activa con combinacion libre.
const SEMANTICA={
 'TC-M09-46':{patron:/temperatura/i,obligatoria:false,etiqueta:'Temperatura (preferida) o cualquier variable activa'},
 'TC-M09-47':{patron:/temperatura/i,obligatoria:true,etiqueta:'Temperatura'},
 'TC-M09-48':{patron:/humedad/i,obligatoria:true,etiqueta:'Humedad'},
 'TC-M09-49':{patron:/\bph\b|potencial de hidr/i,obligatoria:true,etiqueta:'pH'},
};
// Valores del ejemplo academico, usados solo si caben en los limites fisicos reales.
const ACADEMICOS={'TC-M09-47':['35.50','36.70','37.90','39.20'],'TC-M09-49':['6.50','7.00','7.50','8.00']};

function settings(){
 const caso=process.env.G22_CASE,runId=process.env.G22_RUN_ID,intento=Number(process.env.G22_INTENTO||1);
 if(!CASOS.includes(caso))throw Error('G22_CASE debe ser uno de: '+CASOS.join(' | '));
 if(!runId||!/^[\w-]+$/.test(runId))throw Error('G22_RUN_ID requerido');
 if(![1,2].includes(intento))throw Error('G22_INTENTO solo puede ser 1 o 2: maximo dos POST por original');
 return {caso,runId,intento};
}
function clean(s){
 for(const secreto of [process.env.TEST_ADMIN_PASSWORD,process.env.TEST_ADMIN_EMAIL].filter(Boolean))s=s.split(secreto).join('[REDACTED]');
 return s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT REDACTED]')
         .replace(/Bearer\s+[A-Za-z0-9_.-]+/g,'Bearer [REDACTED]');
}
function dir(runId,sub){const d=sub?path.join(__dirname,'RESULTADOS',runId,sub):path.join(__dirname,'RESULTADOS',runId);fs.mkdirSync(d,{recursive:true});return d;}
function save(runId,name,value){fs.writeFileSync(path.join(dir(runId),name),clean(JSON.stringify({...META,fecha:new Date().toISOString(),...value},null,2)));}
function load(runId,name){const p=path.join(dir(runId),name);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}

async function get(endpoint,token){
 const r=await fetch(BASE+endpoint,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(25000)});
 if(r.status!==200)throw Error(`GET ${endpoint} HTTP ${r.status}`);
 return r.json();
}
async function login(){
 const r=await fetch(BASE+'/sesiones/',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({correo_electronico:process.env.TEST_ADMIN_EMAIL,contrasena:process.env.TEST_ADMIN_PASSWORD}),
  signal:AbortSignal.timeout(25000)});
 if(r.status!==200)throw Error(`ENVIRONMENT_ERROR login HTTP ${r.status}`);
 const j=await r.json();if(!j.token)throw Error('ENVIRONMENT_ERROR login sin token');
 return j.token;
}

// Aritmetica decimal exacta a dos decimales: nada se deriva de coma flotante.
function d2(v){const [e,d='']=String(v).split('.');const s=e.startsWith('-');const ent=s?e.slice(1):e;
 return (s?-1n:1n)*BigInt(ent+(d+'00').slice(0,2));}
function txt(c){const s=c<0n;const a=(s?-c:c).toString().padStart(3,'0');return (s?'-':'')+a.slice(0,-2)+'.'+a.slice(-2);}

/** Rango interior seguro con tres niveles contiguos que cubren exactamente el padre. */
function rangoValido(caso,lo,hi){
 const academico=ACADEMICOS[caso];
 if(academico){
  const [a,,,d]=academico;
  if(d2(a)>=d2(lo)&&d2(d)<=d2(hi))return {puntos:academico,origen:'valores del ejemplo academico, dentro de los limites fisicos reales'};
 }
 // Interior seguro: [30%, 70%] del rango fisico, con cortes en los tercios.
 const L=d2(lo),H=d2(hi),R=H-L;
 const a=L+(R*30n)/100n,d=L+(R*70n)/100n,paso=(d-a)/3n;
 const puntos=[a,a+paso,a+2n*paso,d].map(txt);
 const ok=puntos.every((p,i)=>!i||d2(p)>d2(puntos[i-1]));
 return ok?{puntos,origen:'intervalo interior del rango fisico real, adaptado del ejemplo academico'}:null;
}

async function discover(token,caso){
 const perms=(await get('/sesiones/me/permisos',token)).permisos;
 if(![1,2].every(a=>perms.some(p=>p.id_recurso===20&&p.id_accion===a)))throw Error('BLOCKED permiso RF17 ausente');
 const especies=(await get('/configuracion/especies',token)).items;
 const activas=especies.filter(s=>s.es_activo);
 if(!activas.length)throw Error('BLOCKED sin especies activas');
 // El catalogo de variables ambientales publica unicamente las activas.
 const variables=(await get('/configuracion/variables-ambientales',token)).items;
 const {patron,obligatoria,etiqueta}=SEMANTICA[caso];
 const coinciden=variables.filter(v=>patron.test(v.nombre));
 const candidatas=coinciden.length?coinciden:(obligatoria?[]:variables);
 if(!candidatas.length)throw Error(`BLOCKED: TEST no publica ninguna variable ambiental de ${etiqueta}`);

 const ocupadas=[];
 for(const v of candidatas){
  const rango=rangoValido(caso,String(v.valor_fisico_min),String(v.valor_fisico_max));
  if(!rango)continue;
  for(const s of activas){
   // Disponibilidad reevaluada en cada original: un caso anterior pudo persistir.
   const previos=(await get(`/configuracion/umbrales?id_especie=${s.id_especie}`,token)).items;
   if(previos.some(u=>u.id_variable_ambiental===v.id_variable_ambiental)){
    ocupadas.push({id_especie:s.id_especie,id_variable_ambiental:v.id_variable_ambiental});
    continue;
   }
   const [p0,p1,p2,p3]=rango.puntos;
   return {caso,
    especie:{id:s.id_especie,nombre:s.nombre,es_activo:s.es_activo},
    variable:{id:v.id_variable_ambiental,nombre:v.nombre,unidad:v.unidad,catalogoActivo:true,
              fisicoMin:String(v.valor_fisico_min),fisicoMax:String(v.valor_fisico_max),
              semantica:etiqueta,coincidePatron:patron.test(v.nombre)},
    rangoElegido:{valor_min:p0,valor_max:p3,origen:rango.origen},
    combinacionLibre:true,combinacionesOcupadasRevisadas:ocupadas,
    umbralesPrevios:previos.map(u=>({id:u.id_umbral_ambiental,id_variable_ambiental:u.id_variable_ambiental})),
    payload:{id_especie:s.id_especie,id_variable_ambiental:v.id_variable_ambiental,valor_min:p0,valor_max:p3,
     niveles:[{nivel:'normal',limite_inferior:p0,limite_superior:p1},
              {nivel:'precaucion',limite_inferior:p1,limite_superior:p2},
              {nivel:'critico',limite_inferior:p2,limite_superior:p3}]}};
  }
 }
 throw Error(`BLOCKED — DATOS TEST INSUFICIENTES: sin combinacion libre de especie activa + ${etiqueta}`);
}

// Cuerpo con literales decimales exactos: '6.50' no se degrada a 6.5 por coma flotante.
function cuerpo(payload){
 const nivel=n=>`{"nivel":"${n.nivel}","limite_inferior":${n.limite_inferior},"limite_superior":${n.limite_superior}}`;
 return `{"id_especie":${payload.id_especie},"id_variable_ambiental":${payload.id_variable_ambiental},`
  +`"valor_min":${payload.valor_min},"valor_max":${payload.valor_max},`
  +`"niveles":[${payload.niveles.map(nivel).join(',')}]}`;
}

module.exports={BASE,FRONT,META,CASOS,SEMANTICA,settings,clean,dir,save,load,get,login,discover,cuerpo,rangoValido};
