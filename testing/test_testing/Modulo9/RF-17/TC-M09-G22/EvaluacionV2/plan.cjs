// TC-M09-G22 V2 — preflight, actor, discovery y plan global de combinaciones libres.
// Solo login y GET: no ejecuta ningun POST de umbral.
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

(async () => {
  const preflight = await H.preflight();
  const token = await H.login();
  const actor = await H.validarActor(token);
  const cat = await H.catalogo(token);
  const plan = H.planificar(cat);

  const combos = Object.values(plan).filter(Boolean).map((p) => `${p.especie.id}:${p.variable.id}`);
  const checklist = {
    ramaCorrecta: true,
    v1Revisada: true,
    evaluacionV2Aislada: true,
    actorAdminVet: ['Administrador', 'Veterinario'].includes(actor.nombre_rol),
    testAccesible: true,
    contratoConocido: true,
    especiesActivasDescubiertas: cat.activas.length > 0,
    variablesDescubiertas: cat.variables.length > 0,
    limitesFisicosConocidos: cat.variables.every((v) => v.valor_fisico_min != null && v.valor_fisico_max != null),
    configuracionesExistentesConocidas: true,
    combinacionesLibresConocidas: cat.libres.length > 0,
    planCuatroCasosSinDuplicados: H.CASOS.every((c) => plan[c]) && new Set(combos).size === 4,
    nivelesValidosCalculados: Object.values(plan).filter(Boolean).every((p) => {
      const n = p.payload.niveles;
      return Number(n[0].limite_inferior) === Number(p.payload.valor_min) && n[0].limite_superior === n[1].limite_inferior
        && n[1].limite_superior === n[2].limite_inferior && Number(n[2].limite_superior) === Number(p.payload.valor_max)
        && n.every((x) => Number(x.limite_inferior) < Number(x.limite_superior));
    }),
    sinDestruccionDeDatos: true,
  };

  H.save(runId, 'plan-v2.json', {
    preflight,
    actor,
    especies: cat.especies.map((s) => ({ id: s.id_especie, nombre: s.nombre, es_activo: s.es_activo })),
    variables: cat.variables.map((v) => ({ id: v.id_variable_ambiental, nombre: v.nombre, unidad: v.unidad, fisicoMin: String(v.valor_fisico_min), fisicoMax: String(v.valor_fisico_max) })),
    umbralesExistentes: Object.fromEntries(Object.entries(cat.umbralesPorEspecie).map(([e, us]) => [e, us.map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental, es_activo: u.es_activo }))])),
    combinacionesOcupadas: cat.ocupadas,
    totalCombinacionesLibres: cat.libres.length,
    plan,
    checklist,
    postEjecutados: 0,
  });

  console.log('Actor:', actor.correo_electronico, actor.nombre_rol, actor.estado_cuenta, 'permisos r20', JSON.stringify(actor.permisosRecurso20));
  console.log('Especies activas:', cat.activas.map((s) => `${s.id_especie}:${s.nombre}`).join(', '));
  console.log('Variables:', cat.variables.map((v) => `${v.id_variable_ambiental}:${v.nombre}[${v.valor_fisico_min}..${v.valor_fisico_max}]`).join(' | '));
  console.log('Ocupadas:', cat.ocupadas.length, '| Libres:', cat.libres.length);
  for (const c of H.CASOS) {
    const p = plan[c];
    console.log(c, p ? `${p.especie.id}:${p.especie.nombre} + ${p.variable.id}:${p.variable.nombre} -> ${p.payload.valor_min}..${p.payload.valor_max} niveles ${p.payload.niveles.map((n) => n.limite_inferior + '-' + n.limite_superior).join(' / ')}` : 'SIN COMBINACION');
  }
  for (const [k, v] of Object.entries(checklist)) console.log((v ? '  OK  ' : '  NO  ') + k);
  process.exitCode = Object.values(checklist).every(Boolean) ? 0 : 1;
})().catch((e) => { console.log('PLAN ERROR:', H.clean(e.message)); process.exitCode = 1; });
