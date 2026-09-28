/// <reference types="cypress" />

Cypress.Commands.add('loginUI', (correo: string, contrasena: string) => {
  cy.visit('/login');
  cy.get('input[type="email"], input[name="correo"], input[name="correo_electronico"]').clear().type(correo);
  cy.get('input[type="password"], input[name="contrasena"]').clear().type(contrasena);
  cy.contains('button', 'Ingresar').click();
  cy.location('pathname', { timeout: 15000 }).should('not.include', '/login');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(correo: string, contrasena: string): Chainable<void>;
    }
  }
}

export {};
