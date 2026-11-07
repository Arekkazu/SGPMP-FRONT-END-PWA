/// <reference types="cypress" />

// TC-M09-G01 · CU-01 - Gestionar Catálogo de Especies Productivas (RF-15 - Módulo 9)
// Adaptado con SANDBOX TRANSACCIONAL y compatibilidad con scanner.py

const RUN_ID = `run-TC-M09-G01-${Date.now()}`;
const DIR_RESULTADOS = 'resultados';
const DIR_EVIDENCIAS = 'evidencias';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
const DATO_NOMBRE = 'Equino Sandbox QA';
const DATO_DESCRIPCION = 'grupo de mamíferos herbívoros ungulados que incluye a los caballos, las cebras y los asnos';

type Estado = 'OK' | 'FALLA';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G01 - Registro de Especie Productiva (RF-15 - Módulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI y API) con Sandbox Transaccional |
| Run ID Sandbox | \`${RUN_ID}\` |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Dato de prueba | Nombre: \`${DATO_NOMBRE}\`, Descripción: \`${DATO_DESCRIPCION}\` |

## Checkpoints Evaluados
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Aislamiento Transaccional
- **Transacción Aislada:** Las peticiones enviaron \`X-Test-Run-Id: ${RUN_ID}\` y \`X-Sandbox-Secret\`.
- **Rollback:** Se invocó \`DELETE /test-control/runs/${RUN_ID}\` en el hook \`after()\`, garantizando 0 registros contaminados en la BD de TEST.
`;
}

describe('TC-M09-G01 - Registro de Especie Productiva con Sandbox (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  before(() => {
    // 1. Activar el interceptor de Sandbox para adjuntar headers en todas las peticiones
    cy.startSandbox(RUN_ID);

    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    // 1. Ejecutar Rollback en el backend para revertir la creación de la especie
    cy.rollbackSandbox(RUN_ID);

    const veredicto = checks.length === 0
      ? 'RECHAZADO (falló la preparación)'
      : (checks.some((c) => c.estado === 'FALLA') ? 'RECHAZADO' : 'APROBADO');

    // 2. Reporte computacional estricto para scanner.py (resultados/resultado_TC-M09-G01.json)
    const reporteScanner = {
      tc: 'TC-M09-G01',
      checkpoints: checks,
    };

    // 3. Reporte descriptivo para evidencias humanas (evidencias/)
    const reporteHumano = {
      caso: 'TC-M09-G01',
      titulo: 'CU-01 - Gestionar Catálogo de Especies Productivas (RF-15)',
      runId: RUN_ID,
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      checkpoints: checks,
      veredicto,
    };

    cy.task('writeResult', {
      file: `${DIR_RESULTADOS}/resultado_TC-M09-G01.json`,
      content: JSON.stringify(reporteScanner, null, 2),
    });

    cy.task('writeResult', {
      file: `${DIR_EVIDENCIAS}/TC-M09-G01_resultado.md`,
      content: renderMd(reporteHumano),
    });
  });

  it('registra una especie dentro del Sandbox transaccional y confirma en UI', () => {
    checks.length = 0;

    cy.intercept('GET', `**${ENDPOINT_ESPECIES}*`).as('listarEspecies');
    cy.intercept('POST', `**${ENDPOINT_ESPECIES}`).as('crearEspecie');

    // Inicio de sesión
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');

    // Navegación al módulo de configuración
    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
    cy.wait('@listarEspecies', { timeout: 15000 }).its('response.statusCode').should('eq', 200);

    add(
      'CP-01 Acceso al Catálogo de Especies',
      'Navegar a /configuracion y listar catálogo HTTP 200',
      'Vista de configuración cargada y catálogo consultado exitosamente',
      'OK',
    );

    // Apertura del modal y diligenciamiento
    cy.contains('button', 'Nueva especie').should('be.visible').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('input[name="nombre"]').clear().type(DATO_NOMBRE);
    cy.get('textarea#especie-desc').clear().type(DATO_DESCRIPCION);

    add(
      'CP-02 Diligenciamiento de Formulario',
      `Ingresar nombre "${DATO_NOMBRE}" y descripción`,
      'Campos completados correctamente en el formulario modal',
      'OK',
    );
    cy.screenshot('evidencias/screenshots/01_formulario_especie_ui');

    // Enviar formulario (viaja con los headers del Sandbox)
    cy.contains('button', 'Registrar especie').click();

    cy.wait('@crearEspecie', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      const body = interception.response?.body || {};

      const esValida =
        (status === 201 || status === 200) &&
        typeof body.id_especie === 'number' &&
        body.nombre === DATO_NOMBRE;

      add(
        'CP-03 Contrato API de Creación con Sandbox',
        'HTTP 201/200 con objeto especie en transacción aislada',
        esValida
          ? `HTTP ${status} OK - ID asignado: #${body.id_especie}`
          : `HTTP ${status} - Respuesta inesperada: ${JSON.stringify(body)}`,
        esValida ? 'OK' : 'FALLA',
      );

      expect(esValida, 'contrato de creación de especie').to.eq(true);

      // Verificación en la UI
      cy.contains('tbody tr', DATO_NOMBRE, { timeout: 10000 })
        .should('contain.text', 'Activo');

      add(
        'CP-04 Renderizado del Nuevo Registro en UI',
        'La fila aparece visible en la tabla con estado Activo',
        `Especie "${DATO_NOMBRE}" renderizada correctamente en la tabla`,
        'OK',
      );
    });

    cy.screenshot('evidencias/screenshots/02_confirmacion_registro_ui');
  });
});
