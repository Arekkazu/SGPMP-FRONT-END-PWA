/// <reference types="cypress" />
// Comandos del caso TC-M05-G41 copiados del patrón de TC-M05-G13.
//
// - Intercept fail-closed para host de API distinto de API_BASE_URL.
// - Intercept al host de la API que inyecta X-Test-Run-Id y X-Sandbox-Secret cuando el sandbox está habilitado.
// - Captura de access_token en memoria (sin imprimirlo ni persistirlo en reportes) con fallback a localStorage('access_token').
// - Conteo exacto de peticiones GET /suministros/historial (UI + cy.request).

interface PeticionBloqueada {
  host: string;
  method: string;
  path: string;
}

export interface PeticionSesion {
  method: string;
  url: string;
  statusCode?: number;
}

interface EstadoSandbox {
  runId: string;
  activo: boolean;
  cerrado: boolean;
  confirmado: boolean;
  deshabilitadoPorFallo: boolean;
  peticiones: number;
  historialGets: number;
  tokenSandbox: string;
  tokenFuera: string;
  bloqueadas: PeticionBloqueada[];
  sesiones: PeticionSesion[];
}

const estado: EstadoSandbox = {
  runId: '',
  activo: false,
  cerrado: false,
  confirmado: false,
  deshabilitadoPorFallo: false,
  peticiones: 0,
  historialGets: 0,
  tokenSandbox: '',
  tokenFuera: '',
  bloqueadas: [],
  sesiones: [],
};

export interface ResumenSandbox {
  runId: string;
  activo: boolean;
  cerrado: boolean;
  confirmado: boolean;
  deshabilitadoPorFallo: boolean;
  peticiones: number;
  historialGets: number;
  hayTokenSandbox: boolean;
  hayTokenFuera: boolean;
  bloqueadasCount: number;
  hostsBloqueados: string[];
  sesiones: PeticionSesion[];
}

export interface OpcionesApi {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Cypress.RequestBody;
}

declare global {
  namespace Cypress {
    interface Chainable {
      startSandbox(runId: string): Chainable<void>;
      aplicarSandbox(): Chainable<void>;
      deshabilitarSandbox(): Chainable<void>;
      rollbackSandbox(runId: string): Chainable<Cypress.Response<unknown>>;
      estadoSandbox(): Chainable<ResumenSandbox>;
      apiSandbox(opciones: OpcionesApi): Chainable<Cypress.Response<any>>;
      apiSinSandbox(path: string, token?: 'sandbox' | 'fuera'): Chainable<Cypress.Response<any>>;
      obtenerTokenMemoria(): Chainable<string>;
      contarGetHistorial(): Chainable<number>;
      loginUI(email: string, password: string): Chainable<boolean>;
      fijarZonaHoraria(zona: string): Chainable<void>;
      esperarToken(tipo: 'sandbox' | 'fuera', timeoutMs?: number): Chainable<boolean>;
      esperarCondicion(condicion: (doc: Document) => boolean, timeoutMs?: number, intervaloMs?: number): Chainable<boolean>;
    }
  }
}

function apiBase(): string {
  const url = String(Cypress.env('API_BASE_URL') || '').replace(/\/+$/, '');
  if (!url) throw new Error('[TC-M05-G41] API_BASE_URL no está definida (ver cypress.config.js).');
  return url;
}

export function appBasePath(): string {
  const p = String(Cypress.env('APP_BASE_PATH') || '').trim();
  if (!p) return '';
  const conBarra = p.startsWith('/') ? p : '/' + p;
  return conBarra.replace(/\/+$/, '');
}

/** Devuelve el pathname sin el prefijo APP_BASE_PATH (p. ej. '/sigab-test/login' -> '/login'). */
export function rutaApp(pathname: string): string {
  const base = appBasePath();
  if (base && pathname.startsWith(base)) {
    const resto = pathname.slice(base.length);
    return resto.startsWith('/') ? resto : (resto ? '/' + resto : '/');
  }
  return pathname;
}

