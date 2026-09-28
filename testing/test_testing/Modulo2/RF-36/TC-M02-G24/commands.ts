/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', (
  email = Cypress.env('ADMIN_EMAIL'),
  password = Cypress.env('ADMIN_PASSWORD'),
) => {
  if (!email || !password) {
    throw new Error('Credenciales ADMIN_EMAIL o ADMIN_PASSWORD no provistas en variables de entorno Cypress');
  }
  cy.visit('/login');
  cy.get('input[autocomplete="email"]').clear().type(email);
  cy.get('input[autocomplete="current-password"]').clear().type(password, { log: false });
  cy.contains('button', /^(Ingresar|Sign In|Log In)$/i).click();
  cy.location('pathname', { timeout: 120000 }).should('not.eq', '/login');
});

export {};
