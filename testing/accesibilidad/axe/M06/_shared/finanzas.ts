// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-242..266 RF-87..94: utilidades de las pruebas de accesibilidad de M06 |
/**
 * Utilidades de los specs de accesibilidad de M06 (Finanzas NIC 41, /finanzas/*).
 *
 * Complementa `_shared/sigabA11y.ts`: sesión por rol (Admin o Productor), simulación de lecturas
 * del módulo, concesión simulada de permisos visuales y la evidencia que repiten los criterios de
 * M06 (diálogos de acción irreversible, textos crudos en pantalla, tema oscuro, descargas).
 *
 * PROTECCIÓN DE DATOS: el contexto aborta toda escritura (POST/PUT/PATCH/DELETE) salvo el login.
 * Cerrar un período, aprobar un informe o anular una cotización son hechos inmutables (NIC 41):
 * ninguno llega al backend. Las respuestas a esas escrituras se simulan con page.route y la prueba
 * lo deja anotado como "Datos simulados".
 *
 * El ambiente TEST no tiene cuentas de Contador ni de Auditor externo: las vistas se recorren con la
 * cuenta Admin. Donde el criterio depende de un permiso que Admin no tiene, el permiso se concede
 * en la respuesta de GET /sesiones/me/permisos (solo control visual: el backend sigue rechazando).
 */
import fs from 'fs';
import path from 'path';
import { expect, type Browser, type BrowserContext, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { iniciarSesion, PREFIJO_API } from '../../_shared/sigabA11y';

const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

// ── Sesión ───────────────────────────────────────────────────────────────────

export type Rol = 'admin' | 'productor';

function credenciales(rol: Rol) {
  const pref = rol === 'admin' ? 'TEST_ADMIN' : 'TEST_PRODUCTOR';
  const email = process.env[`${pref}_EMAIL`] ?? '';
  const password = process.env[`${pref}_PASSWORD`] ?? '';
  expect(email, `Faltan ${pref}_EMAIL / ${pref}_PASSWORD en testing/.env.test`).not.toBe('');
  return { email, password };
}

/** Contexto del viewport del proyecto, caché de assets y ninguna escritura hacia el backend. */
export async function abrirSesionRol(browser: Browser, testInfo: TestInfo, rol: Rol): Promise<{ contexto: BrowserContext; page: Page }> {
  const { email, password } = credenciales(rol);
  const use = testInfo.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL, viewport: use.viewport, deviceScaleFactor: use.deviceScaleFactor, userAgent: use.userAgent, locale: 'es-CO',
    acceptDownloads: true,
  });
  if (fs.existsSync(HAR_ASSETS)) await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', notFound: 'fallback' });
  await contexto.route('**/*', (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || ['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return r.fallback();
    if (/\/sesiones\/(refresh\/?)?$/.test(new URL(req.url()).pathname)) return r.fallback();
    return r.abort();
  });
  const page = await contexto.newPage();
  await iniciarSesion(page, email, password);
  return { contexto, page };
}

// ── Simulación ───────────────────────────────────────────────────────────────

const rutaApi = (url: string) => new URL(url).pathname.replace(PREFIJO_API, '');

/** Responde un GET cuyo pathname (sin prefijo) cumple `patron`. `cuerpo` puede depender de la URL. */
export async function simularGet(page: Page, patron: RegExp, cuerpo: unknown | ((u: URL) => unknown)) {
  await page.route((u) => u.pathname.startsWith(PREFIJO_API) && patron.test(u.pathname.replace(PREFIJO_API, '')), (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const u = new URL(route.request().url());
    const json = typeof cuerpo === 'function' ? (cuerpo as (u: URL) => unknown)(u) : cuerpo;
    return route.fulfill({ status: 200, contentType: 'application/json', json });
  });
}

