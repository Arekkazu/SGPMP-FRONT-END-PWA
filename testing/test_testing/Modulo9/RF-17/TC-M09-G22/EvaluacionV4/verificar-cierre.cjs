// TC-M09-G22 V3 — verificacion final de solo lectura: los umbrales creados en V3 siguen
// persistidos, activos y con sus niveles; los umbrales previos de cada especie se conservan
// y los registros historicos de V2 (ids 38-41) continuan intactos.
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

(async () => {
  const token = await H.login();
  const actor = await H.validarActor(token);
  const salida = {};
  for (const caso of H.CASOS) {
    const ev = H.load(runId, `${caso}-v4-intento1.json`);
    if (!ev) { salida[caso] = { error: 'sin evidencia Newman' }; continue; }
    // El POST respondio 500 por el flujo alterno de sincronizacion Edge habiendo guardado el
    // registro: la respuesta no trae id, asi que se usa el localizado por GET tras el POST.
    const complemento = H.load(runId, `${caso}-v4-persistencia-pese-a-500.json`);
    const idV4 = ev.idCreado ?? ev.persistencia?.idPersistido ?? complemento?.idPersistido ?? null;
    const detalleV4 = ev.persistencia?.detalle || complemento?.detalle || null;
    const items = (await H.get(`/configuracion/umbrales?id_especie=${ev.especie.id}`, token)).items;
    const u = items.find((x) => x.id_umbral_ambiental === idV4);
    salida[caso] = {
      id: idV4, especie: ev.especie.nombre, variable: ev.variable.nombre,
      httpPost: ev.status, errorCode: ev.errorCode,
      estadoSincronizacion: u ? u.estado_sincronizacion ?? null : null,
      presente: !!u, es_activo: u?.es_activo ?? null,
      valoresCoinciden: !!u && !!detalleV4 && u.valor_min === detalleV4.valor_min && u.valor_max === detalleV4.valor_max,
      nivelesCoinciden: !!u && !!detalleV4 && JSON.stringify(u.niveles) === JSON.stringify(detalleV4.niveles),
      registrosDeLaCombinacion: items.filter((x) => x.id_variable_ambiental === ev.variable.id).length,
      previosConservados: ev.umbralesPrevios.every((p) => items.some((x) => x.id_umbral_ambiental === p.id)),
      totalEspecie: items.length,
      mismoRangoQueV2: ev.equivalenciaV2.mismoRango, datoModificadoRespectoV2: ev.datoModificadoRespectoV2,
    };
  }
  const cat = await H.catalogo(token);
  const datosV2 = H.estadoDatosV2(cat);
  const fixture = H.estadoFixture(cat);
  H.save(runId, 'verificacion-final-readonly.json', {
    actor: actor.correo_electronico, rol: actor.nombre_rol, operaciones: 'solo GET',
    resultados: salida, datosV2Conservados: datosV2, fixtureQA: fixture,
  }, { sobrescribir: true });
  console.log(JSON.stringify({ v3: salida, v2: { ids: datosV2.ids, todosPresentes: datosV2.todosPresentes },
    fixture61: { activo: fixture.es_activo, umbrales: fixture.totalUmbrales } }, null, 1));
  process.exitCode = Object.values(salida).every((r) => r.presente && r.es_activo && r.valoresCoinciden && r.nivelesCoinciden
    && r.registrosDeLaCombinacion === 1 && r.previosConservados) && datosV2.todosPresentes ? 0 : 1;
})().catch((e) => { console.log('ERROR:', H.clean(e.message)); process.exitCode = 1; });
