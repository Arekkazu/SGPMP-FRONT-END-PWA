// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-21 | Juan Sebastian Gutierrez | TC-M08-G028 (TC-M08-068 y TC-M08-069; RF-107): confirmacion de acciones criticas, contenido del dialogo y modo bloqueante v1 |
// | 2026-11-23 | Juan Sebastian Gutierrez | v1.1 reintento 1 (INC-M08-393-G028, GitHub 731): 12 checkpoints; ADAPT-1 el dialogo de la reversion se busca por su titulo con el activo ({{activo}} desde ac134ec1); P7 sin operacion en curso heredada; OBS-6 reescrita (Escape corregido en b370f754) |
//
// QA SGPMP - Evaluacion (ronda 1; reintento 1 con v1.1). Prueba de componente con Vitest + jsdom.
// Red simulada SOLO con http.defaults.adapter (emula timeout de axios). No se llama a TEST.
// Reporte: JSON propio en STAGING_DIR (resultado_TC-M08-G028[_reintentoN].json). Cada checkpoint arranca en FALLA "No alcanzado".
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../../../src/shared/i18n';
import { http } from '../../../../../src/shared/api/http';
import { fijarCatalogoErrores } from '../../../../../src/shared/api/catalogoErrores';
import { limpiarToasts } from '../../../../../src/shared/hooks/useToast';
import { operacionEnCurso } from '../../../../../src/shared/hooks/operacionEnCurso';
import { ToastHost } from '../../../../../src/shared/design-system/ToastHost';
import { AuthContext } from '../../../../../src/shared/auth/AuthContext';
import { EventosSection } from '../../../../../src/biological_assets/components/EventosSection';
import { RECURSO_ACTIVOS, ACCION_C as ACCION_C_BIO } from '../../../../../src/biological_assets/rbac';
import type { EventoActivoResponse } from '../../../../../src/biological_assets/types';
import { DetalleActivoModal } from '../../../../../src/financial_valuation/components/DetalleActivoModal';
import { CierreView } from '../../../../../src/financial_valuation/pages/CierreView';
import { ProveedorPeriodo, nombrePeriodo } from '../../../../../src/financial_valuation/components/comunes';
import { R_CIERRE, R_RECONOCIMIENTO, ACCION_R as ACCION_R_FIN, ACCION_D as ACCION_D_FIN, ACCION_E as ACCION_E_FIN } from '../../../../../src/financial_valuation/rbac';
import type { HistorialActivo, Periodo, ResultadoCierre } from '../../../../../src/financial_valuation/types';
import { ClientesView } from '../../../../../src/accounting_integration/pages/ClientesView';
import { R_CLIENTES, ACCION_R as ACCION_R_INT, ACCION_D as ACCION_D_INT } from '../../../../../src/accounting_integration/rbac';
import { ReportesPage } from '../../../../../src/reportes/pages/ReportesPage';

const TC = 'TC-M08-G028';
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
    esperado: 'Baja: al llegar a «Confirma la baja» hay 1 diálogo y 0 POST de baja; «Volver» y luego «Cancelar» cierran sin POST (0); repetir el flujo y «Confirmar baja» => exactamente 1 POST de baja',
    fuente: 'RF-107 8.1; Restricciones; CA-03',
  },
  {
    paso: 'CP-02',
    esperado: 'Reversión: al pulsar «Revertir reconocimiento» hay 1 diálogo y 0 POST; «Cancelar» => diálogo cerrado y 0 POST; reabrir, motivo, confirmar => 1 POST de reversión',
    fuente: 'RF-107 8.1; CA-03',
  },
  {
    paso: 'CP-03',
    esperado: 'Cierre: «Cerrar período» => 1 diálogo y 0 POST de cierre; «Cancelar» => 0; reabrir y confirmar => 1 POST',
    fuente: 'RF-107 8.1; CA-03',
  },
  {
    paso: 'CP-04',
    esperado: 'Revocación: «Revocar QA Cliente G028» => 1 diálogo y 0 POST; «Cancelar» => 0; reabrir, motivo, confirmar => 1 POST',
    fuente: 'RF-107 8.1; CA-03',
  },
  {
    paso: 'CP-05',
    esperado: 'Acción no crítica: «Exportar en PDF» => 0 diálogos en todo momento y exactamente 1 POST /reportes',
    fuente: 'RF-107 8.1 («requiere_confirmacion = false: no muestra ningún modal»)',
  },
  {
    paso: 'CP-06',
    esperado: 'El diálogo del cierre contiene el nombre del período tal como lo muestra la app (nombrePeriodo: «Octubre de 2026»)',
    fuente: 'RF-107 8.5 (CIERRE_PERIODO: «el período a cerrar»)',
  },
  {
    paso: 'CP-08',
    esperado: 'El diálogo del cierre advierte que no podrá reabrirse ni modificarse: el texto cumple /(reabr|irreversible)/i Y /(modific|inmutable)/i',
    fuente: 'RF-107 8.5',
  },
  {
    paso: 'CP-09',
    esperado: 'Reversión y revocación: el texto del diálogo (título + descripción) nombra lo afectado («BOV-QA-G028-R» en la reversión; «QA Cliente G028» en la revocación) Y advierte la irreversibilidad /(irreversible|no se puede deshacer|definitiv)/i. Exige 2 diálogos evaluados',
    fuente: 'RF-107 8.5 («para las demás acciones críticas: qué datos serán afectados, qué cambio es irreversible»)',
  },
  {
    paso: 'CP-10',
    esperado: 'Escape (fireEvent.keyDown(document, {key:\'Escape\'})) con el diálogo de confirmación abierto de la reversión, el cierre y la revocación: los 3 siguen abiertos y 0 POST',
    fuente: 'RF-107 Restricciones («no tiene cierre por tecla Escape»); 8.5; CA-05',
  },
  {
    paso: 'CP-11',
    esperado: 'Clic en el fondo del diálogo (fireEvent.click sobre el propio [role="dialog"]) en los 4 diálogos (la baja en su paso «Confirma la baja»): los 4 siguen abiertos y 0 POST',
    fuente: 'RF-107 Restricciones; CA-05',
  },
  {
    paso: 'CP-12',
    esperado: 'Ninguno de los 4 diálogos (la baja en «Confirma la baja») tiene el botón X (acciones.cerrar)',
    fuente: 'RF-107 8.5 («dos botones»); CA-05; v7',
  },
  {
    paso: 'CP-13',
    esperado: 'Con cada uno de los 4 diálogos abiertos (la baja en «Confirma la baja»), avanzar 600.000 ms: siguen abiertos y 0 POST',
    fuente: 'RF-107 8.5 («No tiene ningún temporizador de cierre automático»)',
  },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const retirados: Array<{ paso: string; motivo: string }> = [
  { paso: '068 (b) configurar requiere_confirmacion=false', motivo: 'el campo no existe en el frontend; las confirmaciones están fijas en cada vista' },
  { paso: '068 (d) contradicción nivel_criticidad_accion/requiere_confirmacion y advertencia en log', motivo: 'los campos no existen y no hay log en el frontend' },
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
let peticiones: Array<{ metodo: string; uri: string }> = [];
const sinRuta: string[] = [];
const adaptadorOriginal = http.defaults.adapter;

function simular(metodo: string, patron: RegExp, status: number, data: unknown): void {
  rutas = [{ metodo, patron, responder: () => ({ status, data }) }, ...rutas];
}

function contarPost(patron: RegExp): number {
  return peticiones.filter((p) => p.metodo === 'POST' && patron.test(p.uri)).length;
}

async function adaptador(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const metodo = (config.method ?? 'get').toUpperCase();
  const uri = http.getUri(config);
  const url = config.url ?? '';
  peticiones.push({ metodo, uri });
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
const tBio = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'biologicalAssets', ...opts });
const tFin = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'finanzas', ...opts });
const tInt = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'integracion', ...opts });
const tSup = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'supplies', ...opts });
const tCom = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'common', ...opts });

