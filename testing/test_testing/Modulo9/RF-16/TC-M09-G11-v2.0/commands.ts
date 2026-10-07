/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<string>;
      capturarRefresh(): Chainable<void>;
      token(): Chainable<string>;
      getRunId(): Chainable<string>;
      purgarIndexedDB(): Chainable<boolean>;
      preflightEspecieNombres(idEspecie: number, nombres: { ciclos?: string[]; patologias?: string[]; metricas?: string[] }): Chainable<void>;
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

Cypress.Commands.add('preflightEspecieNombres', (idEspecie: number, nombres: { ciclos?: string[]; patologias?: string[]; metricas?: string[] }) => {
  cy.token().then((tok) => {
    const apiBase = Cypress.env('API_BASE_URL');
    const headers = { Authorization: `Bearer ${tok}` };

    if (nombres.ciclos && nombres.ciclos.length > 0) {
      cy.request({
        method: 'GET',
        url: `${apiBase}/configuracion/ciclos?id_especie=${idEspecie}&solo_activas=true`,
        headers,
        failOnStatusCode: false,
      }).then((res) => {
        const items = Array.isArray(res.body) ? res.body : res.body?.items || [];
        const existentes = items.map((i: any) => (i.nombre || '').trim().toLowerCase());
        for (const n of nombres.ciclos!) {
          if (existentes.includes(n.trim().toLowerCase())) {
            throw new Error(`ABORT PREFLIGHT: El ciclo "${n}" ya existe activo para la especie #${idEspecie}.`);
          }
        }
      });
    }

    if (nombres.patologias && nombres.patologias.length > 0) {
      cy.request({
        method: 'GET',
        url: `${apiBase}/configuracion/patologias?id_especie=${idEspecie}&solo_activas=true`,
        headers,
        failOnStatusCode: false,
      }).then((res) => {
        const items = Array.isArray(res.body) ? res.body : res.body?.items || [];
        const existentes = items.map((i: any) => (i.nombre || '').trim().toLowerCase());
        for (const n of nombres.patologias!) {
          if (existentes.includes(n.trim().toLowerCase())) {
            throw new Error(`ABORT PREFLIGHT: La patología "${n}" ya existe activa para la especie #${idEspecie}.`);
          }
        }
      });
    }

    if (nombres.metricas && nombres.metricas.length > 0) {
      cy.request({
        method: 'GET',
        url: `${apiBase}/configuracion/metricas?id_especie=${idEspecie}&solo_activas=true`,
        headers,
        failOnStatusCode: false,
      }).then((res) => {
        const items = Array.isArray(res.body) ? res.body : res.body?.items || [];
        const existentes = items.map((i: any) => (i.nombre || '').trim().toLowerCase());
        for (const n of nombres.metricas!) {
          if (existentes.includes(n.trim().toLowerCase())) {
            throw new Error(`ABORT PREFLIGHT: La métrica "${n}" ya existe activa para la especie #${idEspecie}.`);
          }
        }
      });
    }
  });
});

export {};
