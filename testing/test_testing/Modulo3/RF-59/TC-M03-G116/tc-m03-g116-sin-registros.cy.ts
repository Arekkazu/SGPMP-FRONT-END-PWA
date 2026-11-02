// TC-M03-G116 · Historial sin resultados: mensaje de estado vacio (RF-59)
// Ejecutar (PowerShell, desde esta carpeta):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_email="<correo del Productor>"; $env:CYPRESS_password="<contrasena>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M03-G116.html   Capturas: RESULTADOS\capturas
// Los selectores salen del codigo de la pantalla (HistorialView / HistorialFiltros / HistorialTable / LineChartTelemetria).

// Rango con filtros validos y sin lecturas. El 24/10/2026 estaba vacio el 25-Oct, pero el 02-Nov ya tiene 2 lecturas
// (los datos de TEST cambian), asi que la precondicion se BUSCA: se prueba primero el dia indicado con
// $env:CYPRESS_fecha_vacia_desde / CYPRESS_fecha_vacia_hasta (aaaa-mm-dd) y despues dias de respaldo, y se usa el primero
// cuyo API responda 200 con total = 0. Si ninguno esta vacio la prueba falla (no se da por buena sin la precondicion).
const DESDE = Cypress.env('fecha_vacia_desde') || '2026-10-24';
const HASTA = Cypress.env('fecha_vacia_hasta') || '2026-10-24';
const RESPALDO = ['2026-10-17', '2026-10-16', '2026-10-15', '2026-09-15', '2026-08-15', '2026-01-15'];

let diaVacio = '';
const intentos: string[] = [];

function buscarRangoVacio(candidatos: Array<[string, string]>, k = 0): Cypress.Chainable<any> {
  if (k >= candidatos.length) {
    throw new Error('Ningun dia candidato esta vacio en TEST (' + intentos.join('; ') + '): precondicion no cumplida');
  }
  const [d, h] = candidatos[k];
  return cy.consultarHistorial({ desde: d, hasta: h, variable: '', estado: '', infra: '' }).then((i) => {
    const ok = i.response.statusCode === 200 && i.response.body.total === 0 && (i.response.body.items || []).length === 0;
    intentos.push(`${d}..${h}: HTTP ${i.response.statusCode}, total ${i.response.body && i.response.body.total}`);
    if (ok) { diaVacio = `${d}..${h}`; return cy.wrap(i); }
    return buscarRangoVacio(candidatos, k + 1);
  });
}

describe('TC-M03-G116 · RF-59 · Historial sin resultados', () => {
  before(() => {
    cy.loginProductor();
    cy.irAHistorial();
  });

  it('1. Consulta valida sin datos: HTTP 200 y total = 0 (precondicion)', () => {
    const candidatos: Array<[string, string]> = [[DESDE, HASTA], ...RESPALDO.map((d) => [d, d] as [string, string])];
    buscarRangoVacio(candidatos).then((i) => {
      cy.task('log', 'G116 intentos: ' + intentos.join(' | ') + ` -> rango vacio usado: ${diaVacio}`);
      expect(i.response.statusCode, 'HTTP del historial').to.eq(200);
      expect(i.response.body.total, `total entre ${diaVacio}`).to.eq(0);
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
