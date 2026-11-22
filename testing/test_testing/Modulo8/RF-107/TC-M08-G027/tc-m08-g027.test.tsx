// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-21 | Juan Sebastian Gutierrez | TC-M08-G027 (TC-M08-063 y TC-M08-064; RF-107): proceso en curso, umbrales, aviso 30 s, timeout y bloqueo de operaciones dependientes v1 |
// | 2026-11-22 | Juan Sebastian Gutierrez | v1.1 reintento 1 (#730, INC-M08-392-G027). CP-02 segun la entrega (decision de Sebastian 2026-11-22): el indicador se activa por tiempo transcurrido (> 3.000 ms), no por tiempo_estimado_operacion; la diferencia con R129 / 8.5 es la OBS-6. ADAPT-1: CP-03 se mide con el indicador visible. ADAPT-2: t1 = instante real en que aparece el indicador (esperado literal de la ronda 1). CP-04 pasa a OBS-5 (decision de Sebastian 2026-11-21): 10 checkpoints. OBS-1 reescrita. P7: umbral de la entrega |
//
// QA SGPMP - Evaluacion (ronda 1). Prueba de componente con Vitest + jsdom.
// Red simulada SOLO con http.defaults.adapter (emula timeout de axios). No se llama a TEST.
// Reporte: JSON propio en STAGING_DIR (resultado_TC-M08-G027[_reintentoN].json). Cada checkpoint arranca en FALLA "No alcanzado".
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import type { History } from 'history';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../../../src/shared/i18n';
import { http } from '../../../../../src/shared/api/http';
import { fijarCatalogoErrores } from '../../../../../src/shared/api/catalogoErrores';
import { limpiarToasts } from '../../../../../src/shared/hooks/useToast';
import { ToastHost } from '../../../../../src/shared/design-system/ToastHost';
import { AuthContext } from '../../../../../src/shared/auth/AuthContext';
import { ReportesPage } from '../../../../../src/reportes/pages/ReportesPage';
import { CierreView } from '../../../../../src/financial_valuation/pages/CierreView';
import { ProveedorPeriodo } from '../../../../../src/financial_valuation/components/comunes';
import type { Periodo } from '../../../../../src/financial_valuation/types';
import { ClientesView } from '../../../../../src/accounting_integration/pages/ClientesView';
import { R_CLIENTES, ACCION_R, ACCION_D, ACCION_E } from '../../../../../src/accounting_integration/rbac';
import { R_CIERRE } from '../../../../../src/financial_valuation/rbac';

const TC = 'TC-M08-G027';
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = resolve(AQUI, '../../../../..');
const T_BASE = '2026-11-21T10:00:00-05:00';

// ---------------------------------------------------------------------------------------------------------------
// Registro de checkpoints
// ---------------------------------------------------------------------------------------------------------------
type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }

const CPS: Checkpoint[] = [
  {
    paso: 'CP-01',
    esperado: 'Operación con tiempo_estimado_operacion=3000 y duración real 3000 ms: el indicador (role="status" con aria-busy="true" de ProcesoEnCurso) NO aparece en t0+0, t0+1000 ni t0+2999',
    fuente: 'RF-107 Entradas R129; 8.5 paso 3 («menor o igual a 3.000 ms: no se activa el indicador»)',
  },
  {
    paso: 'CP-02',
    esperado: 'Operación de 10.000 ms (la respuesta trae tiempo_estimado_operacion=3001, que el frontend no usa): el indicador NO se ve en t0+3.000 y SÍ en t0+3.001, con el texto exacto de reportes.json generar.generando (activación por tiempo transcurrido, según la entrega; decisión de Sebastian 2026-11-22)',
    fuente: 'RF-107 8.5 paso 3 (umbral de 3.000 ms) según la entrega del issue 730; la diferencia con R129 y la 8.5 («evalúa el campo tiempo_estimado_operacion») es la OBS-6',
  },
  {
    paso: 'CP-03',
    esperado: 'Durante CP-02, con el indicador visible (t0+3.001; progreso null): hay spinner (svg.ds-btn__spinner dentro del indicador) y NO hay role="progressbar"',
    fuente: 'RF-107 Entradas R129, R131; 8.5 paso 3 («null: spinner con el mensaje»)',
  },
  // CP-04 (t1+30.000 sin aviso) pasa a observación OBS-5 por decisión de Sebastian (2026-11-21): limite exacto del reloj simulado.
  {
    paso: 'CP-05',
    esperado: 'Operación de 45.000 ms; t1 = instante en que el indicador aparece: en t1+30.001 el texto exacto de proceso.largo está visible dentro del indicador',
    fuente: 'RF-107 8.5 paso 3',
  },
  {
    paso: 'CP-06',
    esperado: 'EXITOSO a los 5.000 ms: en t0+5.000 (tras estabilidad) el indicador ya no está y hay un banner de éxito con el texto de avisos.generado',
    fuente: 'RF-107 8.5 paso 4 (EXITOSO)',
  },
  {
    paso: 'CP-07',
    esperado: 'FALLIDO (422) a los 5.000 ms: indicador ausente y un error visible (Alert de la sección o banner) con el message del 422',
    fuente: 'RF-107 8.5 paso 4 (FALLIDO)',
  },
  {
    paso: 'CP-08',
    esperado: 'Sin respuesta: el simulador agota el timeout de 60.000 ms. En t0+60.000 (tras estabilidad): indicador ausente y visible exactamente «La operación no pudo completarse. Intenta nuevamente.»',
    fuente: 'RF-107 8.5 paso 3 («supera el tiempo máximo permitido: FA-3») y FA-3',
  },
  {
    paso: 'CP-09',
    esperado: 'En /finanzas/cierre, tras «Cerrar período» -> confirmar en el modal, con el POST de cierre pendiente: el botón «Cerrar período» (y «cierre.cancelar_no» si está en pantalla) está deshabilitado Y tiene un tooltip que cumple /^Espera a que finalice .+ antes de continuar\\.$/',
    fuente: 'RF-107 8.3 «Bloqueo de operaciones dependientes»; 8.5 paso 3',
  },
  {
    paso: 'CP-10',
    esperado: 'Con el mismo cierre pendiente: history.push(\'/reportes\') del anfitrión cambia la ubicación a /reportes y se ve el título de ReportesPage; ningún elemento del documento tiene inert ni aria-modal="true"',
    fuente: 'RF-107 Restricciones («No bloquea la navegación»); 8.3',
  },
  {
    paso: 'CP-11',
    esperado: 'Con el POST de cierre AÚN pendiente: navegar a /integracion/clientes y pulsar el botón de revocar de «QA Cliente G027». Esperado: 0 role="dialog" abiertos y un mensaje visible (alert/status/toast) que contenga «espera» y («finalice» o «termine») sin distinguir mayúsculas',
    fuente: 'RF-107 8.2 nivel 1 («bloquea el intento y muestra un mensaje informativo»)',
  },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const retirados: Array<{ paso: string; motivo: string }> = [
  { paso: '063 (b) avance N/Total del cierre (CA-07)', motivo: 'fuera de la entrega v7, sección 9' },
];

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso);
  if (!cp) throw new Error(`Checkpoint desconocido ${paso}`);
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}

