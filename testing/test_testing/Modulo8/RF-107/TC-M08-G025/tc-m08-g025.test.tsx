// TC-M08-G025 - RF-107 Mensajes de exito (TC-M08-061) y de error (TC-M08-062).
// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-19 | Juan Sebastian Gutierrez | v1 ronda 1 |
// | 2026-11-22 | Juan Sebastian Gutierrez | v1.1 reintento 1 (INC-M08-384-G025, GitHub 705): CP-03 sin role=alert en el esperado ni en la medicion (decision de Sebastian, opcion A: RF-107 Tipo 1 no define el rol; el rol medido pasa a OBS-rol); OBS-CA01 y OBS-alcance reescritas; OBS-cierre-detalle y OBS-sin-costo nuevas. Los demas checkpoints, esperados y fuentes quedan literales |
// QA SGPMP - Evaluacion (ronda 1; reintento 1 con v1.1). Prueba de componente con Vitest + jsdom.
//
// Que se ejecuta de verdad (codigo de src/, sin modificarlo):
//   - Exito de REGISTRO_ACTIVO: useActivos().registrar -> activosApi -> http -> pushToast (plantilla 8.5) -> ToastHost/Alert.
//   - Exito de CIERRE_PERIODO: CierreView completo (ProveedorPeriodo, prevalidacion, modal de confirmacion,
//     POST del cierre) -> pushToast -> ToastHost/Alert.
//   - Errores: cargarCatalogoErrores (catalogo de M09) -> reportesApi.generar -> http (interceptor que llama
//     mapToApiError) -> la linea literal de HistorialPredictivoView.tsx:190 -> ToastHost/Alert.
// La red se simula con el adaptador del mismo cliente `http` que usa la app. No se llama a TEST.
//
// Reporte: JSON propio en STAGING_DIR (resultado_TC-M08-G025[_reintentoN].json). Cada checkpoint arranca en
// FALLA "No alcanzado"; `obtenido` es siempre lo que se leyo del DOM.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../../../src/shared/i18n';
import { http } from '../../../../../src/shared/api/http';
import type { ApiError } from '../../../../../src/shared/api/errors';
import { cargarCatalogoErrores, fijarCatalogoErrores } from '../../../../../src/shared/api/catalogoErrores';
import { limpiarToasts, pushToast } from '../../../../../src/shared/hooks/useToast';
import { ToastHost } from '../../../../../src/shared/design-system/ToastHost';
import { AuthContext } from '../../../../../src/shared/auth/AuthContext';
import { useActivos } from '../../../../../src/biological_assets/hooks/useActivos';
import { reportesApi } from '../../../../../src/reportes/api/reportesApi';
import { CierreView } from '../../../../../src/financial_valuation/pages/CierreView';
import { ProveedorPeriodo, nombrePeriodo } from '../../../../../src/financial_valuation/components/comunes';
import type { Periodo } from '../../../../../src/financial_valuation/types';

const TC = 'TC-M08-G025';
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = resolve(AQUI, '../../../../..');

// ---------------------------------------------------------------------------------------------------------------
// Registro de checkpoints
// ---------------------------------------------------------------------------------------------------------------
type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; caso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }

