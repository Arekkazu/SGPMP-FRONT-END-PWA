/// <reference types="cypress" />
// | Fecha      | Nombre                    | Que se hizo                                                        |
// |------------|---------------------------|--------------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: sandbox, helper de API, login y espera sin aserción |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: intercept fail-closed y registro peticiones bloq |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: trazabilidad peticiones /sesiones para diagnostico |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: helpers visitar y rutaApp para APP_BASE_PATH    |
//
// Comandos del caso TC-M05-G13 (proyecto autocontenido, se carga como supportFile).
//
// Sandbox transaccional:
// - El intercept solo toca peticiones al host de la API (no al frontend ni a terceros):
//   el secreto nunca sale hacia otro dominio.
// - `cy.intercept` NO afecta a `cy.request`. Toda llamada directa a la API pasa por
//   `cy.apiSandbox`, que agrega a mano X-Test-Run-Id, X-Sandbox-Secret y Authorization.
// - Cypress borra los intercepts antes de cada it(): `cy.aplicarSandbox()` se vuelve a
//   llamar en beforeEach. Tras el rollback el intercept deja de inyectar cabeceras.
// - El token se toma del header Authorization de las peticiones de la SPA; nunca se
//   imprime ni se escribe en el reporte.

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
  peticiones: number;
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
  peticiones: 0,
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
  peticiones: number;
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
      rollbackSandbox(runId: string): Chainable<Cypress.Response<unknown>>;
      estadoSandbox(): Chainable<ResumenSandbox>;
      apiSandbox(opciones: OpcionesApi): Chainable<Cypress.Response<any>>;
      apiSinSandbox(path: string, token: 'sandbox' | 'fuera'): Chainable<Cypress.Response<any>>;
      loginUI(email: string, password: string): Chainable<boolean>;
      fijarZonaHoraria(zona: string): Chainable<void>;
      esperarToken(tipo: 'sandbox' | 'fuera', timeoutMs?: number): Chainable<boolean>;
      esperarCondicion(condicion: (doc: Document) => boolean, timeoutMs?: number, intervaloMs?: number): Chainable<boolean>;
    }
  }
}

function apiBase(): string {
  const url = String(Cypress.env('API_BASE_URL') || '').replace(/\/+$/, '');
  if (!url) throw new Error('[TC-M05-G13] API_BASE_URL no está definida (ver cypress.config.js).');
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
  return cy.visit(`${appBasePath()}${r}`, opciones);
}

