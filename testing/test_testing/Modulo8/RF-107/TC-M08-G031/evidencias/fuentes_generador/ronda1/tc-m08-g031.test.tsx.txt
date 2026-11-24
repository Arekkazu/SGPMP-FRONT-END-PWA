// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-21 | Juan Sebastian Gutierrez | TC-M08-G031 (RF-107, TC-M08-071): estado de sincronizacion y panel por modulo v1 |
//
// QA SGPMP - Evaluacion (ronda 1). Prueba de componente con Vitest + jsdom, sin red.
// Reporte: JSON propio en STAGING_DIR (resultado_TC-M08-G031[_reintentoN].json). Cada checkpoint arranca en FALLA "No alcanzado".
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncOperation } from '../../../../../src/shared/db/db';

const { mockGetQueue, mockGetConflictos } = vi.hoisted(() => ({
  mockGetQueue: vi.fn<() => Promise<SyncOperation[]>>(),
  mockGetConflictos: vi.fn<() => Promise<SyncOperation[]>>(),
}));

vi.mock('../../../../../src/shared/sync/syncQueue', () => ({
  getQueue: mockGetQueue,
  getConflictos: mockGetConflictos,
  SYNC_REPLAY_TERMINADO: 'sgpmp:sync-replay-terminado',
}));

import i18n from '../../../../../src/shared/i18n';
import { EstadoSincronizacion } from '../../../../../src/shared/design-system/EstadoSincronizacion';
import { peticionIniciada, peticionTerminada } from '../../../../../src/shared/sync/estadoSincronizacion';

const TC = 'TC-M08-G031';
const T_BASE_ISO = '2026-11-21T20:00:00Z';
const T_CONFLICTO_MS = new Date('2026-11-21T19:30:00Z').getTime();

type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }

const CPS: Checkpoint[] = [
  {
    paso: 'CP-01',
    esperado: 'SINCRONIZADO: online, cola vacía y sin peticiones => button.ds-sync con clase ds-sync--SINCRONIZADO, texto «Sincronizado» y svg con clase lucide-cloud-check',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-02',
    esperado: 'SINCRONIZANDO: online y peticionIniciada() sin terminar => ds-sync--SINCRONIZANDO y texto «Sincronizando»',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-03',
    esperado: 'OFFLINE: navigator.onLine=false y evento offline => ds-sync--OFFLINE, texto «Sin conexión» y svg lucide-cloud-off',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-04',
    esperado: 'CONFLICTO: online con 1 conflicto en getConflictos => ds-sync--CONFLICTO, texto «Conflicto» y svg lucide-cloud-alert',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-05',
    esperado: 'Panel (CA-15): diálogo con .ds-sync__tabla y exactamente 6 filas en orden Activos biológicos, Telemetría, Predicción, Suministros, Finanzas, Integración contable; cada fila con 4 celdas td',
    fuente: 'RF-107 CA-15; 8.4; TC-M08-071',
  },
  {
    paso: 'CP-06',
    esperado: 'Formato último sincronizado (8.4): con último exitoso de Activos a las 2026-11-21T20:00:00Z, la celda de Activos es exactamente «2026-11-21 15:00»',
    fuente: 'RF-107 8.4 («AAAA-MM-DD HH:MM»); TC-M08-071',
  },
  {
    paso: 'CP-07',
    esperado: 'Pendientes (8.4): (a) SINCRONIZADO => las 6 filas con 0; (b) OFFLINE con 2 operaciones en cola para activos => fila Activos en «Sin conexión» con 2',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-08',
    esperado: 'Acción disponible (8.4): CONFLICTO (Activos) <button> «Resolver conflicto»; OFFLINE (Activos) <a>/<button> «Ver cola»; SINCRONIZANDO (Suministros) <a>/<button> «Ver detalle»; SINCRONIZADO sin botón ni enlace',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-09',
    esperado: 'Contenido OFFLINE (8.4): tras avanzar 5 min en OFFLINE con 2 acciones encoladas, el panel contiene (i) tiempo transcurrido, (ii) registrar_evento y registrar_crecimiento, y (iii) mención de caché (/cach[eé]/i)',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-10',
    esperado: 'Contenido CONFLICTO (8.4): en escenario CP-04 el panel contiene valor local «Lote QA 1», valor del servidor (/servidor/i) y una fecha de la divergencia',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
  {
    paso: 'CP-11',
    esperado: 'SINCRONIZANDO por módulo (8.4): online con 3 operaciones en cola para suministros sin conflicto => fila Suministros en «Sincronizando» con 3 pendientes',
    fuente: 'RF-107 8.4; TC-M08-071',
  },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const retirados: Array<{ paso: string; motivo: string }> = [];

const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso);
  if (!cp) throw new Error(`Checkpoint desconocido ${paso}`);
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}

