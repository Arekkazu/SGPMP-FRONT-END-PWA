// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: verifica diseño y acciones con API simulada |
/// <reference types="cypress" />

// Navegador real y aplicación real; todas las respuestas HTTP son dobles explícitos.
const alerta = {
  id_alerta: 17, tipo_alerta: 'TEMPERATURA_CRITICA', estado_alerta: 'ACTIVA',
  tipo_variable: 'TEMPERATURA', severidad: 'CRITICO', origen_evento: 'EDGE',
  valor: 40, unidad: '°C', fecha_generacion: '2026-10-22T12:00:00Z',
  fecha_evento: '2026-10-22T12:00:00Z', reglas_activas: [], historico_estados: [],
};

function preparar(descartar = true) {
  // Impide que una ruta auxiliar no preparada alcance un backend de desarrollo.
  cy.intercept('http://localhost:8000/**', { statusCode: 404, body: { message: 'Fixture no definido' } });
  const now = Math.floor(Date.now() / 1000);
  const token = `fixture.${btoa(JSON.stringify({ sub: '17', jti: 'fe12', rol: 999, iat: now, exp: now + 3600 }))}.fixture`;
  cy.intercept('POST', '**/sesiones/refresh', { token });
  cy.intercept('GET', '**/usuarios/me', { id_usuario: 17, nombre: 'QA', apellidos: 'FE12', nombre_rol: 'Fixture', estado_cuenta: 'Activo' });
  cy.intercept('GET', '**/sesiones/me/permisos', {
    permisos: [{ id_recurso: 32, id_accion: 2 }, { id_recurso: 32, id_accion: 3 }, ...(descartar ? [{ id_recurso: 32, id_accion: 4 }] : [])],
  });
  cy.intercept('GET', '**/configuracion/interfaz/contexto', { statusCode: 204 });
  cy.intercept('GET', '**/configuracion/interfaz/idioma*', { locale_code: 'es-CO' });
  cy.intercept('GET', '**/configuracion/interfaz/tema*', { modo_tema: 'CLARO' });
  cy.intercept('GET', '**/notificaciones*', { items: [], total: 0 });
  cy.intercept('GET', '**/iot/alertas?*', { items: [alerta], total: 1, pagina: 1, por_pagina: 50 });
  cy.intercept('GET', '**/iot/alertas/17', alerta);
}

describe('FE-12 navegador con backend simulado', () => {
  it('detalle sin D conserva diseño y oculta el descarte', () => {
    preparar(false);
    cy.viewport(1280, 900);
    cy.visit('/telemetria/alertas');
    cy.contains('tr', 'TEMPERATURA_CRITICA').click();
    cy.get('.ds-modal__panel').should('be.visible');
    cy.contains('button', 'Tomar en atención').should('be.visible');
    cy.contains('button', /^Descartar$/).should('not.exist');
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').should('be.visible');
    cy.screenshot('detalle-sin-descarte');
  });

  for (const estado of [403, 422]) {
    it(`móvil: rechazo ${estado} mantiene motivo y no reintenta`, () => {
      preparar();
      let envios = 0;
      cy.intercept('PATCH', '**/iot/alertas/17/estado', (req) => {
        envios += 1;
        expect(req.body).to.deep.equal({ nuevo_estado: 'DESCARTADA', motivo: 'Motivo conservado' });
        req.reply({ statusCode: estado, body: { error_code: estado === 403 ? 'ACCESO_DENEGADO' : 'TRANSICION_INVALIDA', message: 'Rechazo público FE-12' } });
      }).as('cambio');
      cy.viewport(390, 844);
      cy.visit('/telemetria/campo');
      cy.contains('button', /^Descartar$/).click();
      cy.get('#motivo-alerta').type('Motivo conservado');
      cy.get('[role="dialog"]').contains('button', /^Descartar$/).click();
      cy.wait('@cambio');
      cy.contains('[role="alert"]', 'Rechazo público FE-12').should('be.visible');
      cy.get('#motivo-alerta').should('have.value', 'Motivo conservado');
      cy.contains('Activa').should('be.visible');
      cy.then(() => expect(envios).to.equal(1));
      cy.screenshot(`movil-rechazo-${estado}`);
    });
  }
});
