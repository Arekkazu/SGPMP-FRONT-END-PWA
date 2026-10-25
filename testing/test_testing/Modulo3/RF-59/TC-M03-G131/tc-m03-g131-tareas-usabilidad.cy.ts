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
      expect(aplicados.tipo_variable, 'variable aplicada').to.eq('Temperatura Ambiental');
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
      cy.get('.recharts-wrapper').contains('Sin datos').should('be.visible');
      cy.get('body').then(($b) => {
        const aviso = /intervalos? sin datos/i.test($b.text());
        fin('4. Detectar el vacio', true, `Zona "Sin datos" visible; aviso de texto del periodo: ${aviso ? 'si' : 'no'}; fila de vacio en la tabla: ${$b.find('[data-testid="fila-vacio"]').length}`);
      });
      cy.screenshot('tarea4-vacio');
    });
  });

  it('Tarea 5. Ver temperatura y humedad juntas y poder distinguirlas', () => {
    inicio();
    cy.consultarHistorial({ desde: DESDE, hasta: HASTA, variable: '', estado: '', infra: '' }).then((i) => {
      accion(3); // fechas, vaciar variable, Consultar
      const items: any[] = i.response.body.items;
      const rango = (v: string) => {
        const xs = items.filter((it) => it.tipo_variable === v).map((it) => Number(it.valor));
        return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
      };
      cy.get('.recharts-wrapper').first().scrollIntoView().should('be.visible');
      cy.get('.recharts-legend-item-text').then(($l) => {
        const nombres = [...$l].map((e) => (e.textContent || '').trim());
        expect(nombres.length, 'series en la leyenda').to.be.greaterThan(1);
        const r1 = rango('Humedad Relativa'); const r2 = rango('Temperatura Ambiental');
        const plana = Math.min(r1, r2) / Math.max(r1, r2, 1) < 0.1;
        fin('5. Temperatura y humedad juntas', true,
          `Leyenda: ${nombres.join(', ')}. Rango pagina 1: humedad ${r1.toFixed(1)}, temperatura ${r2.toFixed(1)}. Un solo eje Y${plana ? ': una serie se ve casi plana' : ''}`);
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
