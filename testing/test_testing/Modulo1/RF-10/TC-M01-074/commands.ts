/// <reference types="cypress" />
// Comandos personalizados para TC-M01-074 (loginUI, setNetwork).
// Se cargan vía "supportFile" en cypress.config.js (proyecto autocontenido, sin
// carpeta cypress/support/ estándar).

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
  // No asumimos una ruta fija de destino post-login (para esta cuenta la app
  // redirige a /auditoria, no a /dashboard): solo confirmamos que salimos de /login.
  cy.location('pathname', { timeout: 15000 }).should('not.eq', '/login');
});

// CORREGIDO: la version anterior usaba Cypress.automation('remote:debugger:protocol',
// 'Network.emulateNetworkConditions', { offline: true }) -- corte de red real a nivel
// de todo el proceso del navegador via CDP. En "cypress run" (headless) la app y el
// propio runner de Cypress comparten el mismo proceso/tab, y ese corte de red tambien
// rompe el canal interno que Cypress usa para hablar con el iframe de la aplicacion:
// tras activarlo, cy.get('body') dejaba de devolver el DOM de la app y pasaba a
// devolver el shell interno de Cypress (`/__cypress/iframes/...`, ~1100 caracteres de
// body), haciendo parecer que la app se habia quedado sin botones cuando en realidad
// el test habia perdido la conexion con la app, no la app con el backend. Confirmado
// con un cy.intercept('**/*') de diagnostico + inspeccionando window.location.pathname
// justo en el momento del chequeo.
//
// Fix: simular "offline" solo a nivel de aplicacion -- exactamente lo que un negativo
// de este tipo necesita probar (como reacciona LA APP a quedarse sin red), sin tocar
// el canal de control de Cypress:
//   1) cy.intercept() fuerza error de red SOLO en las llamadas al backend de la app.
//   2) navigator.onLine se sobreescribe + se dispara el evento offline/online, que es
//      lo que cualquier listener de conectividad de la app (useOnlineStatus.ts) usa.
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