/** cy.visit respetando APP_BASE_PATH (p. ej. '/login' -> cy.visit('/sigab-test/login')). */
export function visitar(ruta: string, opciones: Partial<Cypress.VisitOptions> = {}): Cypress.Chainable<Cypress.AUTWindow> {
  const r = ruta.startsWith('/') ? ruta : '/' + ruta;
  const userOnBeforeLoad = opciones.onBeforeLoad;
  return cy.visit(`${appBasePath()}${r}`, {
    ...opciones,
    onBeforeLoad(win) {
      try {
        win.navigator?.serviceWorker?.getRegistrations?.().then((regs) => {
          regs.forEach((reg) => {
            reg.unregister().catch(() => {});
          });
        });
      } catch {
        // ignorar si no hay serviceWorker
      }
      if (userOnBeforeLoad) userOnBeforeLoad(win);
    },
  });
}

function secreto(): string {
  const s = String(Cypress.env('TEST_SANDBOX_SECRET') || '');
  if (!s) throw new Error('[TC-M05-G41] TEST_SANDBOX_SECRET no está definida (ver cypress.config.js).');
  return s;
}

function zona(): string {
  return String(Cypress.env('ZONA_HORARIA') || 'America/Bogota');
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hostApi(): string {
  try {
    return new URL(apiBase()).host;
  } catch {
    return '';
  }
}

/** Peticiones de la SPA al host de la API (cualquier ruta bajo API_BASE_URL). */
function matcherApi(): RegExp {
  return new RegExp(`^${escaparRegex(apiBase())}(/|\\?|$)`);
}

/** Prefijo general de la API para detectar llamadas fuera del host autorizado. */
const PREFIJO_API = /\/api-sgpmp-test(\/|\?|$)/;

function cabeceraAuth(valor: string | string[] | undefined): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return typeof v === 'string' && /^Bearer\s+\S+/i.test(v) ? v.replace(/^Bearer\s+/i, '') : '';
}

export function sandboxHeadersIfActive(): Record<string, string> {
  if (estado.activo && !estado.cerrado && !estado.deshabilitadoPorFallo) {
    return { 'X-Test-Run-Id': estado.runId, 'X-Sandbox-Secret': secreto() };
  }
  return {};
}

export function sumarHistorialGet(): void {
  estado.historialGets += 1;
}

export function esGetHistorialUrl(method: string, url: string): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  try {
    const u = new URL(url, apiBase());
    return /\/suministros\/historial\/?$/.test(u.pathname);
  } catch {
    return /\/suministros\/historial(\?|$)/.test(url);
  }
}

Cypress.Commands.add('startSandbox', (runId: string) => {
  if (!runId) throw new Error('[TC-M05-G41] startSandbox requiere un runId.');
  estado.runId = runId;
  estado.activo = true;
  estado.cerrado = false;
  estado.confirmado = false;
  estado.deshabilitadoPorFallo = false;
  estado.peticiones = 0;
  estado.historialGets = 0;
  estado.tokenSandbox = '';
  estado.tokenFuera = '';
  estado.bloqueadas = [];
  estado.sesiones = [];
  cy.log(`[SANDBOX] corrida transaccional ${runId}`);
  cy.aplicarSandbox();
});

Cypress.Commands.add('deshabilitarSandbox', () => {
  estado.deshabilitadoPorFallo = true;
  estado.confirmado = false;
  cy.log('[SANDBOX] deshabilitado tras no confirmar / error no-2xx; continuando sin cabeceras de sandbox.');
});