/** Escrituras simuladas: registra cada una y responde con `status`/`json` tras `demoraMs`. */
export async function simularEscritura(page: Page, patron: RegExp, status: number, json: unknown, demoraMs = 0) {
  const recibidas: { metodo: string; ruta: string; cuerpo: unknown }[] = [];
  await page.route((u) => u.pathname.startsWith(PREFIJO_API) && patron.test(u.pathname.replace(PREFIJO_API, '')), async (route: Route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.fallback();
    recibidas.push({ metodo: req.method(), ruta: rutaApi(req.url()), cuerpo: req.postDataJSON?.() ?? null });
    if (demoraMs) await new Promise((r) => setTimeout(r, demoraMs));
    return route.fulfill({ status, contentType: 'application/json', json }).catch(() => {});
  });
  return recibidas;
}

/** Error del backend con el formato que mapea shared/api/errors.ts. */
export const errorApi = (error_code: string, message: string, field?: string) => ({ error_code, message, detail: message, ...(field ? { field } : {}) });

/**
 * Concede permisos visuales (nombre_recurso, id_accion) añadiéndolos a GET /sesiones/me/permisos.
 * Surte efecto en la siguiente navegación (la app vuelve a pedir los permisos en cada carga).
 */
export async function concederPermisos(page: Page, permisos: Array<[string, number]>) {
  await page.route((u) => /\/sesiones\/me\/permisos\/?$/.test(u.pathname), async (route) => {
    const r = await route.fetch();
    const datos = (await r.json().catch(() => null)) as { permisos?: Array<Record<string, unknown>> } | null;
    // Si la respuesta no trae permisos (sesión renovándose), se deja pasar tal cual.
    if (!r.ok() || !datos?.permisos) return route.fulfill({ response: r });
    const base = datos.permisos[0] ?? {};
    for (const [nombre, accion] of permisos) {
      if (!datos.permisos.some((p) => p.nombre_recurso === nombre && p.id_accion === accion)) {
        datos.permisos.push({ ...base, nombre_recurso: nombre, id_accion: accion, id_recurso: 90_000 + accion });
      }
    }
    return route.fulfill({ response: r, json: datos });
  });
}

export async function quitarSimulaciones(page: Page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
}

// ── Datos simulados (forma de src/financial_valuation/types.ts) ───────────────

export const NIT = '900123456';

export function periodo(id: number, estado: string, inicio: string, extra: Record<string, unknown> = {}) {
  const [a, m] = inicio.split('-').map(Number);
  const fin = new Date(a, m, 0).getDate();
  return {
    id_periodo_contable: id, numero_id_tributaria: NIT, tipo_cierre: 'MENSUAL', fecha_inicio: inicio,
    fecha_fin: `${inicio.slice(0, 8)}${String(fin).padStart(2, '0')}`, estado, fecha_cierre: estado === 'CERRADO' ? `${inicio.slice(0, 8)}${fin}T23:00:00` : null,
    ultimo_cierre: null, ...extra,
  };
}

/** Tres períodos: septiembre CERRADO (id 9101), octubre EN_CIERRE (9102), noviembre ABIERTO (9103). */
export const PERIODOS = [
  periodo(9101, 'CERRADO', '2026-09-01'),
  periodo(9102, 'EN_CIERRE', '2026-10-01'),
  periodo(9103, 'ABIERTO', '2026-11-01'),
];

export const prevalidacionLimpia = { bloqueos: [], activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: false };

export const ACTIVOS = [
  { id_activo_biologico: 7001, identificador: 'BOV-101', especie: 'Bovino', id_especie: 1, finca: 'Finca Simulada', id_finca: 31, valor_razonable_neto: '4500000.00', valorado_por_costo: false, valor_contable_por_costo: null, tipo_activo: 'INDIVIDUAL' },
  { id_activo_biologico: 7002, identificador: 'BOV-102', especie: 'Bovino', id_especie: 1, finca: 'Finca Simulada', id_finca: 31, valor_razonable_neto: '3800000.00', valorado_por_costo: false, valor_contable_por_costo: null, tipo_activo: 'INDIVIDUAL' },
  { id_activo_biologico: 7003, identificador: 'LOTE-TIL-07', especie: 'Tilapia', id_especie: 4, finca: 'Finca Simulada', id_finca: 31, valor_razonable_neto: '12600000.00', valorado_por_costo: false, valor_contable_por_costo: null, tipo_activo: 'POBLACIONAL' },
];

