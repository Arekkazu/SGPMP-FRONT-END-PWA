// | Fecha      | Nombre                  | Que se hizo |
// |------------|-------------------------|-------------|
// | 2026-11-20 | Juan Sebastian Gutierrez | TC-M08-G021 (TC-M08-052 y 053; RF-106): ventana de correspondencia y colision. Parte Vitest (CP-01 a CP-09) |
//
// QA SGPMP - Evaluacion (ronda 1). Presentacion de la vista con respuestas simuladas con la forma REAL del backend
// (consultar_historial_predictivo_use_case.py:118-144). Las correspondencias y los grupos los calcula el simulador con
// una traduccion literal de sgpmp-backend src/reporting/domain/historial_predictivo.py:80-104: la ventana y la colision
// son del backend; aqui solo se mide como la vista presenta lo que recibe. Con datos reales: parte Playwright (CP-10 a CP-17).
//
// Reporte: parcial_vitest_TC-M08-G021[_reintentoN].json en STAGING_DIR; cada checkpoint arranca en FALLA "No alcanzado";
// el obtenido es lo medido en el DOM (conteos, textos, coordenadas) o la URL real de la peticion.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../../../src/shared/i18n';
import { http } from '../../../../../src/shared/api/http';
import { AuthContext, type PermisoUsuario } from '../../../../../src/shared/auth/AuthContext';
import { PrediccionPage } from '../../../../../src/prediction/pages/PrediccionPage';

const TC = 'TC-M08-G021';
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = resolve(AQUI, '../../../../..');

// ---------------------------------------------------------------------------------------------------------------
// Checkpoints (9)
// ---------------------------------------------------------------------------------------------------------------
type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; caso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }

const CPS: Checkpoint[] = [
  { paso: 'CP-01', caso: 'TC-M08-052 Δt 10 h (4001, Lineal)',
    esperado: 'Exactamente 1 conector punteado (discontinuo) entre el punto de P1 y el marcador de E1',
    fuente: 'RF-106 Restricción 5b; Proceso 2.1 (regla de correspondencia R5b: vínculo visual con conector discontinuo); CA-7 (A)' },
  { paso: 'CP-02', caso: 'TC-M08-052 Δt 12 h 00 min (4001, Lineal)',
    esperado: 'Exactamente 1 conector punteado entre el punto de P2 y el marcador de E2',
    fuente: 'RF-106 Restricción 5b (|Δt| ≤ ventana de 12 h); Proceso 2.1' },
  { paso: 'CP-03', caso: 'TC-M08-052 Δt -10 h, el evento antes de la predicción (4001, Lineal)',
    esperado: 'Exactamente 1 conector punteado entre el punto de P5 y el marcador de E5',
    fuente: 'RF-106 Restricción 5b (ventana temporal bidireccional de ±12 h)' },
  { paso: 'CP-04', caso: 'TC-M08-052 Δt 12 h 01 min y 20 h (4001, Lineal)',
    esperado: '0 conectores entre P3 y E3 y 0 conectores entre P4 y E4 (marcadores independientes)',
    fuente: 'RF-106 Restricción 5b (si la diferencia supera la ventana: elementos independientes); CA-7 (B)' },
  { paso: 'CP-05', caso: 'TC-M08-052 en modo Agrupada (4001)',
    esperado: 'En modo Agrupada: exactamente 1 conector punteado en P1-E1, P2-E2 y P5-E5, y 0 conectores en P3-E3 y P4-E4',
    fuente: 'RF-106 CA-7 (verificar renderizado en LINEAL y AGRUPADO); Restricción 5b' },
  { paso: 'CP-06', caso: 'TC-M08-053 colisión a 30 min (4002)',
    esperado: 'En Lineal y en Agrupada hay en la gráfica un marcador "2 eventos" en la posición de P6/E6',
    fuente: 'RF-106 Restricción 5c; Proceso 2.1 (Colisión R5c: marcador agrupado "N eventos"); CA-7 (C)' },
  { paso: 'CP-07', caso: 'TC-M08-053 colisión a 60 min (4002)',
    esperado: 'En Lineal y en Agrupada hay en la gráfica un marcador "2 eventos" en la posición de P7/E7',
    fuente: 'RF-106 Restricción 5c (|Δt| ≤ 1 h)' },
  { paso: 'CP-08', caso: 'TC-M08-053 61 min, cercanos no colisionados (4002, Lineal)',
    esperado: 'Sin marcador de grupo en P8/E8 y exactamente 1 conector punteado entre el punto de P8 y el marcador de E8',
    fuente: 'RF-106 Restricción 5d; Proceso 2.1 (Cercanos no colisionados R5d: conector discontinuo)' },
  { paso: 'CP-09', caso: 'TC-M08-053 grupo de tres (4002, Agrupada)',
    esperado: 'Al expandir los grupos, el grupo de tres lista sus elementos en el orden retroalimentación (R9), evento sanitario (E9), predicción (P9); cada elemento se identifica por su fecha y hora',
    fuente: 'RF-106 Restricción 5c (prioridad visual al expandir: 1° RF-72, 2° RF-41, 3° RF-67); Proceso 2.1' },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const observaciones: string[] = [];
const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const retirados = [{
  paso: 'TC-M08-052/053 límites exactos con datos reales',
  motivo: 'La ventana (≤ 12 h) y la colisión (≤ 1 h) las calcula el backend (historial_predictivo.py:21, :84, :96-97). En TEST no hay pares a 12 h 00, 12 h 01, 60 ni 61 min (el 885 tiene 600, 30 y 1200 min). Con datos reales se miden los tres escenarios de CA-7 en la parte Playwright (CP-10 a CP-17)',
}, {
  paso: 'Tooltip con la diferencia en 12 h 00, -10 h y 61 min ("Diferencia: 12 h", "Diferencia: 10 h", "Diferencia: 1 h 1 min")',
  motivo: 'jsdom no activa el tooltip de recharts (el contenedor no tiene tamaño: con mouseEnter/mouseMove sobre el símbolo y sobre .recharts-wrapper el tooltip queda vacío y oculto), así que en Vitest no se puede medir lo que ve el usuario. El tooltip se mide en navegador real (CP-14, par de 10 h del 885); en TEST no hay pares de 12 h 00, -10 h ni 61 min',
}];

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso);
  if (!cp) throw new Error(`Checkpoint desconocido ${paso}`);
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}