const CPS: Checkpoint[] = [
  { paso: 'CP-01', caso: 'TC-M08-061 a',
    esperado: 'Banner de exito con el texto "El activo BOV-2024-001 fue registrado correctamente. Valor inicial reconocido: $1.639.000 COP."',
    fuente: 'RF-107 seccion 8.5 (EXITOSO, plantilla fija REGISTRO_ACTIVO); Tipo 1 (ejemplo); CA-09' },
  { paso: 'CP-02', caso: 'TC-M08-061 b',
    esperado: 'Banner de exito con el texto "El periodo [periodo] fue cerrado correctamente. 120 activos fueron revaluados." (N = activos_procesados de la respuesta del cierre)',
    fuente: 'RF-107 seccion 8.5 (EXITOSO, plantilla fija CIERRE_PERIODO); CA-09' },
  { paso: 'CP-03', caso: 'TC-M08-061',
    esperado: 'El aviso de exito es un banner verde (variante success) con icono de check (sin role=alert: decision de Sebastian del 2026-11-22, opcion A; RF-107 Tipo 1 no define el rol; ver OBS-rol)',
    fuente: 'RF-107 Tipo 1 (Apariencia)' },
  { paso: 'CP-04', caso: 'TC-M08-061 (valor limite)',
    esperado: 'Visible a los 4,999 s y oculto a los 5,000 s',
    fuente: 'RF-107 Tipo 1 (Duracion 5 s); seccion 8.2 nivel 4' },
  { paso: 'CP-05', caso: 'TC-M08-061 c',
    esperado: 'A los 2 s el usuario lo cierra con el boton de cierre y el banner desaparece',
    fuente: 'RF-107 Tipo 1 ("El usuario puede cerrarlo antes")' },
  { paso: 'CP-06', caso: 'TC-M08-061 d',
    esperado: 'Un segundo exito a los 3 s deja un solo banner, con el mensaje nuevo; el temporizador se reinicia: visible a los 7,999 s y oculto a los 8,000 s',
    fuente: 'RF-107 seccion 8.3 (regla de unicidad para mensajes de exito); seccion 8.2 nivel 4' },
  { paso: 'CP-07', caso: 'TC-M08-062 a',
    esperado: 'PERIODO_NO_CERRADO: banner rojo (variante error) con icono de error, el texto del catalogo "Este reporte solo se genera sobre periodos contables cerrados." (no el del servidor) y el boton "Ir al cierre de periodo" que navega a /finanzas',
    fuente: 'RF-107 seccion 8.5 (FALLIDO: texto y boton del catalogo de M09); Tipo 2; catalogo sembrado (migracion a7c3e91f5b20); v7 (el catalogo tiene prioridad sobre el texto del servidor)' },
  { paso: 'CP-08', caso: 'TC-M08-062 b',
    esperado: 'OPERACION_DUPLICADA: el texto del catalogo "Esta operacion ya esta en curso o fue ejecutada recientemente." y ningun boton de accion',
    fuente: 'RF-107 seccion 8.5 (boton solo si hay accion definida); catalogo sembrado (migracion a7c3e91f5b20)' },
  { paso: 'CP-09', caso: 'TC-M08-062 c',
    esperado: 'Clave fuera del catalogo (PERIODOS_FUERA_DE_ORDEN): el texto en lenguaje natural del servidor "El periodo de comparacion debe ser anterior al periodo base.", sin la clave cruda ni codigo HTTP, y sin boton',
    fuente: 'Decision de QA: criterio de Desarrollo (v7 y catalogoErrores.ts: fuera del catalogo se usa el texto del servidor); RF-107 Restriccion 1 y CA-02' },
  { paso: 'CP-10', caso: 'TC-M08-062 e',
    esperado: 'Con 422, 404, 409 y 500 (cuerpo real del backend) cada banner tiene texto en lenguaje natural y ninguno muestra solo el codigo HTTP, un termino tecnico, la clave cruda ni "[object Object]"',
    fuente: 'RF-107 Restriccion 1; CA-02; Tipo 2 ("sin codigos HTTP ni terminos tecnicos")' },
  { paso: 'CP-11', caso: 'TC-M08-062 f',
    esperado: 'El banner de error sigue visible a los 10 s (y a los 60 s) y se cierra al pulsar el boton de cierre',
    fuente: 'RF-107 Tipo 2 (persiste hasta que el usuario lo cierre)' },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const observaciones: string[] = [];
const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso);
  if (!cp) throw new Error(`Checkpoint desconocido ${paso}`);
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}

// ---------------------------------------------------------------------------------------------------------------
// Red simulada en el cliente `http` de la app
// ---------------------------------------------------------------------------------------------------------------
interface RutaSimulada { metodo: string; patron: RegExp; status: number; data: unknown }
let rutas: RutaSimulada[] = [];
const sinRuta: string[] = [];
const adaptadorOriginal = http.defaults.adapter;

function simular(metodo: string, patron: RegExp, status: number, data: unknown): void {
  rutas = [{ metodo, patron, status, data }, ...rutas];
}

function adaptador(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const metodo = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  const ruta = rutas.find((r) => r.metodo === metodo && r.patron.test(url));
  if (!ruta) {
    sinRuta.push(`${metodo} ${url}`);
    return Promise.reject(new AxiosError(`QA: peticion sin respuesta simulada ${metodo} ${url}`, 'ERR_QA', config));
  }
  const respuesta: AxiosResponse = {
    data: ruta.data, status: ruta.status, statusText: '', headers: {}, config, request: {},
  };
  if (ruta.status >= 200 && ruta.status < 300) return Promise.resolve(respuesta);
  return Promise.reject(new AxiosError(`Request failed with status code ${ruta.status}`,
    ruta.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, respuesta));
}

/** Cuerpo de error estandar del backend (src/shared/error_handlers.py, _respuesta_error / app_error_handler). */
function cuerpoError(code: string, message: string, field?: string) {
  return { error_code: code, message, fields: field ? [{ field, message }] : [], timestamp: '2026-11-19T22:00:00Z' };
}

