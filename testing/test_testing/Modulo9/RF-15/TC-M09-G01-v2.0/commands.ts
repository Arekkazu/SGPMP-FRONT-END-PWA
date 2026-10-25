/// <reference types="cypress" />
// Comandos personalizados para TC-M09-G01-v2.0 (loginUI, setNetwork).
// Sin credenciales hardcodeadas; inyección vía Cypress.env o variables de entorno.

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
      setNetwork(offline: boolean): Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  'loginUI',
  (
    email = Cypress.env('ADMIN_EMAIL'),
    password = Cypress.env('TEST_ADMIN_PASSWORD') || Cypress.env('ADMIN_PASSWORD'),
  ) => {
    if (!email) {
      throw new Error(
        'Falta la variable de entorno ADMIN_EMAIL para iniciar sesión. Verifique .env.test o el entorno.',
      );
    }
    if (!password) {
      throw new Error(
        'Falta la variable de entorno TEST_ADMIN_PASSWORD (o ADMIN_PASSWORD) para iniciar sesión.',
      );
    }

    cy.visit('/login', { timeout: 120000 });
    cy.get('input[autocomplete="email"], input[type="email"]', { timeout: 30000 })
      .clear()
      .type(email);
    // Escribir contraseñas con log: false para evitar fugas en logs y screenshots
    cy.get('input[autocomplete="current-password"], input[type="password"]')
      .clear()
      .type(password, { log: false });

    // Selector bilingüe con regex es|en (RF-29)
    cy.contains('button', /ingresar|iniciar sesión|sign in|log in/i)
      .should('be.visible')
      .click();

    cy.location('pathname', { timeout: 120000 }).should('not.eq', '/login');
  },
);

Cypress.Commands.add('setNetwork', (offline: boolean) => {
  cy.log(`red → ${offline ? 'OFFLINE' : 'ONLINE'}`);
  cy.wrap(
    (Cypress.automation('remote:debugger:protocol', { command: 'Network.enable', params: {} }) as any)
      .then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Network.emulateNetworkConditions',
          params: {
            offline,
            latency: 0,
            downloadThroughput: offline ? 0 : -1,
            uploadThroughput: offline ? 0 : -1,
          },
        }),
      ),
    { log: false },
  );
});

export {};