export function costo(id: number, extra: Record<string, unknown>) {
  return {
    id_registro_costo: id, naturaleza_costo: 'MANTENIMIENTO', subtipo_costo: 'MANO_OBRA', origen_costo: 'MANO_OBRA_PROPIA', vehiculo_contable: 'ASIENTO_NIC41',
    id_activo_biologico: 7001, activo: 'BOV-101', monto_costo: '180000.00', fecha_costo: '2026-11-05', id_periodo_contable: 9103, estado: 'REGISTRADO',
    politica_capitalizacion: 'NO_APLICA', justificacion: null, tercero_razon_social: null, factura_prefijo: null, factura_numero: null,
    id_grupo_reparto: null, metodo_reparto: null, es_reverso: false, id_origen_m05: null, id_especie: 1, especie: 'Bovino', finca: 'Finca Simulada', ...extra,
  };
}

/** Costos de noviembre: tres naturalezas, cuatro orígenes, un reparto, una inversión capitalizada y dos pendientes. */
export const COSTOS = [
  costo(1, {}),
  costo(2, { subtipo_costo: 'ALIMENTO', origen_costo: 'CONSUMO_INVENTARIO', vehiculo_contable: 'NINGUNO', monto_costo: '420000.00', id_origen_m05: 'ENT-88' }),
  costo(3, { subtipo_costo: 'VETERINARIO', origen_costo: 'SERVICIO_TERCERO', vehiculo_contable: 'FACTURA_COMPRA', tercero_razon_social: 'Vet Andina SAS', factura_prefijo: 'FE', factura_numero: '1203', monto_costo: '260000.00' }),
  costo(4, { naturaleza_costo: 'INVERSION', subtipo_costo: 'INVERSION_DIRECTA', origen_costo: 'COMPRA_PROVEEDOR', vehiculo_contable: 'FACTURA_COMPRA', politica_capitalizacion: 'CAPITALIZAR', tercero_razon_social: 'Agroinsumos del Huila', factura_prefijo: 'FV', factura_numero: '889', monto_costo: '1500000.00' }),
  costo(5, { naturaleza_costo: 'VENTA', subtipo_costo: 'TRANSPORTE', origen_costo: 'SERVICIO_TERCERO', vehiculo_contable: 'FACTURA_COMPRA', tercero_razon_social: 'Transportes Sur', factura_numero: '45', monto_costo: '90000.00' }),
  costo(6, { subtipo_costo: 'MANO_OBRA', id_activo_biologico: 7002, activo: 'BOV-102', id_grupo_reparto: 'g-1', metodo_reparto: 'POR_CABEZAS', monto_costo: '60000.00' }),
  costo(7, { subtipo_costo: 'MANO_OBRA', id_activo_biologico: 7003, activo: 'LOTE-TIL-07', especie: 'Tilapia', id_especie: 4, id_grupo_reparto: 'g-1', metodo_reparto: 'POR_CABEZAS', monto_costo: '60000.00' }),
  costo(8, { naturaleza_costo: null, subtipo_costo: 'OTRO', estado: 'PENDIENTE_CLASIFICACION', monto_costo: '75000.00' }),
  costo(9, { naturaleza_costo: null, subtipo_costo: 'INVERSION_DIRECTA', origen_costo: 'COMPRA_PROVEEDOR', vehiculo_contable: 'FACTURA_COMPRA', estado: 'PENDIENTE_CLASIFICACION', politica_capitalizacion: 'SIN_POLITICA', tercero_razon_social: 'Agroinsumos del Huila', factura_numero: '901', monto_costo: '640000.00' }),
];

export function linea(id: number, extra: Record<string, unknown> = {}) {
  return {
    id_linea_asiento_nic41: id, tipo_hecho: 'VARIACION_VR_TB', sentido: 'GANANCIA', valor: '850000.00', fecha_hecho: '2026-11-20', id_periodo_contable: 9103,
    id_activo_biologico: 7001, tabla_origen: 'mediciones_posteriores', id_origen: 33, tipo_evidencia: 'LECTURA_IOT', subtipo_costo: null,
    es_estimacion: false, es_reverso: false, cuenta_debito: '1580101', cuenta_credito: '4250101', estado: 'REGISTRADA',
    estado_trazabilidad: 'VERIFICADO', id_comprobante_nic41: null, ...extra,
  };
}