// ---------------------------------------------------------------------------------------------------------------
// Red simulada en http.defaults.adapter (con emulacion de timeout de axios)
// ---------------------------------------------------------------------------------------------------------------
type Respuesta = { status: number; data: unknown };
interface RutaSimulada { metodo: string; patron: RegExp; responder: (config: InternalAxiosRequestConfig) => Respuesta | Promise<Respuesta> }
let rutas: RutaSimulada[] = [];
let peticiones: string[] = [];
const sinRuta: string[] = [];
const adaptadorOriginal = http.defaults.adapter;

function simular(metodo: string, patron: RegExp, status: number, data: unknown): void {
  rutas = [{ metodo, patron, responder: () => ({ status, data }) }, ...rutas];
}
function simularConRetraso(metodo: string, patron: RegExp, retrasoMs: number, status: number, data: unknown): void {
  rutas = [{
    metodo,
    patron,
    responder: () => new Promise<Respuesta>((resolveResp) => {
      setTimeout(() => resolveResp({ status, data }), retrasoMs);
    }),
  }, ...rutas];
}
function simularDiferida(metodo: string, patron: RegExp): { resolver: (r: Respuesta) => void; pendiente: () => boolean } {
  let resuelta = false;
  let resolverFn: (r: Respuesta) => void = () => undefined;
  const promesa = new Promise<Respuesta>((ok) => {
    resolverFn = (r) => {
      if (resuelta) return;
      resuelta = true;
      ok(r);
    };
  });
  rutas = [{ metodo, patron, responder: () => promesa }, ...rutas];
  return { resolver: (r) => resolverFn(r), pendiente: () => !resuelta };
}

