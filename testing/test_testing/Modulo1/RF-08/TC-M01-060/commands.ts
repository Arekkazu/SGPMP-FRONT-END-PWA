/// <reference types="cypress" />

Cypress.Commands.add('loginUI', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[autocomplete="email"]').type(email);
  cy.get('input[autocomplete="current-password"]').type(password, { log: false });
  cy.contains('button', 'Ingresar').click();
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email: string, password: string): Chainable<void>;
    }
  }
}