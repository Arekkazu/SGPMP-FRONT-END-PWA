// | Fecha      | Nombre      | Que se hizo                                                                        |
// |------------|-------------|------------------------------------------------------------------------------------|
// | 2026-11-09 | Laura032005 | TC-M06-G31 RF-82..85: tareas de Cypress que preparan los datos por API dentro del run |
'use strict';

// Preparación de datos de TC-M06-G31 (se ejecuta en Node, no en el navegador: el secreto del sandbox y las
// contraseñas nunca pasan por la interfaz ni por el registro de comandos de Cypress).
// Es el espejo de los ayudantes de pytest (sgpmp-backend/tests/Test_Testing/Test_Modulo6/m06_lib.py).
//
// Variables de entorno (PowerShell, antes de correr Cypress):
//   $env:CYPRESS_TEST_SANDBOX_SECRET   secreto del sandbox
//   $env:CYPRESS_QA_CONTRASENA_ADMIN / _INGENIERO / _PRODUCTOR / _VETERINARIO
// Opcionales: CYPRESS_API_URL (por defecto TEST), CYPRESS_QA_ID_FINCA (163).

// La dirección de la API la fija cada tarea con la que usa la interfaz (se toma de su petición de login), para que los datos
// preparados aquí y la bandeja que lee la interfaz sean los mismos. Solo se aceptan direcciones de TEST.
let API = (process.env.CYPRESS_API_URL || 'https://api.inmero.co/api-sgpmp-test').replace(/\/$/, '');

function fijarApi(api) {
  const candidata = String(api || API).replace(/\/$/, '');
  if (candidata.endsWith('/sigab') || !/test/i.test(candidata)) {
    throw new Bloqueo(`la API ${candidata} no parece ser de TEST: MAIN nunca se prueba.`);
  }
  API = candidata;
}
const SECRETO = process.env.CYPRESS_TEST_SANDBOX_SECRET || '';
const TZ = 'America/Bogota';
const LIMITE_RUN_S = 170; // el backend cierra el run a los 180 s
const ID_FINCA = Number(process.env.CYPRESS_QA_ID_FINCA || 163);
const ID_USUARIO_INGENIERO = 158;
const ROL_CONTADOR = 5;
// Especie de TEST con métrica y ciclo productivo sembrados (Cachama): el evento productivo de M02 (RF-43) exige una fase activa.
const ID_ESPECIE_PRODUCTIVA = 4;
const ID_METRICA_PRODUCTIVA = 16;
const ID_CICLO_PRODUCTIVO = 4;

const CUENTAS = {
  admin: [process.env.CYPRESS_QA_CORREO_ADMIN || 'admin@pecuaria.co', 'CYPRESS_QA_CONTRASENA_ADMIN'],
  ingeniero: [process.env.CYPRESS_QA_CORREO_INGENIERO || 'ingedecampo6@gmail.com', 'CYPRESS_QA_CONTRASENA_INGENIERO'],
  productor: [process.env.CYPRESS_QA_CORREO_PRODUCTOR || 'daniiella.vargass@gmail.com', 'CYPRESS_QA_CONTRASENA_PRODUCTOR'],
  veterinario: [process.env.CYPRESS_QA_CORREO_VETERINARIO || 'mariajosecastillovargas57@gmail.com', 'CYPRESS_QA_CONTRASENA_VETERINARIO'],
};

// Cuentas del plan contable de PRUEBA que se cargan por la API de M09 (matriz RF-109) para la especie del run.
const CUENTAS_MATRIZ = [
  ['RECONOCIMIENTO_NACIMIENTO', 'UNICO', '140105', '425010'],
  ['RECONOCIMIENTO_NACIMIENTO', 'TRASLADO', '140105', '280505'],
  ['RECONOCIMIENTO_DIFERENCIA', 'GANANCIA', '140105', '425020'],
  ['RECONOCIMIENTO_DIFERENCIA', 'PERDIDA', '531520', '140105'],
  ['VARIACION_VR_TB', 'GANANCIA', '140105', '425030'],
  ['VARIACION_VR_TB', 'PERDIDA', '531530', '140105'],
  ['VARIACION_VR_PM', 'GANANCIA', '140105', '425040'],
  ['VARIACION_VR_PM', 'PERDIDA', '531540', '140105'],
  ['PRODUCTO_AGRICOLA', 'UNICO', '143005', '425050'],
  ['PRODUCTO_AGRICOLA', 'TRASLADO', '143005', '140105'],
  ['BAJA_ACTIVO', 'UNICO', '130505', '140105'],
  ['BAJA_ACTIVO', 'PERDIDA', '531550', '140105'],
];

