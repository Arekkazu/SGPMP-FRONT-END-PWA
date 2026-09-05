/// <reference types="cypress" />
// Comandos personalizados para TC-M01-042 (loginUI, setNetwork).
// Se cargan vía "supportFile" en cypress.config.js (proyecto autocontenido, sin
// carpeta cypress/support/ estándar). Este spec no llama loginUI (el formulario
// de recuperación es público), se mantiene por consistencia con el resto del
// proyecto de pruebas.

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
      setNetwork(offline: boolean): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', (
  email = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co',
  password = Cypress.env('ADMIN_PASSWORD') || 'Test1234!',
) => {
  cy.visit('/login');
  cy.get('input[autocomplete="email"]').clear().type(email);
  cy.get('input[autocomplete="current-password"]').clear().type(password, { log: false });
  cy.contains('button', 'Ingresar').click();
  cy.location('pathname', { timeout: 15000 }).should('not.eq', '/login');
});

Cypress.Commands.add('setNetwork', (offline: boolean) => {
  cy.log(`red → ${offline ? 'OFFLINE' : 'ONLINE'}`);
  return cy.wrap(
    Cypress.automation('remote:debugger:protocol', { command: 'Network.enable', params: {} })
      .then(() => Cypress.automation('remote:debugger:protocol', {
        command: 'Network.emulateNetworkConditions',
        params: { offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1 },
      })),
    { log: false },
  );
});

export {};
