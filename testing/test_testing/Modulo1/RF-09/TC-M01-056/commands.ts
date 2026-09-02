/// <reference types="cypress" />
// Comandos personalizados para TC-M01-056.

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
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

export {};
