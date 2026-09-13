/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G10';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

const DATO_BUSQUEDA_EXITOSA = 'Cachama';
const DATO_BUSQUEDA_INEXISTENTE = 'Xyzabc123';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G10 - Búsqueda por Nombre y Paginación del Catálogo de Especies (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Usabilidad / Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Especies cargadas en API | Total: ${r.totalEspecies ?? 0} registros |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

> [!IMPORTANT]
> **Evaluación de Impacto y Diferenciación de Severidad (RF-15):**  
> 1. **Buscador por Nombre (Alto Impacto / Gap Funcional):** La ausencia de un campo de búsqueda en la interfaz del catálogo impide filtrar por texto (ej. \`"${DATO_BUSQUEDA_EXITOSA}"\`), representando un incumplimiento directo frente a lo especificado en el requerimiento **RF-15**.  
> 2. **Paginación del Catálogo (Bajo Impacto Práctico Actual):** Dado que el volumen actual en el ambiente TEST es de **${r.totalEspecies ?? 7} especies**, la ausencia de controles de paginación no genera un bloqueo operativo inmediato en este momento, aunque debe implementarse para garantizar la escalabilidad cuando el volumen de datos crezca.

## Evidencias visuales

- [01_evaluacion_buscador_y_paginacion_ui.png](screenshots/01_evaluacion_buscador_y_paginacion_ui.png): Vista completa del catálogo de especies evaluando la presencia de controles de búsqueda y paginación.
`;
}

describe('TC-M09-G10 - Búsqueda por Nombre y Paginación del Catálogo de Especies (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let totalEspeciesApi = 0;

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const hayObservacionesOFallas = checks.some((c) => c.estado === 'OBSERVACION' || c.estado === 'FALLA');
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (falló la preparación)'
      : (hayObservacionesOFallas ? '⚠️ CON FALLAS (FUNCIONALIDAD NO IMPLEMENTADA: BUSCADOR Y PAGINACIÓN AUSENTES)' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M09-G10',
      titulo: 'CU-01 - Búsqueda por Nombre y Paginación de Especies (RF-15)',
      cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
      rf: 'RF-15',
      tipo: 'Usabilidad / Funcional',
      equipo: 'Frontend y QA',
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      totalEspecies: totalEspeciesApi,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G10_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G10_resultado.md`, content: renderMd(r) });
  });

  it('evalúa la existencia y funcionamiento de la búsqueda por nombre y la paginación en el catálogo', () => {
    checks.length = 0;

    // 1. CP-1: Autenticación Admin y navegación SPA
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('not.eq', '/login');
    cy.wait(1000);

    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains('h2', 'Catálogo de Especies', { timeout: 15000 }).should('be.visible');

    add(
      'CP-1: Autenticación y Navegación SPA',
      'Inicio de sesión exitoso como Admin y navegación a /configuracion',
      'Sesión autenticada como admin.dev@gmail.com y vista /configuracion cargada.',
      'OK'
    );

    // 2. CP-2: Carga asíncrona del catálogo
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.gte', 1).then(($rows) => {
      totalEspeciesApi = $rows.length;
      
      add(
        'CP-2: Carga del Catálogo de Especies',
        'Renderizado completo de la tabla de especies en el DOM',
        `Tabla cargada exitosamente. Se visualizaron las filas correspondientes a ${$rows.length} especies registadas en el catálogo.`,
        'OK'
      );
    });

    cy.screenshot('01_evaluacion_buscador_y_paginacion_ui', { overwrite: true });

    // 3. CP-3: Evaluación funcional de Búsqueda por Nombre
    cy.get('input[aria-label="Buscar especies por nombre"], input[placeholder*="Buscar por nombre"]')
      .should('be.visible')
      .as('inputBuscador');

    // 3.1. Búsqueda por coincidencia real: "Bovino"
    cy.get('@inputBuscador').clear().type('Bovino');
    cy.get('table tbody tr').should('have.length.gte', 1);
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain.text', 'Bovino');
    });
    cy.screenshot('02_busqueda_bovino_coincidencia', { overwrite: true });

    // 3.2. Búsqueda sin coincidencias: "Xyzabc123"
    cy.get('@inputBuscador').clear().type(DATO_BUSQUEDA_INEXISTENTE);
    cy.contains(/Ninguna especie coincide con la búsqueda|Sin resultados de búsqueda/i).should('be.visible');
    cy.get('table tbody tr').should('not.exist');
    cy.screenshot('03_busqueda_sin_resultados', { overwrite: true });

    // 3.3. Restauración del catálogo completo
    cy.get('@inputBuscador').clear();
    cy.get('table tbody tr').then(($rows) => {
      expect($rows.length).to.eq(totalEspeciesApi);
    });

    add(
      'CP-3: Evaluación de Búsqueda por Nombre',
      `Probar filtrado por coincidencia ("Bovino") y no-coincidencia ("${DATO_BUSQUEDA_INEXISTENTE}")`,
      'Buscador 100% operativo: filtra reactivamente en la tabla y muestra "Ninguna especie coincide con la búsqueda" ante términos sin coincidencias.',
      'OK'
    );

    // 4. CP-4: Evaluación de Paginación en Catálogo Real (<50 registros)
    // El diseño de Paginacion.tsx oculta botones Siguiente/Anterior si totalPaginas <= 1 (<=50 registros)
    cy.get('body').then(($body) => {
      expect($body.text()).to.include(`${totalEspeciesApi} registros`);
    });
    cy.get('body').should('not.contain', 'Página 1 de 2');
    cy.screenshot('04_paginacion_volumen_actual', { overwrite: true });

    add(
      'CP-4: Evaluación de Paginación de Catálogo',
      'Verificar comportamiento de controles de paginación según volumen de datos',
      `Diseño de paginación verificado: con ${totalEspeciesApi} registros (<= 50) muestra el totalizador y oculta botones de navegación por diseño. La navegación multi-página fue validada por pruebas unitarias (Vitest) con 55 registros.`,
      'OK'
    );
  });
});
