// TC-M03-G131 · Preparacion tecnica de la sesion de usabilidad (la prueba en si es MANUAL)
// Ejecutar (PowerShell, desde esta carpeta):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_email="<correo del Productor>"; $env:CYPRESS_password="<contrasena>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M03-G131.html   Capturas: RESULTADOS\capturas
// Los selectores salen del codigo de la pantalla (HistorialView / HistorialFiltros / HistorialTable / LineChartTelemetria).

// Este spec NO evalua la usabilidad: solo comprueba que la pantalla y los datos estan listos para la sesion manual
// (ver guion_usabilidad_TC-M03-G131.md) y deja registrado en la consola que periodo usar.
const DESDE = Cypress.env('desde') || '2026-10-18';
const HASTA = Cypress.env('hasta') || '2026-10-25';

describe('TC-M03-G131 · RF-59 · Preparacion de la sesion de usabilidad', () => {
  before(() => {
    cy.loginProductor();
    cy.irAHistorial();
  });

  it('1. El Productor llega al historial y se muestran filtros, grafica y tabla con la consulta inicial', () => {
    cy.get('#h-desde').should('be.visible');
    cy.get('#h-hasta').should('be.visible');
    cy.contains('button', 'Consultar').should('be.visible');
  });

  it('2. Temperatura Ambiental del 20 al 22/10/2026 devuelve lecturas y se grafica (tareas 2 y 3 del guion)', () => {
    cy.consultarHistorial({ desde: '2026-10-20', hasta: '2026-10-22', variable: 'Temperatura Ambiental', estado: '', infra: '' }).then((i) => {
      expect(i.response.statusCode).to.eq(200);
      expect(i.response.body.total, 'lecturas de temperatura 20-22/10').to.be.greaterThan(0);
      cy.get('.recharts-wrapper').should('be.visible');
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
      cy.screenshot('TC-M03-G131-tarea2-temperatura');
    });
  });

  it('3. Sin filtro de variable hay al menos dos variables en el periodo (precondicion de la ficha)', () => {
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado: '', infra: '' }).then((i) => {
      expect(i.response.statusCode).to.eq(200);
      const vars = (i.response.body.estadisticas as any[]).map((e) => e.tipo_variable);
      cy.task('log', `G131 variables en ${DESDE}..${HASTA}: ` + vars.join(', '));
      expect(vars.length, 'variables con lecturas').to.be.greaterThan(1);
    });
  });

  it('4. Existe un vacio temporal visible en el periodo (tarea 4 del guion)', () => {
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado: '', infra: '' }).then((i) => {
      const vacios: any[] = i.response.body.vacios_temporales;
      cy.task('log', `G131 vacios en ${DESDE}..${HASTA} (${vacios.length}): ` + JSON.stringify(vacios.slice(0, 5)));
      expect(vacios.length, 'vacios temporales en el periodo').to.be.greaterThan(0);
    });
  });
});
