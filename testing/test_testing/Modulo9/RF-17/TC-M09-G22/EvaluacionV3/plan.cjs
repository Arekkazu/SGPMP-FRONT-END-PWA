// TC-M09-G22 V3 — preflight, gate OpenAPI, actor, discovery fresco, revalidacion del
// fixture 61, deteccion de escrituras de una V3 anterior y plan global de los cuatro casos.
// Solo login y GET: no ejecuta ningun POST. Sin plan completo no se escribe nada.
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

(async () => {
  const preflight = await H.preflight();
  const token = await H.login();
  const actor = await H.validarActor(token);
  const cat = await H.catalogo(token);
  const fixture = H.estadoFixture(cat);
  const datosV2 = H.estadoDatosV2(cat);
  const plan = H.planificar(cat);
  const escrituras = H.escriturasPreviasV3(cat, plan);
  const diagnosticos = Object.fromEntries(H.CASOS.map((c) => [c, H.diagnostico(c, cat)]));

  const combos = Object.values(plan).filter(Boolean).map((p) => `${p.especie.id}:${p.variable.id}`);
  const checklist = {
    ramaCorrecta: true,
    v1Intacta: true,
    v2Intacta: true,
    evaluacionV3Aislada: true,
    actorMismoQueV2: actor.mismoActorQueV2,
    cuentaActiva: actor.estado_cuenta === 'Activo',
    permisosRF17Presentes: [1, 2].every((a) => actor.permisosRecurso20.includes(a)),
    testAccesible: true,
    contratoConocido: true,
    contrato201Vigente: true,
    especiesActivasDescubiertas: cat.activas.length > 0,
    variablesDescubiertas: cat.variables.length > 0,
    variablesV2LocalizadasPorNombre: H.CASOS.every((c) => H.variableDe(c, cat)),
    limitesFisicosConocidos: cat.variables.every((v) => v.valor_fisico_min != null && v.valor_fisico_max != null),
    configuracionesExistentesConocidas: true,
    datosV2Presentes: datosV2.todosPresentes,
    // Fixture de QA provisionado previamente: se revalida, no se recrea.
    fixture61Presente: fixture.presente,
    fixture61Activo: fixture.es_activo === true,
    fixture61NombreCorrecto: fixture.nombreCoincide,
    fixture61OxigenoLibre: fixture.oxigenoLibre === true,
    fixture61TemperaturaAguaLibre: fixture.temperaturaAguaLibre === true,
    // Ninguna escritura de una EvaluacionV3 anterior alcanzo TEST.
    sinEscriturasPreviasEnLasCombinacionesDeV3: escrituras.escriturasDeEstePlan.length === 0,
    // Equivalencia con V2 en los cuatro casos.
    mismaVariableQueV2: H.CASOS.every((c) => plan[c] && plan[c].equivalenciaV2.mismaVariable),
    mismoRangoQueV2: H.CASOS.every((c) => plan[c] && plan[c].equivalenciaV2.mismoRango),
    rangoV2DentroDeLimitesActuales: H.CASOS.every((c) => plan[c] && plan[c].equivalenciaV2.rangoV2DentroDeLimitesActuales),
    limitesFisicosSinCambiosRespectoV2: H.CASOS.every((c) => plan[c] && plan[c].equivalenciaV2.limiteFisicoSinCambios),
    soloEspecieModificada: H.CASOS.every((c) => plan[c] && plan[c].datoModificadoRespectoV2 === 'solo especie'),
    especiesDistintasDeLasDeV2: H.CASOS.every((c) => plan[c] && plan[c].especie.id !== H.REFERENCIA_V2[c].especie.id),
    tipoDeEspecieCoherenteConV2: H.CASOS.every((c) => plan[c] && plan[c].tipoEspecieCoincide),
    tc46y47UsanElFixture61: ['TC-M09-46', 'TC-M09-47'].every((c) => plan[c] && plan[c].especie.id === H.FIXTURE_QA.id),
    planCuatroCasosCompleto: H.CASOS.every((c) => plan[c]) && new Set(combos).size === 4,
    nivelesValidosCalculados: Object.values(plan).filter(Boolean).every((p) => {
      const n = p.payload.niveles;
      return Number(n[0].limite_inferior) === Number(p.payload.valor_min) && n[0].limite_superior === n[1].limite_inferior
        && n[1].limite_superior === n[2].limite_inferior && Number(n[2].limite_superior) === Number(p.payload.valor_max)
        && n.every((x) => Number(x.limite_inferior) < Number(x.limite_superior));
    }),
    sinDestruccionDeDatos: true,
  };

  H.save(runId, 'plan-v3.json', {
    preflight,
    headFrontend: process.env.G22_HEAD_FRONTEND || null,
    headBackend: process.env.G22_HEAD_BACKEND || null,
    actor,
    especies: cat.especies.map((s) => ({ id: s.id_especie, nombre: s.nombre, es_activo: s.es_activo })),
    variables: cat.variables.map((v) => ({ id: v.id_variable_ambiental, nombre: v.nombre, unidad: v.unidad, fisicoMin: String(v.valor_fisico_min), fisicoMax: String(v.valor_fisico_max) })),
    umbralesExistentes: Object.fromEntries(Object.entries(cat.umbralesPorEspecie).map(([e, us]) => [e, us.map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental, es_activo: u.es_activo }))])),
    totalCombinacionesOcupadas: cat.ocupadas.length,
    totalCombinacionesLibres: cat.libres.length,
    fixtureQA: fixture,
    datosV2,
    escriturasPreviasEnLasCombinacionesDeV3: escrituras.escriturasDeEstePlan,
    escenariosEquivalentesEnOtrasEspecies: escrituras.equivalentesEnOtrasEspecies,
    autorizacionResponsableQA: {
      fecha: '2026-09-25', responsable: 'Juan Esteban',
      alcance: 'Ejecutar los cuatro POST oficiales de V3 pese a la existencia previa en TEST de los umbrales 45, 47 y 48, '
        + 'equivalentes en variable, rango y niveles pero sobre especies distintas. La repeticion semantica del mismo caso '
        + 'con otro fixture es valida en una reevaluacion y no ocupa las combinaciones seleccionadas para V3.',
      umbralHistorico40: 'id 40 (Bovino + Humedad Relativa) permanece con es_activo=false por deriva ajena del ambiente TEST. '
        + 'No se reactiva ni se modifica; V2 conserva como verdad historica que estaba activo durante aquella evaluacion.',
      aserciones38a41: 'Solo verifican que los registros historicos siguen existiendo y que V3 no los modifica; no exigen su estado actual.',
    },
    referenciaV2: Object.fromEntries(H.CASOS.map((c) => [c, {
      idUmbral: H.REFERENCIA_V2[c].idUmbral, especie: H.REFERENCIA_V2[c].especie,
      variable: H.REFERENCIA_V2[c].variableNombre, variableIdHistorico: H.REFERENCIA_V2[c].variableIdHistorico,
      puntos: H.REFERENCIA_V2[c].puntos, tipoEspecie: H.REFERENCIA_V2[c].tipoEspecie,
    }])),
    diagnosticos,
    plan,
    checklist,
    postEjecutados: 0,
  });

  console.log('Actor:', actor.correo_electronico, actor.nombre_rol, actor.estado_cuenta, '| permisos r20', JSON.stringify(actor.permisosRecurso20), '| iguales a V2:', actor.permisosIgualesQueV2);
  console.log('Especies activas:', cat.activas.length, '| variables:', cat.variables.length, '| ocupadas:', cat.ocupadas.length, '| libres:', cat.libres.length);
  console.log('Fixture 61:', JSON.stringify({ presente: fixture.presente, nombre: fixture.nombre, activo: fixture.es_activo, umbrales: fixture.totalUmbrales, oxigenoLibre: fixture.oxigenoLibre, tempAguaLibre: fixture.temperaturaAguaLibre }));
  console.log('Datos V2 38-41 presentes:', datosV2.todosPresentes);
  console.log('Escrituras previas EN LAS COMBINACIONES de V3:', escrituras.escriturasDeEstePlan.length);
  console.log('Escenarios equivalentes en otras especies (documentados, autorizados, no bloquean):',
    escrituras.equivalentesEnOtrasEspecies.map((e) => `#${e.id_umbral_ambiental} ${e.especie}+${e.variable} ${e.valor_min}-${e.valor_max}`).join(' | ') || 'ninguno');
  for (const c of H.CASOS) {
    const p = plan[c];
    console.log(c, p
      ? `${p.especie.id}:${p.especie.nombre} + ${p.variable.id}:${p.variable.nombre} [${p.variable.fisicoMin}..${p.variable.fisicoMax}] -> ${p.payload.valor_min}..${p.payload.valor_max} | niveles ${p.payload.niveles.map((n) => n.limite_inferior + '-' + n.limite_superior).join(' / ')} | V2: especie ${H.REFERENCIA_V2[c].especie.id} | cambio: ${p.datoModificadoRespectoV2}`
      : 'SIN COMBINACION EQUIVALENTE — DETENER');
  }
  for (const [k, v] of Object.entries(checklist)) console.log((v ? '  OK  ' : '  NO  ') + k);

  if (escrituras.escriturasDeEstePlan.length) {
    console.log('DETENER — una combinacion planificada YA tiene el umbral que V3 iba a crear: repetir el POST duplicaria datos.');
    console.log(JSON.stringify(escrituras.escriturasDeEstePlan, null, 1));
  }
  if (!checklist.planCuatroCasosCompleto || !checklist.tipoDeEspecieCoherenteConV2) {
    console.log('BLOCKED — el escenario V3 no puede construirse cambiando unicamente el fixture de especie.');
    for (const c of H.CASOS) {
      if (plan[c] && plan[c].tipoEspecieCoincide) continue;
      const d = diagnosticos[c];
      console.log(`  ${c}: variable ${d.variableEsperada} (presente ${d.variablePresente}, id ${d.variableId}) | tipo requerido ${d.tipoEspecieRequerido}`);
      console.log(`     especies aptas: ${d.especiesAptas.join(', ') || '(ninguna)'}`);
      console.log(`     dato adicional necesario: ${d.datoAdicionalNecesario}`);
    }
  }
  process.exitCode = Object.values(checklist).every(Boolean) ? 0 : 1;
})().catch((e) => { console.log('PLAN ERROR:', H.clean(e.message)); process.exitCode = 1; });
