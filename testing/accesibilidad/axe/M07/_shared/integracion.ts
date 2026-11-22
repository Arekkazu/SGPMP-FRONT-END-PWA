// | Fecha      | Nombre      | Que se hizo                                                                 |
// |------------|-------------|-----------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-267..276 RF-98/101/102: utilidades de las pruebas de accesibilidad de M07 |
// | 2026-11-22 | SaraSofGonzalez | TC-DIS-267..270 RF-98: versiones simuladas con motivo_no_activable y versiones_que_retira |
/**
 * Utilidades de los specs de accesibilidad de M07 (Integración contable, /integracion/*).
 *
 * Reutiliza la evidencia genérica de M06 (`M06/_shared/finanzas.ts`: diálogos, regiones vivas, textos
 * crudos, badges, tema, simulación de lecturas y escrituras) y agrega lo propio de M07: sesión por rol
 * (incluido el Revisor Fiscal), navegación a las pestañas de Integración y los datos simulados con la
 * forma de `src/accounting_integration/types.ts`.
 *
 * PROTECCIÓN DE DATOS: igual que en M06, el contexto aborta toda escritura (POST/PUT/PATCH/DELETE)
 * salvo el login. Activar o retirar una versión del contrato, revocar un sistema o cambiar su
 * credencial son irreversibles y afectan la prueba de interoperabilidad con AgroFusion en TEST:
 * ninguna llega al backend. Sus respuestas se simulan y la prueba lo anota como "Datos simulados".
 *
 * Datos reales: los siembra el DBA según Datos_Semilla_M07_M08.md (escenario A del contrato,
 * clientes QA_*, 120 eventos de auditoría y uno alterado). Cada spec evalúa primero la vista real y
 * deja como precondición lo que el ambiente todavía no tenga.
 */
import fs from 'fs';
import path from 'path';
import { expect, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { iniciarSesion } from '../../_shared/sigabA11y';
import { concederPermisos, simularGet } from '../../M06/_shared/finanzas';

export {
  abrirYAuditarDialogo, anunciosDurante, badges, cerrarConEscape, concederPermisos, describirFocoDialogo, errorApi, focoVisible,
  guardarDescarga, quitarSimulaciones, simularEscritura, simularGet, temaOscuro, textosCrudos,
} from '../../M06/_shared/finanzas';

const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

// ── Sesión ───────────────────────────────────────────────────────────────────

export type RolM07 = 'admin' | 'productor' | 'revisor';

const PREFIJO: Record<RolM07, string> = { admin: 'TEST_ADMIN', productor: 'TEST_PRODUCTOR', revisor: 'TEST_REVISOR_FISCAL' };

/** Contexto del viewport del proyecto, caché de assets y ninguna escritura hacia el backend. */
export async function abrirSesionM07(browser: Browser, testInfo: TestInfo, rol: RolM07): Promise<{ contexto: BrowserContext; page: Page }> {
  const pref = PREFIJO[rol];
  const email = process.env[`${pref}_EMAIL`] ?? '';
  const password = process.env[`${pref}_PASSWORD`] ?? '';
  expect(email, `Faltan ${pref}_EMAIL / ${pref}_PASSWORD en testing/.env.test`).not.toBe('');
  const use = testInfo.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL, viewport: use.viewport, deviceScaleFactor: use.deviceScaleFactor, userAgent: use.userAgent, locale: 'es-CO',
    acceptDownloads: true,
  });
  await contexto.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
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

// ── Navegación ───────────────────────────────────────────────────────────────

export type SeccionIntegracion = 'contrato' | 'clientes' | 'auditoria' | 'documento';