const OP_CONFLICTO: SyncOperation = {
  id: 7,
  modulo: 'activos',
  accion: 'actualizar_activo',
  payload: { nombre: 'Lote QA 1' },
  intentos: 1,
  creadoEn: T_CONFLICTO_MS,
  conflicto: true,
  status: 409,
  error: 'El nombre ya existe.',
};

const OPS_OFFLINE_ACTIVOS: SyncOperation[] = [
  { id: 11, modulo: 'activos', accion: 'registrar_evento', payload: { id_activo: 885 }, intentos: 0, creadoEn: new Date('2026-11-21T20:00:00Z').getTime() },
  { id: 12, modulo: 'activos', accion: 'registrar_crecimiento', payload: { id_activo: 885, valor: 420 }, intentos: 0, creadoEn: new Date('2026-11-21T20:01:00Z').getTime() },
];

const OPS_SUMINISTROS_3: SyncOperation[] = [
  { id: 21, modulo: 'suministros', accion: 'registrar_entrega', payload: { n: 1 }, intentos: 0, creadoEn: new Date('2026-11-21T20:00:00Z').getTime() },
  { id: 22, modulo: 'suministros', accion: 'registrar_entrega', payload: { n: 2 }, intentos: 0, creadoEn: new Date('2026-11-21T20:00:10Z').getTime() },
  { id: 23, modulo: 'suministros', accion: 'registrar_entrega', payload: { n: 3 }, intentos: 0, creadoEn: new Date('2026-11-21T20:00:20Z').getTime() },
];

function fijarOnLine(valor: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => valor });
}

async function cambiarConexion(valor: boolean): Promise<void> {
  fijarOnLine(valor);
  await act(async () => {
    window.dispatchEvent(new Event(valor ? 'online' : 'offline'));
  });
}

function leerIcono(): { clase: string; texto: string; svgClase: string; aria: string } {
  const btn = document.querySelector('button.ds-sync') as HTMLButtonElement | null;
  if (!btn) return { clase: '(ausente)', texto: '(ausente)', svgClase: '(ausente)', aria: '(ausente)' };
  const txt = btn.querySelector('.ds-sync__texto');
  const svg = btn.querySelector('svg');
  return {
    clase: norm(btn.className),
    texto: norm(txt?.textContent ?? btn.textContent),
    svgClase: norm(svg?.getAttribute('class') ?? ''),
    aria: norm(btn.getAttribute('aria-label')),
  };
}

async function esperarEstable(): Promise<{ clase: string; texto: string; svgClase: string; aria: string }> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 15));
  });
  let prev = leerIcono();
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const actLectura = leerIcono();
    if (actLectura.clase === prev.clase && actLectura.texto === prev.texto && actLectura.svgClase === prev.svgClase) {
      return actLectura;
    }
    prev = actLectura;
  }
  return prev;
}

interface FilaTabla {
  modulo: string;
  estado: string;
  estadoClase: string;
  ultimo: string;
  pendientes: string;
  accionTexto: string;
  accionElemento: string;
  celdasCount: number;
  accionTd: HTMLTableCellElement | null;
}

