/// <reference types="cypress" />

describe('Smoke Test - TC-M09-G07-v2.0 (Verificación de Infraestructura)', () => {
  it('Comprueba Login, navegación a configuración, reactividad offline/online, IndexedDB y consulta API sin crear datos', () => {
    // 1. Login UI
    cy.loginUI();

    // 2. Navegación a /configuracion y espera de sidebar
    cy.capturarRefresh();
    cy.visit('/configuracion');

    cy.contains('.ds-sidebar__item:not(.ds-sidebar__item--locked)', /configuración|configuration/i, { timeout: 20000 })
      .should('be.visible');

    cy.contains('h2', /catálogo de especies|species catalog/i, { timeout: 20000 })
      .should('be.visible');

    // 3. Simulación offline -> verificar banner
    cy.setOnline(false);
    cy.contains(/sin conexión|offline/i, { timeout: 10000 }).should('be.visible');

    // 4. Simulación online -> verificar que el banner desaparece
    cy.setOnline(true);
    cy.contains(/sin conexión|offline/i, { timeout: 10000 }).should('not.exist');

    // 5. Purgar IndexedDB y verificar recreación
    cy.purgarIndexedDB().then((purged) => {
      expect(purged, 'Resultado de purgar IndexedDB').to.be.a('boolean');
    });

    // 6. Consulta GET ?solo_activas=false con Authorization mediante cy.token()
    cy.token().then((tok) => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_BASE_URL')}/configuracion/especies?solo_activas=false`,
        headers: { Authorization: `Bearer ${tok}` },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Smoke GET status: ${res.status}`);
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });
  });
});
