// TC-M03-G118 · La grafica de tendencia representa solo variables numericas (RF-59)
// Ejecutar (PowerShell, desde esta carpeta):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_email="<correo del Productor>"; $env:CYPRESS_password="<contrasena>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M03-G118.html   Capturas: RESULTADOS\capturas
// Los selectores salen del codigo de la pantalla (HistorialView / HistorialFiltros / HistorialTable / LineChartTelemetria).

// Periodo con lecturas ERROR_CALIBRACION y FUERA_DE_RANGO en TEST. Se puede cambiar con CYPRESS_desde / CYPRESS_hasta.
const DESDE = Cypress.env('desde') || '2026-10-18';
const HASTA = Cypress.env('hasta') || '2026-10-25';
const ESTADOS_CATEGORICOS = /LECTURA_VALIDA|FUERA_DE_RANGO|ERROR_CALIBRACION|\b(ROJO|VERDE|AMARILLO|GRIS)\b/;

function verificar(estado: 'ERROR_CALIBRACION' | 'FUERA_DE_RANGO') {
  cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado, infra: '' }).then((i) => {
    expect(i.response.statusCode, 'HTTP del historial').to.eq(200);
    const items: any[] = i.response.body.items;
    expect(items.length, `lecturas ${estado} entre ${DESDE} y ${HASTA} (precondicion)`).to.be.greaterThan(0);
    items.forEach((it) => {
      // El API serializa los decimales como texto ("23.50"): se exige que el contenido sea un numero finito.
      if (it.valor !== null) expect(Number.isFinite(Number(it.valor)), `valor numerico de la lectura ${it.id_telemetria} (${JSON.stringify(it.valor)})`).to.eq(true);
    });
    const variables = new Set(items.map((it) => it.tipo_variable)).size;

    // Grafica: una linea por variable numerica, ningun estado categorico como serie ni en los ejes
    cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
    cy.get('.recharts-line').should('have.length', variables);
    cy.get('.recharts-wrapper').invoke('text').should('not.match', ESTADOS_CATEGORICOS);
    cy.get('.recharts-wrapper svg text').then(($t) => {
      const numericos = [...$t].map((t) => (t.textContent || '').trim()).filter((x) => /^-?[\d.,]+$/.test(x));
      expect(numericos.length, 'etiquetas numericas en el eje Y de la grafica').to.be.greaterThan(0);
    });

    // Tabla: los estados categoricos van como columnas de texto
    cy.contains('table thead th', 'Estado').should('exist');
    cy.contains('table thead th', 'Semáforo').should('exist');
    cy.get('table tbody tr td:nth-child(7)').should('have.length.greaterThan', 0).each(($td) => {
      expect($td.text().trim()).to.eq(estado);
    });
  });
}

describe('TC-M03-G118 · RF-59 · Grafica solo con variables numericas', () => {
  before(() => {
    cy.loginProductor();
    cy.irAHistorial();
  });

  it('3.2a Con lecturas ERROR_CALIBRACION: grafica solo numerica y estados solo en la tabla', () => {
    verificar('ERROR_CALIBRACION');
    cy.screenshot('TC-M03-G118-ERROR_CALIBRACION');
  });

  it('3.2b Con lecturas FUERA_DE_RANGO: grafica solo numerica y estados solo en la tabla', () => {
    verificar('FUERA_DE_RANGO');
    cy.screenshot('TC-M03-G118-FUERA_DE_RANGO');
  });
});