class Bloqueo extends Error {}
class NoConcluyente extends Error {}

const corridas = new Map(); // run_id -> instante de la primera petición dentro del run

// ---------------------------------------------------------------------------------- utilidades
function hoy(dias = 0) {
  // Bogotá es UTC-5 todo el año.
  return new Date(Date.now() - 5 * 3600 * 1000 + dias * 86400 * 1000).toISOString().slice(0, 10);
}

function sufijo(n = 8) {
  // El backend rechaza nombres con números o símbolos (VAL_ENTRADA): solo letras.
  let s = '';
  for (let i = 0; i < n; i += 1) s += String.fromCharCode(97 + Math.floor(Math.random() * 16));
  return s;
}

function dvNit(numero) {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digitos = numero.split('').reverse();
  const s = digitos.reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const r = s % 11;
  return r < 2 ? r : 11 - r;
}

function lista(data, ...claves) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of [...claves, 'items', 'eventos', 'resultados', 'rows', 'data']) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
}

async function llamar(metodo, ruta, { token, run, json, params } = {}) {
  const headers = { 'X-Zona-Horaria': TZ };
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (run) {
    if (!SECRETO) throw new Bloqueo('falta CYPRESS_TEST_SANDBOX_SECRET (secreto del sandbox).');
    headers['X-Test-Run-Id'] = run;
    headers['X-Sandbox-Secret'] = SECRETO;
    if (!corridas.has(run)) corridas.set(run, Date.now());
  }
  let url = API + ruta;
  if (params) url += `?${new URLSearchParams(params).toString()}`;
  const t0 = Date.now();
  const resp = await fetch(url, {
    method: metodo,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    signal: AbortSignal.timeout(40000),
  });
  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  return { status: resp.status, data, text, err: data && data.error_code, ms: Date.now() - t0 };
}

async function prep(promesa, codigos, que) {
  const r = await promesa;
  if (!codigos.includes(r.status)) {
    throw new Bloqueo(`precondición «${que}» respondió HTTP ${r.status} ${String(r.text).slice(0, 220)}`);
  }
  return r;
}

function presupuesto(run, segundos) {
  const inicio = corridas.get(run);
  const restante = inicio ? LIMITE_RUN_S - (Date.now() - inicio) / 1000 : LIMITE_RUN_S;
  if (restante < segundos) {
    throw new NoConcluyente(`se agotó el presupuesto de ${LIMITE_RUN_S} s del sandbox (quedan ${restante.toFixed(0)} s).`);
  }
}

function resumir(r) {
  const d = r.data || {};
  return {
    status: r.status,
    error_code: r.err || null,
    indicador_valoracion: d.indicador_valoracion || null,
    es_confirmable: d.es_confirmable === undefined ? null : d.es_confirmable,
    advertencias: Array.isArray(d.advertencias) ? d.advertencias.length : null,
    bloqueos: Array.isArray(d.bloqueos) ? d.bloqueos.map((b) => (b && (b.codigo || b.code)) || b) : null,
  };
}

// ---------------------------------------------------------------------------------- datos del run
async function titular(c) {
  const r = await llamar('GET', `/configuracion/fincas/${ID_FINCA}/titular`, { token: c.admin, run: c.run });
  if (r.status === 200 && r.data && (r.data.numero_id_tributaria || r.data.titular)) return;
  const nit = '900123456';
  await prep(llamar('PUT', `/configuracion/fincas/${ID_FINCA}/titular`, {
    token: c.admin, run: c.run,
    json: { tipo_id_tributaria: 'NIT', numero_id_tributaria: nit, dv: String(dvNit(nit)), razon_social: 'QA Titular M06' },
  }), [200, 201], 'titular tributario de la finca');
}