function secreto(): string {
  const s = String(Cypress.env('TEST_SANDBOX_SECRET') || '');
  if (!s) throw new Error('[TC-M05-G13] TEST_SANDBOX_SECRET no está definida (ver cypress.config.js).');
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

Cypress.Commands.add('startSandbox', (runId: string) => {
  if (!runId) throw new Error('[TC-M05-G13] startSandbox requiere un runId.');
  estado.runId = runId;
  estado.activo = true;
  estado.cerrado = false;
  estado.confirmado = false;
  estado.peticiones = 0;
  estado.tokenSandbox = '';
  estado.tokenFuera = '';
  estado.bloqueadas = [];
  estado.sesiones = [];
  cy.log(`[SANDBOX] corrida transaccional ${runId}`);
  cy.aplicarSandbox();
});

Cypress.Commands.add('aplicarSandbox', () => {
  if (!estado.activo) return;

  // 1) BLOQUEO "FAIL-CLOSED" (C2): Toda petición del navegador con /api-sgpmp-test/
  // cuyo host sea distinto del host resuelto de la API debe abortarse y registrarse.
  // Nunca se inyecta X-Sandbox-Secret en otro host.
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

  // 2) Intercept ESPECÍFICO para el host resuelto (declarado después para que Cypress
  // lo evalúe PRIMERO por orden LIFO). Inyecta cabeceras de sandbox y captura tokens.
  cy.intercept({ url: matcherApi() }, (req) => {
    const token = cabeceraAuth(req.headers['authorization']);
    if (estado.cerrado) {
      if (token) estado.tokenFuera = token;
      return; // después del rollback la SPA va directo, sin sandbox
    }
    if (token) estado.tokenSandbox = token;
    req.headers['X-Test-Run-Id'] = estado.runId;
    req.headers['X-Sandbox-Secret'] = secreto();
    estado.peticiones += 1;
    req.continue((res) => {
      // Registro de diagnóstico para peticiones de /sesiones (Paso 0): método, ruta y código HTTP
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
      // El middleware del backend devuelve X-Test-Run-Id solo si aceptó la corrida.
      if (String(res.headers['x-test-run-id'] || '') === estado.runId) estado.confirmado = true;
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
      peticiones: estado.peticiones,
      hayTokenSandbox: !!estado.tokenSandbox,
      hayTokenFuera: !!estado.tokenFuera,
      bloqueadasCount: estado.bloqueadas.length,
      hostsBloqueados: Array.from(new Set(estado.bloqueadas.map((b) => b.host))),
      sesiones: [...estado.sesiones],
    },
    { log: false },
  ),
);

/**
 * Único punto de entrada para cy.request dentro del sandbox: siempre con
 * X-Test-Run-Id, X-Sandbox-Secret y el token capturado de la SPA.
 * Se niega a ejecutar si el sandbox no está activo o ya se cerró.
 */
Cypress.Commands.add('apiSandbox', ({ method, path, body }: OpcionesApi) => {
  if (!estado.activo || estado.cerrado) {
    throw new Error(`[TC-M05-G13] apiSandbox ${method} ${path}: el sandbox no está activo; no se envía nada.`);
  }
  if (!estado.tokenSandbox) {
    throw new Error(`[TC-M05-G13] apiSandbox ${method} ${path}: aún no hay token de la SPA (¿falló el login?).`);
  }
  cy.log(`[API sandbox] ${method} ${path}`);
  return cy.request({
    method,
    url: `${apiBase()}${path}`,
    body,
    headers: {
      'X-Test-Run-Id': estado.runId,
      'X-Sandbox-Secret': secreto(),
      Authorization: `Bearer ${estado.tokenSandbox}`,
      'X-Zona-Horaria': zona(),
    },
    failOnStatusCode: false,
    log: false,
  });
});

/** Solo lectura y solo tras el rollback: GET sin cabeceras de sandbox (verificación CP-14). */
Cypress.Commands.add('apiSinSandbox', (path: string, token: 'sandbox' | 'fuera') => {
  if (!estado.cerrado) {
    throw new Error('[TC-M05-G13] apiSinSandbox solo se usa después del rollback.');
  }
  const valor = token === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera;
  cy.log(`[API sin sandbox] GET ${path} (token ${token})`);
  return cy.request({
    method: 'GET',
    url: `${apiBase()}${path}`,
    headers: { Authorization: `Bearer ${valor}`, 'X-Zona-Horaria': zona() },
    failOnStatusCode: false,
    log: false,
  });
});

/**
 * Login por la UI. Las credenciales se escriben con log:false y nunca se imprimen.
 * Devuelve true si la app sale de /login dentro de 120 s (no lanza: el spec registra el CP).
 */
Cypress.Commands.add('loginUI', (email: string, password: string) => {
  if (!email || !password) throw new Error('[TC-M05-G13] loginUI sin credenciales: revisa VET_EMAIL / VET_PASSWORD.');
  visitar('/login', { log: false });
  cy.get('input[autocomplete="email"]', { timeout: 120000 }).clear({ log: false }).type(email, { log: false });
  cy.get('input[autocomplete="current-password"]').clear({ log: false }).type(password, { log: false });
  cy.contains('button[type="submit"]', /^\s*(ingresar|sign in)\s*$/i).click();
  return cy.esperarCondicion((doc) => rutaApp(doc.location.pathname) !== '/login', 120000, 500);
});

/** Fuerza la zona del navegador por CDP (Chrome/Electron); en Linux también aplica TZ. */
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

/** Espera (sin aserción) a que la SPA haga una petición autenticada y se capture su token. */
Cypress.Commands.add('esperarToken', (tipo: 'sandbox' | 'fuera', timeoutMs = 30000) => {
  const leer = () => (tipo === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera);
  return cy.esperarCondicion(() => !!leer(), timeoutMs, 250);
});

/**
 * Sondeo del DOM de la app SIN aserciones: devuelve true/false. Se usa donde un
 * `should` abortaría el it() y el checkpoint quedaría sin registrar (CP-09, CP-10…).
 * El cy.wait(intervalo) es el paso del sondeo, no una espera fija: corta en cuanto
 * se cumple la condición o vence el timeout.
 */
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
