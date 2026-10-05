// TC-M09-G22 V3 — un original por invocacion: un unico POST real + GET de persistencia.
// Presupuesto: 1 POST por original, 4 en total. Revalidacion inmediatamente antes del POST.
// Si el POST falla no se reintenta: se guarda la evidencia y se diagnostica.
const fs = require('fs');
const path = require('path');
const newman = require('newman');
const { execSync } = require('child_process');
require.resolve('newman-reporter-htmlextra');
const H = require('./helpers.cjs');
const { runId, caso, intento } = H.settings();

const base = `${caso}-v4-intento${intento}`;
const evid = H.dir(runId);
const htmlDir = H.dir(runId, 'newman');
const html = path.join(htmlDir, `newman-${base}.html`);
const json = path.join(htmlDir, `newman-${base}.json`);
if (fs.existsSync(path.join(evid, base + '.json')) || fs.existsSync(path.join(evid, base + '-error.json')) || fs.existsSync(html)) throw Error('No sobrescribir la evidencia de este intento');
const planGlobal = H.load(runId, 'plan-v4.json');
if (!planGlobal) throw Error('plan-v4.json ausente: el plan global debe existir antes del primer POST');
if (!Object.values(planGlobal.checklist).every(Boolean)) throw Error('plan-v4.json con checklist incompleto: no se escribe nada');

const versionGlobal = (paquete) => {
  try { return require(path.join(execSync('npm root -g').toString().trim(), paquete, 'package.json')).version; } catch { return 'desconocida'; }
};