// La cuenta del ingeniero (id 158) pasa a Contador dentro del run; el rollback la restaura.
async function contador(c) {
  const d = await prep(llamar('GET', `/usuarios/${ID_USUARIO_INGENIERO}/detalle`, { token: c.admin, run: c.run }), [200], 'detalle del usuario 158');
  await prep(llamar('PATCH', `/usuarios/${ID_USUARIO_INGENIERO}`, {
    token: c.admin, run: c.run,
    json: { nombre: d.data.nombre, apellidos: d.data.apellidos, version: d.data.version, id_rol: ROL_CONTADOR },
  }), [200], 'PATCH rol Contador del usuario 158');
}

async function precio(c, esc, valor, { fuente = 'MERCADO_ACTIVO', desde, hasta, categoria } = {}) {
  const cuerpo = {
    id_especie: esc.idEsp, categoria: categoria || esc.categoria, precio_unitario: valor,
    fecha_vigencia: desde || hoy(-1), fuente, evidencia_documental: 'Boletín de precios QA TC-M06', confirmar_desviacion: true,
  };
  if (hasta) cuerpo.fecha_vencimiento = hasta;
  return prep(llamar('POST', '/finanzas/precios', { token: c.ing, run: c.run, json: cuerpo }), [200, 201], 'registrar precio RF-89');
}

async function escenario(c, o = {}) {
  const {
    categoria = 'POR_CABEZA', clasificacion = 'PRODUCCION', costos = ['0.02', '0.03', '0.01'], precioActivo = '8000000.00',
    vidaUtil = 60, especieExistente = null,
  } = o;
  await titular(c);
  await contador(c);
  const suf = sufijo(8);
  let idEsp = especieExistente;
  if (!idEsp) {
    const a = await prep(llamar('POST', '/configuracion/especies', {
      token: c.admin, run: c.run,
      json: { nombre: `Especie QA ${suf}`, descripcion: 'Especie de prueba TC-M06', densidad_maxima_por_especie: '50.00', grupo_manejo: 'PORCINOS' },
    }), [200, 201], 'crear especie');
    idEsp = a.data.id_especie;
  }
  const i = await prep(llamar('POST', '/configuracion/infraestructuras', {
    token: c.admin, run: c.run,
    json: { nombre_infraestructura: `Galpon QA ${suf}`, tipo_area: 'Galpón', superficie: '500.00', finca_id: ID_FINCA, especie_id: idEsp },
  }), [200, 201], 'crear infraestructura');
  const esc = { idEsp, idInfra: i.data.id_infraestructura, categoria };
  if (clasificacion) {
    const cuerpo = { clasificacion, categoria_precio: categoria };
    if (vidaUtil) cuerpo.vida_util_meses = vidaUtil;
    await prep(llamar('PUT', `/finanzas/configuracion/especies/${idEsp}`, { token: c.ing, run: c.run, json: cuerpo }), [200, 201], 'parámetros de la especie (M09)');
  }
  if (costos) {
    await prep(llamar('PUT', `/finanzas/configuracion/costos-venta/${idEsp}`, {
      token: c.ing, run: c.run, json: { pct_transporte: costos[0], pct_comisiones: costos[1], pct_impuestos: costos[2] },
    }), [200, 201], 'costos de venta (M09)');
  }
  for (const [tipo, sentido, deb, cre] of CUENTAS_MATRIZ) {
    // Si una asignación ya existe, el backend la rechaza y el escenario sigue (igual que en pytest).
    await llamar('POST', '/finanzas/configuracion/matriz', {
      token: c.ing, run: c.run,
      json: { tipo_hecho: tipo, sentido, id_especie: idEsp, cuenta_debito: deb, cuenta_credito: cre },
    });
  }
  if (precioActivo) await precio(c, esc, precioActivo);
  return esc;
}