// Catalogo sembrado en TEST por la migracion a7c3e91f5b20 (_MENSAJES, filas es-CO). El frontend lo pide en
// GET /configuracion/mensajes-error?idioma=es-CO y solo usa las filas activas.
const CATALOGO_ES_CO = [
  { clave: 'ERROR_NO_CATALOGADO', idioma: 'es-CO', mensaje: 'Ocurrió un problema técnico. Intenta nuevamente o contacta al administrador.', texto_accion: null, ruta_accion: null, es_activo: true },
  { clave: 'SIN_CONEXION', idioma: 'es-CO', mensaje: 'Sin conexión. La operación se reintentará automáticamente cuando vuelva la conexión.', texto_accion: null, ruta_accion: null, es_activo: true },
  { clave: 'OPERACION_INTERRUMPIDA', idioma: 'es-CO', mensaje: 'La operación no pudo completarse. Intenta nuevamente.', texto_accion: null, ruta_accion: null, es_activo: true },
  { clave: 'OPERACION_DUPLICADA', idioma: 'es-CO', mensaje: 'Esta operación ya está en curso o fue ejecutada recientemente.', texto_accion: null, ruta_accion: null, es_activo: true },
  { clave: 'PERIODO_NO_CERRADO', idioma: 'es-CO', mensaje: 'Este reporte solo se genera sobre períodos contables cerrados.', texto_accion: 'Ir al cierre de período', ruta_accion: 'finanzas', es_activo: true },
];

// ---------------------------------------------------------------------------------------------------------------
// Utilidades de DOM
// ---------------------------------------------------------------------------------------------------------------
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

function zonaAvisos(): HTMLElement {
  const zona = document.querySelector('.ds-toasts');
  if (!zona) throw new Error('No se encontro la zona de avisos (.ds-toasts) de ToastHost');
  return zona as HTMLElement;
}
function avisos(variante: 'success' | 'error'): HTMLElement[] {
  return Array.from(zonaAvisos().querySelectorAll(`.ds-alert--${variante}`)) as HTMLElement[];
}
/** Texto visible del banner (titulo y detalle), sin el texto del boton de accion, que se reporta aparte. */
function textoAviso(a: HTMLElement): string {
  const cuerpo = a.querySelector('.ds-alert__body')?.cloneNode(true) as HTMLElement | undefined;
  cuerpo?.querySelectorAll('.ds-alert__accion').forEach((b) => b.remove());
  return norm(cuerpo?.textContent);
}
function claseIcono(a: HTMLElement): string {
  return a.querySelector('.ds-alert__icon svg')?.getAttribute('class') ?? '(sin icono)';
}
function describirAvisos(variante: 'success' | 'error'): string {
  const lista = avisos(variante);
  return lista.length === 0 ? `0 banners ${variante}` : `${lista.length} banner(s) ${variante}: ${lista.map((a) => `"${textoAviso(a)}"`).join(' | ')}`;
}

function Anfitrion() {
  return (
    <MemoryRouter initialEntries={['/historial-predictivo']}>
      <ToastHost />
      <Route path="*" render={({ location }) => <span data-testid="qa-ruta">{location.pathname}</span>} />
    </MemoryRouter>
  );
}

/** Mismo manejo de error que HistorialPredictivoView.tsx:190 (la linea se verifica literal en beforeAll). */
async function exportarComoHistorialPredictivo(): Promise<void> {
  try {
    await reportesApi.generar('REPORTE_HISTORICO_SANITARIO', 'PDF',
      { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', activo_biologico_id: 885 });
  } catch (e) {
    const err = e as ApiError;
    const t = (k: string) => i18n.t(k, { ns: 'prediction' });
    pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion });
  }
}

const RESPUESTA_REGISTRO = (identificador: string, id: number) => ({
  id_activo_biologico: id, id_especie: 1, tipo: 'INDIVIDUAL', identificador,
  fecha_inicio_ciclo: '2026-11-19', detalles_procedencia: 'Compra a tercero', origen_financiero: 'COMPRA',
  costo_adquisicion: 1639000, soporte_documental: null, descripcion: null, id_infraestructura: 10,
  atributos_dinamicos: null, id_estado: 1, nombre_estado: 'ACTIVO', id_usuario: 97,
  fecha_creacion: '2026-11-19T22:00:00-05:00', fecha_actualizacion: null, detalle_individual: null,
});
const DTO_REGISTRO = (identificador: string) => ({
  tipo_activo: 'INDIVIDUAL', id_especie: 1, fecha_inicio_ciclo: '2026-11-19', origen_financiero: 'COMPRA',
  costo_adquisicion: 1639000, id_infraestructura: 10, identificador,
});