/** Líneas de noviembre: IoT verificada, manual pendiente, poblacional, y dos con cadena incompleta. */
export const LINEAS = [
  linea(601),
  linea(602, { tipo_hecho: 'CONSUMO_INSUMO', sentido: 'UNICO', tipo_evidencia: 'REGISTRO_MANUAL', valor: '320000.00', estado_trazabilidad: 'VERIFICACION_PENDIENTE' }),
  linea(603, { id_activo_biologico: 7003, valor: '1250000.00' }),
  linea(604, { tipo_evidencia: 'LECTURA_IOT', estado_trazabilidad: 'PENDIENTE_TRAZABILIDAD', valor: '410000.00' }),
  linea(605, { tipo_hecho: 'VARIACION_VR_PM', tipo_evidencia: 'PRECIO_MERCADO', es_estimacion: true, estado_trazabilidad: 'PENDIENTE_TRAZABILIDAD', valor: '95000.00' }),
];

export function cadena(idLinea: number) {
  const l = LINEAS.find((x) => x.id_linea_asiento_nic41 === idLinea) ?? LINEAS[0];
  const incompleta = l.estado_trazabilidad === 'PENDIENTE_TRAZABILIDAD';
  const manual = l.tipo_evidencia === 'REGISTRO_MANUAL';
  return {
    id_linea_asiento_nic41: l.id_linea_asiento_nic41, tipo_hecho: l.tipo_hecho, valor: l.valor, tipo_evidencia: l.tipo_evidencia,
    estado_trazabilidad: l.estado_trazabilidad, estado_verificacion: incompleta ? 'FALLIDA' : 'OK',
    nivel_fallo: incompleta ? (l.tipo_evidencia === 'PRECIO_MERCADO' ? 'NIVEL_3' : 'NIVEL_1') : null,
    eslabones_faltantes: incompleta ? [l.tipo_evidencia === 'PRECIO_MERCADO' ? 'precio_documentado' : 'lecturas_nic41'] : null,
    eslabones: {
      origen: { tabla: l.tabla_origen, id: l.id_origen },
      evento_m02: { id_evento: 4501, tipo: 'Pesaje' },
      lecturas_nic41: manual ? null : (incompleta && l.tipo_evidencia === 'LECTURA_IOT' ? false : { lecturas: 12 }),
      precio_documentado: l.tipo_evidencia === 'PRECIO_MERCADO' ? !incompleta : { id_precio: 77 },
      cierre: { id_comprobante: null },
    },
  };
}

const informe = (id: number, estado: string, version: string, extra: Record<string, unknown> = {}) => ({
  id_informe: id, version_informe: version, estado, fecha_generacion: '2026-10-02T09:00:00', fecha_aprobacion: estado === 'APROBADO' || estado === 'ARCHIVADO' ? '2026-10-03T10:00:00' : null,
  razon_rechazo: estado === 'RECHAZADO' ? 'La conciliación del Párr. 50 no cuadra con el comprobante de bajas.' : null, hash_informe: 'e'.repeat(64), ...extra,
});

/** Versiones del informe de revelaciones de septiembre 2026 (período 9101) en los cuatro estados. */
export const INFORMES = [
  informe(81, 'BORRADOR', 'v4'),
  informe(82, 'RECHAZADO', 'v3'),
  informe(83, 'APROBADO', 'v2'),
  informe(84, 'ARCHIVADO', 'v1'),
];

