// TC-M09-G22 V2 — un original por invocacion: un unico POST real + GET de persistencia.
// Maximo 2 POST por original; nunca se reintenta un PASS ni un POST que persistio.
const fs = require('fs');
const path = require('path');
const newman = require('newman');
require.resolve('newman-reporter-htmlextra');
const H = require('./helpers.cjs');
const { runId, caso, intento } = H.settings();

const base = `${caso}-v2-intento${intento}`;
const evid = H.dir(runId);
const htmlDir = H.dir(runId, 'newman');
const html = path.join(htmlDir, `newman-${base}.html`);
if (fs.existsSync(path.join(evid, base + '.json')) || fs.existsSync(path.join(evid, base + '-error.json')) || fs.existsSync(html)) throw Error('No sobrescribir la evidencia de este intento');
if (fs.existsSync(path.join(evid, `${caso}-v2-intento2.json`))) throw Error(`Maximo 2 POST por original: ${caso} ya consumio su presupuesto`);
const previo = H.load(runId, `${caso}-v2-intento1.json`);
if (intento === 2) {
  if (!previo) throw Error('El intento 2 requiere el intento 1 registrado');
  if (previo.resultado === 'PASS') throw Error('No se reintenta un PASS');
  if (previo.persistencia?.idCreado || previo.persistencia?.registrosDeLaCombinacion) throw Error('El intento 1 persistio: no se realiza otro POST');
}
const planGlobal = H.load(runId, 'plan-v2.json');
if (!planGlobal || !Object.values(planGlobal.checklist).every(Boolean)) throw Error('plan-v2.json ausente o checklist incompleto');

