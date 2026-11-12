/// <reference types="cypress" />
// TC-M05-G41 · RF-81 · Consulta de historial de suministros por activo
// Casos agrupados: TC-M05-098, TC-M05-099, TC-M05-104
// Rol: Gestor de Granja (GESTOR_GRANJA_EMAIL / GESTOR_GRANJA_PASSWORD de .env.test).

import {
  type ResumenSandbox,
  rutaApp,
  visitar,
  sandboxHeadersIfActive,
  sumarHistorialGet,
} from '../support/commands';

type Estado = 'OK' | 'FALLA';
interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

type IdCp =
  | '098-01' | '098-02' | '098-03' | '098-04' | '098-05' | '098-06' | '098-07'
  | '099-01' | '099-02' | '099-03' | '099-04' | '099-05' | '099-06' | '099-07' | '099-08'
  | '104-01' | '104-02';

const TC = 'TC-M05-G41';
const ACTIVO_ID = 1624;
const RUN_ID = `tc-m05-g41-${Date.now()}`;
const MODO = String(Cypress.env('G41_MODO') || 'ensayo').toLowerCase() === 'oficial' ? 'oficial' : 'ensayo';
const TITULO_VEREDICTO = 'Veredicto · consolidación de resultados TC-M05-G41';

const COSTOS_ORACULO_099 = [
  125012.45,
  100009.32,
  125010.45,
  100007.72,
  125014.45,
  100010.92,
  125008.45,
  100006.12,
];

const ESPERADOS: Record<IdCp, { paso: string; esperado: string }> = {
  '098-01': {
    paso: '098-01 UI: tabla página 1 sin filtros muestra 50 filas',
    esperado: '50 filas',
  },
  '098-02': {
    paso: '098-02 UI: resumen sin filtros muestra total 500 y monto 63753757.50',
    esperado: '500 y ≈63753757.50 (|diff| <= 0.5)',
  },
  '098-03': {
    paso: '098-03 UI: fechas de columna fecha página 1 en orden descendente (0 inversiones)',
    esperado: '0 inversiones',
  },
  '098-04': {
    paso: '098-04 UI: Anterior deshabilitado en pág 1; Siguiente pasa a pág 2 con 50 filas distintas',
    esperado: 'Anterior deshabilitado pág 1; pág 2 con 50 filas y 1a fila distinta',
  },
  '098-05': {
    paso: '098-05 UI: navegar hasta última página (10) muestra 50 filas y Siguiente deshabilitado',
    esperado: '50 filas, Siguiente deshabilitado',
  },
  '098-06': {
    paso: '098-06 API: GET historial?id_activo_biologico=1624 por defecto (pág 1 / 50 filas)',
    esperado: 'HTTP 200, 50 items, total_paginas 10, total 500, monto 63753757.50, tipos 125 c/u, ciclos 3 (150/150/200), nivel_volumen 1, contexto false',
  },
  '098-07': {
    paso: '098-07 API: registros_por_pagina=200 págs 1-3 suman 500 IDs únicos y fecha DESC',
    esperado: '200+200+100 filas, 500 IDs únicos, fecha_aplicacion no creciente en 499 transiciones',
  },
  '099-01': {
    paso: '099-01 UI: filtro combinado MEDICAMENTO+MANUAL+2026-04-23..2026-07-31+100000..300000',
    esperado: '8 filas, resumen total 8 y monto ≈900079.88',
  },
  '099-02': {
    paso: '099-02 UI: conjunto de costos de las 8 filas igual al oráculo y cumplimiento de 4 filtros',
    esperado: 'Mismo conjunto numérico de 8 costos y 8/8 filas cumplen tipo/origen/fecha',
  },
  '099-03': {
    paso: '099-03 UI: vacío por costo (MEDICAMENTO + costo_min=500000)',
    esperado: '0 filas, resumen en cero y estado vacío visible',
  },
  '099-04': {
    paso: '099-04 UI: vacío por fecha (2025-01-01..2025-12-31)',
    esperado: '0 filas, resumen en cero y estado vacío visible',
  },
  '099-05': {
    paso: '099-05 UI: desde > hasta muestra error de validación y envía 0 GET historial',
    esperado: 'Error de validación visible y 0 GET /suministros/historial',
  },
  '099-06': {
    paso: '099-06 UI: costo_min > costo_max muestra error de validación y envía 0 GET historial',
    esperado: 'Error de validación visible y 0 GET /suministros/historial',
  },
  '099-07': {
    paso: '099-07 API: combinado, simples (MEDICAMENTO/MANUAL/M40_AUTOMATICO) y 2 vacíos con mensaje literal',
    esperado: '8 (900079.88), 125, 251, 249, y 2 vacíos HTTP 200 items=[] ceros con mensaje literal activo 1624',
  },
  '099-08': {
    paso: '099-08 API: rangos inválidos fecha_fin < fecha_inicio y costo_max < costo_min → HTTP 422',
    esperado: 'HTTP 422 en ambos casos',
  },
  '104-01': {
    paso: '[SIMULADO] 104-01 UI: datos_contexto_no_disponibles=true y nombre_ciclo/especie=null',
    esperado: 'Aviso de datos de contexto no disponibles visible y tabla con filas > 0',
  },
  '104-02': {
    paso: '104-02 API real: datos_contexto_no_disponibles=false en 1624 (M02 disponible)',
    esperado: 'datos_contexto_no_disponibles=false',
  },
};

const ORDEN = Object.keys(ESPERADOS) as IdCp[];
const resultados = new Map<IdCp, Checkpoint>();
const evaluados = new Set<IdCp>();
const scriptErrors: string[] = [];

for (const id of ORDEN) {
  resultados.set(id, {
    ...ESPERADOS[id],
    obtenido: 'No evaluado (error de script previo o bloque no ejecutado).',
    estado: 'FALLA',
  });
}

function registrar(id: IdCp, ok: boolean, obtenido: string): void {
  evaluados.add(id);
  resultados.set(id, { ...ESPERADOS[id], obtenido, estado: ok ? 'OK' : 'FALLA' });
  cy.log(`${id} → ${ok ? 'OK' : 'FALLA'} · ${obtenido}`);
}