async function registrarActivo(identificador: string, id: number): Promise<void> {
  simular('POST', /^\/activos-biologicos$/, 201, RESPUESTA_REGISTRO(identificador, id));
  const { result } = renderHook(() => useActivos());
  await act(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.current.registrar(DTO_REGISTRO(identificador) as any);
  });
}

const TERMINO_TECNICO = [
  /\b[1-5]\d\d\b/, /HTTP/i, /\bError \d/i, /error_code/i, /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/, /Exception/i,
  /Traceback/i, /\bundefined\b/, /\bnull\b/, /\[object Object\]/, /Not Found/i, /Internal Server Error/i,
  /Bad Request/i, /Unprocessable/i, /\bConflict\b/,
];
function problemasDeTexto(texto: string): string[] {
  const p = TERMINO_TECNICO.filter((r) => r.test(texto)).map((r) => `coincide ${r}`);
  if (texto.split(' ').filter((w) => /[a-záéíóúñ]{2,}/i.test(w)).length < 4) p.push('sin explicacion en lenguaje natural');
  return p;
}

// ---------------------------------------------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------------------------------------------
beforeAll(async () => {
  await i18n.changeLanguage('es-CO');
  // La rama de error replica la linea de HistorialPredictivoView: si cambia, la corrida no es valida.
  const vista = readFileSync(join(RAIZ_FRONT, 'src/prediction/pages/HistorialPredictivoView.tsx'), 'utf8');
  const linea = "pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion });";
  precondiciones.push({ nombre: 'Linea de HistorialPredictivoView.tsx que muestra el error', ok: vista.includes(linea), detalle: linea });
  const host = readFileSync(join(RAIZ_FRONT, 'src/shared/design-system/ToastHost.tsx'), 'utf8');
  precondiciones.push({ nombre: 'ToastHost navega con history.push a /<ruta_accion>', ok: host.includes('history.push(`/${x.accion!.ruta}`)'), detalle: 'history.push(`/${x.accion!.ruta}`)' });
});