async function adaptador(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const metodo = (config.method ?? 'get').toUpperCase();
  const uri = http.getUri(config);
  const url = config.url ?? '';
  peticiones.push(`${metodo} ${uri}`);
  const ruta = rutas.find((r) => r.metodo === metodo && r.patron.test(url));
  if (!ruta) {
    sinRuta.push(`${metodo} ${uri}`);
    throw new AxiosError(`QA: peticion sin respuesta simulada ${metodo} ${uri}`, 'ERR_QA', config);
  }
  const promResp = Promise.resolve(ruta.responder(config));
  let respData: Respuesta;
  if (typeof config.timeout === 'number' && config.timeout > 0) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const promTimeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new AxiosError(`timeout of ${config.timeout}ms exceeded`, 'ECONNABORTED', config));
      }, config.timeout);
    });
    try {
      respData = await Promise.race([promResp, promTimeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  } else {
    respData = await promResp;
  }
  const { status, data } = respData;
  const respuesta: AxiosResponse = { data, status, statusText: '', headers: {}, config, request: {} };
  if (status >= 200 && status < 300) return respuesta;
  throw new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
    config,
    {},
    respuesta,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Datos fijos y utilidades
// ---------------------------------------------------------------------------------------------------------------
const norm = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();

let lecturasTiempoEstimado = 0;
const lecturasPorCp: Record<string, number> = {};

function conTiempoEstimado<T extends Record<string, unknown>>(obj: T, valor: number): T {
  Object.defineProperty(obj, 'tiempo_estimado_operacion', {
    enumerable: true,
    configurable: true,
    get() {
      lecturasTiempoEstimado += 1;
      return valor;
    },
  });
  return obj;
}

const CATALOGO_REP = [{
  tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO',
  titulo: 'Inventario biológico',
  periodo_cerrado: false,
  compara_periodos: false,
  limite_sincrono: 1000,
  filtros: [],
}];

function crearVistaPrevia(tiempoEst?: number) {
  const base: Record<string, unknown> = {
    tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO',
    titulo: 'Inventario biológico',
    encabezado: [],
    numero_registros: 10,
    en_segundo_plano: false,
    sin_datos: false,
    mensaje: null,
    resumen: [],
    detalle: null,
    secciones: [],
    finales: [],
    advertencias: [],
    aclaraciones: [],
  };
  return tiempoEst !== undefined ? conTiempoEstimado(base, tiempoEst) : base;
}

function crearReporteExito(tiempoEst?: number) {
  const base: Record<string, unknown> = {
    id_reporte: 'r-ok',
    tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO',
    titulo: 'Inventario biológico',
    formato: 'PDF',
    estado: 'GENERADO',
    partes: [],
    numero_registros: 10,
    fecha_solicitud: '2026-11-21T15:00:00Z',
    fecha_expiracion: '2026-11-23T15:00:00Z',
    mensaje: null,
  };
  return tiempoEst !== undefined ? conTiempoEstimado(base, tiempoEst) : base;
}

function cuerpoError(code: string, message: string) {
  return { error_code: code, message, fields: [], timestamp: '2026-11-21T15:00:00Z' };
}

const PERIODO_7: Periodo = {
  id_periodo_contable: 7,
  numero_id_tributaria: '900123456',
  razon_social: 'Finca QA',
  tipo_cierre: 'MENSUAL',
  fecha_inicio: '2026-10-01',
  fecha_fin: '2026-10-31',
  estado: 'ABIERTO',
  fecha_cierre: null,
  ultimo_cierre: null,
} as Periodo;

const CLIENTE_QA = {
  id_cliente_externo: 501,
  codigo: 'QA_CLI_G027',
  nombre: 'QA Cliente G027',
  identificador_publico: 'qa-cliente-g027',
  estado: 'ACTIVO',
  tipo: 'ERP',
  ip_permitida: null,
  ttl_token_canal_minutos: 15,
  canales: [{ canal: 'CONSULTA_AAEF', limite_por_minuto: 60 }],
  fecha_actualizacion: '2026-11-20T12:00:00Z',
  credencial: { fecha_emision: '2026-11-01T00:00:00Z', fecha_expiracion: '2027-11-01T00:00:00Z' },
};

const navegador: { history: History | null } = { history: null };

function crearAuth() {
  const permisos = [
    { id_recurso: 1, nombre_recurso: R_CIERRE, id_accion: ACCION_R },
    { id_recurso: 1, nombre_recurso: R_CIERRE, id_accion: ACCION_E },
    { id_recurso: 2, nombre_recurso: R_CLIENTES, id_accion: ACCION_R },
    { id_recurso: 2, nombre_recurso: R_CLIENTES, id_accion: ACCION_D },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    token: 't',
    claims: null,
    userInfo: null,
    permisos,
    perfilIncompleto: false,
    isBootstrapping: false,
    errorRestaurandoSesion: false,
    reintentarRestaurarSesion: () => {},
    sesionOffline: false,
    permisosActualizadosEn: null,
    setSession: () => {},
    clearSession: () => {},
    refreshUserInfo: async () => {},
  } as any;
}

function Anfitrion({ ruta = '/reportes' }: { ruta?: string }) {
  const auth = crearAuth();
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[ruta]}>
        <Route path="*" render={({ history, location }) => {
          navegador.history = history as unknown as History;
          return <span data-testid="qa-ruta">{location.pathname}</span>;
        }} />
        <Switch>
          <Route path="/reportes" render={() => <ReportesPage />} />
          <Route path="/finanzas/cierre" render={() => <ProveedorPeriodo><CierreView /></ProveedorPeriodo>} />
          <Route path="/integracion/clientes" render={() => <ClientesView />} />
        </Switch>
        <ToastHost />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

/** Avanza reloj simulado fuera de act() para que React y timers se intercalen como en navegador. */
async function avanzar(ms: number): Promise<void> {
  const g = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previo = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await vi.advanceTimersByTimeAsync(ms);
  } finally {
    g.IS_REACT_ACT_ENVIRONMENT = previo;
  }
  await act(async () => { /* vacia cola de React */ });
}

async function drenarMicrotareas(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => { await Promise.resolve(); });
  }
}

function firmaPantalla(): string {
  const r = document.querySelector('[data-testid="qa-ruta"]')?.textContent ?? '';
  const txt = norm(document.body.textContent).slice(0, 600);
  const btns = Array.from(document.querySelectorAll('button')).map((b) => `${norm(b.textContent)}:${b.disabled}`).join(',');
  return `${r}|${txt.length}|${btns}`;
}

/** Espera estabilidad: misma firma de pantalla en dos lecturas seguidas. */
async function esperarEstable(maxPasos = 20): Promise<void> {
  let anterior = '';
  for (let i = 0; i < maxPasos; i += 1) {
    await drenarMicrotareas();
    const actual = firmaPantalla();
    if (actual === anterior && i > 0) return;
    anterior = actual;
  }
}

function indicadorProceso(): HTMLElement | null {
  return document.querySelector('[role="status"][aria-busy="true"]') as HTMLElement | null;
}

function bannersToast(variante?: 'success' | 'error' | 'info'): HTMLElement[] {
  const zona = document.querySelector('.ds-toasts');
  if (!zona) return [];
  const sel = variante ? `.ds-alert--${variante}` : '.ds-alert';
  return Array.from(zona.querySelectorAll(sel)) as HTMLElement[];
}

function textoAlert(el: HTMLElement): string {
  const title = norm(el.querySelector('.ds-alert__title')?.textContent);
  const body = norm(el.querySelector('.ds-alert__body')?.textContent);
  return body || title || norm(el.textContent);
}