const POST_BAJA_RE = /\/activos-biologicos\/4101\/eventos\/baja$/;
const POST_REVERSION_RE = /\/finanzas\/reconocimientos\/4102\/reversion$/;
const POST_CIERRE_RE = /\/finanzas\/periodos\/7\/cierre$/;
const POST_REVOCAR_RE = /\/integracion\/clientes\/502\/revocar$/;
const POST_REPORTES_RE = /\/reportes$/;

const RESPUESTA_BAJA_201: EventoActivoResponse = {
  id_eventos: 9001,
  id_activo_biologico: 4101,
  fecha: '2026-11-21',
  descripcion: 'Baja de prueba QA G028',
  id_usuario: 1,
  crecimiento: null,
  baja: { cantidad_afectada: 1, tipo: 'muerte', motivo_baja: 'Baja de prueba QA G028' },
  sanitario: null,
  productivo: null,
  reproductivo: null,
};

const HISTORIAL_4102: HistorialActivo = {
  activo: {
    id_activo_biologico: 4102,
    identificador: 'BOV-QA-G028-R',
    especie: 'Bovino',
    finca: 'Finca QA',
    razon_social: 'Finca QA',
    numero_id_tributaria: '900123456',
    peso_kg: '420.00',
    cantidad_actual: 1,
    costo_adquisicion: '2500000.00',
  },
  reconocimientos: [
    {
      id_reconocimiento_inicial: 301,
      estado: 'CONFIRMADO',
      indicador_valoracion: 'VALOR_RAZONABLE',
      valor_razonable_neto_inicial: '2800000.00',
      fecha_reconocimiento: '2026-10-05',
      es_apertura: false,
      justificacion_reversion: null,
    },
  ],
  calculos: [],
  mediciones: [],
  productos: [],
  valor_en_libros_actual: '2800000.00',
  valoracion_costo: null,
  lineas: [],
};

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
};

const RESULTADO_CIERRE_200: ResultadoCierre = {
  id_cierre: 77,
  periodo: '2026-10',
  estado: 'COMPLETADO',
  activos_procesados: 12,
  activos_excluidos: [],
  lineas_excluidas: [],
  comprobantes: [],
  hash_cierre: 'a'.repeat(64),
  reportes: {},
  id_periodo_siguiente: 8,
};

const CLIENTE_QA_G028 = {
  id_cliente_externo: 502,
  codigo: 'QA_CLI_G028',
  nombre: 'QA Cliente G028',
  identificador_publico: 'qa-cliente-g028',
  estado: 'ACTIVO',
  tipo: 'ERP',
  ip_permitida: null,
  ttl_token_canal_minutos: 15,
  canales: [{ canal: 'CONSULTA_AAEF', limite_por_minuto: 60 }],
  fecha_actualizacion: '2026-11-20T12:00:00Z',
  credencial: { fecha_emision: '2026-11-01T00:00:00Z', fecha_expiracion: '2027-11-01T00:00:00Z' },
};

const CATALOGO_REP = [{
  tipo_reporte: 'REPORTE_INVENTARIO_BIOLOGICO',
  titulo: 'Inventario biológico',
  periodo_cerrado: false,
  compara_periodos: false,
  limite_sincrono: 1000,
  filtros: [],
}];