export function informeDetalle(id: number) {
  const r = INFORMES.find((x) => x.id_informe === id) ?? INFORMES[0];
  return {
    ...r,
    contenido: {
      parr_41_43_descripcion: { descripcion: 'Ganado bovino de cría y levante; tilapia en estanques.', grupos: ['PRODUCCION', 'CONSUMO'] },
      parr_40_ganancias_perdidas: { ganancia_reconocimiento_inicial: '0', transformacion_biologica: '850000.00', precio_mercado: '-95000.00' },
      parr_50_conciliacion: [
        { activo: 'BOV-101', valor_inicio: '4100000.00', compras: '0', transformacion_biologica: '850000.00', precio_mercado: '-95000.00', bajas: '0', valor_cierre: '4855000.00' },
        { activo: 'LOTE-TIL-07', valor_inicio: '11800000.00', compras: '0', transformacion_biologica: '800000.00', precio_mercado: '0', bajas: '0', valor_cierre: '12600000.00' },
      ],
      parr_54_56_activos_al_costo: 'DATOS_INSUFICIENTES',
      parr_49_restricciones_compromisos: { compromisos: [], activos_pignorados: [] },
      alertas_consistencia: [{ campo: 'parr_50_conciliacion', detalle: 'El valor de cierre de BOV-101 difiere del comprobante en $ 5.000.' }],
    },
  };
}

/** Permiso visual de Revelaciones (R/U/C) y el historial simulado de septiembre 2026. */
export async function simularRevelaciones(page: Page) {
  await concederPermisos(page, [['revelaciones_nic41', 2], ['revelaciones_nic41', 3], ['revelaciones_nic41', 1]]);
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/revelaciones$/, INFORMES);
  await simularGet(page, /^\/finanzas\/revelaciones\/\d+$/, (u: URL) => informeDetalle(Number(u.pathname.match(/revelaciones\/(\d+)/)![1])));
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
}

const estadoResumen = (id: number, version: number, ingresos: string, gastos: string, neto: string, estado: string) => ({
  id_estado: id, id_periodo_contable: 9101, total_ingresos: ingresos, total_gastos: gastos, resultado_neto: neto, estado,
  fecha_generacion: '2026-10-01T08:00:00', filtros: { id_especie: null, id_finca: null, id_activo_biologico: null }, version,
  fecha_aprobacion: estado === 'APROBADO' ? '2026-10-02T09:00:00' : null,
});

/** Estados de resultados de septiembre 2026: v2 con ganancia (APROBADO) y v1 con pérdida (GENERADO). */
export const ESTADOS = [
  estadoResumen(71, 2, '1650000.00', '1190000.00', '460000.00', 'APROBADO'),
  estadoResumen(72, 1, '300000.00', '1490000.00', '-1190000.00', 'GENERADO'),
];

export function estadoDetalle(id: number) {
  const r = ESTADOS.find((e) => e.id_estado === id) ?? ESTADOS[0];
  const gananciaTB = r.id_estado === 71 ? '850000.00' : '300000.00';
  return {
    ...r, hash_consistencia: 'f'.repeat(64),
    componentes: {
      ganancia_reconocimiento_inicial: '0', ganancia_transformacion_biologica: gananciaTB, ganancia_precio_mercado: r.id_estado === 71 ? '800000.00' : '0',
      ingresos_productos_agricolas: '0', ganancia_ajustes_periodos_anteriores: '0',
      perdida_reconocimiento_inicial: '0', perdida_transformacion_biologica: '0', perdida_precio_mercado: r.id_estado === 71 ? '95000.00' : '400000.00',
      costos_mantenimiento: '1095000.00', inversiones_llevadas_a_gasto: '0', bajas_activos: '0', depreciacion_activos_costo: '0',
      deterioro_activos_costo: '0', perdida_ajustes_periodos_anteriores: '0',
      activos_excluidos_cierre: [{ id_activo_biologico: 7002, identificador: 'BOV-102', motivo: 'Sin precio de mercado vigente' }],
    },
  };
}

export async function simularEstados(page: Page) {
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/estados-resultados$/, (u: URL) => (u.pathname.includes('/9101/') ? ESTADOS : []));
  await simularGet(page, /^\/finanzas\/estados-resultados\/\d+$/, (u: URL) => estadoDetalle(Number(u.pathname.match(/resultados\/(\d+)/)![1])));
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
}

// ── Navegación ───────────────────────────────────────────────────────────────