// ---------------------------------------------------------------------------------------------------------------
// Recharts en jsdom: tamaño fijo (ResponsiveContainer no mide en jsdom)
// ---------------------------------------------------------------------------------------------------------------
vi.mock('recharts', async () => {
  const real = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...real,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => React.cloneElement(children, { width: 800, height: 320 }),
  };
});

// ---------------------------------------------------------------------------------------------------------------
// Simulador con la forma real del backend
// ---------------------------------------------------------------------------------------------------------------
const VENTANA_SIMULADOR = 12;
const ORDEN_GRUPO_BACKEND = true;
const HORA_MS = 3_600_000;
const PRIORIDAD: Record<string, number> = { RETROALIMENTACION: 0, EVENTO_SANITARIO: 1, PREDICCION: 2 };

type Clase = 'PREDICCION' | 'EVENTO_SANITARIO' | 'RETROALIMENTACION';
interface Fuente { clase: Clase; nombre: string; fecha: string; datos: Record<string, unknown> }

/** Fecha como datetime.isoformat() de Python (UTC, "+00:00"). */
const iso = (s: string) => s.replace('Z', '+00:00');
const ms = (s: string) => new Date(s).getTime();

function pred(nombre: string, id: string, fecha: string, nivel: number, conRetro = false): Fuente {
  return { clase: 'PREDICCION', nombre, fecha, datos: {
    id_resultado_inferencia: id, nivel_riesgo: nivel, confianza: 0.9, condicion: 'Condición QA', modo_sombra: false,
    tiene_retroalimentacion: conRetro, en_conflicto: false } };
}
function evento(nombre: string, id: number, fecha: string, tipoClinico: string): Fuente {
  // Forma real: el caso de uso pone "tipo": e["tipo"] en datos (:105) y serial() hace {"tipo": m.tipo, ..., **m.datos}
  // (:118-119), asi que el "tipo" que llega es el tipo clinico del evento, no "EVENTO_SANITARIO".
  return { clase: 'EVENTO_SANITARIO', nombre, fecha, datos: {
    id_evento: id, tipo: tipoClinico, descripcion: `Evento QA ${id}`, veterinario: 'Vet QA' } };
}
function retro(nombre: string, idInferencia: string, fecha: string, valoracion: string): Fuente {
  return { clase: 'RETROALIMENTACION', nombre, fecha, datos: {
    id_resultado_inferencia: idInferencia, valoracion, veterinario: 'Vet QA', observaciones: null, en_conflicto: false } };
}
function serial(f: Fuente): Record<string, unknown> {
  return { tipo: f.clase, fecha: iso(f.fecha), ...f.datos };
}

// historial_predictivo.py:91-104
function correspondenciasBackend(preds: Fuente[], eventos: Fuente[], ventanaHoras: number) {
  const pares: Array<{ id_resultado_inferencia: unknown; id_evento: unknown; diferencia_minutos: number; diferencia: string; colision: boolean }> = [];
  for (const p of preds) {
    for (const e of eventos) {
      const delta = Math.abs(ms(e.fecha) - ms(p.fecha));
      if (delta <= ventanaHoras * HORA_MS) {
        const minutos = Math.floor(delta / 60_000);
        pares.push({ id_resultado_inferencia: p.datos.id_resultado_inferencia, id_evento: e.datos.id_evento, diferencia_minutos: minutos,
          diferencia: `Diferencia: ${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}`, colision: delta <= HORA_MS });
      }
    }
  }
  return pares;
}

// historial_predictivo.py:80-88 (y caso de uso :129: solo grupos de mas de 1)
function gruposBackend(marcadores: Fuente[]): Fuente[][] {
  const ordenados = [...marcadores].sort((a, b) => ms(a.fecha) - ms(b.fecha));
  const grupos: Fuente[][] = [];
  for (const m of ordenados) {
    const ultimo = grupos.length ? grupos[grupos.length - 1] : null;
    if (ultimo && ms(m.fecha) - ms(ultimo[ultimo.length - 1].fecha) <= HORA_MS) ultimo.push(m);
    else grupos.push([m]);
  }
  return grupos
    .map((g) => (ORDEN_GRUPO_BACKEND ? [...g].sort((a, b) => (PRIORIDAD[a.clase] - PRIORIDAD[b.clase]) || (ms(a.fecha) - ms(b.fecha))) : g))
    .filter((g) => g.length > 1);
}

const P = (n: number) => `a0000000-0000-4000-8000-00000000000${n}`;
const Q = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;

