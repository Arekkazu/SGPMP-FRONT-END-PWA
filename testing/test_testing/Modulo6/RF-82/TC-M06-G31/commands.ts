/// <reference types="cypress" />
// | Fecha      | Nombre      | Que se hizo                                                                  |
// |------------|-------------|------------------------------------------------------------------------------|
// | 2026-11-09 | Laura032005 | TC-M06-G31 RF-82..85: comandos de apoyo (login, cabeceras de sandbox, bandeja, sin service worker) |

// Comandos de apoyo (proyecto autocontenido, se carga por supportFile en cypress.config.js).
// Pantalla bajo prueba: bandeja de notificaciones del encabezado (src/notificaciones/components/NotificationTray.tsx).
//
// Reglas de QA que aplica:
// - El login de la interfaz se hace FUERA del sandbox (sin cabeceras): solo el primer login de un run funciona
//   y el backend admite una sesión por cuenta.
// - Después, cy.intercept agrega X-Test-Run-Id y X-Sandbox-Secret a las peticiones que la interfaz hace a la API,
//   para que la bandeja lea lo mismo que se preparó por API dentro del run (cy.task, ver m06-api.js).
// - El estado compartido (run actual, token de la sesión de la interfaz) vive en Cypress.env: el archivo de soporte
//   y el spec se empaquetan por separado y no comparten variables de módulo.

export type Rol = 'ingeniero' | 'productor' | 'veterinario';

export interface ItemBandeja {
  titulo: string;
  mensaje: string;
  noLeida: boolean;
}

export interface Bandeja {
  noLeidas: number;
  total: number;
  items: ItemBandeja[];
}

declare global {
  namespace Cypress {
    interface Chainable {
      exigirVariables(): Chainable<void>;
      cabecerasSandbox(): Chainable<void>;
      loginUI(rol: Rol): Chainable<string>;
      nuevaCorrida(): Chainable<string>;
      cerrarCorrida(): Chainable<void>;
      limpiarCacheNotificaciones(): Chainable<void>;
      leerBandeja(captura: string): Chainable<Bandeja>;
    }
  }
}

// La dirección de la API se toma de la petición de login que hace la interfaz (Cypress.env('_api')): así los datos que se
// preparan por API y lo que lee la bandeja son los mismos. Solo se acepta una dirección de TEST.
const apiBase = (): string => String(Cypress.env('_api') || Cypress.env('API_URL') || 'https://api.inmero.co/api-sgpmp-test').replace(/\/$/, '');

const CUENTAS: Record<Rol, { correo: string; variableClave: string; defecto: string }> = {
  ingeniero: { correo: 'QA_CORREO_INGENIERO', variableClave: 'QA_CONTRASENA_INGENIERO', defecto: 'ingedecampo6@gmail.com' },
  productor: { correo: 'QA_CORREO_PRODUCTOR', variableClave: 'QA_CONTRASENA_PRODUCTOR', defecto: 'daniiella.vargass@gmail.com' },
  veterinario: { correo: 'QA_CORREO_VETERINARIO', variableClave: 'QA_CONTRASENA_VETERINARIO', defecto: 'mariajosecastillovargas57@gmail.com' },
};

const SECRETO = 'TEST_SANDBOX_SECRET';

// Sin service worker en la página, el código de la PWA que lo consulta (registerSW.js, mensajería push) puede lanzar un error propio de ese hecho:
// solo esos errores se ignoran; cualquier otro error de la aplicación sigue haciendo fallar el caso.
Cypress.on('uncaught:exception', (err) => {
  if (/serviceWorker|reading '(register|ready|getRegistrations?)'/.test(String(err && err.message))) return false;
  return undefined;
});