async function montarReportesYPrepararExportar(tiempoEst?: number): Promise<HTMLButtonElement | null> {
  simular('GET', /^\/reportes\/catalogo$/, 200, CATALOGO_REP);
  simular('GET', /^\/reportes$/, 200, []);
  simular('POST', /^\/reportes\/vista-previa$/, 200, crearVistaPrevia(tiempoEst));
  render(<Anfitrion ruta="/reportes" />);
  await esperarEstable();
  const select = screen.queryByLabelText(/^Reporte/) as HTMLSelectElement | null;
  if (!select) return null;
  fireEvent.change(select, { target: { value: 'REPORTE_INVENTARIO_BIOLOGICO' } });
  await esperarEstable();
  const btnPrevia = screen.queryByRole('button', { name: 'Ver vista previa' });
  if (!btnPrevia) return null;
  fireEvent.click(btnPrevia);
  await esperarEstable();
  const btnExportar = screen.queryByRole('button', { name: 'Exportar en PDF' }) as HTMLButtonElement | null;
  return btnExportar && !btnExportar.disabled ? btnExportar : null;
}

function contarEnSrc(re: RegExp): number {
  let total = 0;
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const p = join(dir, nombre);
      const st = statSync(p);
      if (st.isDirectory()) recorrer(p);
      else if (/\.(ts|tsx)$/.test(nombre)) {
        const c = readFileSync(p, 'utf8');
        const m = c.match(re);
        if (m) total += m.length;
      }
    }
  };
  recorrer(join(RAIZ_FRONT, 'src'));
  return total;
}

// ---------------------------------------------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------------------------------------------
let refsTiempoEstimadoSrc = 0;
let refsTiempoEstimadoCodigo = 0;
let usosProgresoSrc = 0;