const observaciones: Record<string, unknown> = {
  modo: MODO,
  idiomaPorDefecto: '',
  columnasTabla: [],
  muestraPrimeraFilaUI: [],
  desgloseEnResumen: { porTipo: false, porCiclo: false, textosTipos: [] as string[] },
  existeFiltroCicloEnUI: false,
  estadoVacioTextoLiteral: '',
  muestraResumenMensajeAlert: false,
  resumenMensajeTextoLiteral: '',
  registroPorPagina201: null,
  respuestasNoExitosasOFallas: [] as unknown[],
  sandbox: { confirmado: false, sinSandboxMensaje: '' },
};

const ctx = {
  loginOk: false,
  sandboxConfirmado: false,
  primeraFilaPag1: '',
};

Cypress.on('fail', (err, runnable) => {
  const titulo = runnable?.title || 'desconocido';
  if (titulo !== TITULO_VEREDICTO) {
    scriptErrors.push(`[${titulo}] ${err.message}`);
  }
  throw err;
});

// ── Helpers de texto, moneda y fecha ──────────────────────────────────
const RE = {
  menuSuministros: /^\s*(suministros|supplies)\s*$/i,
  pestanaHistorial: /^\s*(historial|history)\s*$/i,
  consultar: /^\s*(consultar|look up|search)\s*$/i,
  anterior: /^\s*(anterior|previous)\s*$/i,
  siguiente: /^\s*(siguiente|next)\s*$/i,
  vacioFiltro: /(sin suministros con esos filtros|no supplies match those filters)/i,
  sinContexto: /(algunos datos de contexto \(activo, ciclo\) no est[aá]n disponibles|some context data \(asset, cycle\) is unavailable)/i,
};

function normText(el: Element | null | undefined): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function parseMonedaUI(raw: string, isEnUS: boolean): number {
  const clean = raw.replace(/[^\d.,-]/g, '').trim();
  if (!clean) return NaN;
  if (isEnUS) {
    return Number(clean.replace(/,/g, ''));
  }
  // es-CO: '.' separador de miles, ',' separador decimal
  return Number(clean.replace(/\./g, '').replace(',', '.'));
}

const MESES: Record<string, number> = {
  ene: 1, jan: 1,
  feb: 2,
  mar: 3,
  abr: 4, apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8, aug: 8,
  sep: 9, sept: 9,
  oct: 10,
  nov: 11,
  dic: 12, dec: 12,
};

function parseFechaTabla(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // es-CO medium: "8 nov 2026" o "8 nov. 2026"
  const mEs = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\.?\s+(?:de\s+)?(\d{4})$/i);
  if (mEs) {
    const mes = MESES[mEs[2].toLowerCase()];
    if (mes) {
      return `${mEs[3]}-${String(mes).padStart(2, '0')}-${mEs[1].padStart(2, '0')}`;
    }
  }
  // en-US medium: "Nov 8, 2026"
  const mEn = s.match(/^([a-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/i);
  if (mEn) {
    const mes = MESES[mEn[1].toLowerCase()];
    if (mes) {
      return `${mEn[3]}-${String(mes).padStart(2, '0')}-${mEn[2].padStart(2, '0')}`;
    }
  }
  // Numérico D/M/YYYY o DD/MM/YYYY (ej. "8/11/2026" = 8 de noviembre de 2026)
  const mNum = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mNum) {
    const dia = Number(mNum[1]);
    const mes = Number(mNum[2]);
    const anio = Number(mNum[3]);
    const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fechaUtc.getUTCFullYear() === anio &&
      fechaUtc.getUTCMonth() === mes - 1 &&
      fechaUtc.getUTCDate() === dia
    ) {
      return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
  }
  return null;
}

function obtenerResumenEl(doc: Document): HTMLElement | null {
  return doc.querySelector<HTMLElement>(
    'section[aria-label="Resumen del historial"], section[aria-label="History summary"]',
  );
}

function obtenerTablaRows(doc: Document): HTMLTableRowElement[] {
  const region = doc.querySelector<HTMLElement>(
    'div[role="region"][aria-label="Historial de suministros"], div[role="region"][aria-label="Supplies history"]',
  );
  if (!region) return Array.from(doc.querySelectorAll<HTMLTableRowElement>('table tbody tr'));
  return Array.from(region.querySelectorAll<HTMLTableRowElement>('table tbody tr'));
}

function leerResumenUI(doc: Document): {
  encontrado: boolean;
  isEnUS: boolean;
  total: number;
  monto: number;
  montoRaw: string;
  texto: string;
} {
  const sec = obtenerResumenEl(doc);
  if (!sec) {
    return { encontrado: false, isEnUS: false, total: NaN, monto: NaN, montoRaw: '', texto: '' };
  }
  const txt = normText(sec);
  const isEnUS = /history summary|filtered total/i.test(sec.getAttribute('aria-label') || txt);
  const montoEl = sec.querySelectorAll('p')[1];
  const regEl = sec.querySelectorAll('p')[2];
  const montoRaw = normText(montoEl);
  const regRaw = normText(regEl);
  const mReg = regRaw.match(/(\d[\d.,]*)\s*(registros?|records?)/i) || txt.match(/(\d[\d.,]*)\s*(registros?|records?)/i);
  const total = mReg ? Number(mReg[1].replace(/[.,]/g, '')) : NaN;
  const monto = parseMonedaUI(montoRaw, isEnUS);
  return { encontrado: true, isEnUS, total, monto, montoRaw, texto: txt };
}