Cypress.Commands.add('exigirVariables', () => {
  const faltan = [SECRETO, 'QA_CONTRASENA_ADMIN', 'QA_CONTRASENA_INGENIERO', 'QA_CONTRASENA_PRODUCTOR', 'QA_CONTRASENA_VETERINARIO']
    .filter((v) => !Cypress.env(v) || String(Cypress.env(v)).startsWith('<'));
  if (faltan.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltan.map((v) => `CYPRESS_${v}`).join(', ')}.`);
  }
  if (String(Cypress.config('baseUrl')).replace(/\/$/, '').endsWith('/sigab')) {
    throw new Error('baseUrl apunta a MAIN (/sigab): ese ambiente nunca se prueba.');
  }
});

// Agrega las cabeceras del sandbox a las peticiones de la interfaz mientras haya un run abierto.
// Los intercepts se limpian antes de cada test: se registra en beforeEach.
Cypress.Commands.add('cabecerasSandbox', () => {
  // Solo las peticiones XHR (axios): interceptar también los archivos de la aplicación (cientos de chunks) vuelve lenta la carga y el login.
  cy.intercept({ resourceType: 'xhr' }, (req) => {
    const run = Cypress.env('_run');
    if (run && req.url.startsWith(apiBase())) {
      req.headers['x-test-run-id'] = run;
      req.headers['x-sandbox-secret'] = String(Cypress.env(SECRETO));
    }
  });
});

// Sesión nueva en la interfaz, FUERA del sandbox. Devuelve el token que emitió el login (la interfaz lo guarda solo en memoria).
Cypress.Commands.add('loginUI', (rol: Rol) => {
  const cuenta = CUENTAS[rol];
  Cypress.env('_run', null);
  // La aplicación es una PWA y registra un service worker: desde la segunda carga el service worker instalado toma el control de la página
  // y Cypress no recibe nunca el evento load (cy.visit queda colgado y los casos siguientes fallan en cascada). Se borran los service workers
  // y la caché de la aplicación desde el navegador (protocolo de depuración de Chrome) y, además, se impide que la página registre uno nuevo.
  cy.then(() => Cypress.automation('remote:debugger:protocol', {
    command: 'Storage.clearDataForOrigin',
    params: { origin: new URL(String(Cypress.config('baseUrl'))).origin, storageTypes: 'service_workers,cache_storage' },
  }).then(() => undefined, () => undefined));
  cy.clearCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
  cy.intercept({ method: 'POST', url: '**/sesiones/', resourceType: 'xhr' }).as('loginUI');
  cy.visit('/login', {
    timeout: 60000,
    onBeforeLoad(win) {
      // Sin service worker en la página bajo prueba (ver arriba).
      // Se quita de Navigator.prototype para que «'serviceWorker' in navigator» sea falso y registerSW.js no intente registrarlo.
      try { delete (win as any).Navigator.prototype.serviceWorker; } catch (e) { /* si el navegador no lo permite, queda el borrado previo */ }
    },
  });
  cy.get('input[type="email"]').clear().type(String(Cypress.env(cuenta.correo) || cuenta.defecto), { log: false });
  cy.get('input[autocomplete="current-password"]').clear().type(String(Cypress.env(cuenta.variableClave)), { log: false });
  cy.get('button[type="submit"]').click();
  cy.wait('@loginUI', { timeout: 90000 }).then((i) => {
    expect(i.response?.statusCode, `login de ${rol} en la interfaz`).to.eq(200);
    Cypress.env('_tokUI', i.response?.body?.token);
    const api = i.request.url.replace(/\/sesiones\/?(\?.*)?$/, '').replace(/\/$/, '');
    expect(/test/i.test(api) && !api.endsWith('/sigab'), `la API del login (${api}) debe ser de TEST: MAIN nunca se prueba`).to.eq(true);
    Cypress.env('_api', api);
  });
  cy.location('pathname', { timeout: 30000 }).should('not.match', /\/login\/?$/);
  // La sesión queda iniciada cuando el encabezado de la aplicación (con la campana de notificaciones) está en pantalla.
  cy.get('button[aria-controls="notification-tray"]', { timeout: 30000 }).should('exist');
  return cy.then(() => String(Cypress.env('_tokUI')));
});

// Abre un run nuevo: desde aquí la interfaz habla con el sandbox.
Cypress.Commands.add('nuevaCorrida', () => {
  const run = `test-cypress-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  Cypress.env('_run', run);
  return cy.wrap(run, { log: false });
});

// Cierra el run (rollback) y deja la interfaz fuera del sandbox.
Cypress.Commands.add('cerrarCorrida', () => {
  const run = Cypress.env('_run');
  Cypress.env('_run', null);
  if (run) cy.task('m06:cerrar', { run, api: apiBase() }, { log: false });
});

// «Se limpia la caché local de notificaciones antes de abrir la interfaz» (tabla `notificaciones` de la base Dexie `sgpmp`).
Cypress.Commands.add('limpiarCacheNotificaciones', () => {
  cy.window({ log: false }).then((win) => new Promise<void>((resolve) => {
    const abrir = win.indexedDB.open('sgpmp');
    abrir.onerror = () => resolve();
    abrir.onsuccess = () => {
      const db = abrir.result;
      try {
        if (!db.objectStoreNames.contains('notificaciones')) { db.close(); resolve(); return; }
        const tx = db.transaction('notificaciones', 'readwrite');
        tx.objectStore('notificaciones').clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      } catch (e) {
        db.close();
        resolve();
      }
    };
  }));
});

// Abre la bandeja, espera la consulta de notificaciones que dispara al abrirse y devuelve lo que se ve. Deja la bandeja cerrada.
Cypress.Commands.add('leerBandeja', (captura: string) => {
  cy.limpiarCacheNotificaciones();
  cy.intercept({ method: 'GET', url: '**/notificaciones*', resourceType: 'xhr' }).as('listaNotificaciones');
  cy.get('button[aria-controls="notification-tray"]').click();
  cy.get('#notification-tray', { timeout: 20000 }).should('be.visible');
  cy.wait('@listaNotificaciones', { timeout: 60000 }).then((i) => {
    cy.task('log', `GET /notificaciones desde la interfaz -> ${i.response ? i.response.statusCode : 'SIN RESPUESTA'}`);
  });
  cy.get('#notification-tray .notification-tray__spin', { timeout: 30000 }).should('not.exist');
  cy.contains('#notification-tray', 'Cargando notificaciones', { timeout: 30000 }).should('not.exist');
  cy.wait(500, { log: false });
  cy.screenshot(captura, { capture: 'viewport' });
  return cy.get('#notification-tray').then(($tray) => {
    const cabecera = $tray.find('.notification-tray__header p').first().text();
    const m = /(\d+)\s+sin leer de\s+(\d+)/.exec(cabecera);
    const items: ItemBandeja[] = $tray.find('.notification-tray__item').toArray().map((el) => ({
      titulo: Cypress.$(el).find('strong').first().text().trim(),
      mensaje: Cypress.$(el).find('.notification-tray__item-body p').first().text().trim(),
      noLeida: Cypress.$(el).hasClass('notification-tray__item--unread'),
    }));
    const bandeja: Bandeja = { noLeidas: m ? Number(m[1]) : -1, total: m ? Number(m[2]) : -1, items };
    cy.get('#notification-tray-close').click();
    return cy.wrap(bandeja, { log: false });
  });
});

export {};