interface PanelLeido {
  presente: boolean;
  claseDialogo: string;
  titulo: string;
  descripcion: string;
  textoCompleto: string;
  filas: FilaTabla[];
}

async function abrirYLeerPanel(): Promise<PanelLeido> {
  const btn = document.querySelector('button.ds-sync') as HTMLButtonElement | null;
  if (!btn) {
    return { presente: false, claseDialogo: '', titulo: '', descripcion: '', textoCompleto: '', filas: [] };
  }
  await act(async () => {
    fireEvent.click(btn);
    await Promise.resolve();
  });
  const dlg = document.querySelector('[role="dialog"]') as HTMLElement | null;
  if (!dlg) {
    return { presente: false, claseDialogo: '', titulo: '', descripcion: '', textoCompleto: '', filas: [] };
  }
  const titulo = norm(dlg.querySelector('h1, h2, h3, .ds-modal__title')?.textContent);
  const descEl = dlg.querySelector('.ds-modal__desc, .ds-modal__description');
  const descripcion = norm(descEl?.textContent);
  const textoCompleto = norm(dlg.textContent);
  const tabla = dlg.querySelector('table.ds-sync__tabla');
  const filas: FilaTabla[] = [];
  if (tabla) {
    for (const tr of Array.from(tabla.querySelectorAll('tbody tr'))) {
      const th = tr.querySelector('th[scope="row"]');
      const tds = Array.from(tr.querySelectorAll('td')) as HTMLTableCellElement[];
      const accionTd = tds[3] ?? null;
      const interactivo = accionTd?.querySelector('button, a') ?? null;
      filas.push({
        modulo: norm(th?.textContent),
        estado: norm(tds[0]?.textContent),
        estadoClase: norm(tds[0]?.className),
        ultimo: norm(tds[1]?.textContent),
        pendientes: norm(tds[2]?.textContent),
        accionTexto: norm(accionTd?.textContent),
        accionElemento: interactivo ? `<${interactivo.tagName.toLowerCase()}>` : 'texto plano',
        celdasCount: tds.length,
        accionTd,
      });
    }
  }
  return {
    presente: true,
    claseDialogo: norm(dlg.className),
    titulo,
    descripcion,
    textoCompleto,
    filas,
  };
}

// Recolectores de observaciones
let obs1Detalle = 'no medido';
let obs3Detalle = 'no medido';
let obs4SvgSincronizando = 'no medido';
let obs5FilasCp02 = 'no medido';