// M02 exige una fase productiva activa para registrar eventos de crecimiento (SIN_FASE_ACTIVA, HTTP 422): se asocia el activo al ciclo antes del pesaje.
async function asignarFase(c, ida) {
  const f = await llamar('POST', `/activos-biologicos/${ida}/fases`, { token: c.admin, run: c.run, json: { id_ciclo_productiva: ID_CICLO_PRODUCTIVO } });
  if (![200, 201].includes(f.status)) {
    throw new Bloqueo(`precondición «asignar la fase del ciclo ${ID_CICLO_PRODUCTIVO} al activo» (RF-37) respondió HTTP ${f.status} ${String(f.text).slice(0, 200)}`);
  }
}

async function pesaje(c, ida, kg) {
  return prep(llamar('POST', `/activos-biologicos/${ida}/eventos/crecimiento`, {
    token: c.admin, run: c.run, json: { tipo_medicion: 'PESO', valor_medicion: kg, unidad_medida: 'kg' },
  }), [200, 201], 'evento de crecimiento (pesaje)');
}

async function activo(c, esc, { origen = 'compra', costo = '2500000.0000', soporte = 'Factura QA-M06', pesoKg = null } = {}) {
  const cuerpo = {
    tipo_activo: 'INDIVIDUAL', id_especie: esc.idEsp, id_infraestructura: esc.idInfra, fecha_inicio_ciclo: hoy(),
    origen_financiero: origen, identificador: `QA-M06-${sufijo(10)}`, raza: 'QA', sexo: 'Macho',
  };
  if (costo !== null) cuerpo.costo_adquisicion = costo;
  if (soporte !== null) cuerpo.soporte_documental = soporte;
  const r = await prep(llamar('POST', '/activos-biologicos', { token: c.admin, run: c.run, json: cuerpo }), [200, 201], `registrar activo RF-33 (${origen})`);
  const ida = r.data.id_activo_biologico;
  if (esc.categoria === 'PESO_KG') {
    await asignarFase(c, ida);
    await pesaje(c, ida, pesoKg || '400');
  }
  return ida;
}

const propuesta = (c, ida) => llamar('GET', `/finanzas/reconocimientos/propuestas/${ida}`, { token: c.ing, run: c.run });
const confirmar = (c, ida) => llamar('POST', `/finanzas/reconocimientos/${ida}`, { token: c.ing, run: c.run, json: {} });
const procesar = (c) => llamar('POST', '/finanzas/eventos/procesar', { token: c.ing, run: c.run });
const simulacion = (c, ida) => llamar('GET', `/finanzas/activos/${ida}/simulacion`, { token: c.ing, run: c.run });

async function reconocer(c, esc, o) {
  const ida = await activo(c, esc, o);
  await prep(confirmar(c, ida), [200, 201], 'confirmar el reconocimiento inicial');
  return ida;
}

async function tiposAuditoria(c, ida) {
  const r = await llamar('GET', '/finanzas/auditoria', { token: c.ing, run: c.run, params: { id_activo_biologico: ida, tamano: 500 } });
  if (r.status !== 200) return [`(auditoría respondió ${r.status})`];
  return lista(r.data, 'eventos').map((e) => e.tipo_evento);
}