const eventos = [];
(async () => {
  const preflight = await H.preflight();
  const token = await H.login();
  const actor = await H.validarActor(token);

  // --- Revalidacion inmediatamente antes del POST: TEST es compartido ---
  const usadas = H.load(runId, 'combinaciones-usadas-v4.json')?.combinaciones || [];
  const otras = usadas.filter((u) => u.caso !== caso && (u.idUmbralCreado || u.persistio));
  const cat = await H.catalogo(token);
  const fixtureAntes = H.estadoFixture(cat);
  const datosV2Antes = H.estadoDatosV2(cat);
  let ctx = planGlobal.plan[caso];
  // Si la combinacion exacta que vamos a enviar ya existe, un POST de V3 ya persistio: no se repite.
  const yaEscrito = H.escriturasPreviasV4(cat, { [caso]: ctx }).escriturasDeEstePlan
    .filter((s) => !otras.some((o) => o.idUmbralCreado === s.id_umbral_ambiental));
  if (yaEscrito.length) throw Error(`DETENER — ${caso} ya tiene persistido el umbral que V3 iba a crear: ${JSON.stringify(yaEscrito)}`);

  const ocupada = (cat.umbralesPorEspecie[ctx.especie.id] || []).some((u) => u.id_variable_ambiental === ctx.variable.id);
  const yaUsada = otras.some((u) => u.id_especie === ctx.especie.id && u.id_variable_ambiental === ctx.variable.id);
  const especieActiva = cat.activas.some((s) => s.id_especie === ctx.especie.id);
  let replanificado = false;
  if (ocupada || yaUsada || !especieActiva) {
    // Solo se busca otra ESPECIE equivalente: misma variable, mismo rango, mismos niveles.
    ctx = H.planificar(cat, [caso], otras)[caso];
    replanificado = true;
    if (!ctx) throw Error(`BLOCKED — ${caso} no puede reproducirse cambiando unicamente el fixture de especie`);
  } else {
    ctx = { ...ctx, umbralesPrevios: (cat.umbralesPorEspecie[ctx.especie.id] || []).map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental })) };
  }
  // Salvaguarda de equivalencia: nunca se envia un rango o una variable distintos de V2.
  const eq = ctx.equivalenciaV2;
  if (!eq.mismaVariable || !eq.mismoRango || !eq.mismosNiveles || !eq.rangoV2DentroDeLimitesActuales) throw Error(`BLOCKED — equivalencia V2 no verificable para ${caso}`);

  const { payload, ...contexto } = ctx;
  const texto = H.cuerpo(payload);

  // --- SNAPSHOT PRE ---
  const snapshotPre = {
    especie: ctx.especie, variable: ctx.variable,
    limitesFisicos: { min: ctx.variable.fisicoMin, max: ctx.variable.fisicoMax },
    valor_min: payload.valor_min, valor_max: payload.valor_max, niveles: payload.niveles,
    combinacionLibre: true,
    umbralesActualesDeLaEspecie: (cat.umbralesPorEspecie[ctx.especie.id] || []).length,
    idsExistentesDeLaEspecie: (cat.umbralesPorEspecie[ctx.especie.id] || []).map((u) => u.id_umbral_ambiental),
    fixture61: fixtureAntes, datosV2: datosV2Antes,
  };
  H.save(runId, `${caso}-v4-snapshot-pre.json`, snapshotPre);

  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, 'TC-M09-G22-reevaluacion-v4.postman_collection.json'), 'utf8'));
  collection.item = collection.item.filter((i) => i.name === caso);
  if (collection.item.length !== 1) throw Error('Una invocacion ejecuta un unico original');

  const summary = await new Promise((resolve, reject) => {
    const run = newman.run({
      collection, reporters: ['cli', 'json', 'htmlextra'], timeoutRequest: 25000,
      reporter: {
        json: { export: json },
        htmlextra: { export: html, omitHeaders: true, showEnvironmentData: false, showGlobalData: false,
          skipEnvironmentVars: ['token'], logs: false, silentProgressBar: true,
          title: `${caso} — G22 REEVALUACION V4 — RF-17 TEST — intento ${intento}` },
      },
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

  // --- SNAPSHOT POST ---
  const despues = await H.get(`/configuracion/umbrales?id_especie=${payload.id_especie}`, token);
  const post = eventos.find((e) => e.metodo === 'POST');
  const idCreado = post?.status === 201 ? post.respuesta?.id_umbral_ambiental ?? null : null;
  const deLaCombinacion = despues.items.filter((u) => u.id_variable_ambiental === payload.id_variable_ambiental);
  // Flujo alterno "fallo de sincronizacion Edge": el backend puede responder 500 habiendo
  // guardado el registro. Sin id en la respuesta, se localiza por (especie, variable) entre
  // los que NO existian antes del POST. Es diagnostico de persistencia, no una aserción relajada.
  const previosIds = new Set(ctx.umbralesPrevios.map((u) => u.id));
  const nuevoDetectado = deLaCombinacion.find((u) => !previosIds.has(u.id_umbral_ambiental)) || null;
  const idPersistido = idCreado ?? (nuevoDetectado ? nuevoDetectado.id_umbral_ambiental : null);
  const persistido = deLaCombinacion.find((u) => u.id_umbral_ambiental === idPersistido) || null;
  const previosConservados = ctx.umbralesPrevios.every((p) => despues.items.some((u) => u.id_umbral_ambiental === p.id));
  const persistio = !!persistido && deLaCombinacion.length === 1;
  const catDespues = { ...cat, umbralesPorEspecie: { ...cat.umbralesPorEspecie, [payload.id_especie]: despues.items } };
  const datosV2Despues = H.estadoDatosV2(catDespues);
  const resultado = summary.run.failures.length === 0 && idCreado && persistio && previosConservados && datosV2Despues.todosPresentes ? 'PASS' : 'FAIL';

  for (const f of [html, json]) if (fs.existsSync(f)) fs.writeFileSync(f, H.clean(fs.readFileSync(f, 'utf8')));
  H.save(runId, base + '.json', {
    caso, intento, resultado, ambiente: 'TEST', actor,
    preflight, replanificado,
    especie: ctx.especie, variable: ctx.variable,
    limitesFisicos: { min: ctx.variable.fisicoMin, max: ctx.variable.fisicoMax, efectivoMin: ctx.rangoElegido.efectivoMin, efectivoMax: ctx.rangoElegido.efectivoMax },
    rangoElegido: ctx.rangoElegido, equivalenciaV2: eq, datoModificadoRespectoV2: ctx.datoModificadoRespectoV2,
    tipoEspecieEsperado: ctx.tipoEspecieEsperado, tipoEspecieCoincide: ctx.tipoEspecieCoincide,
    snapshotPre, combinacionLibrePrevia: true, umbralesPrevios: ctx.umbralesPrevios,
    payloadEnviado: payload, cuerpoEnviado: texto,
    endpoint: 'POST /configuracion/umbrales', status: post?.status ?? null, errorCode: post?.respuesta?.error_code ?? null, respuesta: post?.respuesta ?? null,
    idCreado,
    getPosterior: { endpoint: `GET /configuracion/umbrales?id_especie=${payload.id_especie}`, status: 200, total: despues.total, ids: despues.items.map((u) => u.id_umbral_ambiental) },
    persistencia: { persistio, idPersistido, persistioPeseAlError: !idCreado && !!persistido,
      registrosDeLaCombinacion: deLaCombinacion.length, previosConservados,
      detalle: persistido ? { id: persistido.id_umbral_ambiental, id_especie: persistido.id_especie, id_variable_ambiental: persistido.id_variable_ambiental,
        valor_min: persistido.valor_min, valor_max: persistido.valor_max, es_activo: persistido.es_activo, niveles: persistido.niveles } : null },
    datosV2Antes, datosV2Despues,
    eventos,
    assertions: summary.run.stats.assertions,
    failures: summary.run.failures.map((f) => ({ test: f.error?.test || f.error?.name, message: H.clean(f.error?.message || '') })),
    duracionMs: summary.run.timings?.completed - summary.run.timings?.started,
    newman: versionGlobal('newman'), reporter: 'newman-reporter-htmlextra ' + versionGlobal('newman-reporter-htmlextra'),
    html: path.relative(evid, html).split(path.sep).join('/'), reporteJson: path.relative(evid, json).split(path.sep).join('/'),
  });

  H.save(runId, 'combinaciones-usadas-v4.json', { combinaciones: [...usadas.filter((u) => u.caso !== caso), {
    caso, intento, id_especie: ctx.especie.id, especie: ctx.especie.nombre, id_variable_ambiental: ctx.variable.id, variable: ctx.variable.nombre,
    especieV2: H.REFERENCIA_V2[caso].especie, idUmbralV2: H.REFERENCIA_V2[caso].idUmbral,
    idUmbralCreado: idCreado, persistio, status: post?.status ?? null, fecha: new Date().toISOString() }] }, { sobrescribir: true });

  console.log(`${caso} intento ${intento}: ${resultado} | ${ctx.especie.nombre} + ${ctx.variable.nombre} ${payload.valor_min}..${payload.valor_max}`
    + ` | POST ${post?.status} ${post?.respuesta?.error_code ?? ''} | id ${idCreado} | persistio ${persistio} | previos ${previosConservados}`
    + ` | V2 38-41 ${datosV2Despues.todosPresentes}`
    + ` | assertions ${summary.run.stats.assertions.total} fallidas ${summary.run.failures.length}${replanificado ? ' | REPLANIFICADO' : ''}`);
  summary.run.failures.slice(0, 6).forEach((f) => console.log('   FAIL:', f.error?.test, '->', H.clean(f.error?.message || '').slice(0, 140)));
  process.exitCode = resultado === 'PASS' ? 0 : 1;
})().catch((e) => {
  H.save(runId, base + '-error.json', { caso, intento, resultado: 'ERROR', motivo: H.clean(e.message), eventos });
  console.log('ERROR:', H.clean(e.message));
  process.exitCode = 1;
});