/** goto a /integracion/<seccion> y espera el h1 o el aviso de acceso; si vuelve al login, BLOQUEO DE AMBIENTE. */
export async function irIntegracion(page: Page, seccion: SeccionIntegracion, titulo: RegExp = /./) {
  await page.goto(`integracion/${seccion}`, { waitUntil: 'commit', timeout: 120_000 });
  const h1 = page.getByRole('heading', { level: 1, name: titulo });
  const denegado = page.getByText('No tienes acceso a esta sección');
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(h1.or(denegado).or(login).first()).toBeVisible({ timeout: 120_000 });
  if (await login.isVisible()) throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (integracion/${seccion})`);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
}

export function accesoDenegado(page: Page) {
  return page.getByText('No tienes acceso a esta sección').first();
}

/** Fila de una tabla que contiene `texto` (versión, nombre del sistema…). */
export function fila(alcance: Locator, texto: string | RegExp) {
  return alcance.locator('tbody tr').filter({ hasText: texto }).first();
}

// ── Permisos (src/accounting_integration/rbac.ts; acciones de supplies/rbac) ──

export const R = {
  contratos: 'contratos_aaef', clientes: 'clientes_externos', auditoria: 'auditoria_integracion',
  auditoriaCierres: 'auditoria_integracion_cierres', exportacion: 'exportacion_contable',
} as const;
export const ACC = { C: 1, R: 2, U: 3, D: 4, E: 5 } as const;

/** Todos los permisos del Administrador sobre un recurso (solo control visual: el backend sigue validando). */
export function permisosCompletos(recurso: string): Array<[string, number]> {
  return [ACC.C, ACC.R, ACC.U, ACC.D, ACC.E].map((a) => [recurso, a]);
}

// ── Datos simulados: contrato (RF-98 / RF-AE02) ─────────────────────────────

const sha = (c: string) => c.repeat(64).slice(0, 64);

export function anexo(id: number, codigo: string, version: string, estado: string) {
  return {
    id_mapeo_anexo_aaef: id, codigo_anexo: codigo, version_anexo: version, ruta_documento: `docs/integracion/anexo_aaef_v${version}.md`,
    sha256_documento: sha(version.replace('.', '')), estado,
    fecha_aprobacion_interna: estado === 'BORRADOR' ? null : '2026-10-10T09:00:00', fecha_aprobacion: estado === 'APROBADO' ? '2026-10-15T09:00:00' : null,
  };
}

export const ANEXOS = [
  anexo(301, 'AAEF-ANEXO-3.0', '3.0', 'APROBADO'),
  anexo(302, 'AAEF-ANEXO-4.0', '4.0', 'APROBADO'),
  anexo(303, 'AAEF-ANEXO-5.0', '5.0', 'BORRADOR'),
];

export function version(id: number, v: string, tipo: 'MAJOR' | 'MINOR', estado: string, vigencia: string, idAnexo: number, extra: Record<string, unknown> = {}) {
  return {
    id_version_contrato_aaef: id, contrato_version: v, tipo_cambio: tipo, fecha_vigencia: vigencia, id_mapeo_anexo_aaef: idAnexo,
    mapeadores: ['COMPRAS'], periodo_gracia_dias: tipo === 'MAJOR' ? 90 : null, descripcion: null, estado,
    fecha_activacion: ['ACTIVO', 'DEPRECADO', 'INACTIVO'].includes(estado) ? `${vigencia}T08:00:00` : null,
    fecha_deprecacion: null, fecha_inactivacion: null, ...extra,
  };
}

type VersionSimulada = ReturnType<typeof version>;

/**
 * Completa `motivo_no_activable` y `versiones_que_retira` con las mismas reglas y textos que devuelve el
 * backend en TEST (leídos el 2026-11-22): anexo no aprobado, o dos versiones vigentes con una en retiro.
 * Sin estos campos, «Activar» abre su confirmación sobre datos incompletos y la sección se cae (falso negativo).
 */
export function conReglasDeActivacion(lista: VersionSimulada[], anexos: Array<{ id_mapeo_anexo_aaef: number; estado: string }> = ANEXOS) {
  const vigentes = lista.filter((c) => c.estado === 'ACTIVO' || c.estado === 'DEPRECADO');
  const enRetiro = lista.find((c) => c.estado === 'DEPRECADO');
  const activa = lista.find((c) => c.estado === 'ACTIVO');
  const fecha = (iso: unknown) => String(iso ?? '').slice(0, 10).split('-').reverse().join('/');
  return lista.map((c) => {
    if (c.estado !== 'PENDIENTE') return { ...c, motivo_no_activable: null, versiones_que_retira: [] as string[] };
    const aprobado = anexos.some((a) => a.id_mapeo_anexo_aaef === c.id_mapeo_anexo_aaef && a.estado === 'APROBADO');
    const motivo = !aprobado ? `La versión ${c.contrato_version} no tiene un anexo de mapeo aprobado.`
      : vigentes.length >= 2 && enRetiro ? `Ya hay ${vigentes.length} versiones vigentes y la versión ${enRetiro.contrato_version} ya está en retiro hasta el ${fecha(enRetiro.fecha_inactivacion)}. Podrá activar una nueva versión cuando termine ese retiro.`
        : null;
    return { ...c, motivo_no_activable: motivo, versiones_que_retira: c.tipo_cambio === 'MAJOR' && activa ? [activa.contrato_version] : [] as string[] };
  });
}

/** Escenario A de Datos_Semilla_M07_M08.md §3.2: dos versiones vigentes (2.0 en retiro y 3.0 activa). */
export const CONTRATOS_A = conReglasDeActivacion([
  version(401, '1.0', 'MAJOR', 'INACTIVO', '2026-01-01', 301, { fecha_deprecacion: '2026-04-01T08:00:00', fecha_inactivacion: '2026-06-30' }),
  version(402, '2.0', 'MAJOR', 'DEPRECADO', '2026-07-01', 301, { fecha_deprecacion: '2026-10-17T08:00:00', fecha_inactivacion: '2027-01-15' }),
  version(403, '3.0', 'MAJOR', 'ACTIVO', '2026-10-17', 301),
  version(404, '3.1', 'MINOR', 'PENDIENTE', '2027-03-01', 301),
  version(405, '4.0', 'MAJOR', 'PENDIENTE', '2026-11-01', 302),
  version(406, '5.0', 'MAJOR', 'PENDIENTE', '2026-11-01', 303),
]);

/** Escenario B (§3.3): 2.0 ya retirada; 3.0 activa y 4.0 lista para activarse. */
export const CONTRATOS_B = conReglasDeActivacion(CONTRATOS_A.map((c) => (c.contrato_version === '2.0' ? { ...c, estado: 'INACTIVO', fecha_inactivacion: '2026-11-16' } : c)));

/** Estado inconsistente (RF-98 5.6): tres versiones vigentes a la vez. Solo se puede simular. */
export const CONTRATOS_INCONSISTENTES = conReglasDeActivacion(CONTRATOS_A.map((c) => (c.contrato_version === '4.0' ? { ...c, estado: 'ACTIVO', fecha_activacion: '2026-11-02T08:00:00' } : c)));

export async function simularContrato(page: Page, contratos: unknown[] = CONTRATOS_A, anexos: unknown[] = ANEXOS) {
  await concederPermisos(page, permisosCompletos(R.contratos));
  await simularGet(page, /^\/integracion\/anexos\/?$/, anexos);
  await simularGet(page, /^\/integracion\/contratos\/?$/, contratos);
}

// ── Datos simulados: clientes externos (RF-101) ─────────────────────────────

export function cliente(id: number, codigo: string, nombre: string, estado: string, extra: Record<string, unknown> = {}) {
  return {
    id_cliente_externo: id, codigo, nombre, identificador_publico: codigo.toLowerCase().replace(/_/g, '-'), estado, tipo: 'SISTEMA_INTERMEDIARIO',
    ip_permitida: null, ttl_token_canal_minutos: 15, canales: [{ canal: 'CONSULTA_AAEF', limite_por_minuto: 60 }],
    fecha_actualizacion: '2026-11-16T10:00:00', credencial: estado === 'REVOCADO' ? null : { fecha_emision: '2026-11-16T10:00:00', fecha_expiracion: '2027-12-31T23:59:59' },
    ...extra,
  };
}

/** Clientes de prueba de §4 (sin AGROFUSION real). */
export const CLIENTES = [
  cliente(501, 'QA_ACTIVO', 'QA Cliente Activo', 'ACTIVO'),
  cliente(502, 'QA_ROTACION', 'QA Cliente Rotacion', 'ACTIVO', { canales: [{ canal: 'CONSULTA_AAEF', limite_por_minuto: 60 }, { canal: 'IDENTIDAD_M2M', limite_por_minuto: 30 }] }),
  cliente(503, 'QA_SUSPENDIDO', 'QA Cliente Suspendido', 'SUSPENDIDO'),
  cliente(504, 'QA_REVOCADO', 'QA Cliente Revocado', 'REVOCADO'),
  cliente(505, 'QA_REVOCAR_1', 'QA Cliente Para Revocar 1', 'ACTIVO', { ip_permitida: '203.0.113.0/24' }),
];

/** Secreto de prueba: no es real y no sirve en ningún ambiente. Nunca se pegan secretos reales en la evidencia. */
export const SECRETO_SIMULADO = 'QaSecretoSimulado-NoReal-0000';

export async function simularClientes(page: Page, clientes: unknown[] = CLIENTES) {
  await concederPermisos(page, permisosCompletos(R.clientes));
  await simularGet(page, /^\/integracion\/clientes\/?$/, clientes);
}

// ── Datos simulados: auditoría de integración (RF-102) ──────────────────────

const TIPOS_REPARTO = [
  'PAQUETE_AAEF_CONSULTADO', 'PAQUETE_AAEF_CONSULTADO', 'VISTA_AAEF_GENERADA', 'SOLICITUD_RECHAZADA', 'TOKEN_CANAL_EMITIDO',
  'TOKEN_CANAL_RECHAZADO', 'RATE_LIMIT_EXCEDIDO', 'CLIENTE_SUSPENDIDO', 'CONTRATO_ACTIVADO', 'SECRETO_ROTADO',
];

export function evento(n: number, extra: Record<string, unknown> = {}) {
  const tipo = TIPOS_REPARTO[n % TIPOS_REPARTO.length];
  const rechazo = tipo === 'SOLICITUD_RECHAZADA' || tipo === 'TOKEN_CANAL_RECHAZADO' || tipo === 'RATE_LIMIT_EXCEDIDO';
  const http = tipo === 'SOLICITUD_RECHAZADA' ? 422 : tipo === 'TOKEN_CANAL_RECHAZADO' ? 401 : tipo === 'RATE_LIMIT_EXCEDIDO' ? 429 : 200;
  const dia = String(1 + (n % 15)).padStart(2, '0');
  return {
    id_evento_integracion: `ev-${n}`, tipo_evento: tipo, severidad: rechazo ? 'ADVERTENCIA' : 'INFORMATIVA', tipo_actor: 'CLIENTE_EXTERNO',
    fecha_evento: `2026-11-${dia}T${String(8 + (n % 10)).padStart(2, '0')}:15:00`, endpoint: '/integracion/aaef/productores/901458732',
    metodo_http: 'GET', codigo_http: http, codigo_resultado: rechazo ? 'RECHAZADO' : 'OK', latencia_ms: 120 + n,
    ip_origen: tipo === 'TOKEN_CANAL_RECHAZADO' ? '181.49.10.25' : null, numero_id_tributaria: '901458732',
    fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31', version_contrato: '3.0', tamano_payload_bytes: 2048,
    correo_usuario: tipo.startsWith('PAQUETE') || tipo.startsWith('VISTA') ? 'contador@gmail.com' : null,
    nombre_cliente: tipo.startsWith('VISTA') ? null : 'AgroFusion', integridad: 'INTEGRO', ...extra,
  };
}

/** 120 eventos de §5.1 y uno alterado (§5.2). */
export const EVENTOS = [
  evento(0, { id_evento_integracion: 'ev-alterado', tipo_evento: 'PAQUETE_AAEF_CONSULTADO', fecha_evento: '2026-11-10T10:00:00', integridad: 'CORRUPTO', correo_usuario: 'alterado@ejemplo.com' }),
  ...Array.from({ length: 120 }, (_, i) => evento(i + 1)),
];

/** Responde GET /integracion/auditoria paginando y filtrando `eventos` como lo haría el backend. */
export async function simularAuditoria(page: Page, eventos: Array<Record<string, unknown>> = EVENTOS) {
  await simularGet(page, /^\/integracion\/auditoria\/?$/, (u: URL) => {
    const tipo = u.searchParams.get('tipo_evento');
    const http = u.searchParams.get('codigo_http');
    const lista = eventos.filter((e) => (!tipo || e.tipo_evento === tipo) && (!http || String(e.codigo_http) === http));
    const pagina = Number(u.searchParams.get('pagina') ?? 1);
    const tamano = Number(u.searchParams.get('tamano') ?? 50);
    return { items: lista.slice((pagina - 1) * tamano, pagina * tamano), pagina, tamano, total: lista.length };
  });
}

// ── Evidencia propia de M07 ─────────────────────────────────────────────────

/** Atributos de accesibilidad de un campo de formulario por su etiqueta visible. */
export function auditarCampo(alcance: Locator, etiqueta: string | RegExp) {
  return alcance.getByLabel(etiqueta).first().evaluate((e) => {
    const c = e as HTMLInputElement;
    const ayuda = (c.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
    const contenedor = c.closest('.ds-field') ?? c.parentElement;
    return {
      requerido: c.required || c.getAttribute('aria-required') === 'true',
      asterisco: /\*/.test(c.labels?.[0]?.textContent ?? ''),
      invalido: c.getAttribute('aria-invalid') === 'true',
      ayuda,
      errorBajoCampo: (contenedor?.querySelector('[role="alert"]')?.textContent ?? '').trim(),
    };
  });
}

/** Texto de los avisos de error visibles (Alert role="alert") dentro de `alcance`. */
export function alertas(alcance: Locator): Promise<string[]> {
  return alcance.locator('[role="alert"]').evaluateAll((es) => es.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
}

export function dialogo(page: Page) {
  return page.locator('[role="dialog"], [role="alertdialog"]').last();
}