// ---------------------------------------------------------------------------------- un escenario por caso
const CASOS = {
  // 139: activo COMPRA con costo y soporte, sin precio RF-89 → valoración por costo (advertencia).
  async 139(c) {
    const esc = await escenario(c, { categoria: 'POR_CABEZA', precioActivo: null });
    presupuesto(c.run, 25);
    const ida = await activo(c, esc, { origen: 'compra', costo: '2500000.0000', soporte: 'Factura QA-M06-139' });
    const p = await propuesta(c, ida);
    const r = await confirmar(c, ida);
    return { ida, propuesta: resumir(p), confirmacion: resumir(r) };
  },
  // 140: activo NACIMIENTO sin precio RF-89 y sin costo → el reconocimiento se bloquea.
  async 140(c) {
    const esc = await escenario(c, { categoria: 'POR_CABEZA', precioActivo: null });
    presupuesto(c.run, 25);
    const ida = await activo(c, esc, { origen: 'nacimiento', costo: null, soporte: null });
    const p = await propuesta(c, ida);
    const r = await confirmar(c, ida);
    return { ida, propuesta: resumir(p), confirmacion: resumir(r) };
  },
  // 142: activo reconocido, sin precio vigente pero con precio histórico; evento CRECIMIENTO → medición con estimación.
  async 142(c) {
    // Especie productiva sembrada de TEST: su ciclo (id 4) es el único que M02 acepta para asignar la fase que exige el pesaje (CICLO_ESPECIE_INCOMPATIBLE con una especie nueva).
    const esc = await escenario(c, { categoria: 'PESO_KG', precioActivo: null, especieExistente: ID_ESPECIE_PRODUCTIVA });
    await precio(c, esc, '20000.00', { desde: hoy(-10) });
    presupuesto(c.run, 50);
    const ida = await reconocer(c, esc, { origen: 'nacimiento', costo: null, soporte: null, pesoKg: '400' });
    await procesar(c); // cola vacía
    presupuesto(c.run, 40);
    await precio(c, esc, '2000000.00', { desde: hoy(-3), hasta: hoy(-1), categoria: 'POR_CABEZA' });
    await prep(llamar('PUT', `/finanzas/configuracion/especies/${esc.idEsp}`, {
      token: c.ing, run: c.run, json: { clasificacion: 'PRODUCCION', categoria_precio: 'POR_CABEZA', vida_util_meses: 60 },
    }), [200, 201], 'especie con precio solo histórico');
    await pesaje(c, ida, '450');
    const r = await procesar(c);
    return { ida, procesamiento: resumir(r) };
  },
  // 143: costos de venta = 100 % del bruto (neto cero) → bloqueo y alerta crítica por revisión requerida.
  async 143(c) {
    const esc = await escenario(c, { categoria: 'POR_CABEZA', precioActivo: '1000.00', costos: ['0.5', '0.4', '0.1'] });
    presupuesto(c.run, 25);
    const ida = await activo(c, esc, { origen: 'nacimiento', costo: null, soporte: null });
    const s = await simulacion(c, ida);
    const r = await confirmar(c, ida);
    return { ida, simulacion: resumir(s), confirmacion: resumir(r) };
  },
  // 144: costo de MANTENIMIENTO registrado por el Contador → se reclasifica como gasto del período.
  async 144(c) {
    const esc = await escenario(c, { categoria: 'POR_CABEZA', precioActivo: '10000000.00', costos: ['0.02', '0.02', '0.01'] });
    presupuesto(c.run, 40);
    const ida = await reconocer(c, esc, { origen: 'nacimiento', costo: null, soporte: null });
    const r = await llamar('POST', '/finanzas/costos', {
      token: c.ing, run: c.run,
      json: { subtipo_costo: 'MANO_OBRA', origen_costo: 'MANO_OBRA_PROPIA', monto_costo: '80000.0000', fecha_costo: hoy(), id_activo_biologico: ida },
    });
    if (![200, 201].includes(r.status)) throw new Bloqueo(`precondición «registrar el costo de MANTENIMIENTO» respondió HTTP ${r.status} ${String(r.text).slice(0, 200)}`);
    const reg = ((r.data || {}).registros || [])[0] || {};
    return { ida, costo: { status: r.status, naturaleza_costo: reg.naturaleza_costo || null } };
  },
  // 145: cosecha de un producto sin precio de mercado → el reconocimiento queda pendiente.
  async 145(c) {
    const esc = await escenario(c, { categoria: 'PESO_KG', precioActivo: null, especieExistente: ID_ESPECIE_PRODUCTIVA });
    await precio(c, esc, '20000.00', { desde: hoy(-10) });
    presupuesto(c.run, 60);
    const ida = await reconocer(c, esc, { origen: 'nacimiento', costo: null, soporte: null, pesoKg: '1000' });
    await procesar(c);
    // la fase del ciclo ya se asignó al registrar el activo (asignarFase)
    presupuesto(c.run, 25);
    await prep(llamar('POST', `/activos-biologicos/${ida}/eventos/productivo`, {
      token: c.admin, run: c.run,
      json: { id_metrica_produccion: ID_METRICA_PRODUCTIVA, cantidad_producida: '200', unidad_medida: 'kg', fecha_evento: hoy() },
    }), [200, 201], 'evento productivo de 200 kg sin precio del producto');
    const r = await procesar(c);
    return { ida, procesamiento: resumir(r) };
  },
};
// 141 usa el mismo escenario que 139 (notificación de valoración por costo generada para el Contador).
CASOS['141'] = CASOS['139'];

