// TC-M09-G22 V2 — verificacion final de solo lectura: los umbrales creados siguen
// persistidos, activos y con sus niveles; los umbrales previos de cada especie se conservan.
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

(async () => {
  const token = await H.login();
  const actor = await H.validarActor(token);
  const salida = {};
  for (const caso of H.CASOS) {
    const ev = H.load(runId, `${caso}-v2-intento1.json`);
    const items = (await H.get(`/configuracion/umbrales?id_especie=${ev.especie.id}`, token)).items;
    const u = items.find((x) => x.id_umbral_ambiental === ev.idCreado);
    salida[caso] = {
      id: ev.idCreado, especie: ev.especie.nombre, variable: ev.variable.nombre,
      presente: !!u, es_activo: u?.es_activo ?? null,
      valoresCoinciden: !!u && u.valor_min === ev.persistencia.detalle.valor_min && u.valor_max === ev.persistencia.detalle.valor_max,
      nivelesCoinciden: !!u && JSON.stringify(u.niveles) === JSON.stringify(ev.persistencia.detalle.niveles),
      registrosDeLaCombinacion: items.filter((x) => x.id_variable_ambiental === ev.variable.id).length,
      previosConservados: ev.umbralesPrevios.every((p) => items.some((x) => x.id_umbral_ambiental === p.id)),
      totalEspecie: items.length,
    };
  }
  H.save(runId, 'verificacion-final-readonly.json', { actor: actor.correo_electronico, rol: actor.nombre_rol, operaciones: 'solo GET', resultados: salida });
  console.log(JSON.stringify(salida, null, 1));
})().catch((e) => { console.log('ERROR:', H.clean(e.message)); process.exitCode = 1; });
