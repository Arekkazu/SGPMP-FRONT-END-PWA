/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<string>;
      capturarRefresh(): Chainable<void>;
      token(): Chainable<string>;
      setOnline(online: boolean): Chainable<void>;
      getRunId(): Chainable<string>;
      purgarIndexedDB(): Chainable<boolean>;
      preflightEspecieNombres(nombres: string[]): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', (email?: string, password?: string) => {
  const targetEmail = email || Cypress.env('ADMIN_EMAIL');
  const targetPassword = password || Cypress.env('TEST_ADMIN_PASSWORD');

  if (!targetEmail || !targetPassword) {
    throw new Error(
      'Configuración incompleta: ADMIN_EMAIL o TEST_ADMIN_PASSWORD no están definidos en las variables de entorno.'
    );
  }

  cy.clearLocalStorage();
  cy.clearCookies();
  cy.intercept('POST', '**/sesiones/').as('postLogin');
  cy.visit('/login');
  cy.get('input[autocomplete="email"]', { timeout: 15000 }).should('be.visible').clear().type(targetEmail);
  cy.get('input[autocomplete="current-password"]').should('be.visible').clear().type(targetPassword, { log: false });
  cy.contains('button', /ingresar|sign in|log in/i).should('be.visible').click();

  cy.wait('@postLogin', { timeout: 20000 }).then((interception) => {
    const token = interception.response?.body?.token;
    if (!token) throw new Error('Login falló: no se obtuvo token en response body');
    Cypress.env('CAPTURED_TOKEN', token);
  });

  return cy.then(() => {
    const token = Cypress.env('CAPTURED_TOKEN') as string;
    return cy.wrap(token);
  });
});

Cypress.Commands.add('capturarRefresh', () => {
  cy.intercept('POST', '**/sesiones/refresh', (req) => {
    req.continue((res) => {
      const nuevoToken = res.body?.token;
      if (nuevoToken) {
        Cypress.env('CAPTURED_TOKEN', nuevoToken);
      }
    });
  }).as('postRefresh');
});

Cypress.Commands.add('token', () => {
  cy.then(() => {
    const t = Cypress.env('CAPTURED_TOKEN');
    if (!t) throw new Error('CAPTURED_TOKEN no está definido en el entorno de Cypress');
  });
  return cy.then(() => {
    return cy.wrap(Cypress.env('CAPTURED_TOKEN') as string);
  });
});

Cypress.Commands.add('setOnline', (online: boolean) => {
  cy.log(`Estado de red del navegador → ${online ? 'ONLINE' : 'OFFLINE'}`);
  cy.window({ log: false }).then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
    win.dispatchEvent(new win.Event(online ? 'online' : 'offline'));
  });
});

Cypress.Commands.add('getRunId', () => {
  cy.task('readResult', { file: 'evidencias/run_id.txt' }).then((contenido: any) => {
    if (typeof contenido === 'string' && /^[A-Z]{6}$/.test(contenido.trim())) {
      const existingId = contenido.trim();
      Cypress.env('RUN_ID', existingId);
    } else {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let nuevoId = '';
      for (let i = 0; i < 6; i++) {
        nuevoId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      cy.task('writeResult', { file: 'evidencias/run_id.txt', content: nuevoId }).then(() => {
        Cypress.env('RUN_ID', nuevoId);
      });
    }
  });

  return cy.then(() => {
    const runId = Cypress.env('RUN_ID') as string;
    return cy.wrap(runId);
  });
});

// I1: purgarIndexedDB con deleteDatabase más limpio
Cypress.Commands.add('purgarIndexedDB', () => {
  cy.window({ log: false }).then((win) => {
    return new Cypress.Promise((resolve) => {
      try {
        const req = win.indexedDB.deleteDatabase('sgpmp');
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }).then((ok) => {
    Cypress.env('PURGE_OK', Boolean(ok));
  });

  return cy.then(() => {
    return cy.wrap(Boolean(Cypress.env('PURGE_OK')));
  });
});

Cypress.Commands.add('preflightEspecieNombres', (nombres: string[]) => {
  cy.token().then((tok) => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('API_BASE_URL')}/configuracion/especies?solo_activas=false`,
      headers: { Authorization: `Bearer ${tok}` },
      failOnStatusCode: false,
    }).then((res) => {
      const items = Array.isArray(res.body) ? res.body : res.body?.items || [];
      const nombresExistentes = items.map((i: any) => (i.nombre || '').trim().toLowerCase());
      for (const n of nombres) {
        if (nombresExistentes.includes(n.trim().toLowerCase())) {
          throw new Error(`ABORT PREFLIGHT: La especie "${n}" ya existe en el catálogo TEST. No se escribe JSON.`);
        }
      }
    });
  });
});

export {};