Cypress.Commands.add('aplicarSandbox', () => {
  if (!estado.activo) return;

  // 0) Evita que el Service Worker de PWA intercepte recargas subsecuentes de cy.visit()
  cy.intercept('GET', /\/(registerSW|sw|firebase-messaging-sw)\.js(\?|$)/, {
    statusCode: 200,
    headers: { 'content-type': 'application/javascript' },
    body: '',
  });

  // 1) BLOQUEO "FAIL-CLOSED": Toda petición del navegador con /api-sgpmp-test/
  // cuyo host sea distinto del host resuelto de la API debe abortarse y registrarse.
  cy.intercept({ url: PREFIJO_API }, (req) => {
    let reqHost = '';
    let reqPath = '';
    try {
      const u = new URL(req.url);
      reqHost = u.host;
      reqPath = u.pathname;
    } catch {
      reqHost = 'desconocido';
      reqPath = req.url;
    }

    if (reqHost !== hostApi()) {
      estado.bloqueadas.push({ host: reqHost, method: req.method, path: reqPath });
      cy.log(`[FAIL-CLOSED] Petición bloqueada hacia host no autorizado: ${reqHost} ${req.method} ${reqPath}`);
      req.destroy();
      return;
    }

    req.continue();
  });

  // 2) Intercept específico para el host resuelto (LIFO).
  cy.intercept({ url: matcherApi() }, (req) => {
    const token = cabeceraAuth(req.headers['authorization']);
    if (token) {
      if (estado.cerrado || estado.deshabilitadoPorFallo) estado.tokenFuera = token;
      else estado.tokenSandbox = token;
    }
    if (esGetHistorialUrl(req.method, req.url)) {
      estado.historialGets += 1;
    }

    if (estado.cerrado || estado.deshabilitadoPorFallo) {
      req.continue();
      return;
    }

    req.headers['X-Test-Run-Id'] = estado.runId;
    req.headers['X-Sandbox-Secret'] = secreto();
    estado.peticiones += 1;
    req.continue((res) => {
      if (req.url.includes('/sesiones')) {
        let ruta = '';
        try {
          ruta = new URL(req.url).pathname;
        } catch {
          ruta = req.url;
        }
        estado.sesiones.push({
          method: req.method,
          url: ruta,
          statusCode: res.statusCode,
        });
      }
      if (String(res.headers['x-test-run-id'] || '') === estado.runId && res.statusCode >= 200 && res.statusCode < 300) {
        estado.confirmado = true;
      }
    });
  });
});

Cypress.Commands.add('rollbackSandbox', (runId: string) => {
  cy.log(`[SANDBOX] rollback de ${runId}`);
  return cy
    .request({
      method: 'DELETE',
      url: `${apiBase()}/test-control/runs/${encodeURIComponent(runId)}`,
      headers: { 'X-Test-Run-Id': runId, 'X-Sandbox-Secret': secreto() },
      failOnStatusCode: false,
      log: false,
    })
    .then((res) => {
      estado.cerrado = true;
      cy.log(`[SANDBOX] rollback → HTTP ${res.status}`);
      return cy.wrap(res, { log: false });
    });
});

Cypress.Commands.add('estadoSandbox', () =>
  cy.wrap<ResumenSandbox>(
    {
      runId: estado.runId,
      activo: estado.activo,
      cerrado: estado.cerrado,
      confirmado: estado.confirmado,
      deshabilitadoPorFallo: estado.deshabilitadoPorFallo,
      peticiones: estado.peticiones,
      historialGets: estado.historialGets,
      hayTokenSandbox: !!estado.tokenSandbox,
      hayTokenFuera: !!estado.tokenFuera,
      bloqueadasCount: estado.bloqueadas.length,
      hostsBloqueados: Array.from(new Set(estado.bloqueadas.map((b) => b.host))),
      sesiones: [...estado.sesiones],
    },
    { log: false },
  ),
);

Cypress.Commands.add('obtenerTokenMemoria', () =>
  cy.window({ log: false }).then((win) => {
    const lsToken = win.localStorage?.getItem('access_token') || '';
    const memToken = lsToken || estado.tokenSandbox || estado.tokenFuera;
    return cy.wrap(memToken, { log: false });
  }),
);

Cypress.Commands.add('contarGetHistorial', () => cy.wrap(estado.historialGets, { log: false }));

/**
 * Envío por cy.request con el token de la sesión actual.
 * Si el sandbox está confirmado y activo, envía X-Test-Run-Id y X-Sandbox-Secret.
 * Si se corre sin sandbox (deshabilitadoPorFallo), omite las cabeceras de sandbox.
 */
