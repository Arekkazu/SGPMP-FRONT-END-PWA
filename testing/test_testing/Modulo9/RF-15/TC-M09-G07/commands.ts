/// <reference types="cypress" />
// Comandos personalizados para TC-M09-G07 (loginUI, setOnline, setNetwork).
// Se cargan vía "supportFile" en cypress.config.js (proyecto autocontenido).

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
      setNetwork(offline: boolean): Chainable<void>;
      setOnline(online: boolean): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', (email?: string, password?: string) => {
  const targetEmail = email || Cypress.env('ADMIN_EMAIL');
  const targetPassword = password || Cypress.env('TEST_ADMIN_PASSWORD');

  if (!targetEmail || !targetPassword) {
    throw new Error(
      'Configuración incompleta: ADMIN_EMAIL o TEST_ADMIN_PASSWORD no están definidos en las variables de entorno (.env.test).'
    );
  }

  cy.clearLocalStorage();
  cy.clearCookies();
  cy.visit('/login');
  cy.get('input[autocomplete="email"]', { timeout: 15000 }).clear().type(targetEmail);
  cy.get('input[autocomplete="current-password"]').clear().type(targetPassword, { log: false });
  // Selector bilingüe para soporte i18n (es-CO: "Ingresar" / en-US: "Sign In", "Log in")
  cy.contains('button', /ingresar|sign in|log in/i).click();
  cy.location('pathname', { timeout: 20000 }).should('not.eq', '/login');
});

Cypress.Commands.add('setOnline', (online: boolean) => {
  cy.log(`Estado de red del navegador → ${online ? 'ONLINE' : 'OFFLINE'}`);
  cy.window({ log: false }).then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      value: online,
      configurable: true,
      writable: true,
    });
    win.dispatchEvent(new win.Event(online ? 'online' : 'offline'));
  });
});

Cypress.Commands.add('setNetwork', (offline: boolean) => {
  cy.log(`CDP Red → ${offline ? 'OFFLINE' : 'ONLINE'}`);
  cy.wrap(null, { log: false }).then(() => {
    return (Cypress.automation('remote:debugger:protocol', {
      command: 'Network.enable',
      params: {},
    }) as Promise<unknown>).then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline,
          latency: 0,
          downloadThroughput: offline ? 0 : -1,
          uploadThroughput: offline ? 0 : -1,
        },
      })
    );
  });
});

export {};