const ESCENARIOS: Record<number, { etiqueta: string; preds: Fuente[]; eventos: Fuente[]; retros: Fuente[] }> = {
  4001: {
    etiqueta: 'QA-4001 · Pares 052',
    preds: [
      pred('P1', P(1), '2026-10-01T15:00:00Z', 1), pred('P2', P(2), '2026-10-04T15:00:00Z', 2), pred('P3', P(3), '2026-10-07T15:00:00Z', 3),
      pred('P4', P(4), '2026-10-10T15:00:00Z', 2), pred('P5', P(5), '2026-10-13T15:00:00Z', 1),
    ],
    eventos: [
      evento('E1', 5101, '2026-10-02T01:00:00Z', 'DIAGNOSTICO'), evento('E2', 5102, '2026-10-05T03:00:00Z', 'TRATAMIENTO'),
      evento('E3', 5103, '2026-10-08T03:01:00Z', 'DIAGNOSTICO'), evento('E4', 5104, '2026-10-11T11:00:00Z', 'CONTROL_PREVENTIVO'),
      evento('E5', 5105, '2026-10-13T05:00:00Z', 'TRATAMIENTO'),
    ],
    retros: [],
  },
  4002: {
    etiqueta: 'QA-4002 · Colisiones 053',
    preds: [
      pred('P6', Q(6), '2026-10-01T15:00:00Z', 1), pred('P7', Q(7), '2026-10-04T15:00:00Z', 2), pred('P8', Q(8), '2026-10-07T15:00:00Z', 3),
      pred('P9', Q(9), '2026-10-10T15:00:00Z', 2, true),
    ],
    eventos: [
      evento('E6', 5201, '2026-10-01T15:30:00Z', 'CONTROL_PREVENTIVO'), evento('E7', 5202, '2026-10-04T16:00:00Z', 'DIAGNOSTICO'),
      evento('E8', 5203, '2026-10-07T16:01:00Z', 'TRATAMIENTO'), evento('E9', 5204, '2026-10-10T15:20:00Z', 'DIAGNOSTICO'),
    ],
    retros: [retro('R9', Q(9), '2026-10-10T15:40:00Z', 'CORRECTO')],
  },
};

// Lo que el simulador debe producir (control de la traduccion del backend; si no coincide, todo FALLA)
const CORRESPONDENCIAS_ESPERADAS: Record<number, string[]> = {
  4001: ['P1-E1 600 "Diferencia: 10 h" false', 'P2-E2 720 "Diferencia: 12 h" false', 'P5-E5 600 "Diferencia: 10 h" false'],
  4002: ['P6-E6 30 "Diferencia: 0 h 30 min" true', 'P7-E7 60 "Diferencia: 1 h" true', 'P8-E8 61 "Diferencia: 1 h 1 min" false', 'P9-E9 20 "Diferencia: 0 h 20 min" true'],
};
const GRUPOS_ESPERADOS: Record<number, string[]> = { 4001: [], 4002: ['E6,P6', 'E7,P7', 'R9,E9,P9'] };

function nombrePorId(esc: (typeof ESCENARIOS)[number], idPred: unknown, idEvt: unknown): string {
  const p = esc.preds.find((x) => x.datos.id_resultado_inferencia === idPred)?.nombre ?? '?';
  const e = esc.eventos.find((x) => x.datos.id_evento === idEvt)?.nombre ?? '?';
  return `${p}-${e}`;
}

function construirRespuesta(idActivo: number, params: URLSearchParams) {
  const esc = ESCENARIOS[idActivo];
  const incluirEventos = params.get('incluir_eventos_sanitarios') !== 'false';
  const incluirRetro = params.get('incluir_retroalimentacion') !== 'false';
  const niveles = params.getAll('nivel_riesgo').map(Number);
  const visibles = esc.preds.filter((p) => niveles.length === 0 || niveles.includes(Number(p.datos.nivel_riesgo)));
  const eventos = incluirEventos ? esc.eventos : [];
  const retros = incluirRetro ? esc.retros : [];
  const conRetro = new Set(esc.retros.map((r) => r.datos.id_resultado_inferencia));
  const ahora = ms('2026-11-20T17:00:00Z');
  const pendientes = esc.preds
    .filter((p) => !conRetro.has(p.datos.id_resultado_inferencia) && ahora - ms(p.fecha) > 48 * HORA_MS)
    .sort((a, b) => (Number(b.datos.nivel_riesgo) - Number(a.datos.nivel_riesgo)) || (ms(b.fecha) - ms(a.fecha)));
  const validadas = esc.preds.filter((p) => conRetro.has(p.datos.id_resultado_inferencia));
  const correctas = validadas.filter((p) => esc.retros.some((r) => r.datos.id_resultado_inferencia === p.datos.id_resultado_inferencia && r.datos.valoracion === 'CORRECTO'));
  const sinRetro = esc.preds.length - validadas.length;
  const porcentaje = validadas.length ? Math.round((correctas.length / validadas.length) * 10000) / 100 : null;
  const tvco = porcentaje === null
    ? { porcentaje: null, texto: 'Sin datos suficientes para calcular', tvco_denominador: 0, tvco_excluidas_conflicto: 0, excluidas_sin_retroalimentacion: sinRetro, tasa_error: null }
    : { porcentaje, texto: `${porcentaje}% (${validadas.length} ${validadas.length === 1 ? 'validada' : 'validadas'}; ${sinRetro} ${sinRetro === 1 ? 'excluida' : 'excluidas'}: sin retro)`,
        tvco_denominador: validadas.length, tvco_excluidas_conflicto: 0, excluidas_sin_retroalimentacion: sinRetro, tasa_error: Math.round((100 - porcentaje) * 100) / 100 };
  return {
    activo: { id_activo_biologico: idActivo, identificador: `QA-${idActivo}`, especie: 'Bovino', finca: 'Finca QA 184', estado: 'ACTIVO' },
    rango_fechas_aplicado: { fecha_inicio: params.get('fecha_inicio') ?? '2025-11-20', fecha_fin: params.get('fecha_fin') ?? '2026-11-20' },
    ventana_correspondencia_horas: VENTANA_SIMULADOR,
    predicciones: visibles.map(serial),
    eventos_sanitarios: eventos.map(serial),
    retroalimentaciones: retros.map(serial),
    grupos: gruposBackend([...visibles, ...eventos, ...retros]).map((g) => g.map(serial)),
    correspondencias: correspondenciasBackend(visibles, eventos, VENTANA_SIMULADOR),
    tvco,
    pendientes: { total: pendientes.length, pagina: 1, por_pagina: 20, items: pendientes.map((p) => ({
      id_resultado_inferencia: p.datos.id_resultado_inferencia, fecha_inferencia: iso(p.fecha), nivel_riesgo: p.datos.nivel_riesgo, condicion: p.datos.condicion })) },
    metadatos: { total_inferencias: esc.preds.length, total_eventos_sanitarios: esc.eventos.length, total_retroalimentaciones: esc.retros.length,
      total_pendientes: pendientes.length, total_conflictos: 0 },
    fuentes_no_disponibles: [] as string[],
    mensaje: null as string | null,
    modo_visualizacion: params.get('modo_visualizacion') ?? 'LINEAL',
  };
}