const VISTA_PREVIA_REP = {
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

const REPORTE_EXITO_201 = {
  id_reporte: 'r-ok-g028',
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

function crearAuth() {
  const permisos = [
    { id_recurso: RECURSO_ACTIVOS, nombre_recurso: 'activos_biologicos', id_accion: ACCION_C_BIO },
    { id_recurso: 10, nombre_recurso: R_RECONOCIMIENTO, id_accion: ACCION_D_FIN },
    { id_recurso: 11, nombre_recurso: R_CIERRE, id_accion: ACCION_R_FIN },
    { id_recurso: 11, nombre_recurso: R_CIERRE, id_accion: ACCION_E_FIN },
    { id_recurso: 12, nombre_recurso: R_CLIENTES, id_accion: ACCION_R_INT },
    { id_recurso: 12, nombre_recurso: R_CLIENTES, id_accion: ACCION_D_INT },
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

function Env({ children, ruta = '/' }: { children: React.ReactNode; ruta?: string }) {
  const auth = crearAuth();
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[ruta]}>
        {children}
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
  const txt = norm(document.body.textContent).slice(0, 800);
  const dlgs = document.querySelectorAll('[role="dialog"][aria-modal="true"]').length;
  const btns = Array.from(document.querySelectorAll('button')).map((b) => `${norm(b.textContent)}:${b.disabled}`).join(',');
  return `${dlgs}|${txt.length}|${btns}`;
}

async function esperarEstable(maxPasos = 20): Promise<void> {
  let anterior = '';
  for (let i = 0; i < maxPasos; i += 1) {
    await drenarMicrotareas();
    const actual = firmaPantalla();
    if (actual === anterior && i > 0) return;
    anterior = actual;
  }
}

function dialogosAbiertos(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')) as HTMLElement[];
}

function tituloDialogo(dlg: HTMLElement): string {
  const id = dlg.getAttribute('aria-labelledby');
  if (!id) return '';
  return norm(document.getElementById(id)?.textContent);
}

function descripcionDialogo(dlg: HTMLElement): string {
  const id = dlg.getAttribute('aria-describedby');
  if (!id) return '';
  return norm(document.getElementById(id)?.textContent);
}

function botonPorNombreExacto(raiz: ParentNode, nombre: string): HTMLButtonElement | null {
  const btns = within(raiz as HTMLElement).queryAllByRole('button') as HTMLButtonElement[];
  for (const b of btns) {
    const aria = norm(b.getAttribute('aria-label'));
    const txt = norm(b.textContent);
    if (aria === nombre || txt === nombre) return b;
  }
  return null;
}

function tieneBotonCerrarX(dlg: HTMLElement): boolean {
  const cerrarNombre = tCom('acciones.cerrar');
  return botonPorNombreExacto(dlg, cerrarNombre) !== null;
}

function botonesDelDialogo(dlg: HTMLElement): string[] {
  const btns = within(dlg).queryAllByRole('button') as HTMLButtonElement[];
  return btns.map((b) => norm(b.getAttribute('aria-label')) || norm(b.textContent));
}

function tieneIconoAdvertencia(dlg: HTMLElement): boolean {
  return dlg.querySelector('svg, .ds-alert--warning') !== null;
}

// ---------------------------------------------------------------------------------------------------------------
// Flujos de apertura de los 4 dialogos de confirmacion (reutilizables en CP-01..CP-13 y OBS)
// ---------------------------------------------------------------------------------------------------------------
function simularRutasBaja(): void {
  simular('GET', /^\/activos-biologicos\/4101\/eventos$/, 200, { id_activo_biologico: 4101, total: 0, eventos: [] });
  simular('POST', POST_BAJA_RE, 201, RESPUESTA_BAJA_201);
}

async function abrirConfirmacionBaja(montar = true): Promise<{ dlg: HTMLElement | null; detalle: string }> {
  if (montar) {
    simularRutasBaja();
    render(
      <Env>
        <EventosSection idActivo={4101} tipo="INDIVIDUAL" estadoActual="ACTIVO" sinFase={false} onChanged={() => {}} />
      </Env>,
    );
    await esperarEstable();
  }
  const btnBaja = botonPorNombreExacto(document.body, 'Baja');
  if (!btnBaja) return { dlg: null, detalle: 'botón "Baja" no encontrado' };
  fireEvent.click(btnBaja);
  await esperarEstable();
  const dlgForm = dialogosAbiertos()[0] ?? null;
  if (!dlgForm) return { dlg: null, detalle: 'no abrió el formulario de baja' };
  const motivo = within(dlgForm).queryByLabelText(new RegExp(`^${tBio('registrarbajamodal.motivo_de_la_baja')}`)) as HTMLTextAreaElement | null;
  if (!motivo) return { dlg: null, detalle: 'campo motivo de baja no encontrado' };
  fireEvent.change(motivo, { target: { value: 'Baja de prueba QA G028' } });
  const btnRegistrar = botonPorNombreExacto(dlgForm, tBio('registrarbajamodal.registrar_baja'));
  if (!btnRegistrar) return { dlg: null, detalle: 'botón "Registrar baja" no encontrado' };
  fireEvent.click(btnRegistrar);
  await esperarEstable();
  const dlgConf = dialogosAbiertos()[0] ?? null;
  if (!dlgConf || !norm(dlgConf.textContent).includes(tBio('registrarbajamodal.confirma_la_baja'))) {
    return { dlg: null, detalle: 'no alcanzó el paso "Confirma la baja"' };
  }
  return { dlg: dlgConf, detalle: 'ok' };
}

function simularRutasReversion(): void {
  simular('GET', /^\/finanzas\/activos\/4102$/, 200, HISTORIAL_4102);
  simular('POST', POST_REVERSION_RE, 200, { estado: 'REVERTIDO' });
}

function dialogoReversionAbierto(): HTMLElement | null {
  // ADAPT-1 (reintento 1): desde ac134ec1 el título lleva el activo («Revertir el reconocimiento inicial de {{activo}}»).
  // Se reconoce por la parte fija de la plantilla (con cualquier activo), así CP-09 sigue midiendo si se nombra el activo.
  const [antes, despues] = tFin('valor.revertir_titulo', { activo: 'QAMARCAACTIVO' }).split('QAMARCAACTIVO');
  return dialogosAbiertos().find((d) => {
    const t = tituloDialogo(d);
    return t.startsWith(antes) && t.endsWith(despues ?? '') && t.length > antes.length + (despues ?? '').length;
  }) ?? null;
}

async function abrirConfirmacionReversion(montar = true): Promise<{ dlg: HTMLElement | null; detalle: string }> {
  if (montar) {
    simularRutasReversion();
    render(
      <Env>
        <DetalleActivoModal idActivo={4102} identificador="BOV-QA-G028-R" onCerrar={() => {}} onCambio={() => {}} />
      </Env>,
    );
    await esperarEstable();
  }
  const btnRev = botonPorNombreExacto(document.body, tFin('valor.revertir'));
  if (!btnRev) return { dlg: null, detalle: `botón "${tFin('valor.revertir')}" no encontrado` };
  fireEvent.click(btnRev);
  await esperarEstable();
  const dlg = dialogoReversionAbierto();
  return { dlg, detalle: dlg ? 'ok' : 'no abrió el diálogo de reversión' };
}

function simularRutasCierre(): void {
  simular('GET', /^\/finanzas\/titulares$/, 200, [{ numero_id_tributaria: '900123456', razon_social: 'Finca QA' }]);
  simular('GET', /^\/finanzas\/periodos$/, 200, [PERIODO_7]);
  simular('GET', /^\/finanzas\/periodos\/7\/prevalidacion$/, 200, {
    bloqueos: [], activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: false,
  });
  simular('GET', /^\/finanzas\/periodos\/7\/comprobantes$/, 200, []);
  simular('GET', /^\/finanzas\/reconocimientos\/propuestas$/, 200, []);
  simular('POST', POST_CIERRE_RE, 200, RESULTADO_CIERRE_200);
}

async function abrirConfirmacionCierre(montar = true): Promise<{ dlg: HTMLElement | null; detalle: string }> {
  if (montar) {
    simularRutasCierre();
    render(
      <Env ruta="/finanzas/cierre">
        <Switch>
          <Route path="/finanzas/cierre" render={() => <ProveedorPeriodo><CierreView /></ProveedorPeriodo>} />
        </Switch>
      </Env>,
    );
    await esperarEstable();
  }
  const btnCerrar = botonPorNombreExacto(document.body, tFin('cierre.ejecutar'));
  if (!btnCerrar) return { dlg: null, detalle: `botón "${tFin('cierre.ejecutar')}" no encontrado` };
  fireEvent.click(btnCerrar);
  await esperarEstable();
  const dlg = dialogosAbiertos()[0] ?? null;
  return { dlg, detalle: dlg ? 'ok' : 'no abrió el diálogo de cierre' };
}

function simularRutasRevocacion(): void {
  simular('GET', /^\/integracion\/clientes$/, 200, [CLIENTE_QA_G028]);
  simular('POST', POST_REVOCAR_RE, 200, { ...CLIENTE_QA_G028, estado: 'REVOCADO' });
}

async function abrirConfirmacionRevocacion(montar = true): Promise<{ dlg: HTMLElement | null; detalle: string }> {
  if (montar) {
    simularRutasRevocacion();
    render(
      <Env ruta="/integracion/clientes">
        <Switch>
          <Route path="/integracion/clientes" render={() => <ClientesView />} />
        </Switch>
      </Env>,
    );
    await esperarEstable();
  }
  const nombreBtn = tInt('clientes.revocar_aria', { cliente: 'QA Cliente G028' });
  const btnRev = botonPorNombreExacto(document.body, nombreBtn);
  if (!btnRev) return { dlg: null, detalle: `botón "${nombreBtn}" no encontrado` };
  fireEvent.click(btnRev);
  await esperarEstable();
  const dlg = dialogosAbiertos()[0] ?? null;
  return { dlg, detalle: dlg ? 'ok' : 'no abrió el diálogo de revocación' };
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
// Recolectores de observaciones (OBS-1 a OBS-6)
// ---------------------------------------------------------------------------------------------------------------
let refsReqConf = 0;
let refsNivelCrit = 0;
const infoObs2: Record<string, { titulo: string; icono: boolean }> = {};
const infoObs3: Record<string, string[]> = {};
let obs4TextoBaja = '';
let obs4ContieneId = false;
let obs6Resultado = 'no medido';

function registrarObsDialogo(clave: string, dlg: HTMLElement): void {
  infoObs2[clave] = { titulo: tituloDialogo(dlg), icono: tieneIconoAdvertencia(dlg) };
  infoObs3[clave] = botonesDelDialogo(dlg);
}

// ---------------------------------------------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------------------------------------------
beforeAll(async () => {
  await i18n.changeLanguage('es-CO');
  const leer = (rel: string) => readFileSync(join(RAIZ_FRONT, rel), 'utf8');
  const modalSrc = leer('src/shared/design-system/ModalShell.tsx');
  const p1 = modalSrc.includes('useModalA11y(onClose, { escape: !bloqueante })') && modalSrc.includes('{!bloqueante && (');
  const p2 = leer('src/biological_assets/components/RegistrarBajaModal.tsx').includes('bloqueante={pendiente !== null}');
  const p3 = leer('src/financial_valuation/components/DetalleActivoModal.tsx').includes('min={20} max={2000} peligro bloqueante');
  const p4 = leer('src/financial_valuation/pages/CierreView.tsx').includes("<ModalShell bloqueante title={t('cierre.confirmar_titulo'");
  const p5 = leer('src/accounting_integration/pages/ClientesView.tsx').includes("bloqueante={estado.accion === 'revocar'}");

  vi.useFakeTimers({ now: new Date(T_BASE) });
  const tA = Date.now();
  await vi.advanceTimersByTimeAsync(100);
  const tB = Date.now();
  vi.useRealTimers();
  const p6 = tB - tA === 100;

  precondiciones.push({ nombre: 'P1 ModalShell.tsx contiene useModalA11y(onClose, { escape: !bloqueante }) y {!bloqueante && (', ok: p1, detalle: p1 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: 'P2 RegistrarBajaModal.tsx contiene bloqueante={pendiente !== null}', ok: p2, detalle: p2 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: 'P3 DetalleActivoModal.tsx contiene min={20} max={2000} peligro bloqueante', ok: p3, detalle: p3 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: "P4 CierreView.tsx contiene <ModalShell bloqueante title={t('cierre.confirmar_titulo'", ok: p4, detalle: p4 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: "P5 ClientesView.tsx contiene bloqueante={estado.accion === 'revocar'}", ok: p5, detalle: p5 ? 'encontrado' : 'ausente' });
  precondiciones.push({ nombre: 'P6 Reloj simulado avanza Date.now() con vi.advanceTimersByTimeAsync', ok: p6, detalle: `delta=${tB - tA} ms` });

  refsReqConf = contarEnSrc(/requiere_confirmacion/g);
  refsNivelCrit = contarEnSrc(/nivel_criticidad_accion/g);
});

// P7 (reintento 1): ModalShell no abre un diálogo crítico si quedó registrada una operación en curso (operacionEnCurso.ts).
const operacionesHeredadas: string[] = [];
beforeEach(() => {
  const heredada = operacionEnCurso();
  if (heredada) operacionesHeredadas.push(`${expect.getState().currentTestName ?? '?'}: ${heredada}`);
  rutas = [];
  peticiones = [];
  http.defaults.adapter = adaptador;
  limpiarToasts();
  fijarCatalogoErrores({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  limpiarToasts();
  fijarCatalogoErrores({});
  http.defaults.adapter = adaptadorOriginal;
});

afterAll(() => {
  precondiciones.push({
    nombre: 'P7 Sin operación en curso heredada al empezar cada prueba (operacionEnCurso() = null)',
    ok: operacionesHeredadas.length === 0,
    detalle: operacionesHeredadas.length ? operacionesHeredadas.join(' | ') : 'ninguna',
  });
  if (precondiciones.some((p) => !p.ok)) {
    const nombres = precondiciones.filter((p) => !p.ok).map((p) => p.nombre).join('; ');
    for (const c of CPS) {
      c.obtenido = `Precondición no cumplida (${nombres}); medido: ${c.obtenido}`;
      c.estado = 'FALLA';
    }
  }
  const fmtObs2 = ['baja', 'reversion', 'cierre', 'revocacion'].map((k) => {
    const v = infoObs2[k];
    return v ? `${k}: titulo="${v.titulo}", icono_advertencia=${v.icono ? 'sí' : 'no'}` : `${k}: sin diálogo`;
  }).join('; ');
  const fmtObs3 = ['baja', 'reversion', 'cierre', 'revocacion'].map((k) => {
    const v = infoObs3[k];
    return v ? `${k}: [${v.map((x) => `"${x}"`).join(', ')}]` : `${k}: sin diálogo`;
  }).join('; ');

  observaciones.push(`OBS-1: referencias en src\\ a requiere_confirmacion=${refsReqConf}, nivel_criticidad_accion=${refsNivelCrit}.`);
  observaciones.push(`OBS-2: título e ícono de advertencia (svg o .ds-alert--warning) — ${fmtObs2}. El Tipo 5 de la Descripción (versión anterior) pide «¿Confirmas esta acción?» con ícono.`);
  observaciones.push(`OBS-3: textos de botones en paso de confirmación — ${fmtObs3}. La 8.5 dice «Confirmar» y «Cancelar». Decisión del evaluador: observación.`);
  observaciones.push(`OBS-4: la baja contiene "BOV-QA-G028"=${obs4ContieneId ? 'sí' : 'no'} (texto="${obs4TextoBaja}"). Decisión del evaluador: observación.`);
  observaciones.push('OBS-5: en la baja, cancelar desde «Confirma la baja» exige pulsar «Volver» y luego «Cancelar».');
  observaciones.push(`OBS-6: Escape en «Confirma la baja»: ${obs6Resultado}. Es el defecto 2 de INC-M08-384-G025, corregido por Desarrollo en b370f754 (#723: useModalA11y lee la opción escape de un ref); se reverifica aquí y no cuenta en este caso.`);
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
// TC-M08-068 - Flujo de confirmacion y accion no critica (CP-01 a CP-05)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-068 Confirmacion de acciones criticas y accion no critica (RF-107 8.1)', () => {
  it('CP-01 Baja: confirmacion previa, cancelar sin POST y confirmar ejecuta exactamente 1 POST', async () => {
    const paso1 = await abrirConfirmacionBaja(true);
    const dlgsConf = dialogosAbiertos().length;
    const postConf = contarPost(POST_BAJA_RE);
    if (paso1.dlg) {
      registrarObsDialogo('baja', paso1.dlg);
      obs4TextoBaja = norm(paso1.dlg.textContent);
      obs4ContieneId = obs4TextoBaja.includes('BOV-QA-G028');
    }

    let dlgsTrasCancelar = -1;
    let postTrasCancelar = -1;
    let postTrasConfirmar = -1;
    if (paso1.dlg) {
      const btnVolver = botonPorNombreExacto(paso1.dlg, tBio('registrarbajamodal.volver'));
      if (btnVolver) { fireEvent.click(btnVolver); await esperarEstable(); }
      const dlgForm = dialogosAbiertos()[0] ?? null;
      const btnCancelar = dlgForm ? botonPorNombreExacto(dlgForm, tBio('registrarbajamodal.cancelar')) : null;
      if (btnCancelar) { fireEvent.click(btnCancelar); await esperarEstable(); }
      dlgsTrasCancelar = dialogosAbiertos().length;
      postTrasCancelar = contarPost(POST_BAJA_RE);

      const paso2 = await abrirConfirmacionBaja(false);
      const btnConfirmar = paso2.dlg ? botonPorNombreExacto(paso2.dlg, tBio('registrarbajamodal.confirmar_baja')) : null;
      if (btnConfirmar) { fireEvent.click(btnConfirmar); await esperarEstable(); }
      postTrasConfirmar = contarPost(POST_BAJA_RE);
    }

    const ok = dlgsConf === 1 && postConf === 0 && dlgsTrasCancelar === 0 && postTrasCancelar === 0 && postTrasConfirmar === 1;
    anotar(
      'CP-01',
      ok,
      `en_confirmacion={dialogos=${dlgsConf}, post=${postConf}}; tras_volver_y_cancelar={dialogos=${dlgsTrasCancelar}, post=${postTrasCancelar}}; tras_confirmar={post=${postTrasConfirmar}}`,
    );
    expect(ok).toBe(true);
  });

  it('CP-02 Reversion: dialogo previo, cancelar sin POST y confirmar ejecuta exactamente 1 POST', async () => {
    const paso1 = await abrirConfirmacionReversion(true);
    const dlgsConf = paso1.dlg ? 1 : 0;
    const postConf = contarPost(POST_REVERSION_RE);
    if (paso1.dlg) registrarObsDialogo('reversion', paso1.dlg);

    let dlgsTrasCancelar = -1;
    let postTrasCancelar = -1;
    let postTrasConfirmar = -1;
    if (paso1.dlg) {
      const btnCancelar = botonPorNombreExacto(paso1.dlg, tSup('comun.cancelar'));
      if (btnCancelar) { fireEvent.click(btnCancelar); await esperarEstable(); }
      dlgsTrasCancelar = dialogoReversionAbierto() ? 1 : 0;
      postTrasCancelar = contarPost(POST_REVERSION_RE);

      const paso2 = await abrirConfirmacionReversion(false);
      if (paso2.dlg) {
        const area = within(paso2.dlg).queryByLabelText(new RegExp(`^${tFin('valor.motivo')}`)) as HTMLTextAreaElement | null;
        if (area) fireEvent.change(area, { target: { value: 'Reversion de prueba QA G028' } });
        const btnConfirmar = botonPorNombreExacto(paso2.dlg, tFin('valor.revertir'));
        if (btnConfirmar) { fireEvent.click(btnConfirmar); await esperarEstable(); }
      }
      postTrasConfirmar = contarPost(POST_REVERSION_RE);
    }

    const ok = dlgsConf === 1 && postConf === 0 && dlgsTrasCancelar === 0 && postTrasCancelar === 0 && postTrasConfirmar === 1;
    anotar(
      'CP-02',
      ok,
      `en_confirmacion={dialogos=${dlgsConf}, post=${postConf}}; tras_cancelar={dialogos=${dlgsTrasCancelar}, post=${postTrasCancelar}}; tras_confirmar={post=${postTrasConfirmar}}`,
    );
    expect(ok).toBe(true);
  });

  it('CP-03 Cierre: dialogo previo, cancelar sin POST y confirmar ejecuta exactamente 1 POST', async () => {
    const paso1 = await abrirConfirmacionCierre(true);
    const dlgsConf = dialogosAbiertos().length;
    const postConf = contarPost(POST_CIERRE_RE);
    if (paso1.dlg) registrarObsDialogo('cierre', paso1.dlg);

    let dlgsTrasCancelar = -1;
    let postTrasCancelar = -1;
    let postTrasConfirmar = -1;
    if (paso1.dlg) {
      const btnCancelar = botonPorNombreExacto(paso1.dlg, tFin('comun.cancelar'));
      if (btnCancelar) { fireEvent.click(btnCancelar); await esperarEstable(); }
      dlgsTrasCancelar = dialogosAbiertos().length;
      postTrasCancelar = contarPost(POST_CIERRE_RE);

      const paso2 = await abrirConfirmacionCierre(false);
      const btnConfirmar = paso2.dlg ? botonPorNombreExacto(paso2.dlg, tFin('cierre.ejecutar')) : null;
      if (btnConfirmar) { fireEvent.click(btnConfirmar); await esperarEstable(); }
      postTrasConfirmar = contarPost(POST_CIERRE_RE);
    }

    const ok = dlgsConf === 1 && postConf === 0 && dlgsTrasCancelar === 0 && postTrasCancelar === 0 && postTrasConfirmar === 1;
    anotar(
      'CP-03',
      ok,
      `en_confirmacion={dialogos=${dlgsConf}, post=${postConf}}; tras_cancelar={dialogos=${dlgsTrasCancelar}, post=${postTrasCancelar}}; tras_confirmar={post=${postTrasConfirmar}}`,
    );
    expect(ok).toBe(true);
  });

  it('CP-04 Revocacion: dialogo previo, cancelar sin POST y confirmar ejecuta exactamente 1 POST', async () => {
    const paso1 = await abrirConfirmacionRevocacion(true);
    const dlgsConf = dialogosAbiertos().length;
    const postConf = contarPost(POST_REVOCAR_RE);
    if (paso1.dlg) registrarObsDialogo('revocacion', paso1.dlg);

    let dlgsTrasCancelar = -1;
    let postTrasCancelar = -1;
    let postTrasConfirmar = -1;
    if (paso1.dlg) {
      const btnCancelar = botonPorNombreExacto(paso1.dlg, tSup('comun.cancelar'));
      if (btnCancelar) { fireEvent.click(btnCancelar); await esperarEstable(); }
      dlgsTrasCancelar = dialogosAbiertos().length;
      postTrasCancelar = contarPost(POST_REVOCAR_RE);

      const paso2 = await abrirConfirmacionRevocacion(false);
      if (paso2.dlg) {
        const area = within(paso2.dlg).queryByLabelText(new RegExp(`^${tInt('clientes.motivo')}`)) as HTMLTextAreaElement | null;
        if (area) fireEvent.change(area, { target: { value: 'Revocacion QA' } });
        const btnConfirmar = botonPorNombreExacto(paso2.dlg, tInt('clientes.revocar'));
        if (btnConfirmar) { fireEvent.click(btnConfirmar); await esperarEstable(); }
      }
      postTrasConfirmar = contarPost(POST_REVOCAR_RE);
    }

    const ok = dlgsConf === 1 && postConf === 0 && dlgsTrasCancelar === 0 && postTrasCancelar === 0 && postTrasConfirmar === 1;
    anotar(
      'CP-04',
      ok,
      paso1.dlg
        ? `en_confirmacion={dialogos=${dlgsConf}, post=${postConf}}; tras_cancelar={dialogos=${dlgsTrasCancelar}, post=${postTrasCancelar}}; tras_confirmar={post=${postTrasConfirmar}}`
        : `sin diálogo al pulsar revocar (dialogos=${dlgsConf}, post=${postConf})`,
    );
    expect(ok).toBe(true);
  });

  it('CP-05 Accion no critica (Exportar en PDF): 0 dialogos y exactamente 1 POST /reportes', async () => {
    simular('GET', /^\/reportes\/catalogo$/, 200, CATALOGO_REP);
    simular('GET', /^\/reportes$/, 200, []);
    simular('POST', /^\/reportes\/vista-previa$/, 200, VISTA_PREVIA_REP);
    simular('POST', POST_REPORTES_RE, 201, REPORTE_EXITO_201);
    render(<Env ruta="/reportes"><ReportesPage /></Env>);
    await esperarEstable();
    const select = screen.queryByLabelText(/^Reporte/) as HTMLSelectElement | null;
    if (select) { fireEvent.change(select, { target: { value: 'REPORTE_INVENTARIO_BIOLOGICO' } }); await esperarEstable(); }
    const btnPrevia = botonPorNombreExacto(document.body, 'Ver vista previa');
    if (btnPrevia) { fireEvent.click(btnPrevia); await esperarEstable(); }
    const btnExportar = botonPorNombreExacto(document.body, 'Exportar en PDF');
    const dlgsAntes = dialogosAbiertos().length;
    if (btnExportar) fireEvent.click(btnExportar);
    const dlgsInmediato = dialogosAbiertos().length;
    await esperarEstable();
    const dlgsDespues = dialogosAbiertos().length;
    const postRep = contarPost(POST_REPORTES_RE);

    const ok = btnExportar !== null && dlgsAntes === 0 && dlgsInmediato === 0 && dlgsDespues === 0 && postRep === 1;
    anotar(
      'CP-05',
      ok,
      `boton_exportar=${btnExportar ? 'presente' : 'ausente'}; dialogos=[antes=${dlgsAntes}, inmediato=${dlgsInmediato}, despues=${dlgsDespues}]; post_reportes=${postRep}`,
    );
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-069 (a) - Contenido de los dialogos de confirmacion (CP-06, CP-08 y CP-09)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-069 Contenido de dialogos de confirmacion (RF-107 8.5)', () => {
  it('CP-06 y CP-08 Dialogo del cierre: periodo y advertencia de irreversibilidad', async () => {
    const { dlg } = await abrirConfirmacionCierre(true);
    const texto = dlg ? norm(dlg.textContent) : '(sin diálogo)';
    const esperadoPeriodo = nombrePeriodo(PERIODO_7);

    const ok06 = dlg !== null && texto.includes(esperadoPeriodo);
    anotar('CP-06', ok06, `esperado="${esperadoPeriodo}"; texto="${texto}"`);

    const mReabr = dlg ? texto.match(/(reabr|irreversible)/i) : null;
    const mModif = dlg ? texto.match(/(modific|inmutable)/i) : null;
    const ok08 = mReabr !== null && mModif !== null;
    anotar(
      'CP-08',
      ok08,
      `patrones={reabr_o_irreversible=${mReabr ? `"${mReabr[0]}"` : 'no'}, modific_o_inmutable=${mModif ? `"${mModif[0]}"` : 'no'}}; texto="${texto}"`,
    );

    expect(ok06 && ok08).toBe(true);
  });

  it('CP-09 Reversion y revocacion: nombran lo afectado y advierten irreversibilidad', async () => {
    const irrevRe = /(irreversible|no se puede deshacer|definitiv)/i;
    let evaluados = 0;

    // 1) Reversion
    const r1 = await abrirConfirmacionReversion(true);
    let revTexto = '(sin diálogo)';
    let revNombra = false;
    let revIrrev = false;
    if (r1.dlg) {
      evaluados += 1;
      const t = tituloDialogo(r1.dlg);
      const d = descripcionDialogo(r1.dlg);
      revTexto = `${t} | ${d}`;
      revNombra = revTexto.includes('BOV-QA-G028-R');
      revIrrev = irrevRe.test(revTexto);
    }
    cleanup();
    rutas = [];
    peticiones = [];

    // 2) Revocacion
    const r2 = await abrirConfirmacionRevocacion(true);
    let revocTexto = '(sin diálogo)';
    let revocNombra = false;
    let revocIrrev = false;
    if (r2.dlg) {
      evaluados += 1;
      const t = tituloDialogo(r2.dlg);
      const d = descripcionDialogo(r2.dlg);
      revocTexto = `${t} | ${d}`;
      revocNombra = revocTexto.includes('QA Cliente G028');
      revocIrrev = irrevRe.test(revocTexto);
    }

    const ok = evaluados === 2 && revNombra && revIrrev && revocNombra && revocIrrev;
    anotar(
      'CP-09',
      ok,
      `evaluados=${evaluados}/2; reversion={texto="${revTexto}", nombra=${revNombra ? 'sí' : 'no'}, irreversible=${revIrrev ? 'sí' : 'no'}}; revocacion={texto="${revocTexto}", nombra=${revocNombra ? 'sí' : 'no'}, irreversible=${revocIrrev ? 'sí' : 'no'}}`,
    );
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-069 (b) - Restricciones de cierre del dialogo bloqueante (CP-10 a CP-13 + OBS-6)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-069 Restricciones de cierre bloqueante (RF-107 8.5 y CA-05)', () => {
  it('CP-10 Escape en reversion, cierre y revocacion: los 3 siguen abiertos y 0 POST', async () => {
    const detalles: string[] = [];
    let todoOk = true;

    // Reversion
    {
      const { dlg } = await abrirConfirmacionReversion(true);
      if (!dlg) { todoOk = false; detalles.push('reversion: sin diálogo'); }
      else {
        fireEvent.keyDown(document, { key: 'Escape' });
        await esperarEstable();
        const abierto = dialogoReversionAbierto() !== null;
        const post = contarPost(POST_REVERSION_RE);
        if (!abierto || post !== 0) todoOk = false;
        detalles.push(`reversion: ${abierto ? 'sigue abierto' : 'se cerró'}, post=${post}`);
      }
      cleanup(); rutas = []; peticiones = [];
    }

    // Cierre
    {
      const { dlg } = await abrirConfirmacionCierre(true);
      if (!dlg) { todoOk = false; detalles.push('cierre: sin diálogo'); }
      else {
        fireEvent.keyDown(document, { key: 'Escape' });
        await esperarEstable();
        const abierto = dialogosAbiertos().length === 1;
        const post = contarPost(POST_CIERRE_RE);
        if (!abierto || post !== 0) todoOk = false;
        detalles.push(`cierre: ${abierto ? 'sigue abierto' : 'se cerró'}, post=${post}`);
      }
      cleanup(); rutas = []; peticiones = [];
    }

    // Revocacion
    {
      const { dlg } = await abrirConfirmacionRevocacion(true);
      if (!dlg) { todoOk = false; detalles.push(`revocacion: sin diálogo, post=${contarPost(POST_REVOCAR_RE)}`); }
      else {
        fireEvent.keyDown(document, { key: 'Escape' });
        await esperarEstable();
        const abierto = dialogosAbiertos().length === 1;
        const post = contarPost(POST_REVOCAR_RE);
        if (!abierto || post !== 0) todoOk = false;
        detalles.push(`revocacion: ${abierto ? 'sigue abierto' : 'se cerró'}, post=${post}`);
      }
      cleanup(); rutas = []; peticiones = [];
    }

    // OBS-6: Escape en "Confirma la baja" (no cuenta en CP-10)
    {
      const { dlg } = await abrirConfirmacionBaja(true);
      if (!dlg) {
        obs6Resultado = 'sin diálogo';
      } else {
        fireEvent.keyDown(document, { key: 'Escape' });
        await esperarEstable();
        const abierto = dialogosAbiertos().length === 1;
        const post = contarPost(POST_BAJA_RE);
        obs6Resultado = `${abierto ? 'sigue abierto' : 'se cerró'}, ${post} POST`;
      }
    }

    anotar('CP-10', todoOk, detalles.join('; '));
    expect(todoOk).toBe(true);
  });

  it('CP-11 Clic en el fondo del dialogo en los 4 dialogos: los 4 siguen abiertos y 0 POST', async () => {
    const detalles: string[] = [];
    let todoOk = true;

    const casos: Array<{
      nombre: string;
      abrir: () => Promise<{ dlg: HTMLElement | null }>;
      sigueAbierto: () => boolean;
      postRe: RegExp;
    }> = [
      { nombre: 'baja', abrir: () => abrirConfirmacionBaja(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_BAJA_RE },
      { nombre: 'reversion', abrir: () => abrirConfirmacionReversion(true), sigueAbierto: () => dialogoReversionAbierto() !== null, postRe: POST_REVERSION_RE },
      { nombre: 'cierre', abrir: () => abrirConfirmacionCierre(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_CIERRE_RE },
      { nombre: 'revocacion', abrir: () => abrirConfirmacionRevocacion(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_REVOCAR_RE },
    ];

    for (const c of casos) {
      cleanup(); rutas = []; peticiones = [];
      const { dlg } = await c.abrir();
      if (!dlg) {
        todoOk = false;
        detalles.push(`${c.nombre}: sin diálogo, post=${contarPost(c.postRe)}`);
      } else {
        fireEvent.click(dlg);
        await esperarEstable();
        const abierto = c.sigueAbierto();
        const post = contarPost(c.postRe);
        if (!abierto || post !== 0) todoOk = false;
        detalles.push(`${c.nombre}: ${abierto ? 'sigue abierto' : 'se cerró'}, post=${post}`);
      }
    }

    anotar('CP-11', todoOk, detalles.join('; '));
    expect(todoOk).toBe(true);
  });

  it('CP-12 Ninguno de los 4 dialogos tiene el boton X (acciones.cerrar)', async () => {
    const detalles: string[] = [];
    let todoOk = true;

    const casos: Array<{ nombre: string; abrir: () => Promise<{ dlg: HTMLElement | null }> }> = [
      { nombre: 'baja', abrir: () => abrirConfirmacionBaja(true) },
      { nombre: 'reversion', abrir: () => abrirConfirmacionReversion(true) },
      { nombre: 'cierre', abrir: () => abrirConfirmacionCierre(true) },
      { nombre: 'revocacion', abrir: () => abrirConfirmacionRevocacion(true) },
    ];

    for (const c of casos) {
      cleanup(); rutas = []; peticiones = [];
      const { dlg } = await c.abrir();
      if (!dlg) {
        todoOk = false;
        detalles.push(`${c.nombre}: sin diálogo`);
      } else {
        const tieneX = tieneBotonCerrarX(dlg);
        if (tieneX) todoOk = false;
        detalles.push(`${c.nombre}: boton_X=${tieneX ? 'presente' : 'ausente'}`);
      }
    }

    anotar('CP-12', todoOk, detalles.join('; '));
    expect(todoOk).toBe(true);
  });

  it('CP-13 Con cada uno de los 4 dialogos abiertos, avanzar 600.000 ms: siguen abiertos y 0 POST', async () => {
    const detalles: string[] = [];
    let todoOk = true;

    const casos: Array<{
      nombre: string;
      abrir: () => Promise<{ dlg: HTMLElement | null }>;
      sigueAbierto: () => boolean;
      postRe: RegExp;
    }> = [
      { nombre: 'baja', abrir: () => abrirConfirmacionBaja(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_BAJA_RE },
      { nombre: 'reversion', abrir: () => abrirConfirmacionReversion(true), sigueAbierto: () => dialogoReversionAbierto() !== null, postRe: POST_REVERSION_RE },
      { nombre: 'cierre', abrir: () => abrirConfirmacionCierre(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_CIERRE_RE },
      { nombre: 'revocacion', abrir: () => abrirConfirmacionRevocacion(true), sigueAbierto: () => dialogosAbiertos().length === 1, postRe: POST_REVOCAR_RE },
    ];

    for (const c of casos) {
      cleanup();
      vi.useRealTimers();
      rutas = [];
      peticiones = [];
      vi.useFakeTimers({ now: new Date(T_BASE) });
      const { dlg } = await c.abrir();
      if (!dlg) {
        todoOk = false;
        detalles.push(`${c.nombre}: sin diálogo, post=${contarPost(c.postRe)}`);
      } else {
        await avanzar(600_000);
        const abierto = c.sigueAbierto();
        const post = contarPost(c.postRe);
        if (!abierto || post !== 0) todoOk = false;
        detalles.push(`${c.nombre}: tras_600000ms=${abierto ? 'sigue abierto' : 'se cerró'}, post=${post}`);
      }
    }

    anotar('CP-13', todoOk, detalles.join('; '));
    expect(todoOk).toBe(true);
  });
});