beforeAll(async () => {
  await i18n.changeLanguage('es-CO');
  const leer = (rel: string) => readFileSync(join(RAIZ_FRONT, rel), 'utf8');
  const p1 = leer('src/shared/design-system/ProcesoEnCurso.tsx').includes('const AVISO_LARGO_MS = 30_000;');
  const p2 = leer('src/reportes/pages/ReportesPage.tsx').includes("<ProcesoEnCurso mensaje={t('generar.generando')} />");
  const p3 = /generar\([\s\S]*?\{ timeout: 60000 \}/.test(leer('src/reportes/api/reportesApi.ts'));
  const p4 = leer('src/financial_valuation/pages/CierreView.tsx').includes("<ModalShell bloqueante title={t('cierre.confirmar_titulo'");
  const p5 = leer('src/accounting_integration/pages/ClientesView.tsx').includes("bloqueante={estado.accion === 'revocar'}");
  const procesoSrc = leer('src/shared/design-system/ProcesoEnCurso.tsx');
  const p7 = procesoSrc.includes('export const UMBRAL_PROCESO_MS = 3_000;') && procesoSrc.includes('setTimeout(() => setVisible(true), UMBRAL_PROCESO_MS + 1)');

  vi.useFakeTimers({ now: new Date(T_BASE) });
  const tA = Date.now();
  await vi.advanceTimersByTimeAsync(100);
  const tB = Date.now();
  vi.useRealTimers();
  const p6 = tB - tA === 100;

  precondiciones.push({ nombre: 'P1 ProcesoEnCurso.tsx contiene const AVISO_LARGO_MS = 30_000;', ok: p1, detalle: p1 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: "P2 ReportesPage.tsx contiene <ProcesoEnCurso mensaje={t('generar.generando')} />", ok: p2, detalle: p2 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: 'P3 reportesApi.ts generar usa { timeout: 60000 }', ok: p3, detalle: p3 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: "P4 CierreView.tsx contiene <ModalShell bloqueante title={t('cierre.confirmar_titulo'", ok: p4, detalle: p4 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: "P5 ClientesView.tsx contiene bloqueante={estado.accion === 'revocar'}", ok: p5, detalle: p5 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: 'P6 Reloj simulado avanza Date.now() con vi.advanceTimersByTimeAsync', ok: p6, detalle: `delta=${tB - tA} ms` });
  precondiciones.push({ nombre: 'P7 ProcesoEnCurso.tsx: umbral de la entrega (UMBRAL_PROCESO_MS = 3_000; visible a UMBRAL_PROCESO_MS + 1)', ok: p7, detalle: p7 ? 'encontrado' : 'ausente' });

  refsTiempoEstimadoSrc = contarEnSrc(/tiempo_estimado_operacion/g);
  refsTiempoEstimadoCodigo = contarEnSrc(/^(?!\s*(\/\/|\*|\/\*)).*tiempo_estimado_operacion/gm);
  usosProgresoSrc = contarEnSrc(/<ProcesoEnCurso[^>]*\bprogreso=/g);
});

beforeEach(() => {
  rutas = [];
  peticiones = [];
  lecturasTiempoEstimado = 0;
  http.defaults.adapter = adaptador;
  limpiarToasts();
  fijarCatalogoErrores({});
  (window as unknown as Record<string, unknown>).__qaEnCurso = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  limpiarToasts();
  fijarCatalogoErrores({});
  http.defaults.adapter = adaptadorOriginal;
  (window as unknown as Record<string, unknown>).__qaEnCurso = false;
});

afterAll(() => {
  if (precondiciones.some((p) => !p.ok)) {
    const nombres = precondiciones.filter((p) => !p.ok).map((p) => p.nombre).join('; ');
    for (const c of CPS) {
      c.obtenido = `Precondición no cumplida (${nombres}); medido: ${c.obtenido}`;
      c.estado = 'FALLA';
    }
  }
  observaciones.push(`OBS-1: tiempo_estimado_operacion tiene ${refsTiempoEstimadoSrc} referencia(s) en src\\ .ts/.tsx, ${refsTiempoEstimadoCodigo} fuera de comentarios; el backend no lo envía (lectura de Claude, backend 135bc318). Lecturas del campo por la app (lector instrumentado en las respuestas simuladas): CP-01=${lecturasPorCp['CP-01'] ?? 0}, CP-02=${lecturasPorCp['CP-02'] ?? 0}.`);
  observaciones.push('OBS-6 (decisión de Sebastian, 2026-11-22): RF-107 Entradas R129 («Si > 3000 ms, se activa PROCESO_EN_CURSO») y 8.5 paso 3 («M08 evalúa el campo tiempo_estimado_operacion para decidir si debe activar el indicador») piden activar el indicador desde el inicio según la estimación; la entrega del issue 730 lo muestra pasados 3.000 ms de operación porque el contrato no trae el campo. CP-02 se mide según la entrega. Para los líderes y Análisis.');
  observaciones.push(`OBS-2: ProcesoEnCurso acepta progreso 0-100 (barra), pero ningún llamador le pasa progreso (usos con prop progreso en src\\: ${usosProgresoSrc}).`);
  observaciones.push('OBS-3: el «tiempo máximo permitido» de FA-3 no lo define el RF; se tomó el timeout del cliente de generar (60.000 ms, reportesApi.ts).');
  observaciones.push('OBS-4: el cierre usa su propia barra de RF-87 («Progreso» de CierreView), no ProcesoEnCurso.');
  if (sinRuta.length) observaciones.push(`Peticiones sin ruta simulada: ${sinRuta.join(', ')}`);

  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const falla = CPS.length - ok;
  const reintento = Number(process.env.QA_REINTENTO ?? process.env.REINTENTO ?? '0');
  const reporte = {
    tc: TC,
    reintento,
    run_id: process.env.RUN_ID ?? '',
    fecha: new Date().toISOString(),
    summary: { total: CPS.length, ok, falla, veredicto: falla === 0 ? 'Aprobado' : 'Rechazado' },
    checkpoints: CPS,
    observaciones,
    retirados,
    precondiciones,
  };
  const dir = process.env.STAGING_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  const sufijo = reintento > 0 ? `_reintento${reintento}` : '';
  writeFileSync(join(dir, `resultado_${TC}${sufijo}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-063 - Proceso en curso (CP-01 a CP-08)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-063 Indicador de proceso en curso (RF-107 8.5)', () => {
  it('CP-01 operacion <= 3.000 ms no activa indicador', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    simularConRetraso('POST', /^\/reportes$/, 3000, 201, crearReporteExito(3000));
    const btn = await montarReportesYPrepararExportar(3000);
    if (!btn) { anotar('CP-01', false, 'no se pudo preparar el botón Exportar en PDF'); expect(false).toBe(true); return; }

    fireEvent.click(btn);
    await avanzar(0);
    const ind0 = indicadorProceso();
    const txt0 = ind0 ? norm(ind0.textContent) : '';

    await avanzar(1000);
    const ind1000 = indicadorProceso();

    await avanzar(1999);
    const ind2999 = indicadorProceso();

    await avanzar(1);
    await esperarEstable();

    const visiblesEn: number[] = [];
    if (ind0) visiblesEn.push(0);
    if (ind1000) visiblesEn.push(1000);
    if (ind2999) visiblesEn.push(2999);
    lecturasPorCp['CP-01'] = lecturasTiempoEstimado;
    const ok = visiblesEn.length === 0;
    anotar(
      'CP-01',
      ok,
      `${visiblesEn.length ? `visible en [${visiblesEn.join(', ')}] ms` : 'no visible en [0, 1000, 2999] ms'}; texto="${txt0}"; lecturas del campo=${lecturasTiempoEstimado}`,
    );
    expect(ok).toBe(true);
  });

  it('CP-02 y CP-03 operacion de mas de 3.000 ms: indicador a partir de t0+3.001 con spinner y sin progressbar', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    const textoEsperado = i18n.t('generar.generando', { ns: 'reportes' });
    simularConRetraso('POST', /^\/reportes$/, 10000, 201, crearReporteExito(3001));
    const btn = await montarReportesYPrepararExportar(3001);
    if (!btn) {
      anotar('CP-02', false, 'no se pudo preparar el botón Exportar en PDF');
      anotar('CP-03', false, 'no se pudo preparar el botón Exportar en PDF');
      expect(false).toBe(true);
      return;
    }

    fireEvent.click(btn);
    await avanzar(0);
    const ind0 = indicadorProceso();
    await avanzar(3000);
    const ind3000 = indicadorProceso();
    const txt3000 = ind3000 ? norm(ind3000.textContent) : '';
    await avanzar(1);
    // ADAPT-1: CP-03 se mide con el indicador visible (la entrega lo muestra pasados 3.000 ms).
    const ind3001 = indicadorProceso();
    const txt3001 = ind3001 ? norm(ind3001.textContent) : '';
    const spinners = ind3001 ? ind3001.querySelectorAll('svg.ds-btn__spinner').length : 0;
    const progressbars = ind3001 ? ind3001.querySelectorAll('[role="progressbar"]').length : 0;

    await avanzar(7000);
    await esperarEstable();

    lecturasPorCp['CP-02'] = lecturasTiempoEstimado;
    const ok02 = !ind3000 && !!ind3001 && txt3001 === textoEsperado;
    anotar(
      'CP-02',
      ok02,
      `t0+0=${ind0 ? 'visible' : 'ausente'}, t0+3000=${ind3000 ? `visible ("${txt3000}")` : 'ausente'}, t0+3001=${ind3001 ? `visible ("${txt3001}")` : 'ausente'}; lecturas del campo=${lecturasTiempoEstimado}`,
    );
    const ok03 = !!ind3001 && spinners >= 1 && progressbars === 0;
    anotar('CP-03', ok03, `en t0+3001: indicador ${ind3001 ? 'visible' : 'ausente'}, spinners=${spinners}, progressbars=${progressbars}, texto="${txt3001}"`);
    expect(ok02 && ok03).toBe(true);
  });

  it('CP-05 (y OBS-5) aviso proceso.largo respecto de t1 = aparicion del indicador', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    const textoLargoEsperado = i18n.t('proceso.largo', { ns: 'common' });
    simularConRetraso('POST', /^\/reportes$/, 45000, 201, crearReporteExito(45000));
    const btn = await montarReportesYPrepararExportar(45000);
    if (!btn) {
      anotar('CP-05', false, 'no se pudo preparar el botón Exportar en PDF');
      expect(false).toBe(true);
      return;
    }

    // ADAPT-2: t1 = instante real (reloj simulado) en que el indicador aparece, como dice el esperado; la ronda 1
    // suponia t1 = t0 porque el indicador se veia de inmediato. Se avanza de a 1 ms y se lee la pantalla tras
    // drenar microtareas (resolucion 1 ms), hasta 10.000 ms.
    let t1: number | null = null;
    fireEvent.click(btn);
    const t0 = Date.now();
    await avanzar(0);
    await drenarMicrotareas();
    if (indicadorProceso()) t1 = Date.now();
    while (t1 === null && Date.now() - t0 < 10_000) {
      await avanzar(1);
      await drenarMicrotareas();
      if (indicadorProceso()) t1 = Date.now();
    }

    const leerAvisoLargo = (): string => {
      const ind = indicadorProceso();
      if (!ind) return '';
      const avisos = Array.from(ind.querySelectorAll('.ds-proceso__aviso')).map((p) => norm(p.textContent));
      return avisos.join(' | ');
    };

    if (t1 === null) {
      await avanzar(35000);
      await esperarEstable();
      anotar('CP-05', false, 'el indicador no apareció en los primeros 10.000 ms (sin t1)');
      observaciones.push('OBS-5 (decisión de Sebastian 2026-11-21, antes CP-04): sin t1, el indicador no apareció en 10.000 ms.');
      expect(false).toBe(true);
      return;
    }

    const tA = t1;
    const puntos = [
      { nombre: 't0+29.999', en: t0 + 29_999 }, { nombre: 't0+30.000', en: t0 + 30_000 }, { nombre: 't0+30.001', en: t0 + 30_001 },
      { nombre: 't1+29.999', en: tA + 29_999 }, { nombre: 't1+30.000', en: tA + 30_000 }, { nombre: 't1+30.001', en: tA + 30_001 },
    ].sort((a, b) => a.en - b.en);
    const leido: Record<string, string> = {};
    for (const p of puntos) {
      const falta = p.en - Date.now();
      if (falta > 0) await avanzar(falta);
      leido[p.nombre] = leerAvisoLargo();
    }
    const fin = t0 + 45_000 + 1_000 - Date.now();
    if (fin > 0) await avanzar(fin);
    await esperarEstable();

    const desc = (n: string) => `${n}=${leido[n] ? 'presente' : 'ausente'}`;
    const ok05 = leido['t1+30.001'] === textoLargoEsperado;
    anotar('CP-05', ok05, `t1=t0+${tA - t0} ms; t1+30.001="${leido['t1+30.001'] || '(ausente)'}"`);
    observaciones.push(`OBS-5 (decisión de Sebastian 2026-11-21, antes CP-04: límite exacto del reloj simulado): t1=t0+${tA - t0} ms; ${desc('t1+29.999')}, ${desc('t1+30.000')}; respecto del inicio de la operación: ${desc('t0+29.999')}, ${desc('t0+30.000')}, ${desc('t0+30.001')} (el aviso de 30 s cuenta desde el inicio, según la entrega).`);
    expect(ok05).toBe(true);
  }, 60_000);

  it('CP-06 EXITOSO a los 5.000 ms cierra indicador y muestra banner de exito', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    const tituloEsperado = i18n.t('avisos.generado', { ns: 'reportes', titulo: 'Inventario biológico' });
    simularConRetraso('POST', /^\/reportes$/, 5000, 201, crearReporteExito(5000));
    const btn = await montarReportesYPrepararExportar(5000);
    if (!btn) { anotar('CP-06', false, 'no se pudo preparar el botón Exportar en PDF'); expect(false).toBe(true); return; }

    fireEvent.click(btn);
    await avanzar(5000);
    await esperarEstable();

    const ind = indicadorProceso();
    const exitos = bannersToast('success');
    const titulos = exitos.map((b) => norm(b.querySelector('.ds-alert__title')?.textContent));
    const textos = exitos.map(textoAlert);
    const ok = ind === null && exitos.length >= 1 && titulos.includes(tituloEsperado);
    anotar(
      'CP-06',
      ok,
      `indicador=${ind ? 'sí' : 'no'}; banners_exito=${exitos.length} [${textos.map((x) => `"${x}"`).join(' | ')}]`,
    );
    expect(ok).toBe(true);
  });

  it('CP-07 FALLIDO (422) a los 5.000 ms cierra indicador y muestra error con el message del 422', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    const msg422 = 'El rango de fechas supera el máximo permitido.';
    simularConRetraso('POST', /^\/reportes$/, 5000, 422, cuerpoError('VALIDACION_REPORTE', msg422));
    const btn = await montarReportesYPrepararExportar(5000);
    if (!btn) { anotar('CP-07', false, 'no se pudo preparar el botón Exportar en PDF'); expect(false).toBe(true); return; }

    fireEvent.click(btn);
    await avanzar(5000);
    await esperarEstable();

    const ind = indicadorProceso();
    const seccion = screen.queryByRole('heading', { name: 'Generar un reporte' })?.closest('section') as HTMLElement | null;
    const errSeccion = seccion ? Array.from(seccion.querySelectorAll('.ds-alert--error, .ds-alert--warning')) as HTMLElement[] : [];
    const errToast = bannersToast('error');
    const encontrados = [
      ...errSeccion.map((e) => ({ donde: 'seccion', texto: textoAlert(e) })),
      ...errToast.map((e) => ({ donde: 'toast', texto: textoAlert(e) })),
    ];
    const ok = ind === null && encontrados.some((e) => e.texto.includes(msg422));
    anotar(
      'CP-07',
      ok,
      `indicador=${ind ? 'sí' : 'no'}; errores=${encontrados.length} [${encontrados.map((e) => `${e.donde}:"${e.texto}"`).join(' | ')}]`,
    );
    expect(ok).toBe(true);
  });

  it('CP-08 timeout 60.000 ms cierra indicador y muestra mensaje FA-3', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE) });
    const esperadoFa3 = 'La operación no pudo completarse. Intenta nuevamente.';
    const diferida = simularDiferida('POST', /^\/reportes$/);
    const btn = await montarReportesYPrepararExportar(5000);
    if (!btn) { anotar('CP-08', false, 'no se pudo preparar el botón Exportar en PDF'); expect(false).toBe(true); return; }

    try {
      fireEvent.click(btn);
      await avanzar(60000);
      await esperarEstable();

      const ind = indicadorProceso();
      const seccion = screen.queryByRole('heading', { name: 'Generar un reporte' })?.closest('section') as HTMLElement | null;
      const errSeccion = seccion ? Array.from(seccion.querySelectorAll('.ds-alert--error, .ds-alert--warning')) as HTMLElement[] : [];
      const errToast = bannersToast('error');
      const textos = [
        ...errSeccion.map((e) => norm(e.querySelector('.ds-alert__desc')?.textContent) || textoAlert(e)),
        ...errToast.map(textoAlert),
      ];
      const ok = ind === null && textos.some((t) => t === esperadoFa3);
      anotar(
        'CP-08',
        ok,
        `indicador=${ind ? 'sí' : 'no'}; textos_error=[${textos.map((x) => `"${x}"`).join(' | ')}]`,
      );
      expect(ok).toBe(true);
    } finally {
      diferida.resolver({ status: 201, data: crearReporteExito() });
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-064 - Bloqueo de operaciones dependientes, navegacion libre y operacion critica (CP-09 a CP-11)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-064 Bloqueo de operaciones dependientes y navegacion (RF-107 8.2 y 8.3)', () => {
  it('CP-09, CP-10 y CP-11 cierre pendiente: tooltip en controles, navegacion libre y bloqueo de revocacion', async () => {
    vi.useFakeTimers({ now: new Date(T_BASE), toFake: ['Date'] });
    simular('GET', /^\/finanzas\/titulares$/, 200, []);
    simular('GET', /^\/finanzas\/periodos$/, 200, [PERIODO_7]);
    simular('GET', /^\/finanzas\/periodos\/7\/prevalidacion$/, 200, {
      bloqueos: [],
      activos_sin_precio: [],
      lineas_sin_trazabilidad: [],
      puede_cerrar: true,
      requiere_autorizacion: false,
    });
    simular('GET', /^\/finanzas\/periodos\/7\/comprobantes$/, 200, []);
    simular('GET', /^\/reportes\/catalogo$/, 200, CATALOGO_REP);
    simular('GET', /^\/reportes$/, 200, []);
    simular('GET', /^\/integracion\/clientes$/, 200, [CLIENTE_QA]);
    const cierreDiferido = simularDiferida('POST', /^\/finanzas\/periodos\/7\/cierre$/);

    render(<Anfitrion ruta="/finanzas/cierre" />);
    await esperarEstable();

    try {
      const btnAbrir = screen.queryByRole('button', { name: 'Cerrar período' });
      if (!btnAbrir) {
        anotar('CP-09', false, 'no se encontró el botón «Cerrar período»');
        anotar('CP-10', false, 'no se pudo iniciar el cierre');
        anotar('CP-11', false, 'no se pudo iniciar el cierre');
        expect(false).toBe(true);
        return;
      }
      fireEvent.click(btnAbrir);
      await esperarEstable();
      const dialogo = screen.queryByRole('dialog');
      if (!dialogo) {
        anotar('CP-09', false, 'no se abrió el modal de confirmación del cierre');
        anotar('CP-10', false, 'no se pudo confirmar el cierre');
        anotar('CP-11', false, 'no se pudo confirmar el cierre');
        expect(false).toBe(true);
        return;
      }
      const btnConfirmar = within(dialogo).queryByRole('button', { name: 'Cerrar período' });
      if (!btnConfirmar) {
        anotar('CP-09', false, 'no se encontró el botón «Cerrar período» en el modal');
        anotar('CP-10', false, 'no se pudo confirmar el cierre');
        anotar('CP-11', false, 'no se pudo confirmar el cierre');
        expect(false).toBe(true);
        return;
      }
      fireEvent.click(btnConfirmar);
      await esperarEstable();

      // -- CP-09: botones deshabilitados + tooltip valido
      const reTooltip = /^Espera a que finalice .+ antes de continuar\.$/;
      const textoCancelarNo = i18n.t('cierre.cancelar_no', { ns: 'finanzas' });
      const controles: Array<{ texto: string; el: HTMLButtonElement }> = [];
      const bCerrar = screen.queryByRole('button', { name: 'Cerrar período' }) as HTMLButtonElement | null;
      if (bCerrar) controles.push({ texto: 'Cerrar período', el: bCerrar });
      const bCancelarNo = screen.queryByRole('button', { name: textoCancelarNo }) as HTMLButtonElement | null;
      if (bCancelarNo) controles.push({ texto: textoCancelarNo, el: bCancelarNo });

      const evaluarControl = (el: HTMLButtonElement) => {
        const titlePropio = norm(el.getAttribute('title'));
        const titlePadre = norm(el.parentElement?.getAttribute('title'));
        const descId = el.getAttribute('aria-describedby');
        const descTxt = descId ? norm(document.getElementById(descId)?.textContent) : '';
        fireEvent.mouseEnter(el);
        fireEvent.focus(el);
        const roleTip = norm(document.querySelector('[role="tooltip"]')?.textContent);
        const tooltip = titlePropio || titlePadre || descTxt || roleTip;
        const deshabilitado = el.disabled || el.getAttribute('aria-disabled') === 'true';
        return {
          disabled: el.disabled,
          ariaDisabled: el.getAttribute('aria-disabled') ?? 'null',
          ariaBusy: el.getAttribute('aria-busy') ?? 'null',
          tooltip: tooltip || 'sin tooltip',
          valido: deshabilitado && reTooltip.test(tooltip),
        };
      };

      const resultados09 = controles.map((c) => ({ texto: c.texto, ...evaluarControl(c.el) }));
      const ok09 = resultados09.length >= 1 && resultados09.every((r) => r.valido);
      anotar(
        'CP-09',
        ok09,
        resultados09.map((r) => `"${r.texto}" {disabled=${r.disabled}, aria-disabled=${r.ariaDisabled}, aria-busy=${r.ariaBusy}, tooltip="${r.tooltip}"}`).join(' | ') || '0 controles encontrados',
      );

      // -- CP-10: navegacion libre a /reportes
      act(() => { navegador.history?.push('/reportes'); });
      await esperarEstable();
      const ruta10 = norm(document.querySelector('[data-testid="qa-ruta"]')?.textContent);
      const h1Reportes = screen.queryByRole('heading', { level: 1, name: i18n.t('titulo', { ns: 'reportes' }) });
      const inerts = document.querySelectorAll('[inert]').length;
      const ariaModals = document.querySelectorAll('[aria-modal="true"]').length;
      const ok10 = ruta10 === '/reportes' && !!h1Reportes && inerts === 0 && ariaModals === 0;
      anotar(
        'CP-10',
        ok10,
        `ruta="${ruta10}", titulo="${norm(h1Reportes?.textContent) || '(ausente)'}", inert=${inerts}, aria-modal=${ariaModals}`,
      );

      // -- CP-11: navegar a /integracion/clientes con el cierre aun pendiente y pulsar revocar
      act(() => { navegador.history?.push('/integracion/clientes'); });
      await esperarEstable();
      const ruta11 = norm(document.querySelector('[data-testid="qa-ruta"]')?.textContent);
      const pendienteAhora = cierreDiferido.pendiente();
      if (ruta11 !== '/integracion/clientes') {
        anotar('CP-11', false, `no se pudo navegar (ruta="${ruta11}"); cierre pendiente=${pendienteAhora ? 'sí' : 'no'}`);
      } else {
        const ariaRevocar = i18n.t('clientes.revocar_aria', { ns: 'integracion', cliente: 'QA Cliente G027' });
        const btnRevocar = screen.queryByRole('button', { name: ariaRevocar });
        if (!btnRevocar) {
          anotar('CP-11', false, `no se encontró botón "${ariaRevocar}"; cierre pendiente=${pendienteAhora ? 'sí' : 'no'}`);
        } else {
          fireEvent.click(btnRevocar);
          await esperarEstable();
          const dialogos = Array.from(document.querySelectorAll('[role="dialog"]')).map((d) => {
            const lbl = d.getAttribute('aria-labelledby');
            return (lbl ? norm(document.getElementById(lbl)?.textContent) : '') || norm(d.getAttribute('aria-label')) || '(sin título)';
          });
          const mensajes = Array.from(document.querySelectorAll('[role="alert"], [role="status"], .ds-toasts .ds-alert'))
            .map((m) => norm(m.textContent))
            .filter(Boolean);
          const hayMensajeBloqueo = mensajes.some((m) => /espera/i.test(m) && /(finalice|termine)/i.test(m));
          const ok11 = dialogos.length === 0 && hayMensajeBloqueo;
          anotar(
            'CP-11',
            ok11,
            `dialogos=${dialogos.length} [${dialogos.map((d) => `"${d}"`).join(', ')}]; mensajes=[${mensajes.map((m) => `"${m}"`).join(' | ')}]; cierre pendiente=${cierreDiferido.pendiente() ? 'sí' : 'no'}`,
          );
        }
      }

      expect(ok09 && ok10 && CPS.find((c) => c.paso === 'CP-11')?.estado === 'OK').toBe(true);
    } finally {
      cierreDiferido.resolver({
        status: 200,
        data: {
          id_cierre: 31,
          periodo: '2026-10',
          estado: 'COMPLETADO',
          activos_procesados: 10,
          activos_excluidos: [],
          lineas_excluidas: [],
          comprobantes: [],
          hash_cierre: 'f00d',
          reportes: {},
          id_periodo_siguiente: null,
        },
      });
      await drenarMicrotareas();
    }
  });
});
