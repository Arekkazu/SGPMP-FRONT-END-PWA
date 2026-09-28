describe('TC-M09-G31 - evidencia visual del bloqueo de configuracion', () => {
  const email = Cypress.env('adminEmail');
  const secret = Cypress.env('adminPassword');
  const testCase = Cypress.env('caseId');

  it('muestra el bloqueo visual real antes de acceder a Monitoreo', () => {
    expect(email, 'correo de administrador disponible solo en proceso').to.be.a('string').and.not.empty;
    expect(secret, 'secreto de administrador disponible solo en proceso').to.be.a('string').and.not.empty;
    expect(testCase, 'caso original aislado').to.be.oneOf(['TC-M09-66', 'TC-M09-67', 'TC-M09-68']);

    cy.visit('/login');
    cy.get('input[type="email"]').should('be.visible').type(email);
    cy.get('input[type="password"]').should('be.visible').type(secret, { log: false });
    cy.get('button[type="submit"]').should('be.enabled').click();
    cy.location('pathname').should('eq', '/dashboard');
    cy.contains('Bienvenido al sistema').should('be.visible');
    cy.contains('Actualmente no tiene una unidad productiva asignada').should('be.visible');
    cy.screenshot(`${testCase}-bloqueo-sin-unidad`, { capture: 'fullPage' });
  });
});
