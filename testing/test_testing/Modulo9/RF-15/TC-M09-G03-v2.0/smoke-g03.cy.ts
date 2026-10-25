/// <reference types="cypress" />

export interface EspecieItem {
  id_especie?: number;
  id?: number;
  nombre: string;
  descripcion?: string | null;
  es_activo?: boolean;
  activo?: boolean;
  grupo_manejo?: string;
  fecha_creacion?: string;
  fecha_creacion_especie?: string;
  fecha_actualizacion?: string | null;
  fecha_actualizacion_especie?: string | null;
}

describe('SMOKE: TC-M09-G03-v2.0 · Smoke test mínimo sin mutaciones', () => {
  const adminEmail = Cypress.env('ADMIN_EMAIL');
  const adminPassword = Cypress.env('TEST_ADMIN_PASSWORD') || Cypress.env('ADMIN_PASSWORD');
  const apiUrl = Cypress.env('API_BASE_URL');

  let targetId = 0;
  let nombreOriginal = '';

  before(() => {
    cy.intercept('POST', '**/sesiones/').as('postLogin');
    cy.intercept('POST', '**/sesiones/refresh', (req) => {
      req.continue((res) => {
        const t = res.body?.token || res.body?.access_token || (res.body?.data && res.body.data.token);
        if (t) Cypress.env('CAPTURED_TOKEN', t);
      });
    }).as('postRefresh');

    cy.loginUI(adminEmail, adminPassword).then((tok) => {
      Cypress.env('CAPTURED_TOKEN', tok);
      return cy.preflightEspecie(tok).then((candidata) => {
        targetId = candidata.id_especie || candidata.id || 0;
        nombreOriginal = candidata.nombre;
      });
    });
  });

  it('SMOKE: Navega, filtra fila, inspecciona modal y realiza GET sin mutaciones', () => {
    cy.visit('/configuracion');
    cy.get('a[href="/configuracion"]', { timeout: 30000 })
      .should('not.have.class', 'ds-sidebar__item--locked');

    // Filtro por buscador
    cy.get('input[placeholder*="Buscar"], input[placeholder*="Search"]', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type(nombreOriginal, { delay: 20 });
    cy.get('tbody tr', { timeout: 15000 }).should('have.length.gte', 1);

    // Imprimir texto literal de la fila para verificar el formato
    cy.get('tbody tr')
      .first()
      .invoke('text')
      .then((t) => {
        cy.log('fila_literal:', t);
        cy.task('writeResult', {
          file: 'evidencias/smoke_fila_literal.txt',
          content: t,
        });
      });

    // Localizar fila y abrir modal
    cy.contains('tbody tr', nombreOriginal, { timeout: 15000 })
      .should('be.visible')
      .find('button[aria-label*="Editar"], button[aria-label*="Edit"]')
      .first()
      .should('be.visible')
      .click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('h2', 'Editar especie').should('be.visible');

    // Cerrar modal sin enviar
    cy.contains('button', /cancelar|cancel/i).click();
    cy.get('[role="dialog"]').should('not.exist');

    // GET con el token vigente leído en cy.then()
    cy.then(() => {
      const tok = Cypress.env('CAPTURED_TOKEN') as string;
      return cy.request({
        method: 'GET',
        url: `${apiUrl}/configuracion/especies?solo_activas=false`,
        headers: { Authorization: `Bearer ${tok}` },
        failOnStatusCode: false,
      });
    }).then((res) => {
      expect(res.status, 'Smoke GET verificación').to.eq(200);
      cy.log('Smoke GET status:', String(res.status));
    });
  });
});
