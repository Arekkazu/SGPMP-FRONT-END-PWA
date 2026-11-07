/// <reference types="cypress" />
// Comandos personalizados para TC-M09-G01 (loginUI, setNetwork, Sandbox transaccional).
// Se cargan vía "supportFile" en cypress.config.js (proyecto autocontenido).

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<void>;
      setNetwork(offline: boolean): Chainable<void>;
      startSandbox(runId: string): Chainable<void>;
      rollbackSandbox(runId: string, backendUrl?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', (
  email = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com',
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

Cypress.Commands.add('startSandbox', (runId: string) => {
  const secret = Cypress.env('TEST_SANDBOX_SECRET') || '377ab8a5ddc2e5b7f7fb5b58533329eb6ce7f22b99cbd6ad5ffecf3e05b7f8ff';
  cy.log(`[SANDBOX] Activando corrida transaccional: ${runId}`);
  cy.intercept('**', (req) => {
    req.headers['X-Test-Run-Id'] = runId;
    req.headers['X-Sandbox-Secret'] = secret;
  }).as('sandboxRequests');
});

Cypress.Commands.add('rollbackSandbox', (runId: string, backendUrl?: string) => {
  const secret = Cypress.env('TEST_SANDBOX_SECRET') || '377ab8a5ddc2e5b7f7fb5b58533329eb6ce7f22b99cbd6ad5ffecf3e05b7f8ff';
  const url = backendUrl || Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
  cy.log(`[SANDBOX] Ejecutando ROLLBACK en: ${url}/test-control/runs/${runId}`);
  return cy.request({
    method: 'DELETE',
    url: `${url}/test-control/runs/${runId}`,
    headers: {
      'X-Sandbox-Secret': secret,
    },
    failOnStatusCode: false,
  }).then((res) => {
    cy.log(`[SANDBOX] Resultado de rollback: HTTP ${res.status}`);
  });
});

export {};