// ---------------------------------------------------------------------------------- tareas de Cypress
async function envolver(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Bloqueo) return { estado: 'BLOQUEADO', motivo: e.message };
    if (e instanceof NoConcluyente) return { estado: 'NO_CONCLUYENTE', motivo: e.message };
    return { estado: 'ERROR', motivo: `${e && e.name}: ${e && e.message}` };
  }
}

const tareasBase = {
  // Login fuera del sandbox (solo el primero de un run funciona dentro de él, y el backend permite una sesión por cuenta).
  'm06:login': ({ rol, api }) => envolver(async () => {
    fijarApi(api);
    const [correo, variable] = CUENTAS[rol];
    const clave = process.env[variable] || '';
    if (!clave) throw new Bloqueo(`falta la variable ${variable} (contraseña del rol ${rol}).`);
    const r = await llamar('POST', '/sesiones/', { json: { correo_electronico: correo, contrasena: clave } });
    if (r.status !== 200) throw new Bloqueo(`login de ${rol} (${correo}) respondió HTTP ${r.status}: ${String(r.text).slice(0, 160)}`);
    return { estado: 'LISTO', token: r.data.token };
  }),

  'm06:preparar': ({ caso, run, admin, ing, api }) => envolver(async () => {
    fijarApi(api);
    if (!CASOS[caso]) throw new Error(`caso desconocido ${caso}`);
    const c = { run, admin, ing };
    const datos = await CASOS[caso](c);
    const auditoria = await tiposAuditoria(c, datos.ida);
    return { estado: 'LISTO', ...datos, auditoria };
  }),

  // Lo que ve el usuario en su bandeja (GET /notificaciones) sin pasar por la interfaz.
  'm06:notificaciones': ({ run, token, api }) => envolver(async () => {
    fijarApi(api);
    const r = await llamar('GET', '/notificaciones', { token, run, params: { pagina: 1, tamano: 50 } });
    if (r.status !== 200) throw new Bloqueo(`GET /notificaciones respondió HTTP ${r.status} ${String(r.text).slice(0, 160)}`);
    const d = r.data || {};
    return {
      estado: 'LISTO', total: d.total, no_leidas: d.no_leidas,
      items: lista(d, 'items').map((n) => ({ id: n.id_notificacion, tipo_evento: n.tipo_evento, mensaje: n.mensaje, es_leido: n.es_leido })),
    };
  }),

  // Cierra el run (rollback). Se llama siempre al terminar cada caso.
  'm06:cerrar': ({ run, api }) => envolver(async () => {
    fijarApi(api);
    if (!corridas.has(run)) return { estado: 'LISTO', status: null };
    const r = await llamar('DELETE', `/test-control/runs/${run}`, { run });
    corridas.delete(run);
    return { estado: 'LISTO', status: r.status };
  }),
};

// Cada tarea recibe `api` (la de la interfaz) y la fija antes de hacer nada.
const tareas = {};
Object.keys(tareasBase).forEach((nombre) => {
  tareas[nombre] = (args) => tareasBase[nombre]({ ...args });
});

module.exports = { tareas };