beforeAll(async () => {
  await i18n.changeLanguage('es-CO');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  precondiciones.push({
    nombre: 'Zona horaria America/Bogota activa',
    ok: tz === 'America/Bogota',
    detalle: `timeZone=${tz}`,
  });
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T_BASE_ISO));
  mockGetQueue.mockReset();
  mockGetConflictos.mockReset();
  mockGetQueue.mockResolvedValue([]);
  mockGetConflictos.mockResolvedValue([]);
  fijarOnLine(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

afterAll(() => {
  if (precondiciones.some((p) => !p.ok)) {
    const nombres = precondiciones.filter((p) => !p.ok).map((p) => p.nombre).join('; ');
    for (const c of CPS) {
      c.obtenido = `Precondición no cumplida (${nombres}); medido: ${c.obtenido}`;
      c.estado = 'FALLA';
    }
  }

  observaciones.push(`OBS-1: panel en ventana centrada (ModalShell) y no lateral (8.4) — ${obs1Detalle}. Enlazada a INC-M08-NN-G026, defecto 4.`);
  observaciones.push('OBS-2: el ícono está en la barra superior (App.tsx:232, AppBar); la «barra inferior» corresponde al Tipo 4 de la Descripción (versión anterior).');
  observaciones.push(`OBS-3: texto/aviso mostrado al pasar a CONFLICTO frente a FA-7 (que la 8.x no nombra) — ${obs3Detalle}.`);
  observaciones.push(`OBS-4: svg de SINCRONIZANDO="${obs4SvgSincronizando}" (lucide-cloud-cog: engranaje, no reloj). Clases de color por estado: ds-sync--SINCRONIZADO, ds-sync--SINCRONIZANDO, ds-sync--OFFLINE, ds-sync--CONFLICTO (jsdom no aplica CSS).`);
  observaciones.push(`OBS-5: con solo una petición en vuelo (CP-02), estado por módulo de cada fila — ${obs5FilasCp02}.`);

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

describe('TC-M08-G031 Estado de sincronizacion y panel por modulo (RF-107 8.4 y CA-15)', () => {
  it('CP-01 SINCRONIZADO: online, cola vacia y sin peticiones', async () => {
    render(<EstadoSincronizacion />);
    const ic = await esperarEstable();
    const ok = ic.clase.includes('ds-sync--SINCRONIZADO')
      && ic.texto === 'Sincronizado'
      && ic.svgClase.includes('lucide-cloud-check');
    anotar('CP-01', ok, `clase="${ic.clase}"; texto="${ic.texto}"; svg="${ic.svgClase}"`);
    expect(ok).toBe(true);
  });

  it('CP-02 SINCRONIZANDO: online con peticion en curso', async () => {
    render(<EstadoSincronizacion />);
    await esperarEstable();
    peticionIniciada();
    try {
      const ic = await esperarEstable();
      obs4SvgSincronizando = ic.svgClase;
      const panel = await abrirYLeerPanel();
      obs5FilasCp02 = panel.filas.map((f) => `${f.modulo}=${f.estado}`).join(', ');
      const ok = ic.clase.includes('ds-sync--SINCRONIZANDO') && ic.texto === 'Sincronizando';
      anotar('CP-02', ok, `clase="${ic.clase}"; texto="${ic.texto}"; svg="${ic.svgClase}"`);
      expect(ok).toBe(true);
    } finally {
      peticionTerminada(undefined, false);
    }
  });

  it('CP-03 OFFLINE: navigator.onLine=false y evento offline', async () => {
    render(<EstadoSincronizacion />);
    await esperarEstable();
    await cambiarConexion(false);
    const ic = await esperarEstable();
    const ok = ic.clase.includes('ds-sync--OFFLINE')
      && ic.texto === 'Sin conexión'
      && ic.svgClase.includes('lucide-cloud-off');
    anotar('CP-03', ok, `clase="${ic.clase}"; texto="${ic.texto}"; svg="${ic.svgClase}"`);
    expect(ok).toBe(true);
  });

  it('CP-04 CONFLICTO: online con 1 conflicto en getConflictos', async () => {
    mockGetConflictos.mockResolvedValue([OP_CONFLICTO]);
    render(<EstadoSincronizacion />);
    const ic = await esperarEstable();
    const panel = await abrirYLeerPanel();
    obs3Detalle = `aria="${ic.aria}"; descripcion_dialogo="${panel.descripcion || panel.textoCompleto.slice(0, 140)}"`;
    const ok = ic.clase.includes('ds-sync--CONFLICTO')
      && ic.texto === 'Conflicto'
      && ic.svgClase.includes('lucide-cloud-alert');
    anotar('CP-04', ok, `clase="${ic.clase}"; texto="${ic.texto}"; svg="${ic.svgClase}"`);
    expect(ok).toBe(true);
  });

  it('CP-05 Panel (CA-15): 6 filas en orden esperado con 4 celdas td cada una', async () => {
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const panel = await abrirYLeerPanel();
    obs1Detalle = `dialogo_presente=${panel.presente ? 'sí' : 'no'}, clase="${panel.claseDialogo}", titulo="${panel.titulo}"`;
    const ordenEsperado = [
      'Activos biológicos',
      'Telemetría',
      'Predicción',
      'Suministros',
      'Finanzas',
      'Integración contable',
    ];
    const nombres = panel.filas.map((f) => f.modulo);
    const celdasPorFila = panel.filas.map((f) => f.celdasCount);
    const ok = panel.presente
      && nombres.length === 6
      && ordenEsperado.every((m, idx) => nombres[idx] === m)
      && celdasPorFila.every((n) => n === 4);
    anotar('CP-05', ok, `dialogo=${panel.presente}; filas=[${nombres.join(', ')}]; celdas_por_fila=[${celdasPorFila.join(', ')}]`);
    expect(ok).toBe(true);
  });

  it('CP-06 Formato del ultimo sincronizado (AAAA-MM-DD HH:MM)', async () => {
    vi.setSystemTime(new Date(T_BASE_ISO));
    peticionIniciada();
    peticionTerminada('/activos-biologicos/885', true);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const panel = await abrirYLeerPanel();
    const filaActivos = panel.filas.find((f) => f.modulo === 'Activos biológicos');
    const ultimo = filaActivos?.ultimo ?? '(fila ausente)';
    const ok = ultimo === '2026-11-21 15:00';
    anotar('CP-06', ok, `celda_activos="${ultimo}"`);
    expect(ok).toBe(true);
  });

  it('CP-07 Pendientes: (a) SINCRONIZADO 6 filas en 0; (b) OFFLINE con 2 en cola para activos', async () => {
    // Parte (a)
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const panelA = await abrirYLeerPanel();
    const pendA = panelA.filas.map((f) => `${f.modulo}:${f.pendientes}`);
    const okA = panelA.filas.length === 6 && panelA.filas.every((f) => f.pendientes === '0');
    cleanup();

    // Parte (b)
    mockGetQueue.mockResolvedValue(OPS_OFFLINE_ACTIVOS);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    await cambiarConexion(false);
    await esperarEstable();
    const panelB = await abrirYLeerPanel();
    const filaActivosB = panelB.filas.find((f) => f.modulo === 'Activos biológicos');
    const estadoB = filaActivosB?.estado ?? '(ausente)';
    const pendB = filaActivosB?.pendientes ?? '(ausente)';
    const okB = estadoB === 'Sin conexión' && pendB === '2';

    const ok = okA && okB;
    anotar('CP-07', ok, `(a) [${pendA.join(', ')}]; (b) Activos estado="${estadoB}", pendientes="${pendB}"`);
    expect(ok).toBe(true);
  });

  it('CP-08 Accion disponible: botones/enlaces por estado y sin accion interactiva en SINCRONIZADO', async () => {
    // 1) CONFLICTO (CP-04)
    mockGetConflictos.mockResolvedValue([OP_CONFLICTO]);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const pConf = await abrirYLeerPanel();
    const fConf = pConf.filas.find((f) => f.modulo === 'Activos biológicos');
    const btnConf = fConf?.accionTd ? within(fConf.accionTd).queryByRole('button') : null;
    const okConf = !!btnConf && norm(btnConf.textContent) === 'Resolver conflicto';
    cleanup();

    // 2) OFFLINE (CP-07 b)
    mockGetConflictos.mockResolvedValue([]);
    mockGetQueue.mockResolvedValue(OPS_OFFLINE_ACTIVOS);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    await cambiarConexion(false);
    await esperarEstable();
    const pOff = await abrirYLeerPanel();
    const fOff = pOff.filas.find((f) => f.modulo === 'Activos biológicos');
    const elOff = fOff?.accionTd?.querySelector('a, button') ?? null;
    const okOff = !!elOff && norm(elOff.textContent) === 'Ver cola';
    cleanup();

    // 3) SINCRONIZANDO (CP-11)
    fijarOnLine(true);
    mockGetConflictos.mockResolvedValue([]);
    mockGetQueue.mockResolvedValue(OPS_SUMINISTROS_3);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const pSync = await abrirYLeerPanel();
    const fSync = pSync.filas.find((f) => f.modulo === 'Suministros');
    const elSync = fSync?.accionTd?.querySelector('a, button') ?? null;
    const okSync = !!elSync && norm(elSync.textContent) === 'Ver detalle';
    cleanup();

    // 4) SINCRONIZADO (CP-01)
    mockGetQueue.mockResolvedValue([]);
    mockGetConflictos.mockResolvedValue([]);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const pOk = await abrirYLeerPanel();
    const interactivosOk = pOk.filas.filter((f) => f.accionTd?.querySelector('button, a') !== null).length;
    const okSin = pOk.filas.length === 6 && interactivosOk === 0;

    const ok = okConf && okOff && okSync && okSin;
    anotar(
      'CP-08',
      ok,
      `conflicto(Activos)=[${fConf?.accionElemento ?? 'ausente'} "${fConf?.accionTexto ?? ''}"]; `
      + `offline(Activos)=[${fOff?.accionElemento ?? 'ausente'} "${fOff?.accionTexto ?? ''}"]; `
      + `sincronizando(Suministros)=[${fSync?.accionElemento ?? 'ausente'} "${fSync?.accionTexto ?? ''}"]; `
      + `sincronizado(interactivos=${interactivosOk}/6)`,
    );
    expect(ok).toBe(true);
  });

  it('CP-09 Contenido OFFLINE: tiempo transcurrido, acciones encoladas y modulos con cache', async () => {
    mockGetQueue.mockResolvedValue(OPS_OFFLINE_ACTIVOS);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    await cambiarConexion(false);
    await esperarEstable();

    // Avanzar 5 minutos con vi.setSystemTime
    vi.setSystemTime(new Date('2026-11-21T20:05:00Z'));
    const panel = await abrirYLeerPanel();
    const txt = panel.textoCompleto;
    const tieneTiempo = /\b\d+\s*(s|seg|segundos?|min|minutos?|h|horas?)\b/i.test(txt);
    const tieneEv = txt.includes('registrar_evento');
    const tieneCrec = txt.includes('registrar_crecimiento');
    const tieneAcciones = tieneEv && tieneCrec;
    const tieneCache = /cach[eé]/i.test(txt);

    const ok = tieneTiempo && tieneAcciones && tieneCache;
    anotar(
      'CP-09',
      ok,
      `tiempo=${tieneTiempo}; acciones(registrar_evento=${tieneEv}, registrar_crecimiento=${tieneCrec}); cache=${tieneCache}; texto="${txt}"`,
    );
    expect(ok).toBe(true);
  });

  it('CP-10 Contenido CONFLICTO: valor local, valor del servidor y fecha de divergencia', async () => {
    mockGetConflictos.mockResolvedValue([OP_CONFLICTO]);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const panel = await abrirYLeerPanel();
    const txt = panel.textoCompleto;
    const tieneLocal = txt.includes('Lote QA 1');
    const tieneServidor = /servidor/i.test(txt);
    const tieneFecha = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(txt);

    const ok = tieneLocal && tieneServidor && tieneFecha;
    anotar(
      'CP-10',
      ok,
      `local=${tieneLocal}; servidor=${tieneServidor}; fecha=${tieneFecha}; texto="${txt}"`,
    );
    expect(ok).toBe(true);
  });

  it('CP-11 SINCRONIZANDO por modulo: 3 operaciones en cola para suministros', async () => {
    mockGetQueue.mockResolvedValue(OPS_SUMINISTROS_3);
    render(<EstadoSincronizacion />);
    await esperarEstable();
    const panel = await abrirYLeerPanel();
    const filaSum = panel.filas.find((f) => f.modulo === 'Suministros');
    const estado = filaSum?.estado ?? '(ausente)';
    const pend = filaSum?.pendientes ?? '(ausente)';
    const ok = estado === 'Sincronizando' && pend === '3';
    anotar('CP-11', ok, `Suministros estado="${estado}", pendientes="${pend}"`);
    expect(ok).toBe(true);
  });
});