Cypress.Commands.add('apiSandbox', ({ method, path, body }: OpcionesApi) => {
  return cy.obtenerTokenMemoria().then((tok) => {
    if (!tok) {
      throw new Error(`[TC-M05-G41] apiSandbox ${method} ${path}: no hay token disponible en memoria/localStorage.`);
    }
    if (esGetHistorialUrl(method, `${apiBase()}${path}`)) {
      estado.historialGets += 1;
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${tok}`,
      'X-Zona-Horaria': zona(),
    };
    if (estado.activo && !estado.cerrado && !estado.deshabilitadoPorFallo && estado.confirmado) {
      headers['X-Test-Run-Id'] = estado.runId;
      headers['X-Sandbox-Secret'] = secreto();
    }
    cy.log(`[API${headers['X-Test-Run-Id'] ? ' sandbox' : ' sin sandbox'}] ${method} ${path}`);
    return cy.request({
      method,
      url: `${apiBase()}${path}`,
      body,
      headers,
      failOnStatusCode: false,
      log: false,
    });
  });
});

Cypress.Commands.add('apiSinSandbox', (path: string, token: 'sandbox' | 'fuera' = 'fuera') => {
  return cy.obtenerTokenMemoria().then((tokMem) => {
    const valor = (token === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera) || tokMem;
    if (esGetHistorialUrl('GET', `${apiBase()}${path}`)) {
      estado.historialGets += 1;
    }
    cy.log(`[API sin sandbox] GET ${path}`);
    return cy.request({
      method: 'GET',
      url: `${apiBase()}${path}`,
      headers: { Authorization: `Bearer ${valor}`, 'X-Zona-Horaria': zona() },
      failOnStatusCode: false,
      log: false,
    });
  });
});

/**
 * Login por la UI. Las credenciales se escriben con log:false y nunca se imprimen.
 */
Cypress.Commands.add('loginUI', (email: string, password: string) => {
  if (!email || !password) throw new Error('[TC-M05-G41] loginUI sin credenciales: revisa GESTOR_GRANJA_EMAIL / GESTOR_GRANJA_PASSWORD.');
  visitar('/login', { log: false });
  cy.get('input[autocomplete="email"]', { timeout: 120000 }).clear({ log: false }).type(email, { log: false });
  cy.get('input[autocomplete="current-password"]').clear({ log: false }).type(password, { log: false });
  cy.contains('button[type="submit"]', /^\s*(ingresar|sign in)\s*$/i).click();
  return cy.esperarCondicion((doc) => rutaApp(doc.location.pathname) !== '/login', 120000, 500);
});

/** Fuerza la zona del navegador por CDP (Chrome/Electron). */
Cypress.Commands.add('fijarZonaHoraria', (zonaHoraria: string) => {
  if (Cypress.browser.family !== 'chromium') {
    cy.log(`[TZ] ${Cypress.browser.name} no admite override por CDP; se usa TZ del proceso.`);
    return;
  }
  cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setTimezoneOverride',
      params: { timezoneId: zonaHoraria },
    }),
    { log: false },
  );
  cy.log(`[TZ] navegador en ${zonaHoraria}`);
});

Cypress.Commands.add('esperarToken', (tipo: 'sandbox' | 'fuera', timeoutMs = 30000) => {
  const leer = () => (tipo === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera) || estado.tokenSandbox || estado.tokenFuera;
  return cy.esperarCondicion(() => !!leer(), timeoutMs, 250);
});

Cypress.Commands.add(
  'esperarCondicion',
  (condicion: (doc: Document) => boolean, timeoutMs = 10000, intervaloMs = 250) => {
    const inicio = Date.now();
    const intentar = (): Cypress.Chainable<boolean> =>
      cy.document({ log: false }).then((doc) => {
        let ok = false;
        try {
          ok = !!condicion(doc);
        } catch {
          ok = false;
        }
        if (ok) return cy.wrap(true, { log: false });
        if (Date.now() - inicio >= timeoutMs) return cy.wrap(false, { log: false });
        return cy.wait(intervaloMs, { log: false }).then(intentar);
      });
    return intentar();
  },
);

export {};
