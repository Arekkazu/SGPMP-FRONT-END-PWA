// TC-M03-G121 · Representacion grafica de los vacios temporales sin interpolar (RF-59)
// Ejecutar (PowerShell, desde esta carpeta):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_email="<correo del Productor>"; $env:CYPRESS_password="<contrasena>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M03-G121.html   Capturas: RESULTADOS\capturas
// Los selectores salen del codigo de la pantalla (HistorialView / HistorialFiltros / HistorialTable / LineChartTelemetria).

// Periodo y filtros con un vacio temporal (hueco > 3 x frecuencia de muestreo). Se pueden cambiar con
// $env:CYPRESS_desde, CYPRESS_hasta, CYPRESS_variable (por defecto Humedad Relativa) y CYPRESS_infra (id_infraestructura).
// Por defecto el dia 18/10/2026 (vacio conocido del sensor 526, Humedad Relativa, 16:30Z a 23:00Z): con un solo dia las
// dos lecturas que delimitan el vacio caben en la primera pagina (100 lecturas) y la zona puede dibujarse en la grafica.
const DESDE = Cypress.env('desde') || '2026-10-18';
const HASTA = Cypress.env('hasta') || '2026-10-18';
const VARIABLE = Cypress.env('variable') !== undefined ? Cypress.env('variable') : 'Humedad Relativa';
const INFRA = Cypress.env('infra') || '';

let cuerpo: any = null;

describe('TC-M03-G121 · RF-59 · Vacios temporales en la grafica', () => {
  before(() => {
    cy.loginProductor();
    cy.irAHistorial();
  });

  it('0. Precondicion: el API informa al menos un vacio temporal en el periodo', () => {
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: VARIABLE, estado: '', infra: INFRA }).then((i) => {
      expect(i.response.statusCode, 'HTTP del historial').to.eq(200);
      cuerpo = i.response.body;
      const vacios: any[] = cuerpo.vacios_temporales;
      cy.task('log', `G121 vacios_temporales (${vacios.length}): ` + JSON.stringify(vacios.slice(0, 5)));
      expect(vacios.length, `vacios en ${DESDE}..${HASTA} variable "${VARIABLE}" (cambie el periodo o la variable con CYPRESS_desde/CYPRESS_hasta/CYPRESS_variable)`).to.be.greaterThan(0);
      vacios.forEach((v) => expect(v.duracion_min, `duracion del vacio del sensor ${v.sensor_id}`).to.be.greaterThan(3 * v.frecuencia_esperada_min));
    });
  });

  it('1.2 (244) El vacio se ve como zona sombreada o linea discontinua con la etiqueta "Sin datos"', () => {
    // La grafica queda bajo los indicadores y fuera de la ventana: se desplaza hasta ella antes de pedir visibilidad.
    cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
    cy.get('.recharts-reference-area').should('have.length.greaterThan', 0);
    cy.get('.recharts-wrapper').contains('Sin datos').scrollIntoView().should('be.visible');
    cy.screenshot('TC-M03-G121-1.2-vacio-grafica');
  });

  it('1.2 (244) La visualizacion no se interrumpe: sin error en pantalla y con grafica y tabla visibles', () => {
    cy.contains(/error al cargar|par[aá]metros inv[aá]lidos/i).should('not.exist');
    cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    // Informativo (no es parte del criterio de la ficha): aviso de texto y marca del vacio en la tabla.
    cy.get('body').then(($b) => {
      const aviso = /intervalos? sin datos/i.test($b.text());
      const filaVacio = $b.find('[data-testid="fila-vacio"]').length;
      cy.task('log', `G121 informativo: aviso del periodo con vacios=${aviso}; filas de vacio en la tabla=${filaVacio}`);
    });
  });

  it('2.2 (245) No existen lecturas entre las dos lecturas que delimitan el vacio (nada fabricado)', () => {
    expect(cuerpo, 'respuesta de la precondicion').to.not.equal(null);
    (cuerpo.vacios_temporales as any[]).forEach((v) => {
      const desde = new Date(v.desde).getTime();
      const hasta = new Date(v.hasta).getTime();
      const dentro = (cuerpo.items as any[]).filter((it) =>
        it.id_sensor === v.sensor_id && it.tipo_variable === v.tipo_variable &&
        new Date(it.timestamp_captura).getTime() > desde && new Date(it.timestamp_captura).getTime() < hasta);
      expect(dentro.length, `lecturas dentro del vacio del sensor ${v.sensor_id} (${v.desde} - ${v.hasta})`).to.eq(0);
    });
  });

  it('2.2 (245) La grafica no une con una linea continua las lecturas de ambos lados del vacio', () => {
    // Desde INC-M03-193 (26-Oct) el corte se hace con un tramo (otra <Line>) por cada lado del vacio, no con un
    // trazo de varios segmentos. Se comprueba el comportamiento: (a) la serie esta cortada (mas de un trazo o
    // mas de un segmento "M") y (b) NINGUN trazo pasa por dentro de la zona "Sin datos" (nada interpolado).
    // recharts dibuja la zona como <path class="recharts-reference-area-rect"> (no como <rect>).
    cy.get('.recharts-wrapper').first().scrollIntoView();
    cy.get('.recharts-reference-area-rect').should('have.length.greaterThan', 0);
    cy.get('path.recharts-line-curve').should('have.length.greaterThan', 0).then(($paths) => {
      const segmentos = [...$paths].reduce((n, p) => n + Math.max(1, ((p.getAttribute('d') || '').match(/M/g) || []).length), 0);
      cy.get('.recharts-reference-area-rect').then(($zonas) => {
        const TOL = 2; // px: los trazos de cada lado terminan justo en el borde de la zona
        const cruces: string[] = [];
        [...$zonas].forEach((z, zi) => {
          const rz = z.getBoundingClientRect();
          if (rz.width <= 2 * TOL) return;
          [...$paths].forEach((p, pi) => {
            const rp = p.getBoundingClientRect();
            const entraEnZona = rp.left < rz.right - TOL && rp.right > rz.left + TOL;
            if (entraEnZona) cruces.push(`trazo ${pi} cruza la zona ${zi}`);
          });
        });
        cy.task('log', `G121 2.2: trazos=${$paths.length}, segmentos=${segmentos}, zonas=${$zonas.length}, cruces=${cruces.length}`);
        cy.screenshot('TC-M03-G121-2.2-discontinuidad');
        expect(segmentos, 'la serie esta cortada en el vacio (mas de un trazo o de un segmento)').to.be.greaterThan(1);
        expect(cruces, 'trazos que atraviesan la zona "Sin datos" (interpolacion del vacio)').to.deep.eq([]);
      });
    });
  });
});
