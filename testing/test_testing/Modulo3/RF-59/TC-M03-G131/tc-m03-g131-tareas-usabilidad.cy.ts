// TC-M03-G131 · RF-59 · Usabilidad del historial: las 5 tareas del guion ejecutadas como un usuario que navega por la interfaz.
// Registra por tarea: si se logro, tiempo, acciones del usuario y observaciones objetivas, y escribe el registro en
// RESULTADOS\registro_tareas_TC-M03-G131.md. NO reemplaza la valoracion de una persona (comprension, claridad): para eso
// quedan las preguntas de "Validacion humana minima" en guion_usabilidad_TC-M03-G131.md.
// Ejecutar (PowerShell, desde esta carpeta):
//   $env:CYPRESS_email="daniiella.vargass@gmail.com"; luego la contrasena con Read-Host -AsSecureString (ver guion)
//   npx cypress run --browser chrome
// Variables opcionales: CYPRESS_desde_temp / CYPRESS_hasta_temp (def. 2026-10-20 / 2026-10-22), CYPRESS_dia_vacio (def. 2026-10-18),
//   CYPRESS_desde / CYPRESS_hasta (def. 2026-10-18 / 2026-10-25).
const T_DESDE = Cypress.env('desde_temp') || '2026-10-20';
const T_HASTA = Cypress.env('hasta_temp') || '2026-10-22';
const DIA_VACIO = Cypress.env('dia_vacio') || '2026-10-18';
const DESDE = Cypress.env('desde') || '2026-10-18';
const HASTA = Cypress.env('hasta') || '2026-10-25';

type Registro = { tarea: string; logro: boolean; segundos: number; acciones: number; nota: string };
const registro: Registro[] = [];
let t0 = 0;
let acciones = 0;
const inicio = () => cy.then(() => { t0 = Date.now(); acciones = 0; });
const accion = (n = 1) => cy.then(() => { acciones += n; });
const fin = (tarea: string, logro: boolean, nota = '') => cy.then(() => {
  registro.push({ tarea, logro, segundos: Math.round((Date.now() - t0) / 100) / 10, acciones, nota });
});

