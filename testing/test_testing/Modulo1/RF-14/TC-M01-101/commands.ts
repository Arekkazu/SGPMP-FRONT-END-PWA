/// <reference types="cypress" />
// Comandos personalizados para TC-M01-101 (loginUI, setNetwork).
// Copiados de TC-M01-074/commands.ts (mismo proyecto autocontenido, mismo fix
// de "offline simulado a nivel de app" en vez de CDP -- ver la nota extensa
// ahí sobre por qué Network.emulateNetworkConditions rompe el propio canal
// de control de Cypress).

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
  cy.log(`red (simulada a nivel de app) → ${offline ? 'OFFLINE' : 'ONLINE'}`);

  cy.intercept(
    { url: '**/api-sgpmp-test/**' },
    offline ? { forceNetworkError: true } : (req) => req.continue(),
  ).as(offline ? 'backendOffline' : 'backendOnline');

  cy.window({ log: false }).then((win) => {
    Object.defineProperty(win.navigator, 'onLine', { value: !offline, configurable: true });
    win.dispatchEvent(new Event(offline ? 'offline' : 'online'));
  });
});

export {};