const eventos = [];
(async () => {
  const preflight = await H.preflight();
  const token = await H.login();
  const actor = await H.validarActor(token);

  // Redescubrimiento inmediatamente antes del POST: la combinacion debe seguir libre.
  const usadas = H.load(runId, 'combinaciones-usadas-v2.json')?.combinaciones || [];
  const otras = usadas.filter((u) => u.caso !== caso && (u.idUmbralCreado || u.persistio));
  const cat = await H.catalogo(token);
  let ctx = planGlobal.plan[caso];
  const ocupada = cat.umbralesPorEspecie[ctx.especie.id]?.some((u) => u.id_variable_ambiental === ctx.variable.id);
  const yaUsada = otras.some((u) => u.id_especie === ctx.especie.id && u.id_variable_ambiental === ctx.variable.id);
  const especieActiva = cat.activas.some((s) => s.id_especie === ctx.especie.id);
  let replanificado = false;
  if (ocupada || yaUsada || !especieActiva) {
    ctx = H.planificar(cat, [caso], otras)[caso];
    replanificado = true;
    if (!ctx) throw Error(`BLOCKED — DATOS TEST INSUFICIENTES: sin combinacion libre para ${caso}`);
  } else {
    // Refresca umbrales previos de la especie con el GET recien hecho.
    ctx = { ...ctx, umbralesPrevios: cat.umbralesPorEspecie[ctx.especie.id].map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental })) };
  }
  const { payload, ...contexto } = ctx;
  const texto = H.cuerpo(payload);

  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, 'TC-M09-G22-reevaluacion-v2.postman_collection.json'), 'utf8'));
  collection.item = collection.item.filter((i) => i.name === caso);
  if (collection.item.length !== 1) throw Error('Una invocacion ejecuta un unico original');

  const summary = await new Promise((resolve, reject) => {
    const run = newman.run({
      collection, reporters: ['htmlextra'], timeoutRequest: 25000,
      reporter: { htmlextra: { export: html, omitHeaders: true, showEnvironmentData: false, showGlobalData: false,
        skipEnvironmentVars: ['token'], logs: false, silentProgressBar: true, title: `${caso} — G22 REEVALUACION V2 — RF-17 TEST — intento ${intento}` } },
      environment: { values: Object.entries({ base_url: H.BASE, token, id_especie: payload.id_especie, payload: texto, contexto: JSON.stringify(contexto) })
        .map(([key, value]) => ({ key, value: String(value), enabled: true })) },
    }, (err, s) => (err ? reject(Error('Newman execution error')) : resolve(s)));
    run.on('request', (err, args) => {
      let body; try { body = args.response?.json(); } catch { /* sin JSON */ }
      args.request.headers.remove('Authorization'); args.response?.headers?.remove('set-cookie');
      eventos.push({ metodo: args.request.method, status: args.response?.code ?? null,
        cuerpo: args.request.method === 'POST' ? texto : undefined, respuesta: args.request.method === 'POST' ? body : undefined, transportError: !!err });
    });
  });

  const despues = await H.get(`/configuracion/umbrales?id_especie=${payload.id_especie}`, token);
  const post = eventos.find((e) => e.metodo === 'POST');
  const idCreado = post?.status === 201 ? post.respuesta?.id_umbral_ambiental ?? null : null;
  const deLaCombinacion = despues.items.filter((u) => u.id_variable_ambiental === payload.id_variable_ambiental);
  const persistido = deLaCombinacion.find((u) => u.id_umbral_ambiental === idCreado) || null;
  const previosIds = ctx.umbralesPrevios.map((u) => u.id);
  const previosConservados = previosIds.every((id) => despues.items.some((u) => u.id_umbral_ambiental === id));
  const persistio = !!persistido && deLaCombinacion.length === 1;
  const resultado = summary.run.failures.length === 0 && idCreado && persistio && previosConservados ? 'PASS' : 'FAIL';

  fs.writeFileSync(html, H.clean(fs.readFileSync(html, 'utf8')));
  H.save(runId, base + '.json', {
    caso, intento, resultado, ambiente: 'TEST', actor,
    preflight, replanificado,
    especie: ctx.especie, variable: ctx.variable,
    limitesFisicos: { min: ctx.variable.fisicoMin, max: ctx.variable.fisicoMax, efectivoMin: ctx.rangoElegido.efectivoMin, efectivoMax: ctx.rangoElegido.efectivoMax },
    rangoElegido: ctx.rangoElegido, combinacionLibrePrevia: true, umbralesPrevios: ctx.umbralesPrevios,
    payloadEnviado: payload, cuerpoEnviado: texto,
    endpoint: 'POST /configuracion/umbrales', status: post?.status ?? null, errorCode: post?.respuesta?.error_code ?? null, respuesta: post?.respuesta ?? null,
    idCreado,
    getPosterior: { endpoint: `GET /configuracion/umbrales?id_especie=${payload.id_especie}`, status: 200, total: despues.total, ids: despues.items.map((u) => u.id_umbral_ambiental) },
    persistencia: { persistio, registrosDeLaCombinacion: deLaCombinacion.length, previosConservados,
      detalle: persistido ? { id: persistido.id_umbral_ambiental, id_especie: persistido.id_especie, id_variable_ambiental: persistido.id_variable_ambiental,
        valor_min: persistido.valor_min, valor_max: persistido.valor_max, es_activo: persistido.es_activo, niveles: persistido.niveles } : null },
    eventos,
    assertions: summary.run.stats.assertions,
    failures: summary.run.failures.map((f) => ({ test: f.error?.test || f.error?.name, message: H.clean(f.error?.message || '') })),
    newman: '6.2.2', reporter: 'newman-reporter-htmlextra 1.23.1', html: path.relative(evid, html).split(path.sep).join('/'),
  });

  const registro = { combinaciones: [...usadas.filter((u) => u.caso !== caso), {
    caso, intento, id_especie: ctx.especie.id, especie: ctx.especie.nombre, id_variable_ambiental: ctx.variable.id, variable: ctx.variable.nombre,
    idUmbralCreado: idCreado, persistio, status: post?.status ?? null, fecha: new Date().toISOString() }] };
  H.save(runId, 'combinaciones-usadas-v2.json', registro, { sobrescribir: true });

  console.log(`${caso} intento ${intento}: ${resultado} | ${ctx.especie.nombre} + ${ctx.variable.nombre} ${payload.valor_min}..${payload.valor_max}`
    + ` | POST ${post?.status} ${post?.respuesta?.error_code ?? ''} | id ${idCreado} | persistio ${persistio} | previos ${previosConservados}`
    + ` | assertions ${summary.run.stats.assertions.total} fallidas ${summary.run.failures.length}${replanificado ? ' | REPLANIFICADO' : ''}`);
  summary.run.failures.slice(0, 6).forEach((f) => console.log('   FAIL:', f.error?.test, '->', H.clean(f.error?.message || '').slice(0, 140)));
  process.exitCode = resultado === 'PASS' ? 0 : 1;
})().catch((e) => {
  H.save(runId, base + '-error.json', { caso, intento, resultado: 'ERROR', motivo: H.clean(e.message), eventos });
  console.log('ERROR:', H.clean(e.message));
  process.exitCode = 1;
});
