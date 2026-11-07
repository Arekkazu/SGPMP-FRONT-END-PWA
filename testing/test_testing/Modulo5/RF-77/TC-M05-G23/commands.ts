/// <reference types="cypress" />
// | Fecha      | Nombre                    | Que se hizo                                                        |
// |------------|---------------------------|--------------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G23 RF-77: comandos sandbox, API helper, loginUI y navegación |
//
// Comandos del caso TC-M05-G23 (RF-77: Reporte de gastos acumulados y exportación).
//
// Sandbox transaccional:
// - El intercept solo toca peticiones al host de la API oficial (el secreto nunca sale a otros dominios).
// - cy.intercept NO afecta a cy.request: las llamadas directas llevan cabeceras a mano.
// - Los tokens y secretos nunca se imprimen ni se guardan en logs.

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
  if (!url) throw new Error('[TC-M05-G23] API_BASE_URL no está definida (ver cypress.config.js).');
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

/** cy.visit respetando APP_BASE_PATH (p. ej. '/suministros/gastos' -> cy.visit('/sigab-test/suministros/gastos')). */
export function visitar(ruta: string, opciones: Partial<Cypress.VisitOptions> = {}): Cypress.Chainable<Cypress.AUTWindow> {
  const r = ruta.startsWith('/') ? ruta : '/' + ruta;
  return cy.visit(`${appBasePath()}${r}`, opciones);
}

function secreto(): string {
  const s = String(Cypress.env('TEST_SANDBOX_SECRET') || '');
  if (!s) throw new Error('[TC-M05-G23] TEST_SANDBOX_SECRET no está definida (ver cypress.config.js).');
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

/**
 * Intercepta peticiones del navegador:
 * - Inyecta X-Test-Run-Id y X-Sandbox-Secret en peticiones dirigidas al host oficial de la API.
 * - Bloquea con 403 peticiones a otros backends (fail-closed).
 * - Captura el token JWT sin imprimirlo.
 */
Cypress.Commands.add('aplicarSandbox', () => {
  const hostValido = hostApi();
  const patronHostValido = hostValido ? new RegExp(`^https?://${escaparRegex(hostValido)}(?::\\d+)?(?:/|$)`) : null;

  cy.intercept({ url: '**' }, (req) => {
    let urlObj: URL | null = null;
    try {
      urlObj = new URL(req.url);
    } catch {
      req.continue();
      return;
    }

    const esHostApi = patronHostValido ? patronHostValido.test(req.url) : false;
    const esApi = esHostApi && urlObj.pathname.includes('/api-sgpmp-test');

    if (esApi && urlObj.pathname.includes('/sesiones/')) {
      const entrada: PeticionSesion = { method: req.method, url: req.url };
      estado.sesiones.push(entrada);
      req.on('response', (res) => {
        entrada.statusCode = res.statusCode;
      });
    }

    if (!esApi) {
      if (
        req.url.includes('/api-sgpmp') ||
        req.url.includes(':8000') ||
        req.url.includes(':8001') ||
        req.url.includes('backend')
      ) {
        estado.bloqueadas.push({ host: urlObj.host, method: req.method, path: urlObj.pathname });
        req.reply({
          statusCode: 403,
          body: {
            error_code: 'SANDBOX_HOST_BLOQUEADO',
            message: `Petición a host no autorizado por sandbox: ${urlObj.host}`,
          },
        });
        return;
      }
      req.continue();
      return;
    }

    // Inyectar cabeceras en llamadas a la API oficial
    if (estado.activo && !estado.cerrado && estado.runId) {
      req.headers['X-Test-Run-Id'] = estado.runId;
      req.headers['X-Sandbox-Secret'] = secreto();
      req.headers['X-Zona-Horaria'] = zona();
      estado.confirmado = true;
      estado.peticiones++;
    }

    const auth = (req.headers['authorization'] || req.headers['Authorization'] || '') as string;
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (bearer) {
      if (estado.activo && !estado.cerrado) {
        estado.tokenSandbox = bearer;
      } else {
        estado.tokenFuera = bearer;
      }
    }

    req.continue();
  }).as('sandboxGlobal');
});

Cypress.Commands.add('startSandbox', (runId: string) => {
  if (!runId) throw new Error('[TC-M05-G23] startSandbox requiere runId no vacío.');
  estado.runId = runId;
  estado.activo = true;
  estado.cerrado = false;
  estado.confirmado = false;
  estado.peticiones = 0;
  estado.tokenSandbox = '';
  estado.tokenFuera = '';
  estado.bloqueadas = [];
  estado.sesiones = [];
  cy.aplicarSandbox();
  cy.log(`[SANDBOX] iniciado con runId: ${runId}`);
});

Cypress.Commands.add('rollbackSandbox', (runId: string) => {
  estado.cerrado = true;
  estado.activo = false;
  cy.log(`[SANDBOX] solicitando rollback para ${runId}...`);
  return cy
    .request({
      method: 'DELETE',
      url: `${apiBase()}/test-control/runs/${runId}`,
      headers: {
        'X-Sandbox-Secret': secreto(),
      },
      failOnStatusCode: false,
      log: false,
    })
    .then((res) => {
      cy.log(`[SANDBOX] rollback -> HTTP ${res.status}`);
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
 */
Cypress.Commands.add('apiSandbox', ({ method, path, body }: OpcionesApi) => {
  if (!estado.activo || estado.cerrado) {
    throw new Error(`[TC-M05-G23] apiSandbox ${method} ${path}: el sandbox no está activo.`);
  }
  if (!estado.tokenSandbox) {
    throw new Error(`[TC-M05-G23] apiSandbox ${method} ${path}: aún no hay token de la SPA.`);
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

/** Solo lectura y solo tras el rollback: GET sin cabeceras de sandbox. */
Cypress.Commands.add('apiSinSandbox', (path: string, token: 'sandbox' | 'fuera') => {
  if (!estado.cerrado) {
    throw new Error('[TC-M05-G23] apiSinSandbox solo se usa después del rollback.');
  }
  const valor = token === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera;
  cy.log(`[API sin sandbox] GET ${path}`);
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
 */
Cypress.Commands.add('loginUI', (email: string, password: string) => {
  if (!email || !password) throw new Error('[TC-M05-G23] loginUI sin credenciales: revisa ADMIN_EMAIL / ADMIN_PASSWORD.');
  visitar('/login', { log: false });
  cy.get('input[autocomplete="email"]', { timeout: 120000 }).clear({ log: false }).type(email, { log: false });
  cy.get('input[autocomplete="current-password"]').clear({ log: false }).type(password, { log: false });
  cy.contains('button[type="submit"]', /^\s*(ingresar|sign in)\s*$/i).click();
  return cy.esperarCondicion((doc) => rutaApp(doc.location.pathname) !== '/login', 120000, 500);
});

/** Fuerza la zona del navegador por CDP (Chromium). */
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

/** Espera a que la SPA capture su token. */
Cypress.Commands.add('esperarToken', (tipo: 'sandbox' | 'fuera', timeoutMs = 30000) => {
  const leer = () => (tipo === 'sandbox' ? estado.tokenSandbox : estado.tokenFuera);
  return cy.esperarCondicion(() => !!leer(), timeoutMs, 250);
});

/** Sondeo del DOM de la app sin aserciones que aborten el flujo. */
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