describe('TC-M03-G131 · RF-59 · Tareas de usabilidad del historial', () => {
  before(() => {
    cy.loginProductor();
  });

  it('Tarea 1. Encontrar el historial desde la pantalla de inicio usando el menu', () => {
    inicio();
    cy.contains('a, button', /Telemetr[ií]a IoT/).first().click();
    accion();
    cy.contains('a, button, [role="tab"]', /^\s*Historial\s*$/).first().click();
    accion();
    cy.location('pathname').should('match', /telemetria\/historial\/?$/);
    cy.contains(/Historial de Lecturas/i).should('be.visible');
    fin('1. Encontrar el historial', true, 'Menu Telemetria IoT y pestana Historial');
    cy.screenshot('tarea1-historial');
  });

  it('Tarea 2. Ver solo la temperatura ambiental del 20 al 22/10/2026', () => {
    inicio();
    cy.consultarHistorial({ desde: T_DESDE, hasta: T_HASTA, variable: 'Temperatura Ambiental', estado: '', infra: '' }).then((i) => {
      accion(4); // fecha desde, fecha hasta, variable, Consultar
      expect(i.response.statusCode).to.eq(200);
      const aplicados = i.response.body.filtros_aplicados;
      expect(i.response.body.total, 'lecturas').to.be.greaterThan(0);
      // Desde INC-M03-187 (BUG-G118-01) el API admite varias variables: el filtro aplicado se devuelve como lista.
      // Se acepta lista o texto, pero debe ser exactamente la variable pedida (ninguna otra).
      expect([].concat(aplicados.tipo_variable), 'variable aplicada').to.deep.eq(['Temperatura Ambiental']);
      cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
      fin('2. Filtrar temperatura 20-22/10', true, `Lecturas: ${i.response.body.total}`);
      cy.screenshot('tarea2-temperatura');
    });
  });

  it('Tarea 3. La grafica permite interpretar la tendencia (ejes, escala y resumen visibles)', () => {
    inicio();
    cy.get('.recharts-wrapper svg text').then(($t) => {
      const textos = [...$t].map((t) => (t.textContent || '').trim());
      const y = textos.filter((x) => /^-?[\d.,]+$/.test(x)).length;
      const x = textos.filter((x2) => /\d{1,2}:\d{2}/.test(x2)).length;
      expect(y, 'etiquetas numericas del eje Y').to.be.greaterThan(1);
      expect(x, 'etiquetas de hora del eje X').to.be.greaterThan(1);
    });
    cy.contains(/m[ií]nimo/i).should('exist');
    cy.contains(/m[aá]ximo/i).should('exist');
    cy.contains(/promedio/i).should('exist');
    fin('3. Interpretar la tendencia', true, 'Grafica con ejes X e Y legibles y resumen minimo/maximo/promedio visible');
  });

  it('Tarea 4. Detectar el vacio de datos de la humedad relativa del 18/10/2026', () => {
    inicio();
    cy.consultarHistorial({ desde: DIA_VACIO, hasta: DIA_VACIO, variable: 'Humedad Relativa', estado: '', infra: '' }).then((i) => {
      accion(4);
      const vacios: any[] = i.response.body.vacios_temporales;
      expect(vacios.length, 'vacios informados por el API').to.be.greaterThan(0);
      cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
      cy.get('.recharts-reference-area').should('have.length.greaterThan', 0);
      cy.get('.recharts-wrapper').contains('Sin datos').scrollIntoView().should('be.visible');
      cy.get('body').then(($b) => {
        const aviso = /intervalos? sin datos/i.test($b.text());
        fin('4. Detectar el vacio', true, `Zona "Sin datos" visible; aviso de texto del periodo: ${aviso ? 'si' : 'no'}; fila de vacio en la tabla: ${$b.find('[data-testid="fila-vacio"]').length}`);
      });
      cy.screenshot('tarea4-vacio');
    });
  });

  it('Tarea 5. Ver temperatura y humedad juntas y poder distinguirlas', () => {
    // Diseno vigente desde 29-Oct (USAB-M03 prototipo 13.6): una grafica por variable, cada una con su titulo y su
    // eje Y (sin mezclar unidades en un eje), en la misma pantalla. Se comprueba que las dos variables se ven a la
    // vez, que cada una tiene su grafica y que los titulos las distinguen. Si la ficha exige una sola grafica con
    // leyenda, eso es una diferencia de diseno a confirmar con Analisis (no se da por defecto).
    inicio();
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado: '', infra: '' }).then((i) => {
      accion(3); // fechas, vaciar variable, Consultar
      const items: any[] = i.response.body.items;
      const variables = [...new Set(items.map((it) => it.tipo_variable))];
      expect(variables.length, 'variables en la pagina 1 de lecturas').to.be.greaterThan(1);
      expect(variables, 'temperatura y humedad en la pagina').to.include.members(['Humedad Relativa', 'Temperatura Ambiental']);
      cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
      cy.get('.recharts-wrapper').should('have.length', variables.length);
      cy.get('.recharts-wrapper').then(($w) => {
        const titulos = [...$w].map((w) => (w.closest('.recharts-responsive-container')?.parentElement?.parentElement?.querySelector('h3')?.textContent || '').trim());
        cy.task('log', `G131 t5 graficas=${$w.length}; titulos: ` + titulos.join(' | '));
        titulos.forEach((t, k) => expect(t.length, `titulo de la grafica ${k + 1}`).to.be.greaterThan(0));
        expect(new Set(titulos).size, 'titulos distintos (las variables se distinguen)').to.eq(titulos.length);
        const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        expect(titulos.some((t) => /temperatura/.test(norm(t))), 'una grafica titulada temperatura').to.eq(true);
        expect(titulos.some((t) => /humedad/.test(norm(t))), 'una grafica titulada humedad').to.eq(true);
        fin('5. Temperatura y humedad en la misma pantalla', true,
          `Graficas: ${$w.length}, una por variable, cada una con titulo y eje propios: ${titulos.join('; ')}. No hay leyenda comun (diseno 13.6)`);
      });
      cy.screenshot('tarea5-dos-variables');
    });
  });

  after(() => {
    cy.then(() => {
      const filas = registro.map((r) => `| ${r.tarea} | ${r.logro ? 'Si' : 'No'} | ${r.segundos} s | ${r.acciones} | ${r.nota} |`);
      const md = ['# Registro de tareas TC-M03-G131 (ejecucion automatizada)', '',
        '| Tarea | Logro | Tiempo | Acciones del usuario | Observaciones |', '|---|---|---|---|---|', ...filas, '',
        'El tiempo incluye la espera del servidor en cada consulta.', ''].join('\n');
      cy.task('log', '\n' + md);
      cy.task('guardar', { file: 'RESULTADOS/registro_tareas_TC-M03-G131.md', content: md });
    });
  });
});