/** goto a /finanzas/<seccion> y espera el h1; si vuelve al login, BLOQUEO DE AMBIENTE. */
export async function irFinanzas(page: Page, seccion: string, titulo: RegExp = /./) {
  await page.goto(`finanzas/${seccion}`, { waitUntil: 'commit', timeout: 120_000 });
  const h1 = page.getByRole('heading', { level: 1, name: titulo });
  const denegado = page.getByText('No tienes acceso a esta sección');
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(h1.or(denegado).or(login).first()).toBeVisible({ timeout: 120_000 });
  if (await login.isVisible()) throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (finanzas/${seccion})`);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
}

export async function elegirPeriodo(page: Page, id: number) {
  await page.locator('#fin-periodo').selectOption(String(id));
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

export async function accesoDenegado(page: Page) {
  return page.getByText('No tienes acceso a esta sección').isVisible();
}

// ── Evidencia ────────────────────────────────────────────────────────────────

/**
 * Textos que la regla de textos visibles del proyecto prohíbe (CLAUDE.md, 2026-11-05):
 * null/undefined/NaN y valores de enum crudos (MAYUSCULAS_CON_GUION_BAJO).
 */
export async function textosCrudos(alcance: Locator): Promise<string[]> {
  const texto = await alcance.evaluate((e) => {
    const partes: string[] = [(e as HTMLElement).innerText];
    e.querySelectorAll('option').forEach((o) => partes.push(o.textContent ?? ''));
    return partes.join('\n');
  });
  const hallazgos = new Set<string>();
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (/\b(null|undefined|NaN)\b/.test(l) || /\b[A-Z]{3,}(?:_[A-Z0-9]+)+\b/.test(l)) hallazgos.add(l.slice(0, 90));
  }
  return [...hallazgos];
}

/** Badges de estado dentro de `alcance`: texto y si llevan ícono (el criterio pide ícono + etiqueta). */
export function badges(alcance: Locator): Promise<{ texto: string; icono: boolean; clase: string }[]> {
  return alcance.evaluate((raiz) => [...raiz.querySelectorAll('.ds-badge')].map((b) => ({
    texto: (b.textContent ?? '').trim(), icono: !!b.querySelector('svg'), clase: b.className.replace('ds-badge ', ''),
  })));
}

/** Activa el tema oscuro como lo hace useTheme ([data-theme="dark"] en <html>). */
export async function temaOscuro(page: Page, activo: boolean) {
  await page.evaluate((a) => (a ? document.documentElement.setAttribute('data-theme', 'dark') : document.documentElement.removeAttribute('data-theme')), activo);
  await page.waitForTimeout(300);
}

/** Indicadores de foco visibles en el elemento enfocado (outline o box-shadow). */
export function focoVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return false;
    // <input type="date">: el foco va a un segmento interno; el estilo del host no lo refleja (falso negativo).
    if ((a as HTMLInputElement).type === 'date') return true;
    const s = getComputedStyle(a);
    return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== 'none' && s.boxShadow !== '');
  });
}

export interface AuditoriaDialogo {
  abierto: boolean;
  rol: string | null;
  ariaModal: string | null;
  nombre: string;
  labelledby: string | null;
  describedby: string | null;
  descripcion: string;
  texto: string;
  focoInicial: string;
  recorrido: string[];
  focoSaleDelDialogo: boolean;
  controlesSinFocoVisible: string[];
  botones: string[];
}

/**
 * Abre el diálogo con el teclado desde `disparador` (foco + Enter) y recoge lo que piden 4.1.2,
 * 2.1.2, 2.4.3 y 2.4.7: rol, aria-modal, nombre y descripción, foco inicial, trampa de foco y foco
 * visible en cada control. No lo cierra.
 */
export async function abrirYAuditarDialogo(page: Page, disparador: Locator): Promise<AuditoriaDialogo> {
  await page.keyboard.press('Shift');
  await disparador.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.locator('[role="dialog"], [role="alertdialog"]').last();
  const abierto = await dialogo.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
  if (!abierto) {
    return { abierto, rol: null, ariaModal: null, nombre: '', labelledby: null, describedby: null, descripcion: '', texto: '', focoInicial: '', recorrido: [], focoSaleDelDialogo: false, controlesSinFocoVisible: [], botones: [] };
  }
  await page.waitForTimeout(300);
  const info = await dialogo.evaluate((d) => {
    const ref = (ids: string | null) => (ids ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
    return {
      rol: d.getAttribute('role'), ariaModal: d.getAttribute('aria-modal'),
      nombre: d.getAttribute('aria-label') ?? ref(d.getAttribute('aria-labelledby')),
      labelledby: d.getAttribute('aria-labelledby'), describedby: d.getAttribute('aria-describedby'),
      descripcion: ref(d.getAttribute('aria-describedby')),
      texto: (d as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
      botones: [...d.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()),
    };
  });
  const focoInicial = await describirFocoDialogo(page);
  const n = Math.max(4, info.botones.length + 3);
  const recorrido: string[] = [];
  const sinFoco: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const f = await describirFocoDialogo(page);
    recorrido.push(f);
    if (!(await focoVisible(page))) sinFoco.push(f);
  }
  await page.keyboard.press('Shift+Tab');
  recorrido.push(`⇧ ${await describirFocoDialogo(page)}`);
  return {
    abierto, ...info, focoInicial, recorrido,
    focoSaleDelDialogo: recorrido.some((f) => !f.includes('(diálogo)')),
    controlesSinFocoVisible: [...new Set(sinFoco)],
  };
}

export function describirFocoDialogo(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return 'body';
    const nombre = (a as HTMLInputElement).labels?.[0]?.textContent ?? a.getAttribute('aria-label') ?? a.textContent ?? '';
    const dentro = a.closest('[role="dialog"], [role="alertdialog"]') ? ' (diálogo)' : '';
    return `${a.tagName.toLowerCase()} "${nombre.replace(/\s+/g, ' ').trim().slice(0, 40)}"${dentro}`;
  });
}

/** Cierra el diálogo con Escape y dice si se cerró y si el foco volvió al disparador. */
export async function cerrarConEscape(page: Page, disparador: Locator) {
  await page.keyboard.press('Escape');
  const cerrado = await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(200);
  const focoEnDisparador = await disparador.evaluate((e) => document.activeElement === e).catch(() => false);
  return { cerrado, focoEnDisparador, foco: await describirFocoDialogo(page) };
}

/** Texto de las regiones vivas que aparecen dentro de `ms` (sondeo cada 100 ms). */
export async function anunciosDurante(page: Page, ms: number): Promise<string[]> {
  const vistos = new Set<string>();
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const actuales = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], [role="progressbar"]')]
        .map((e) => `${e.getAttribute('role') ?? 'live'}${e.getAttribute('aria-live') ? `/${e.getAttribute('aria-live')}` : ''}: ${(e.getAttribute('aria-valuetext') ?? e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)}`)
        .filter((t) => !/: $/.test(t)),
    ).catch(() => [] as string[]);
    actuales.forEach((a) => vistos.add(a));
    await page.waitForTimeout(100);
  }
  return [...vistos];
}

/** Guarda un archivo descargado en resultados/ y devuelve su ruta. */
export async function guardarDescarga(dirSpec: string, nombre: string, contenido: Buffer) {
  const dir = path.join(dirSpec, 'resultados');
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, nombre);
  fs.writeFileSync(destino, contenido);
  return destino;
}

/** Revisión estructural mínima de un PDF: etiquetado, idioma y título (no reemplaza a PAC). */
export function revisarPdf(bytes: Buffer) {
  const t = bytes.toString('latin1');
  return {
    esPdf: t.startsWith('%PDF'),
    etiquetado: /\/StructTreeRoot/.test(t) && /\/MarkInfo\s*<<[^>]*\/Marked\s+true/.test(t),
    idioma: /\/Lang\s*\(/.test(t),
    titulo: /\/Title\s*[(<]/.test(t),
    mostrarTitulo: /\/DisplayDocTitle\s+true/.test(t),
  };
}