beforeEach(() => {
  rutas = [];
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
  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const falla = CPS.length - ok;
  if (sinRuta.length) observaciones.push(`Peticiones sin respuesta simulada durante la corrida: ${sinRuta.join(', ')}`);
  const reporte = {
    tc: TC,
    reintento: Number(process.env.REINTENTO ?? '0'),
    run_id: process.env.RUN_ID ?? '',
    fecha: new Date().toISOString(),
    summary: { total: CPS.length, ok, falla, veredicto: falla === 0 ? 'Aprobado' : 'Rechazado' },
    precondiciones,
    checkpoints: CPS,
    observaciones,
    retirados: [] as Array<{ paso: string; motivo: string }>,
  };
  const dir = process.env.STAGING_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  const n = reporte.reintento;
  writeFileSync(join(dir, `resultado_${TC}${n > 0 ? `_reintento${n}` : ''}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-061 - Mensaje de exito
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-061 Mensaje de exito (RF-107 Tipo 1)', () => {
  it('CP-01 REGISTRO_ACTIVO usa la plantilla fija con identificador y monto', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    render(<Anfitrion />);
    await registrarActivo('BOV-2024-001', 9001);
    const exitos = avisos('success');
    const texto = exitos.length ? textoAviso(exitos[0]) : '(sin banner de exito)';
    const ok = exitos.length === 1
      && texto.includes('El activo BOV-2024-001 fue registrado correctamente.')
      && texto.includes('Valor inicial reconocido: $1.639.000 COP.');
    anotar('CP-01', ok, `${exitos.length} banner(s) de exito; texto: "${texto}"`);
    expect(ok, texto).toBe(true);
  });

  it('CP-02 CIERRE_PERIODO usa la plantilla fija con periodo y activos revaluados', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00'), toFake: ['Date'] });
    const periodo: Periodo = {
      id_periodo_contable: 7, numero_id_tributaria: '900123456', razon_social: 'Finca QA', tipo_cierre: 'MENSUAL',
      fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', estado: 'ABIERTO', fecha_cierre: null, ultimo_cierre: null,
    } as Periodo;
    const nombre = nombrePeriodo(periodo);
    simular('GET', /^\/finanzas\/titulares$/, 200, []);
    simular('GET', /^\/finanzas\/periodos$/, 200, [periodo]);
    simular('GET', /^\/finanzas\/periodos\/7\/prevalidacion$/, 200,
      { bloqueos: [], activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: true, requiere_autorizacion: false });
    simular('GET', /^\/finanzas\/periodos\/7\/comprobantes$/, 200, []);
    simular('POST', /^\/finanzas\/periodos\/7\/cierre$/, 200, {
      id_cierre: 31, periodo: '2026-10', estado: 'COMPLETADO', activos_procesados: 120, activos_excluidos: [], lineas_excluidas: [],
      comprobantes: [
        { codigo: 'NIC41-2026-10-001', hash: 'a1', valor_total: '1000.00' },
        { codigo: 'NIC41-2026-10-002', hash: 'a2', valor_total: '2000.00' },
        { codigo: 'NIC41-2026-10-003', hash: 'a3', valor_total: '3000.00' },
      ],
      hash_cierre: 'f00d', reportes: {}, id_periodo_siguiente: null,
    });
    const permisos = [
      { id_recurso: 1, nombre_recurso: 'cierre_periodo', id_accion: 2 },
      { id_recurso: 1, nombre_recurso: 'cierre_periodo', id_accion: 5 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = { token: 't', claims: null, userInfo: null, permisos, perfilIncompleto: false, isBootstrapping: false,
      errorRestaurandoSesion: false, reintentarRestaurarSesion: () => {}, sesionOffline: false, permisosActualizadosEn: null,
      setSession: () => {}, clearSession: () => {}, refreshUserInfo: async () => {} } as any;
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/finanzas/cierre']}>
          <ToastHost />
          <ProveedorPeriodo><CierreView /></ProveedorPeriodo>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    const botones = await screen.findAllByRole('button', { name: /Cerrar período/ }, { timeout: 4000 });
    fireEvent.click(botones[0]);
    const dialogo = await screen.findByRole('dialog', {}, { timeout: 4000 });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Cerrar período/ }));
    await waitFor(() => expect(avisos('success').length).toBeGreaterThan(0), { timeout: 4000 }).catch(() => undefined);
    const exitos = avisos('success');
    const texto = exitos.length ? textoAviso(exitos[0]) : '(sin banner de exito)';
    const esperado = `El período ${nombre} fue cerrado correctamente. 120 activos fueron revaluados.`;
    const ok = exitos.length === 1 && texto.includes(esperado);
    anotar('CP-02', ok, `${exitos.length} banner(s) de exito; texto: "${texto}" (periodo mostrado por la app: "${nombre}"; activos_procesados=120; comprobantes=3)`);
    observaciones.push(`OBS-cierre-detalle: despues de la plantilla de la 8.5 el aviso del cierre agrega un detalle (CierreView.tsx, TC-DIS-294: «N/Total activos procesados» y comprobantes). Texto medido: "${texto}". La 8.5 da solo la plantilla; CP-02 exige que la contenga.`);
    expect(ok, `${texto} | esperado: ${esperado}`).toBe(true);
  });

  it('CP-03 el exito es un banner verde con icono de check', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    render(<Anfitrion />);
    await registrarActivo('BOV-2024-001', 9001);
    const exitos = avisos('success');
    const a = exitos[0];
    const clase = a?.getAttribute('class') ?? '(sin banner)';
    const icono = a ? claseIcono(a) : '(sin banner)';
    const rol = a?.getAttribute('role') ?? '(sin banner)';
    const ok = !!a && clase.split(' ').includes('ds-alert--success') && /check/i.test(icono);
    anotar('CP-03', ok, `clase="${clase}"; icono="${icono}"; role="${rol}" (no cuenta, ver OBS-rol)`);
    observaciones.push(`OBS-rol (decision de Sebastian del 2026-11-22, opcion A): el aviso de exito tiene role="${rol}". La ronda 1 exigia role=alert sin fuente en el RF-107 (Tipo 1 solo pide banner verde con icono de check; RNF-05 pide WCAG 2.1 AA). El cambio a role="status" viene de A11Y2-M08 TC-DIS-292 (Alert.tsx:71, commit bd1b0f5f); el error sigue con role=alert.`);
    expect(ok).toBe(true);
  });

  it('CP-04 el exito se ve 5 s: visible a 4,999 s y oculto a 5,000 s', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    render(<Anfitrion />);
    await registrarActivo('BOV-2024-001', 9001);
    const al0 = avisos('success').length;
    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    const a4999 = avisos('success').length;
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const a5000 = avisos('success').length;
    const ok = al0 === 1 && a4999 === 1 && a5000 === 0;
    anotar('CP-04', ok, `banners de exito: t=0 s -> ${al0}; t=4,999 s -> ${a4999}; t=5,000 s -> ${a5000}`);
    expect(ok).toBe(true);
  });

  it('CP-05 el usuario cierra el exito a los 2 s', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    render(<Anfitrion />);
    await registrarActivo('BOV-2024-001', 9001);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    const antes = avisos('success');
    const boton = antes[0]?.querySelector('.ds-alert__close') as HTMLButtonElement | null;
    const etiqueta = boton?.getAttribute('aria-label') ?? '(sin boton de cierre)';
    if (boton) await act(async () => { fireEvent.click(boton); });
    const despues = avisos('success').length;
    const ok = antes.length === 1 && !!boton && despues === 0;
    anotar('CP-05', ok, `t=2 s: ${antes.length} banner(s); boton de cierre "${etiqueta}"; tras pulsarlo: ${despues} banner(s)`);
    expect(ok).toBe(true);
  });

  it('CP-06 un segundo exito a los 3 s reemplaza al primero y reinicia los 5 s', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    render(<Anfitrion />);
    await registrarActivo('BOV-2024-001', 9001);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await registrarActivo('BOV-2024-002', 9002);
    const tras = avisos('success');
    const textos = tras.map(textoAviso);
    const unoNuevo = tras.length === 1 && textos[0].includes('BOV-2024-002') && !textos[0].includes('BOV-2024-001');
    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    const a7999 = avisos('success').length;
    const t7999 = avisos('success').map(textoAviso).join(' | ');
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const a8000 = avisos('success').length;
    const ok = unoNuevo && a7999 === 1 && t7999.includes('BOV-2024-002') && a8000 === 0;
    anotar('CP-06', ok, `t=3 s (tras el 2.o exito): ${tras.length} banner(s) [${textos.map((x) => `"${x}"`).join(', ')}]; t=7,999 s: ${a7999} banner(s) "${t7999}"; t=8,000 s: ${a8000} banner(s)`);
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-062 - Mensaje de error
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-062 Mensaje de error con accion correctiva (RF-107 Tipo 2)', () => {
  async function prepararCatalogo(filas = CATALOGO_ES_CO) {
    simular('GET', /^\/configuracion\/mensajes-error$/, 200, filas);
    await cargarCatalogoErrores(http, 'es-CO');
  }
  async function fallarCon(status: number, data: unknown) {
    simular('POST', /^\/reportes$/, status, data);
    await act(async () => { await exportarComoHistorialPredictivo(); });
  }

  it('CP-07 clave del catalogo con accion: texto del catalogo y boton que navega', async () => {
    await prepararCatalogo();
    render(<Anfitrion />);
    const textoServidor = 'El período del 01/10/2026 al 31/10/2026 no está cerrado. Solo se pueden generar reportes sobre períodos contables cerrados.';
    await fallarCon(422, cuerpoError('PERIODO_NO_CERRADO', textoServidor, 'filtros.periodo_contable_base'));
    const errores = avisos('error');
    const a = errores[0];
    const texto = a ? textoAviso(a) : '(sin banner de error)';
    const clase = a?.getAttribute('class') ?? '';
    const icono = a ? claseIcono(a) : '';
    const boton = a?.querySelector('.ds-alert__accion') as HTMLButtonElement | null;
    const textoBoton = norm(boton?.textContent) || '(sin boton)';
    if (boton) await act(async () => { fireEvent.click(boton); });
    const ruta = screen.getByTestId('qa-ruta').textContent;
    const ok = errores.length === 1 && clase.split(' ').includes('ds-alert--error') && /(circle-x|x-circle)/i.test(icono)
      && texto.includes('Este reporte solo se genera sobre períodos contables cerrados.') && !texto.includes('Solo se pueden generar reportes')
      && textoBoton === 'Ir al cierre de período' && ruta === '/finanzas';
    anotar('CP-07', ok, `${errores.length} banner(s) de error; clase="${clase}"; icono="${icono}"; texto="${texto}"; boton="${textoBoton}"; ruta tras pulsar="${ruta}"`);
    expect(ok).toBe(true);
  });

  it('CP-08 clave del catalogo sin accion: texto del catalogo y sin boton', async () => {
    await prepararCatalogo();
    render(<Anfitrion />);
    await fallarCon(409, cuerpoError('OPERACION_DUPLICADA', 'Ya hay una solicitud igual en curso.'));
    const errores = avisos('error');
    const a = errores[0];
    const texto = a ? textoAviso(a) : '(sin banner de error)';
    const botones = a ? a.querySelectorAll('.ds-alert__accion').length : -1;
    const ok = errores.length === 1 && texto.includes('Esta operación ya está en curso o fue ejecutada recientemente.')
      && !texto.includes('Ya hay una solicitud igual en curso.') && botones === 0;
    anotar('CP-08', ok, `${errores.length} banner(s) de error; texto="${texto}"; botones de accion=${botones}`);
    expect(ok).toBe(true);
  });

  it('CP-09 clave fuera del catalogo: texto del servidor en lenguaje natural y sin boton', async () => {
    await prepararCatalogo();
    render(<Anfitrion />);
    const textoServidor = 'El período de comparación debe ser anterior al período base.';
    await fallarCon(422, cuerpoError('PERIODOS_FUERA_DE_ORDEN', textoServidor, 'filtros.periodo_contable_comparacion'));
    const errores = avisos('error');
    const a = errores[0];
    const texto = a ? textoAviso(a) : '(sin banner de error)';
    const botones = a ? a.querySelectorAll('.ds-alert__accion').length : -1;
    const problemas = problemasDeTexto(texto);
    const ok = errores.length === 1 && texto.includes(textoServidor) && botones === 0 && problemas.length === 0;
    anotar('CP-09', ok, `${errores.length} banner(s) de error; texto="${texto}"; botones de accion=${botones}; revision de terminos tecnicos: ${problemas.length ? problemas.join('; ') : 'ninguno'}`);
    expect(ok).toBe(true);
  });

  it('CP-10 respuestas 422, 404, 409 y 500 sin codigos ni terminos tecnicos', async () => {
    await prepararCatalogo();
    const casos: Array<[number, unknown]> = [
      [422, cuerpoError('REPORTE_EN_PROCESO', 'El reporte todavía se está generando. Te avisaremos cuando esté listo.', 'id_reporte')],
      [404, cuerpoError('PERIODO_INEXISTENTE', 'El período contable elegido no existe.', 'filtros.periodo_contable_base')],
      [409, cuerpoError('CIERRE_NO_CANCELABLE', 'Solo se puede cancelar un cierre que espera la autorización de exclusiones.')],
      [500, cuerpoError('ERROR_INTERNO', 'Ocurrió un error interno. Intenta de nuevo; si el problema persiste, contacta al equipo de soporte.')],
    ];
    const partes: string[] = [];
    let todos = true;
    for (const [status, cuerpo] of casos) {
      limpiarToasts();
      cleanup();
      render(<Anfitrion />);
      await fallarCon(status, cuerpo);
      const errores = avisos('error');
      const texto = errores.length ? textoAviso(errores[0]) : '(sin banner de error)';
      const problemas = errores.length === 1 ? problemasDeTexto(texto) : ['no hubo exactamente 1 banner de error'];
      if (problemas.length) todos = false;
      partes.push(`${status} (${(cuerpo as { error_code: string }).error_code}): "${texto}" -> ${problemas.length ? problemas.join('; ') : 'sin hallazgos'}`);
    }
    anotar('CP-10', todos, partes.join(' || '));
    expect(todos, partes.join('\n')).toBe(true);
  });

  it('CP-11 el error persiste a los 10 s y se cierra al pulsar', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
    await prepararCatalogo();
    render(<Anfitrion />);
    await fallarCon(409, cuerpoError('OPERACION_DUPLICADA', 'Ya hay una solicitud igual en curso.'));
    const al0 = avisos('error').length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    const a10 = avisos('error').length;
    await act(async () => { await vi.advanceTimersByTimeAsync(50_000); });
    const a60 = avisos('error').length;
    const boton = avisos('error')[0]?.querySelector('.ds-alert__close') as HTMLButtonElement | null;
    if (boton) await act(async () => { fireEvent.click(boton); });
    const despues = avisos('error').length;
    const ok = al0 === 1 && a10 === 1 && a60 === 1 && !!boton && despues === 0;
    anotar('CP-11', ok, `banners de error: t=0 s -> ${al0}; t=10 s -> ${a10}; t=60 s -> ${a60}; boton de cierre ${boton ? 'presente' : 'ausente'}; tras pulsarlo -> ${despues}`);
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Observaciones medidas (no cuentan para el veredicto)
// ---------------------------------------------------------------------------------------------------------------
describe('Observaciones de TC-M08-062 (no son checkpoints)', () => {
  it('OBS-d error sin clave: respuesta 502 sin cuerpo', async () => {
    simular('GET', /^\/configuracion\/mensajes-error$/, 200, CATALOGO_ES_CO);
    await cargarCatalogoErrores(http, 'es-CO');
    render(<Anfitrion />);
    simular('POST', /^\/reportes$/, 502, '');
    await act(async () => { await exportarComoHistorialPredictivo(); });
    const texto = avisos('error').map(textoAviso).join(' | ') || '(sin banner de error)';
    observaciones.push(`OBS-d (TC-M08-062 d, FALLIDO sin clave): la especificacion no define el mensaje. Con un 502 sin cuerpo se mostro: "${texto}". FA-2 dice "Ocurrió un problema técnico. Intenta nuevamente o contacta al administrador."`);
    expect(true).toBe(true);
  });

  it('OBS-g clave inactiva en el catalogo (es_activo = false)', async () => {
    const filas = CATALOGO_ES_CO.map((f) => (f.clave === 'PERIODO_NO_CERRADO' ? { ...f, es_activo: false } : f));
    simular('GET', /^\/configuracion\/mensajes-error$/, 200, filas);
    await cargarCatalogoErrores(http, 'es-CO');
    render(<Anfitrion />);
    simular('POST', /^\/reportes$/, 422, cuerpoError('PERIODO_NO_CERRADO',
      'El período del 01/10/2026 al 31/10/2026 no está cerrado. Solo se pueden generar reportes sobre períodos contables cerrados.',
      'filtros.periodo_contable_base'));
    await act(async () => { await exportarComoHistorialPredictivo(); });
    const a = avisos('error')[0];
    const texto = a ? textoAviso(a) : '(sin banner de error)';
    const botones = a ? a.querySelectorAll('.ds-alert__accion').length : -1;
    observaciones.push(`OBS-g (TC-M08-062 g, clave con es_activo=false): la especificacion no define que significa una clave inactiva. Se mostro: "${texto}" con ${botones} boton(es) de accion.`);
    expect(true).toBe(true);
  });

  it('OBS-sin-costo registro sin costo_adquisicion (origen distinto de compra)', async () => {
    let texto = '(no medido)';
    try {
      vi.useFakeTimers({ now: new Date('2026-11-19T22:00:00-05:00') });
      render(<Anfitrion />);
      simular('POST', /^\/activos-biologicos$/, 201,
        { ...RESPUESTA_REGISTRO('BOV-2024-003', 9003), origen_financiero: 'NACIMIENTO', detalles_procedencia: 'Nacimiento en finca', costo_adquisicion: null });
      const { result } = renderHook(() => useActivos());
      await act(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await result.current.registrar({ ...DTO_REGISTRO('BOV-2024-003'), origen_financiero: 'NACIMIENTO', costo_adquisicion: null } as any);
      });
      texto = avisos('success').map(textoAviso).join(' | ') || '(sin banner de exito)';
    } catch (e) {
      texto = `no medido (${(e as Error).message})`;
    }
    observaciones.push(`OBS-sin-costo: con costo_adquisicion null (origen NACIMIENTO) el aviso fue "${texto}". La 8.5 no define el «valor inicial reconocido» cuando el origen no es compra (pendiente de Analisis desde la ronda 1).`);
    expect(true).toBe(true);
  });

  it('OBS-fijas observaciones de alcance', () => {
    observaciones.push('OBS-FA5 (TC-M08-061 e, exito con advertencias): las Entradas vigentes del RF-107 no tienen un campo para advertencias y la seccion 8.5 no tiene esa rama; FA-5 solo aparece en la Descripcion. No se prueba.');
    observaciones.push('OBS-CA01 y posicion: el tiempo de aparicion (<= 500 ms) no se mide en jsdom; se cubre en TC-M08-073 (G030). La posicion "en la parte superior" se mide en navegador real en TC-M08-G026 (CP-22, OK en su reintento 1).');
    observaciones.push('OBS-FA2 (decision de QA): por indicacion del evaluador se sigue el criterio de Desarrollo (v7: el catalogo tiene prioridad sobre el texto del servidor; fuera del catalogo se muestra el texto del servidor). La seccion 8.5 y FA-2 del RF-107 piden el mensaje generico para una clave no catalogada; queda como diferencia documentada con la especificacion.');
    observaciones.push('OBS-alcance: el error al registrar un activo se muestra dentro del formulario y no en el banner de M08; hoy solo HistorialPredictivoView y ReportesPage usan el banner de error con boton (revisado en HEAD f10009d5). Las pruebas de error usan el manejo de HistorialPredictivoView.tsx:190.');
    expect(true).toBe(true);
  });
});
