/// <reference types="cypress" />
// Comandos de apoyo (proyecto autocontenido, se carga por supportFile en cypress.config.js).
// Pantalla bajo prueba: /telemetria/historial (src/telemetry/pages/HistorialView.tsx).
// Credenciales de la cuenta Productor SOLO por variable de entorno (CYPRESS_email, CYPRESS_password).

type FiltrosHistorial = {
  desde?: string;     // yyyy-mm-dd
  hasta?: string;     // yyyy-mm-dd
  variable?: string;  // '' = sin filtro
  estado?: string;    // '' = Todas | LECTURA_VALIDA | FUERA_DE_RANGO | ERROR_CALIBRACION
  infra?: string;     // id_infraestructura, '' = sin filtro
};

declare global {
  namespace Cypress {
    interface Chainable {
      loginProductor(): Chainable<void>;
      irAHistorial(): Chainable<void>;
      consultarHistorial(f: FiltrosHistorial): Chainable<any>;
    }
  }
}

Cypress.Commands.add('loginProductor', () => {
  const email = Cypress.env('email');
  const password = Cypress.env('password');
  if (!email || !password) {
    throw new Error('Faltan las variables de entorno CYPRESS_email y CYPRESS_password (cuenta Productor).');
  }
  cy.visit('/login');
  cy.get('input[type="email"]').clear().type(email, { log: false });
  cy.get('input[autocomplete="current-password"]').clear().type(password, { log: false });
  cy.get('button[type="submit"]').click();
  cy.location('pathname', { timeout: 20000 }).should('not.match', /\/login\/?$/);
});

// Navega dentro de la app (sin recargar, para conservar la sesion). NO exige que la consulta inicial de la
// pantalla responda (en TEST la carga inicial puede fallar): solo deja en la consola lo que ocurrio con ella.
Cypress.Commands.add('irAHistorial', () => {
  cy.intercept('GET', '**/iot/monitoreo/historial*').as('historialInicial');
  const base = new URL(Cypress.config('baseUrl') as string).pathname.replace(/\/$/, '');
  cy.window().then((win) => {
    win.history.pushState({}, '', `${base}/telemetria/historial`);
    win.dispatchEvent(new win.PopStateEvent('popstate', { state: {} }));
  });
  cy.location('pathname').should('eq', `${base}/telemetria/historial`);
  cy.get('#h-desde', { timeout: 20000 }).should('be.visible');
  cy.wait(8000);
  cy.get('@historialInicial.all').then((lista: any) => {
    const resumen = (lista as any[]).map((x) =>
      `${x.request.url} -> ${x.response ? x.response.statusCode + ' ' + JSON.stringify(x.response.body).slice(0, 300) : 'SIN RESPUESTA'}`);
    cy.task('log', `Carga inicial del historial (${resumen.length}): ` + resumen.join(' | '));
  });
});

// Llena los filtros indicados, pulsa Consultar y devuelve la peticion de ESA consulta (alias propio, no la inicial).
Cypress.Commands.add('consultarHistorial', (f: FiltrosHistorial) => {
  if (f.desde !== undefined) cy.get('#h-desde').clear().type(f.desde);
  if (f.hasta !== undefined) cy.get('#h-hasta').clear().type(f.hasta);
  if (f.variable !== undefined) {
    cy.get('#h-var').clear();
    if (f.variable) cy.get('#h-var').type(f.variable);
  }
  if (f.infra !== undefined) {
    cy.get('#h-infra').clear();
    if (f.infra) cy.get('#h-infra').type(f.infra);
  }
  if (f.estado !== undefined) cy.get('#h-estado').select(f.estado === '' ? 0 : f.estado);
  const alias = `consulta${Date.now()}`;
  cy.intercept('GET', '**/iot/monitoreo/historial*').as(alias);
  cy.contains('button', 'Consultar').click();
  return cy.wait(`@${alias}`, { timeout: 60000 }).then((i) => {
    cy.task('log', `Consulta ${i.request.url} -> ${i.response ? i.response.statusCode : 'SIN RESPUESTA'}`);
    return cy.wrap(i);
  });
});

export {};