function limpiarTextoDiagnostico(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function esElementoVisibleDOM(doc: Document, selector: string, extra?: (el: HTMLElement) => boolean): boolean {
  const el = doc.querySelector<HTMLElement>(selector);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = doc.defaultView?.getComputedStyle(el);
  const visible =
    !!style &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    (rect.width > 0 || rect.height > 0);
  if (!visible) return false;
  return extra ? extra(el) : true;
}

function asegurarVisible(selector: string, contexto: string, extra?: (el: HTMLElement) => boolean): void {
  cy.esperarCondicion((doc) => esElementoVisibleDOM(doc, selector, extra), 30000, 200).then((ok) => {
    if (!ok) {
      cy.url({ log: false }).then((urlActual) => {
        cy.document({ log: false }).then((doc) => {
          const snippet = limpiarTextoDiagnostico(doc.body?.innerText || normText(doc.body));
          const shotName = `error_script_${contexto.replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
          cy.screenshot(shotName, { capture: 'viewport' });
          const detalle = `ERROR DE SCRIPT (${contexto}): selector="${selector}" no visible | url="${urlActual}" | body300="${snippet}" | screenshot="${shotName}.png"`;
          const diags = Array.isArray(observaciones.scriptDiagnostics) ? (observaciones.scriptDiagnostics as unknown[]) : [];
          diags.push({ contexto, selector, url: urlActual, body300: snippet, screenshot: `${shotName}.png` });
          observaciones.scriptDiagnostics = diags;
          throw new Error(detalle);
        });
      });
      return;
    }
    if (extra) {
      cy.get(selector, { timeout: 30000 }).should('be.visible').and('not.be.disabled');
    } else {
      cy.get(selector, { timeout: 30000 }).should('be.visible');
    }
  });
}

function irAHistorialFresco(contexto = 'historial'): void {
  visitar('/suministros/historial');
  asegurarVisible('form[role="search"]', `${contexto}-form`);
  asegurarVisible('#historial-activo', `${contexto}-activo`, (el) => !(el as HTMLInputElement).disabled);
  asegurarVisible('#historial-tipo', `${contexto}-tipo`);
}

function escribirActivo(id = ACTIVO_ID, blurAfter = false, contexto = 'activo'): void {
  asegurarVisible('#historial-activo', `${contexto}-activo-antes-clear`, (el) => !(el as HTMLInputElement).disabled);
  cy.get('#historial-activo', { timeout: 30000 }).clear();
  asegurarVisible('#historial-activo', `${contexto}-activo-antes-type`, (el) => !(el as HTMLInputElement).disabled);
  cy.get('#historial-activo', { timeout: 30000 }).type(String(id));
  if (blurAfter) {
    cy.get('#historial-activo', { timeout: 30000 }).blur();
  }
}

function escribirInput(selector: string, valor: string, contexto: string): void {
  asegurarVisible(selector, `${contexto}-antes-clear`);
  cy.get(selector, { timeout: 30000 }).clear();
  asegurarVisible(selector, `${contexto}-antes-type`);
  cy.get(selector, { timeout: 30000 }).type(valor);
}

function consultarActivo(id = ACTIVO_ID): void {
  escribirActivo(id, true, 'consultar-activo');
  cy.get('form[role="search"] button[type="submit"]', { timeout: 30000 }).contains(RE.consultar).click();
}

function sanitizarHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    const low = k.toLowerCase();
    if (low === 'authorization' || low === 'set-cookie' || low === 'x-sandbox-secret') {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function registrarEvidenciaApi(etiqueta: string, res: Cypress.Response<any>): void {
  (observaciones.respuestasNoExitosasOFallas as unknown[]).push({
    etiqueta,
    status: res.status,
    headers: sanitizarHeaders(res.headers as Record<string, unknown>),
    body: res.body,
  });
}

// =====================================================================
describe(`${TC} · RF-81 · Consulta del historial de suministros (${MODO.toUpperCase()})`, () => {
  before(() => {
    const requeridas = [
      'API_BASE_URL',
      'GESTOR_GRANJA_EMAIL',
      'GESTOR_GRANJA_PASSWORD',
      'TEST_SANDBOX_SECRET',
      'ZONA_HORARIA',
    ];
    const faltan = requeridas.filter((k) => !String(Cypress.env(k) || '').trim());
    if (faltan.length) {
      throw new Error(`[${TC}] Faltan variables de entorno: ${faltan.join(', ')}`);
    }
    cy.fijarZonaHoraria(String(Cypress.env('ZONA_HORARIA')));
    cy.startSandbox(RUN_ID);
  });

  beforeEach(() => {
    cy.aplicarSandbox();
  });

  // ── TC-M05-098 UI (login + navegación + 098-01 .. 098-05) ───────────
  it('TC-M05-098 UI · login Gestor, consulta sin filtros, orden, resumen y paginación 1..10 (098-01..098-05)', () => {
    cy.loginUI(
      String(Cypress.env('GESTOR_GRANJA_EMAIL')),
      String(Cypress.env('GESTOR_GRANJA_PASSWORD')),
    ).then((salioDeLogin) => {
      ctx.loginOk = salioDeLogin;
      cy.esperarToken('sandbox', 30000);
      cy.estadoSandbox().then((s: ResumenSandbox) => {
        if (!salioDeLogin || !s.hayTokenSandbox) {
          throw new Error(
            `[${TC}] Login Gestor de Granja no completó: salioDeLogin=${salioDeLogin}, hayToken=${s.hayTokenSandbox}, sesiones=${JSON.stringify(s.sesiones)}`,
          );
        }
        ctx.sandboxConfirmado = s.confirmado;
        if (!s.confirmado) {
          cy.deshabilitarSandbox();
        }
        observaciones.sandbox = {
          confirmado: s.confirmado,
          sesiones: s.sesiones,
        };
      });

      // Navegación desde el menú hacia Suministros -> Historial
      cy.window({ log: false }).then((w) => {
        observaciones.idiomaPorDefecto = w.localStorage.getItem('sgpmp-locale') || 'es-CO (default sin key)';
      });
      cy.esperarCondicion(
        (doc) => Array.from(doc.querySelectorAll('.ds-sidebar__item')).some((e) => RE.menuSuministros.test(normText(e))),
        30000,
      ).then((hayMenu) => {
        if (hayMenu) {
          cy.contains('.ds-sidebar__item', RE.menuSuministros).click();
          cy.esperarCondicion(
            (doc) => Array.from(doc.querySelectorAll('.ds-subpestanas__item')).some((e) => RE.pestanaHistorial.test(normText(e))),
            30000,
          ).then((hayTab) => {
            if (hayTab) cy.contains('.ds-subpestanas__item', RE.pestanaHistorial).click();
            else visitar('/suministros/historial');
          });
        } else {
          visitar('/suministros/historial');
        }
        cy.get('form[role="search"]', { timeout: 30000 }).should('be.visible');
        cy.get('#historial-activo', { timeout: 30000 }).should('be.visible').and('not.be.disabled');
      });
    });

    cy.intercept('GET', /\/suministros\/historial(\?|$)/).as('hist098P1');
    consultarActivo(ACTIVO_ID);
    cy.wait('@hist098P1', { timeout: 60000 }).then((inter) => {
      if (ctx.sandboxConfirmado && String(inter.response?.headers?.['x-test-run-id'] || '') !== RUN_ID) {
        observaciones.sandbox = {
          ...(observaciones.sandbox as object),
          alertaInterceptAlias: 'header x-test-run-id ausente en @hist098P1',
        };
      }
    });

    // Esperar render de tabla y capturar observaciones
    cy.get('section[aria-label="Resumen del historial"], section[aria-label="History summary"]', { timeout: 15000 }).should('be.visible');
    cy.document({ log: false }).then((doc) => {
      const rows = obtenerTablaRows(doc);
      const count = rows.length;
      ctx.primeraFilaPag1 = rows[0] ? normText(rows[0]) : '';

      // Observaciones de columnas, filtros y resumen
      const ths = Array.from(doc.querySelectorAll('table thead th')).map(normText);
      const tdFirst = rows[0] ? Array.from(rows[0].querySelectorAll('td')).map(normText) : [];
      const sec = obtenerResumenEl(doc);
      const dts = sec ? Array.from(sec.querySelectorAll('dl dt')).map(normText) : [];
      const formLabels = Array.from(doc.querySelectorAll('form[role="search"] label')).map(normText);
      observaciones.columnasTabla = ths;
      observaciones.muestraPrimeraFilaUI = tdFirst;
      observaciones.desgloseEnResumen = {
        porTipo: dts.length > 0,
        porCiclo: sec ? /#701|#702|#703|cachama 2025-A/i.test(normText(sec)) : false,
        textosTipos: dts,
      };
      observaciones.existeFiltroCicloEnUI =
        !!doc.querySelector('#historial-ciclo') || formLabels.some((l) => /ciclo|cycle/i.test(l));

      // 098-01
      registrar('098-01', count === 50, `filas página 1 = ${count}`);

      // 098-02
      const resUI = leerResumenUI(doc);
      const diffMonto = Number.isFinite(resUI.monto) ? Math.abs(resUI.monto - 63753757.5) : NaN;
      const ok02 = resUI.encontrado && resUI.total === 500 && Number.isFinite(diffMonto) && diffMonto <= 0.5;
      registrar(
        '098-02',
        ok02,
        `total=${resUI.total}; montoTexto="${resUI.montoRaw}" (parsed=${resUI.monto}, diff=${diffMonto})`,
      );

      // 098-03
      const fechas = rows.map((tr) => parseFechaTabla(normText(tr.querySelectorAll('td')[0])));
      const sinParse = fechas.filter((f) => f === null).length;
      if (rows.length > 0 && sinParse > 0) {
        scriptErrors.push(`[098-03] ERROR DE SCRIPT: ${sinParse} fila(s) sin parsear en columna fecha.`);
      }
      let inversiones = 0;
      for (let i = 0; i < fechas.length - 1; i += 1) {
        const a = fechas[i];
        const b = fechas[i + 1];
        if (a && b && a < b) inversiones += 1;
      }
      registrar(
        '098-03',
        rows.length === 50 && sinParse === 0 && inversiones === 0,
        `filas=${rows.length}; sinParse=${sinParse}; inversiones=${inversiones}; muestra=[${normText(rows[0]?.querySelectorAll('td')[0])} .. ${normText(rows[rows.length - 1]?.querySelectorAll('td')[0])}]`,
      );

      // Preparar 098-04: comprobar botón Anterior deshabilitado en página 1
      const btns = Array.from(doc.querySelectorAll<HTMLButtonElement>('button'));
      const btnAnt1 = btns.find((b) => RE.anterior.test(normText(b)));
      const btnSig1 = btns.find((b) => RE.siguiente.test(normText(b)));
      const antDeshab = !!btnAnt1 && btnAnt1.disabled;
      const sigHab1 = !!btnSig1 && !btnSig1.disabled;
      if (!sigHab1) {
        registrar('098-04', false, `Anterior deshab=${antDeshab}; Siguiente habilitado=${sigHab1} en pág 1`);
        registrar('098-05', false, 'No se pudo avanzar desde pág 1: botón Siguiente no habilitado');
        return;
      }

      // Ir a página 2
      cy.intercept('GET', /\/suministros\/historial(\?|$)/).as('hist098P2');
      cy.contains('button', RE.siguiente).click();
      cy.wait('@hist098P2', { timeout: 60000 }).then(() => {
        cy.esperarCondicion((d) => /p[aá]gina 2 de 10|page 2 of 10/i.test(normText(d.body)), 15000).then((enP2) => {
          cy.document({ log: false }).then((d2) => {
            const rows2 = obtenerTablaRows(d2);
            const primera2 = rows2[0] ? normText(rows2[0]) : '';
            const distinta = !!primera2 && primera2 !== ctx.primeraFilaPag1;
            const ok04 = antDeshab && enP2 && rows2.length === 50 && distinta;
            registrar(
              '098-04',
              ok04,
              `pág1 Anterior disabled=${antDeshab}; enPág2=${enP2}; filasPág2=${rows2.length}; primeraFilaDistinta=${distinta}`,
            );

            // 098-05: navegar hasta página 10
            const avanzar = (paginaActual: number): void => {
              if (paginaActual >= 10) {
                cy.document({ log: false }).then((d10) => {
                  const rows10 = obtenerTablaRows(d10);
                  const btns10 = Array.from(d10.querySelectorAll<HTMLButtonElement>('button'));
                  const btnSig10 = btns10.find((b) => RE.siguiente.test(normText(b)));
                  const sigDeshab10 = !!btnSig10 && btnSig10.disabled;
                  const txtPag10 = /p[aá]gina 10 de 10|page 10 of 10/i.test(normText(d10.body));
                  registrar(
                    '098-05',
                    txtPag10 && rows10.length === 50 && sigDeshab10,
                    `enPág10=${txtPag10}; filas=${rows10.length}; Siguiente disabled=${sigDeshab10}`,
                  );
                });
                return;
              }
              const siguienteEsperada = paginaActual + 1;
              cy.intercept('GET', /\/suministros\/historial(\?|$)/).as(`histPag${siguienteEsperada}`);
              cy.contains('button', RE.siguiente).click();
              cy.wait(`@histPag${siguienteEsperada}`, { timeout: 60000 }).then(() => {
                cy.esperarCondicion(
                  (dx) => new RegExp(`p[aá]gina ${siguienteEsperada} de 10|page ${siguienteEsperada} of 10`, 'i').test(normText(dx.body)),
                  15000,
                ).then((llego) => {
                  if (!llego) {
                    registrar('098-05', false, `No se reflejó página ${siguienteEsperada} de 10 en UI`);
                    return;
                  }
                  avanzar(siguienteEsperada);
                });
              });
            };
            avanzar(2);
          });
        });
      });
    });
  });

  // ── TC-M05-098 API (098-06 .. 098-07 + obs 201) ───────────────────────
  it('TC-M05-098 API · verificación contrato por defecto y 500 filas páginas 1-3 (098-06..098-07)', () => {
    cy.apiSandbox({ method: 'GET', path: `/suministros/historial?id_activo_biologico=${ACTIVO_ID}` }).then((r) => {
      const b = r.body || {};
      const items = Array.isArray(b.items) ? b.items : [];
      const res = b.resumen || {};
      const dt = res.desglose_por_tipo_suministro || {};
      const dc = res.desglose_por_ciclo || {};
      const tiposOk = ['ALIMENTO', 'INSEMINACION', 'MEDICAMENTO', 'SERVICIO_VETERINARIO'].every(
        (k) => dt[k]?.total === 125,
      );
      const cicloVals = Object.values(dc).map((v: any) => v?.total).sort((a, z) => a - z);
      const ciclosOk = Object.keys(dc).length === 3 && cicloVals[0] === 150 && cicloVals[1] === 150 && cicloVals[2] === 200;
      const montoOk = Math.abs(Number(res.monto_total_filtrado) - 63753757.5) < 0.001;
      const ok06 =
        r.status === 200 &&
        items.length === 50 &&
        res.total_paginas === 10 &&
        res.total_registros_filtrados === 500 &&
        montoOk &&
        tiposOk &&
        ciclosOk &&
        res.nivel_volumen === 1 &&
        res.datos_contexto_no_disponibles === false;
      if (!ok06) registrarEvidenciaApi('098-06', r);
      registrar(
        '098-06',
        ok06,
        `HTTP ${r.status}; items=${items.length}; pags=${res.total_paginas}; total=${res.total_registros_filtrados}; monto=${res.monto_total_filtrado}; tipos125=${tiposOk}; ciclos=${JSON.stringify(cicloVals)}; vol=${res.nivel_volumen}; ctxNoDisp=${res.datos_contexto_no_disponibles}`,
      );
    });

    const base200 = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&registros_por_pagina=200`;
    cy.apiSandbox({ method: 'GET', path: `${base200}&pagina=1` }).then((r1) => {
      cy.apiSandbox({ method: 'GET', path: `${base200}&pagina=2` }).then((r2) => {
        cy.apiSandbox({ method: 'GET', path: `${base200}&pagina=3` }).then((r3) => {
          const i1 = Array.isArray(r1.body?.items) ? r1.body.items : [];
          const i2 = Array.isArray(r2.body?.items) ? r2.body.items : [];
          const i3 = Array.isArray(r3.body?.items) ? r3.body.items : [];
          const todas = [...i1, ...i2, ...i3];
          const ids = new Set(todas.map((x: any) => x?.id_registro_suministro));
          let inv = 0;
          for (let i = 0; i < todas.length - 1; i += 1) {
            if (String(todas[i]?.fecha_aplicacion || '') < String(todas[i + 1]?.fecha_aplicacion || '')) inv += 1;
          }
          const ok07 =
            r1.status === 200 && r2.status === 200 && r3.status === 200 &&
            i1.length === 200 && i2.length === 200 && i3.length === 100 &&
            ids.size === 500 && inv === 0;
          if (!ok07) {
            registrarEvidenciaApi('098-07_p1', r1);
            registrarEvidenciaApi('098-07_p2', r2);
            registrarEvidenciaApi('098-07_p3', r3);
          }
          registrar(
            '098-07',
            ok07,
            `HTTP [${r1.status},${r2.status},${r3.status}]; filas=[${i1.length},${i2.length},${i3.length}]; idsUnicos=${ids.size}; inversionesFecha=${inv}`,
          );
        });
      });
    });

    // Observación adicional: registros_por_pagina=201
    cy.apiSandbox({ method: 'GET', path: `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&registros_por_pagina=201` }).then((r201) => {
      observaciones.registroPorPagina201 = {
        status: r201.status,
        error_code: r201.body?.error_code ?? null,
        message: r201.body?.message ?? r201.body?.detail ?? null,
        fields: r201.body?.fields ?? null,
      };
    });
  });

  // ── TC-M05-099 UI (099-01 .. 099-06) ────────────────────────────────
  it('TC-M05-099 UI · filtro combinado y verificación de costos/criterios (099-01..099-02)', () => {
    irAHistorialFresco('099-comb');
    escribirActivo(ACTIVO_ID, false, '099-comb');
    escribirInput('#historial-desde', '2026-04-23', '099-comb-desde');
    escribirInput('#historial-hasta', '2026-07-31', '099-comb-hasta');
    asegurarVisible('#historial-tipo', '099-comb-tipo');
    cy.get('#historial-tipo', { timeout: 30000 }).select('MEDICAMENTO');
    asegurarVisible('#historial-origen', '099-comb-origen');
    cy.get('#historial-origen', { timeout: 30000 }).select('MANUAL');
    escribirInput('#historial-min', '100000', '099-comb-min');
    escribirInput('#historial-max', '300000', '099-comb-max');

    cy.intercept('GET', /\/suministros\/historial(\?|$)/).as('hist099Comb');
    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait('@hist099Comb', { timeout: 60000 });
    cy.get('section[aria-label="Resumen del historial"], section[aria-label="History summary"]', { timeout: 15000 }).should('be.visible');

    cy.document({ log: false }).then((doc) => {
      const rows = obtenerTablaRows(doc);
      const resUI = leerResumenUI(doc);
      const diff = Number.isFinite(resUI.monto) ? Math.abs(resUI.monto - 900079.88) : NaN;
      const ok99_1 = rows.length === 8 && resUI.total === 8 && Number.isFinite(diff) && diff <= 0.5;
      registrar(
        '099-01',
        ok99_1,
        `filas=${rows.length}; resumenTotal=${resUI.total}; montoTexto="${resUI.montoRaw}" (parsed=${resUI.monto}, diff=${diff})`,
      );

      // 099-02: conjunto numérico de costos y verificación por fila (fecha, tipo, origen)
      const costosUI = rows.map((tr) => parseMonedaUI(normText(tr.querySelectorAll('td')[6]), resUI.isEnUS));
      const sortUI = [...costosUI].sort((a, b) => a - b);
      const sortOraculo = [...COSTOS_ORACULO_099].sort((a, b) => a - b);
      const setIgual =
        sortUI.length === sortOraculo.length &&
        sortUI.every((val, idx) => Number.isFinite(val) && Math.abs(val - sortOraculo[idx]) <= 0.5);

      const cumplenFiltros = rows.every((tr) => {
        const tds = tr.querySelectorAll('td');
        const fecha = parseFechaTabla(normText(tds[0]));
        const tipoTxt = normText(tds[1]);
        const precioTxt = normText(tds[5]);
        const costo = parseMonedaUI(normText(tds[6]), resUI.isEnUS);
        const fOk = !!fecha && fecha >= '2026-04-23' && fecha <= '2026-07-31';
        const tOk = /medicamento|medication/i.test(tipoTxt);
        const oOk = /precio manual|manual price/i.test(precioTxt);
        const cOk = costo >= 100000 && costo <= 300000;
        return fOk && tOk && oOk && cOk;
      });
      registrar(
        '099-02',
        setIgual && cumplenFiltros,
        `setIgual=${setIgual}; cumplen4Filtros=${cumplenFiltros}; costosUI=${JSON.stringify(costosUI)}`,
      );
    });
  });

  it('TC-M05-099 UI · escenarios vacíos por costo y por fecha (099-03..099-04)', () => {
    // 099-03: tipo=MEDICAMENTO + min=500000
    irAHistorialFresco('099-03');
    escribirActivo(ACTIVO_ID, false, '099-03');
    asegurarVisible('#historial-tipo', '099-03-tipo');
    cy.get('#historial-tipo', { timeout: 30000 }).select('MEDICAMENTO');
    escribirInput('#historial-min', '500000', '099-03-min');

    cy.intercept('GET', /\/suministros\/historial(\?|$)/).as('hist099VacioCosto');
    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait('@hist099VacioCosto', { timeout: 60000 });
    cy.get('[role="status"]', { timeout: 15000 }).should('be.visible');

    cy.document({ log: false }).then((doc) => {
      const rows = obtenerTablaRows(doc);
      const resUI = leerResumenUI(doc);
      const statusEl = doc.querySelector('[role="status"]');
      const vacioTxt = normText(statusEl);
      const alertInfo = doc.querySelector('.ds-alert--info');
      const alertTxt = normText(alertInfo);

      observaciones.estadoVacioTextoLiteral = vacioTxt;
      observaciones.muestraResumenMensajeAlert = !!alertInfo;
      observaciones.resumenMensajeTextoLiteral = alertTxt;

      const ok99_3 =
        rows.length === 0 &&
        resUI.total === 0 &&
        resUI.monto === 0 &&
        !!statusEl &&
        RE.vacioFiltro.test(vacioTxt);
      registrar(
        '099-03',
        ok99_3,
        `filas=${rows.length}; total=${resUI.total}; monto=${resUI.monto}; vacio="${vacioTxt}"; alertMensaje="${alertTxt}"`,
      );
    });

    // 099-04: rango 2025-01-01..2025-12-31
    irAHistorialFresco('099-04');
    escribirActivo(ACTIVO_ID, false, '099-04');
    escribirInput('#historial-desde', '2025-01-01', '099-04-desde');
    escribirInput('#historial-hasta', '2025-12-31', '099-04-hasta');

    cy.intercept('GET', /\/suministros\/historial(\?|$)/).as('hist099VacioFecha');
    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait('@hist099VacioFecha', { timeout: 60000 });
    cy.get('[role="status"]', { timeout: 15000 }).should('be.visible');

    cy.document({ log: false }).then((doc) => {
      const rows = obtenerTablaRows(doc);
      const resUI = leerResumenUI(doc);
      const vacioTxt = normText(doc.querySelector('[role="status"]'));
      const ok99_4 =
        rows.length === 0 &&
        resUI.total === 0 &&
        resUI.monto === 0 &&
        RE.vacioFiltro.test(vacioTxt);
      registrar('099-04', ok99_4, `filas=${rows.length}; total=${resUI.total}; monto=${resUI.monto}; vacio="${vacioTxt}"`);
    });
  });

  it('TC-M05-099 UI · validación cliente desde > hasta y mín > máx sin GET (099-05..099-06)', () => {
    // 099-05: desde > hasta
    irAHistorialFresco('099-05');
    escribirActivo(ACTIVO_ID, false, '099-05');
    escribirInput('#historial-desde', '2026-08-01', '099-05-desde');
    escribirInput('#historial-hasta', '2026-04-01', '099-05-hasta');

    let llamadasFecha = 0;
    cy.intercept('GET', /\/suministros\/historial(\?|$)/, (req) => {
      llamadasFecha += 1;
      sumarHistorialGet();
      const sb = sandboxHeadersIfActive();
      Object.entries(sb).forEach(([k, v]) => {
        req.headers[k] = v;
      });
      req.continue();
    }).as('histNegFecha');

    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait(250);
    cy.document({ log: false }).then((doc) => {
      const errTxt = normText(doc.querySelector('#historial-hasta-err'));
      const ok99_5 = errTxt.length > 0 && llamadasFecha === 0;
      registrar('099-05', ok99_5, `error="${errTxt}"; GET enviados=${llamadasFecha}`);
    });

    // 099-06: min > max
    irAHistorialFresco('099-06');
    escribirActivo(ACTIVO_ID, false, '099-06');
    escribirInput('#historial-min', '300000', '099-06-min');
    escribirInput('#historial-max', '100000', '099-06-max');

    let llamadasCosto = 0;
    cy.intercept('GET', /\/suministros\/historial(\?|$)/, (req) => {
      llamadasCosto += 1;
      sumarHistorialGet();
      const sb = sandboxHeadersIfActive();
      Object.entries(sb).forEach(([k, v]) => {
        req.headers[k] = v;
      });
      req.continue();
    }).as('histNegCosto');

    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait(250);
    cy.document({ log: false }).then((doc) => {
      const errTxt = normText(doc.querySelector('#historial-max-err'));
      const ok99_6 = errTxt.length > 0 && llamadasCosto === 0;
      registrar('099-06', ok99_6, `error="${errTxt}"; GET enviados=${llamadasCosto}`);
    });
  });

  // ── TC-M05-099 API (099-07 .. 099-08) ───────────────────────────────
  it('TC-M05-099 API · combinado, simples, vacíos y rangos inválidos (099-07..099-08)', () => {
    const qComb = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&tipo_suministro_filtro=MEDICAMENTO&origen_precio_filtro=MANUAL&fecha_inicio_filtro=2026-04-23&fecha_fin_filtro=2026-07-31&costo_min=100000&costo_max=300000&registros_por_pagina=200`;
    const qMed = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&tipo_suministro_filtro=MEDICAMENTO`;
    const qMan = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&origen_precio_filtro=MANUAL`;
    const qM40 = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&origen_precio_filtro=M40_AUTOMATICO`;
    const qVacioC = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&tipo_suministro_filtro=MEDICAMENTO&costo_min=500000`;
    const qVacioF = `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&fecha_inicio_filtro=2025-01-01&fecha_fin_filtro=2025-12-31`;
    const msgEsperado = `No se encontraron registros de suministros con los filtros aplicados para el activo ${ACTIVO_ID}.`;

    cy.apiSandbox({ method: 'GET', path: qComb }).then((rComb) => {
      cy.apiSandbox({ method: 'GET', path: qMed }).then((rMed) => {
        cy.apiSandbox({ method: 'GET', path: qMan }).then((rMan) => {
          cy.apiSandbox({ method: 'GET', path: qM40 }).then((rM40) => {
            cy.apiSandbox({ method: 'GET', path: qVacioC }).then((rVC) => {
              cy.apiSandbox({ method: 'GET', path: qVacioF }).then((rVF) => {
                const combOk =
                  rComb.status === 200 &&
                  rComb.body?.resumen?.total_registros_filtrados === 8 &&
                  Math.abs(Number(rComb.body?.resumen?.monto_total_filtrado) - 900079.88) < 0.001;
                const medOk = rMed.status === 200 && rMed.body?.resumen?.total_registros_filtrados === 125;
                const manOk = rMan.status === 200 && rMan.body?.resumen?.total_registros_filtrados === 251;
                const m40Ok = rM40.status === 200 && rM40.body?.resumen?.total_registros_filtrados === 249;
                const vcOk =
                  rVC.status === 200 &&
                  Array.isArray(rVC.body?.items) && rVC.body.items.length === 0 &&
                  rVC.body?.resumen?.total_registros_filtrados === 0 &&
                  Number(rVC.body?.resumen?.monto_total_filtrado) === 0 &&
                  rVC.body?.resumen?.mensaje === msgEsperado;
                const vfOk =
                  rVF.status === 200 &&
                  Array.isArray(rVF.body?.items) && rVF.body.items.length === 0 &&
                  rVF.body?.resumen?.total_registros_filtrados === 0 &&
                  Number(rVF.body?.resumen?.monto_total_filtrado) === 0 &&
                  rVF.body?.resumen?.mensaje === msgEsperado;

                const ok07 = combOk && medOk && manOk && m40Ok && vcOk && vfOk;
                if (!ok07) {
                  registrarEvidenciaApi('099-07_comb', rComb);
                  registrarEvidenciaApi('099-07_vacio_costo', rVC);
                  registrarEvidenciaApi('099-07_vacio_fecha', rVF);
                }
                registrar(
                  '099-07',
                  ok07,
                  `comb=${rComb.body?.resumen?.total_registros_filtrados}/${rComb.body?.resumen?.monto_total_filtrado}; MED=${rMed.body?.resumen?.total_registros_filtrados}; MANUAL=${rMan.body?.resumen?.total_registros_filtrados}; M40=${rM40.body?.resumen?.total_registros_filtrados}; vacioC=${rVC.status}/${rVC.body?.resumen?.mensaje}; vacioF=${rVF.status}/${rVF.body?.resumen?.mensaje}`,
                );
              });
            });
          });
        });
      });
    });

    // 099-08: rangos inválidos → solo HTTP 422 es OK
    cy.apiSandbox({
      method: 'GET',
      path: `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&fecha_inicio_filtro=2026-08-01&fecha_fin_filtro=2026-04-01`,
    }).then((rF) => {
      cy.apiSandbox({
        method: 'GET',
        path: `/suministros/historial?id_activo_biologico=${ACTIVO_ID}&costo_min=300000&costo_max=100000`,
      }).then((rC) => {
        const ok08 = rF.status === 422 && rC.status === 422;
        if (!ok08) {
          registrarEvidenciaApi('099-08_fecha_inv', rF);
          registrarEvidenciaApi('099-08_costo_inv', rC);
        }
        registrar(
          '099-08',
          ok08,
          `fecha_inv: HTTP ${rF.status} error_code=${JSON.stringify(rF.body?.error_code ?? null)} msg=${JSON.stringify(rF.body?.message ?? rF.body?.detail ?? null)} | costo_inv: HTTP ${rC.status} error_code=${JSON.stringify(rC.body?.error_code ?? null)} msg=${JSON.stringify(rC.body?.message ?? rC.body?.detail ?? null)}`,
        );
      });
    });
  });

  // ── TC-M05-104 (104-01 [SIMULADO] UI + 104-02 API real) ─────────────
  it('TC-M05-104 · [SIMULADO] M02 no disponible en UI y verificación API real (104-01..104-02)', () => {
    irAHistorialFresco('104-01');
    escribirActivo(ACTIVO_ID, true, '104-01');

    cy.intercept({ method: 'GET', url: /\/suministros\/historial(\?|$)/, times: 1 }, (req) => {
      sumarHistorialGet();
      const sb = sandboxHeadersIfActive();
      Object.entries(sb).forEach(([k, v]) => {
        req.headers[k] = v;
      });
      req.continue((res) => {
        if (res.body && typeof res.body === 'object') {
          if (res.body.resumen) {
            res.body.resumen.datos_contexto_no_disponibles = true;
          }
          if (Array.isArray(res.body.items)) {
            res.body.items = res.body.items.map((item: any) => ({
              ...item,
              nombre_ciclo: null,
              especie: null,
            }));
          }
        }
      });
    }).as('hist104Sim');

    cy.get('form[role="search"] button[type="submit"]').contains(RE.consultar).click();
    cy.wait('@hist104Sim', { timeout: 60000 });
    cy.get('section[aria-label="Resumen del historial"], section[aria-label="History summary"]', { timeout: 15000 }).should('be.visible');

    cy.document({ log: false }).then((doc) => {
      const resUI = leerResumenUI(doc);
      const rows = obtenerTablaRows(doc);
      const tieneAviso = RE.sinContexto.test(resUI.texto);
      const primeraColCiclo = rows[0] ? normText(rows[0].querySelectorAll('td')[3]) : '';
      registrar(
        '104-01',
        tieneAviso && rows.length > 0,
        `avisoContextoNoDisponible=${tieneAviso}; filas=${rows.length}; colCicloFila1="${primeraColCiclo}"; textoResumen="${resUI.texto.slice(-140)}"`,
      );
    });

    // 104-02 API real sin modificación
    cy.apiSandbox({ method: 'GET', path: `/suministros/historial?id_activo_biologico=${ACTIVO_ID}` }).then((r) => {
      const val = r.body?.resumen?.datos_contexto_no_disponibles;
      const ok104_2 = r.status === 200 && val === false;
      if (!ok104_2) registrarEvidenciaApi('104-02', r);
      registrar('104-02', ok104_2, `HTTP ${r.status}; datos_contexto_no_disponibles=${JSON.stringify(val)}`);
    });
  });

  // ── Veredicto final ─────────────────────────────────────────────────
  it(TITULO_VEREDICTO, () => {
    const faltantes = ORDEN.filter((id) => !evaluados.has(id));
    expect(faltantes, `Checkpoints no evaluados: ${faltantes.join(', ')}`).to.have.length(0);
    const fallas = ORDEN.filter((id) => resultados.get(id)?.estado === 'FALLA');
    expect(fallas, `Checkpoints en FALLA: ${fallas.join(', ') || 'ninguno'}`).to.have.length(0);
  });

  after(() => {
    cy.rollbackSandbox(RUN_ID).then((rb) => {
      cy.contarGetHistorial().then((nGets) => {
        if (!ctx.sandboxConfirmado) {
          observaciones.sandbox = {
            ...(observaciones.sandbox as object),
            rollbackStatus: rb.status,
            sinSandboxMensaje: `SIN SANDBOX: ${nGets} eventos de auditoría persisten`,
            totalGetHistorial: nGets,
          };
        } else {
          observaciones.sandbox = {
            ...(observaciones.sandbox as object),
            rollbackStatus: rb.status,
            sinSandboxMensaje: '',
            totalGetHistorial: nGets,
          };
        }

        const faltantes = ORDEN.filter((id) => !evaluados.has(id));
        const completo = faltantes.length === 0 && scriptErrors.length === 0;
        const payload = {
          tc: TC,
          checkpoints: ORDEN.map((id) => resultados.get(id) as Checkpoint),
        };

        if (!completo) {
          const incompleto = {
            tc: TC,
            modo: MODO,
            completo: false,
            faltantes,
            scriptErrors,
            checkpoints: payload.checkpoints,
          };
          cy.task('writeResult', {
            file: 'evidencias/incompleto_G41.json',
            content: JSON.stringify(incompleto, null, 2),
          });
          cy.task('writeResult', {
            file: `evidencias/observaciones_${MODO}.json`,
            content: JSON.stringify(observaciones, null, 2),
          });
          return;
        }

        if (MODO === 'oficial') {
          cy.task('writeResult', {
            file: `resultados/resultado_${TC}.json`,
            content: JSON.stringify(payload, null, 2),
          });
          cy.task('writeResult', {
            file: 'evidencias/observaciones_oficial_G41.json',
            content: JSON.stringify(observaciones, null, 2),
          });
        } else {
          cy.task('nextEnsayoFile').then((ensayoFile) => {
            cy.task('writeResult', {
              file: String(ensayoFile),
              content: JSON.stringify(payload, null, 2),
            });
          });
          cy.task('writeResult', {
            file: 'evidencias/ensayo/observaciones_ensayo.json',
            content: JSON.stringify(observaciones, null, 2),
          });
        }
      });
    });
  });
});