interface PeticionRegistrada { metodo: string; url: string; uri: string }
let peticiones: PeticionRegistrada[] = [];
const adaptadorOriginal = http.defaults.adapter;

function adaptadorSimulado(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const metodo = (config.method ?? 'get').toUpperCase();
  const uri = http.getUri(config);
  const url = config.url ?? '';
  peticiones.push({ metodo, url, uri });
  const ok = (data: unknown): Promise<AxiosResponse> => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
  if (metodo === 'GET' && url.includes('/reportes/opciones/activo')) {
    return ok(Object.entries(ESCENARIOS).map(([valor, e]) => ({ valor: Number(valor), etiqueta: e.etiqueta })));
  }
  const m = url.match(/\/historial-predictivo\/(\d+)/);
  if (metodo === 'GET' && m && ESCENARIOS[Number(m[1])]) {
    const params = new URLSearchParams(uri.includes('?') ? uri.slice(uri.indexOf('?') + 1) : '');
    return ok(construirRespuesta(Number(m[1]), params));
  }
  const body = { error_code: 'RUTA_NO_SIMULADA', message: `Ruta no simulada: ${metodo} ${url}`, fields: [], timestamp: '2026-11-20T17:00:00Z' };
  const resp: AxiosResponse = { data: body, status: 404, statusText: 'Not Found', headers: {}, config, request: {} };
  return Promise.reject(new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', config, {}, resp));
}

// ---------------------------------------------------------------------------------------------------------------
// Sesion simulada (RBAC real: migracion a7c3e91f5b20, permiso historial_clinico_predictivo en lectura)
// ---------------------------------------------------------------------------------------------------------------
const PERMISOS_VET: PermisoUsuario[] = [
  { id_recurso: 9106, nombre_recurso: 'historial_clinico_predictivo', id_accion: 2 },
  { id_recurso: 42, nombre_recurso: 'historial_diagnostico', id_accion: 2 },
  { id_recurso: 45, nombre_recurso: 'retroalimentacion_clinica', id_accion: 2 },
];
function crearAuth() {
  return {
    token: 'token-qa', claims: null,
    userInfo: { id_usuario: 97, nombre: 'Usuario', apellidos: 'QA', correo_electronico: 'veterinario@sgpmp.test', nombre_rol: 'VETERINARIO', estado_cuenta: 'ACTIVA' },
    permisos: PERMISOS_VET, perfilIncompleto: false, isBootstrapping: false, errorRestaurandoSesion: false, reintentarRestaurarSesion: () => {},
    sesionOffline: false, permisosActualizadosEn: null, setSession: () => {}, clearSession: () => {}, refreshUserInfo: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
function montar() {
  return render(
    <AuthContext.Provider value={crearAuth()}>
      <MemoryRouter initialEntries={['/prediccion/historial-predictivo']}>
        <PrediccionPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Lectura de la grafica
// ---------------------------------------------------------------------------------------------------------------
const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
type Punto = { x: number; y: number };

function leerPuntosLinea(): Punto[] {
  return Array.from(document.querySelectorAll('.recharts-line-dots circle')).map((el) => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) }));
}
/** Marcadores de evento (path dentro de .recharts-scatter-symbol), con su centro; mismo criterio que G020. */
function leerMarcadoresEvento(): Array<Punto & { el: Element }> {
  return Array.from(document.querySelectorAll('.recharts-scatter-symbol path')).map((el) => {
    let x = Number.NaN;
    let y = Number.NaN;
    const tr = el.getAttribute('transform') ?? el.parentElement?.getAttribute('transform') ?? '';
    const t = tr.match(/translate\(\s*([+-]?[\d.e+-]+)\s*(?:,\s*|\s+)([+-]?[\d.e+-]+)\s*\)/i);
    if (t) { x = Number(t[1]); y = Number(t[2]); } else {
      const nums = (el.getAttribute('d') ?? '').match(/[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
      const xs = nums.filter((_, i) => i % 2 === 0);
      const ys = nums.filter((_, i) => i % 2 === 1);
      if (xs.length) { x = (Math.min(...xs) + Math.max(...xs)) / 2; y = (Math.min(...ys) + Math.max(...ys)) / 2; }
    }
    return { x, y, el };
  });
}
/** Elementos punteados que no son de la cuadricula, con sus extremos en coordenadas del SVG. */
function leerPunteados(): Array<{ a: Punto; b: Punto; etiqueta: string }> {
  const sup = document.querySelector('svg.recharts-surface');
  if (!sup) return [];
  return Array.from(sup.querySelectorAll('line, path')).filter((el) => {
    if (el.closest('.recharts-cartesian-grid')) return false;
    const d = (el.getAttribute('stroke-dasharray') ?? '').trim();
    return d !== '' && d !== '0' && d !== 'none';
  }).map((el) => {
    if (el.tagName.toLowerCase() === 'line') {
      return { a: { x: Number(el.getAttribute('x1')), y: Number(el.getAttribute('y1')) }, b: { x: Number(el.getAttribute('x2')), y: Number(el.getAttribute('y2')) }, etiqueta: 'line' };
    }
    const nums = (el.getAttribute('d') ?? '').match(/[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
    return { a: { x: nums[0], y: nums[1] }, b: { x: nums[nums.length - 2], y: nums[nums.length - 1] }, etiqueta: 'path' };
  });
}
const cerca = (p: Punto, q: Punto) => Math.abs(p.x - q.x) <= 3 && Math.abs(p.y - q.y) <= 3;
function conectoresEntre(a: Punto, b: Punto): number {
  return leerPunteados().filter((s) => (cerca(s.a, a) && cerca(s.b, b)) || (cerca(s.a, b) && cerca(s.b, a))).length;
}
/** Textos "N eventos" dibujados dentro de la grafica. */
function leerMarcadoresGrupo(): Array<{ n: number; x: number; texto: string }> {
  const sup = document.querySelector('svg.recharts-surface');
  if (!sup) return [];
  return Array.from(sup.querySelectorAll('text')).map((el) => ({ el, texto: norm(el.textContent) }))
    .filter((t) => /^(\d+) eventos?$/.test(t.texto))
    .map((t) => ({ n: Number(t.texto.split(' ')[0]), x: Number(t.el.getAttribute('x')), texto: t.texto }));
}
function hayMarcadorGrupo(n: number, miembros: Punto[]): { ok: boolean; detalle: string } {
  const xs = miembros.map((m) => m.x);
  const min = Math.min(...xs) - 3;
  const max = Math.max(...xs) + 3;
  const todos = leerMarcadoresGrupo();
  const ok = todos.some((g) => g.n === n && g.x >= min && g.x <= max);
  return { ok, detalle: `[${todos.map((g) => `"${g.texto}"@x=${g.x.toFixed(1)}`).join(', ')}] (miembros x=${xs.map((v) => v.toFixed(1)).join('/')})` };
}
function firma(): string {
  return [leerPuntosLinea().length, leerMarcadoresEvento().length, leerPunteados().length, leerMarcadoresGrupo().length,
    document.querySelectorAll('details li').length, screen.queryByText('No se pudo cargar el historial') !== null].join('|');
}
async function esperarEstable(): Promise<void> {
  await waitFor(() => expect(screen.queryByText('Cargando historial...')).toBeNull(), { timeout: 3000 });
  let anterior = '';
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 50));
    const actual = firma();
    if (actual === anterior) return;
    anterior = actual;
  }
}
async function seleccionar(etiqueta: string): Promise<string> {
  try {
    const combo = await screen.findByRole('combobox', { name: /Animal o lote/ });
    await waitFor(() => expect(peticiones.some((p) => p.url.includes('/reportes/opciones/activo'))).toBe(true));
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.change(combo, { target: { value: etiqueta } });
    await waitFor(() => expect(peticiones.some((p) => /\/historial-predictivo\/\d+/.test(p.url))).toBe(true), { timeout: 3000 });
    await esperarEstable();
    return '';
  } catch (e) {
    return `no se pudo (${String((e as Error)?.message ?? e).split('\n')[0].slice(0, 160)})`;
  }
}
async function cambiarModo(etiqueta: 'Agrupada' | 'Lineal'): Promise<string> {
  try {
    const modo = etiqueta === 'Agrupada' ? 'AGRUPADO' : 'LINEAL';
    const antes = peticiones.length;
    fireEvent.click(screen.getByLabelText(etiqueta));
    await waitFor(() => expect(peticiones.slice(antes).some((p) => p.uri.includes(`modo_visualizacion=${modo}`))).toBe(true), { timeout: 3000 });
    await esperarEstable();
    return '';
  } catch (e) {
    return `no se pudo cambiar a ${etiqueta} (${String((e as Error)?.message ?? e).split('\n')[0].slice(0, 120)})`;
  }
}

/** Punto de la prediccion i y marcador del evento j, en el orden de la respuesta. */
function ubicar(i: number, j: number, nPred: number, nEvt: number) {
  const puntos = leerPuntosLinea();
  const eventos = leerMarcadoresEvento();
  const conteo = `puntos=${puntos.length}/${nPred}; eventos=${eventos.length}/${nEvt}`;
  if (puntos.length !== nPred || eventos.length !== nEvt) return { ok: false as const, conteo };
  return { ok: true as const, conteo, p: puntos[i], e: eventos[j] };
}
function medirPar(i: number, j: number, nPred: number, nEvt: number) {
  const u = ubicar(i, j, nPred, nEvt);
  if (!u.ok) return { conteoOk: false, conectores: -1, conteo: u.conteo };
  return { conteoOk: true, conectores: conectoresEntre(u.p, u.e), conteo: u.conteo };
}

/** Fecha y hora como la muestra la app en America/Bogota (mismo criterio que CP-04 de G020). */
const fechaBogota = (s: string) => norm(new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }));

/** Abre la lista de grupos (modo Agrupada) y devuelve cada grupo con sus elementos (etiqueta y fecha). */
function abrirGrupos(): { abierto: string; grupos: Array<{ titulo: string; items: Array<{ etiqueta: string; fecha: string }> }> } {
  const summary = Array.from(document.querySelectorAll('summary')).find((s) => /grupos? de eventos cercanos/.test(norm(s.textContent)));
  if (!summary) return { abierto: '(sin lista de grupos)', grupos: [] };
  fireEvent.click(summary);
  const det = summary.closest('details');
  const lis = Array.from(det?.querySelectorAll(':scope > ul > li') ?? []);
  return {
    abierto: String(det?.hasAttribute('open')),
    grupos: lis.map((li) => ({
      titulo: norm(li.firstChild?.textContent ?? ''),
      items: Array.from(li.querySelectorAll(':scope > ul > li')).map((s) => {
        const t = norm(s.textContent);
        const k = t.indexOf(' · ');
        return { etiqueta: k >= 0 ? t.slice(0, k) : t, fecha: k >= 0 ? t.slice(k + 3) : '' };
      }),
    })),
  };
}
function textosLista(re: RegExp): string[] {
  const summary = Array.from(document.querySelectorAll('summary')).find((s) => re.test(norm(s.textContent)));
  const det = summary?.closest('details');
  return Array.from(det?.querySelectorAll(':scope > ul > li') ?? []).map((li) => norm(li.textContent));
}

// ---------------------------------------------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------------------------------------------
beforeAll(async () => {
  await i18n.changeLanguage('es-CO');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  precondiciones.push({ nombre: 'Zona horaria del proceso es America/Bogota', ok: tz === 'America/Bogota', detalle: `timeZone=${tz}` });

  const predPage = readFileSync(join(RAIZ_FRONT, 'src/prediction/pages/PrediccionPage.tsx'), 'utf8');
  const linea = "permisoNombre: ['historial_clinico_predictivo', ACCION_R]";
  precondiciones.push({ nombre: 'PrediccionPage.tsx protege la pestaña con historial_clinico_predictivo en lectura', ok: predPage.includes(linea), detalle: linea });

  const i18nEs = JSON.parse(readFileSync(join(RAIZ_FRONT, 'src/shared/i18n/locales/es-CO/prediction.json'), 'utf8')).historialpredictivo;
  const textos = { modo_AGRUPADO: 'Agrupada', modo_LINEAL: 'Lineal', n_eventos_other: '{{count}} eventos', grupos_other: '{{count}} grupos de eventos cercanos' };
  const malos = Object.entries(textos).filter(([k, v]) => i18nEs?.[k] !== v).map(([k]) => `${k}="${i18nEs?.[k]}"`);
  precondiciones.push({ nombre: 'Textos de es-CO usados por la medición (prediction.json, historialpredictivo)', ok: malos.length === 0, detalle: malos.length ? malos.join('; ') : JSON.stringify(textos) });

  for (const id of [4001, 4002]) {
    const r = construirRespuesta(id, new URLSearchParams());
    const esc = ESCENARIOS[id];
    const corr = r.correspondencias.map((c) => `${nombrePorId(esc, c.id_resultado_inferencia, c.id_evento)} ${c.diferencia_minutos} "${c.diferencia}" ${c.colision}`);
    const todos = [...esc.preds, ...esc.eventos, ...esc.retros];
    const nombreDe = (m: Record<string, unknown>) => todos.find((f) => iso(f.fecha) === m.fecha)?.nombre ?? '?';
    const grupos = r.grupos.map((g) => g.map(nombreDe).join(','));
    const ok = JSON.stringify(corr) === JSON.stringify(CORRESPONDENCIAS_ESPERADAS[id]) && JSON.stringify(grupos) === JSON.stringify(GRUPOS_ESPERADOS[id]);
    precondiciones.push({ nombre: `El simulador reproduce el backend en ${id} (correspondencias y grupos)`, ok,
      detalle: `ventana=${VENTANA_SIMULADOR}; correspondencias=${JSON.stringify(corr)}; grupos=${JSON.stringify(grupos)}` });
  }
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T17:00:00Z'));
  peticiones = [];
  http.defaults.adapter = adaptadorSimulado;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  http.defaults.adapter = adaptadorOriginal;
});

afterAll(() => {
  const fallidas = precondiciones.filter((p) => !p.ok).map((p) => p.nombre);
  if (fallidas.length > 0 || precondiciones.length === 0) {
    for (const c of CPS) {
      c.obtenido = `Precondición no cumplida (${fallidas.join('; ') || 'sin precondiciones evaluadas'}); medido: ${c.obtenido}`;
      c.estado = 'FALLA';
    }
  }
  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const reintento = Number(process.env.REINTENTO ?? '0');
  const reporte = {
    tc: TC, parte: 'vitest', reintento, run_id: process.env.RUN_ID ?? '', fecha: new Date().toISOString(),
    summary: { total: CPS.length, ok, falla: CPS.length - ok, veredicto: ok === CPS.length ? 'Aprobado' : 'Rechazado' },
    precondiciones, checkpoints: CPS, observaciones, retirados,
  };
  const dir = process.env.STAGING_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `parcial_vitest_${TC}${reintento > 0 ? `_reintento${reintento}` : ''}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-052: ventana de correspondencia (4001: 5 predicciones y 5 eventos)
// ---------------------------------------------------------------------------------------------------------------
const ETQ_4001 = ESCENARIOS[4001].etiqueta;
const ETQ_4002 = ESCENARIOS[4002].etiqueta;

describe('TC-M08-052 Ventana de correspondencia (RF-106 Restricción 5b; CA-7 A y B)', () => {
  const casoVinculado = (paso: string, i: number, j: number, par: string) => async () => {
    montar();
    const sel = await seleccionar(ETQ_4001);
    const m = medirPar(i, j, 5, 5);
    const ok = sel === '' && m.conteoOk && m.conectores === 1;
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${m.conteo}; conectores_${par.replace('-', '_')}=${m.conectores}; punteados_fuera_de_la_cuadricula=${leerPunteados().length}`;
    anotar(paso, ok, obtenido);
    expect(ok, obtenido).toBe(true);
  };

  it('CP-01 Δt 10 h (Lineal)', casoVinculado('CP-01', 0, 0, 'P1-E1'));
  it('CP-02 Δt 12 h 00 min (Lineal)', casoVinculado('CP-02', 1, 1, 'P2-E2'));
  it('CP-03 Δt -10 h (Lineal)', casoVinculado('CP-03', 4, 4, 'P5-E5'));

  it('CP-04 Δt 12 h 01 min y 20 h (Lineal)', async () => {
    montar();
    const sel = await seleccionar(ETQ_4001);
    const u3 = ubicar(2, 2, 5, 5);
    const u4 = ubicar(3, 3, 5, 5);
    const c3 = u3.ok ? conectoresEntre(u3.p, u3.e) : -1;
    const c4 = u4.ok ? conectoresEntre(u4.p, u4.e) : -1;
    const ok = sel === '' && u3.ok && u4.ok && c3 === 0 && c4 === 0;
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${u3.conteo}; conectores_P3_E3=${c3}; conectores_P4_E4=${c4}; punteados_fuera_de_la_cuadricula=${leerPunteados().length}`;
    anotar('CP-04', ok, obtenido);
    expect(ok, obtenido).toBe(true);
  });

  it('CP-05 Los cinco pares en modo Agrupada', async () => {
    montar();
    const sel = await seleccionar(ETQ_4001);
    const modo = sel === '' ? await cambiarModo('Agrupada') : 'no se cambió de modo';
    const pares: Array<[number, string, number]> = [[0, 'P1-E1', 1], [1, 'P2-E2', 1], [2, 'P3-E3', 0], [3, 'P4-E4', 0], [4, 'P5-E5', 1]];
    const partes: string[] = [];
    let ok = sel === '' && modo === '';
    for (const [k, par, esperados] of pares) {
      const m = medirPar(k, k, 5, 5);
      ok = ok && m.conteoOk && m.conectores === esperados;
      partes.push(`${par}=${m.conectores}`);
    }
    partes.unshift(`puntos/eventos=${leerPuntosLinea().length}/${leerMarcadoresEvento().length}; conectores:`);
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${modo ? `modo=${modo}; ` : ''}${partes.join('; ')}`;
    anotar('CP-05', ok, obtenido);

    const lista = textosLista(/relacionadas? con (un )?eventos?/);
    observaciones.push(`OBS-5 (medida, 4001): la vista lista las correspondencias como texto, debajo de la gráfica, en un desplegable (${lista.length} elementos): [${lista.map((t) => `"${t}"`).join(', ')}]. El texto lo arma el backend (historial_predictivo.py:101).`);
    expect(ok, obtenido).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// TC-M08-053: colision y orden del grupo (4002: 4 predicciones, 4 eventos y 1 retroalimentacion)
// ---------------------------------------------------------------------------------------------------------------
describe('TC-M08-053 Colisión y cercanos no colisionados (RF-106 Restricción 5c y 5d; CA-7 C)', () => {
  const casoColision = (paso: string, i: number, par: string) => async () => {
    montar();
    const sel = await seleccionar(ETQ_4002);
    const uL = ubicar(i, i, 4, 4);
    const lineal = uL.ok ? hayMarcadorGrupo(2, [uL.p, uL.e]) : { ok: false, detalle: uL.conteo };
    if (paso === 'CP-06' && uL.ok) {
      const puntos = leerPuntosLinea().filter((p) => Math.abs(p.x - uL.p.x) <= 3).length;
      const evts = leerMarcadoresEvento().filter((e) => Math.abs(e.x - uL.e.x) <= 3).length;
      observaciones.push(`OBS-4 (medida, 4002, Lineal): en la posición del grupo P6/E6 siguen dibujados ${puntos} punto(s) de la línea y ${evts} marcador(es) de evento por separado.`);
    }
    const modo = sel === '' ? await cambiarModo('Agrupada') : 'no se cambió de modo';
    const uA = ubicar(i, i, 4, 4);
    const agrupado = uA.ok ? hayMarcadorGrupo(2, [uA.p, uA.e]) : { ok: false, detalle: uA.conteo };
    const lista = textosLista(/grupos? de eventos cercanos/).map((t) => t.slice(0, 60));
    const ok = sel === '' && modo === '' && lineal.ok && agrupado.ok;
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${modo ? `modo=${modo}; ` : ''}${par}: LINEAL marcadores_N_eventos=${lineal.detalle}; AGRUPADO marcadores_N_eventos=${agrupado.detalle}; lista_agrupado=[${lista.map((t) => `"${t}"`).join(', ')}]`;
    anotar(paso, ok, obtenido);
    expect(ok, obtenido).toBe(true);
  };

  it('CP-06 Colisión a 30 min', casoColision('CP-06', 0, 'P6/E6'));
  it('CP-07 Colisión a 60 min', casoColision('CP-07', 1, 'P7/E7'));

  it('CP-08 61 min: cercanos no colisionados (Lineal)', async () => {
    montar();
    const sel = await seleccionar(ETQ_4002);
    const u = ubicar(2, 2, 4, 4);
    const grupo = u.ok ? hayMarcadorGrupo(2, [u.p, u.e]) : { ok: true, detalle: u.conteo };
    const conectores = u.ok ? conectoresEntre(u.p, u.e) : -1;
    const ok = sel === '' && u.ok && !grupo.ok && conectores === 1;
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${u.conteo}; sin_marcador_grupo=${u.ok ? !grupo.ok : '(no medido)'} ${grupo.detalle}; conectores_P8_E8=${conectores}`;
    anotar('CP-08', ok, obtenido);
    expect(ok, obtenido).toBe(true);
  });

  it('CP-09 Orden al expandir el grupo de tres (Agrupada)', async () => {
    montar();
    const sel = await seleccionar(ETQ_4002);
    const modo = sel === '' ? await cambiarModo('Agrupada') : 'no se cambió de modo';
    const { abierto, grupos } = abrirGrupos();
    const esc = ESCENARIOS[4002];
    const porFecha = new Map([...esc.preds, ...esc.eventos, ...esc.retros].map((f) => [fechaBogota(f.fecha), f.nombre] as const));
    const g3 = grupos.find((g) => g.items.length === 3);
    const identificados = g3 ? g3.items.map((it) => porFecha.get(it.fecha) ?? `?(${it.fecha})`) : [];
    const ok = sel === '' && modo === '' && JSON.stringify(identificados) === JSON.stringify(['R9', 'E9', 'P9']);
    const obtenido = `${sel ? `seleccion=${sel}; ` : ''}${modo ? `modo=${modo}; ` : ''}details_open=${abierto}; grupos=${grupos.length}; grupo_de_3=${g3 ? `[${g3.items.map((it) => `"${it.etiqueta} · ${it.fecha}"`).join(', ')}]` : '(no hay)'}; orden_identificado=[${identificados.join(', ')}]`;
    anotar('CP-09', ok, obtenido);

    const etiquetas = grupos.flatMap((g) => g.items.map((it) => it.etiqueta));
    observaciones.push(`OBS-7 (medida, 4002, Agrupada): etiquetas de tipo al expandir los grupos: [${[...new Set(etiquetas)].map((e) => `"${e}"`).join(', ')}]. Con la forma real de la respuesta, el "tipo" de un evento sanitario es su tipo clínico (DIAGNOSTICO, TRATAMIENTO…), porque serial() pone {"tipo": m.tipo, ..., **m.datos} y datos trae "tipo": e["tipo"] (consultar_historial_predictivo_use_case.py:105 y :118-119); la vista traduce historialpredictivo.tipo.<tipo> (HistorialPredictivoView.tsx:255) y espera EVENTO_SANITARIO (historialPredictivoApi.ts:8; tooltip :130).`);
    expect(ok, obtenido).toBe(true);
  });
});

describe('Observaciones del código (no son checkpoints)', () => {
  it('registra las observaciones de diseño', () => {
    observaciones.push('OBS-1: los límites (≤ 12 h y ≤ 1 h, inclusivos y en los dos sentidos) los calcula el backend (historial_predictivo.py:21, :84, :96-97); aquí el simulador los replica. Con datos reales se verifican en CP-10 a CP-13.');
    observaciones.push('OBS-2: la agrupación del backend es encadenada (historial_predictivo.py:84 compara con el último del grupo): marcadores a menos de 1 h entre sí forman un solo grupo aunque el primero y el último estén a más de 1 h. R5c no define las cadenas.');
    observaciones.push('OBS-3: CA-12 dice ±24 h y la Restricción 5b ±12 h (configurable en M09); se usa 12 h (valor por defecto y el de TEST).');
    observaciones.push('OBS-6: la vista no usa el campo "colision" de las correspondencias (HistorialPredictivoView.tsx:261-266).');
    observaciones.push('OBS-8: en recharts 3.10 el ComposedChart solo admite tooltip por eje (ComposedChart.js, allowedTooltipTypes = [\'axis\']) y con el eje X numérico el tooltip solo se ubica en los extremos del dominio (tooltipSelectors.js, scale.domain()); además marcadorTooltip lee payload[0], que es la línea (HistorialPredictivoView.tsx:124). Por eso el tooltip no puede mostrar un evento intermedio; se mide en navegador real en CP-14.');
    expect(observaciones.length).toBeGreaterThan(0);
  });
});
