// TC-M03-G116 · Historial sin resultados: mensaje de estado vacio (RF-59)
// Ejecutar (PowerShell, desde esta carpeta):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_email="<correo del Productor>"; $env:CYPRESS_password="<contrasena>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M03-G116.html   Capturas: RESULTADOS\capturas
// Los selectores salen del codigo de la pantalla (HistorialView / HistorialFiltros / HistorialTable / LineChartTelemetria).

// Rango con filtros validos y sin lecturas (en TEST el 24/10/2026 no tiene datos). Se puede cambiar con
// $env:CYPRESS_fecha_vacia_desde / CYPRESS_fecha_vacia_hasta (formato aaaa-mm-dd).
const DESDE = Cypress.env('fecha_vacia_desde') || '2026-10-24';
const HASTA = Cypress.env('fecha_vacia_hasta') || '2026-10-24';

describe('TC-M03-G116 · RF-59 · Historial sin resultados', () => {
  before(() => {
    cy.loginProductor();
    cy.irAHistorial();
  });

  it('1. Consulta valida sin datos: HTTP 200 y total = 0 (precondicion)', () => {
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado: '', infra: '' }).then((i) => {
      expect(i.response.statusCode, 'HTTP del historial').to.eq(200);
      expect(i.response.body.total, `total entre ${DESDE} y ${HASTA}`).to.eq(0);
      expect(i.response.body.items, 'items').to.have.length(0);
    });
  });

  it('2. La pantalla muestra un estado vacio, sin error tecnico ni datos inventados', () => {
    cy.get('[role="status"]').should('be.visible');
    cy.contains(/error al cargar|par[aá]metros inv[aá]lidos|sin acceso al historial/i).should('not.exist');
    cy.get('.recharts-wrapper').should('not.exist');
    cy.get('table').should('not.exist');
    cy.screenshot('TC-M03-G116-estado-vacio');
  });

  it('3. El mensaje dice "No se encontraron registros para los filtros seleccionados"', () => {
    cy.contains(/no se encontraron registros para los filtros seleccionados/i).should('be.visible');
  });

  it('4. El mensaje sugiere ampliar el rango o modificar los filtros', () => {
    cy.get('[role="status"]').invoke('text').should('match', /ampl[ií]e|ampliar|modifique|modificar|cambie|ajuste/i);
  });
});
