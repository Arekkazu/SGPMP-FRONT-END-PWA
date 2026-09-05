/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G01';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
const DATO_NOMBRE = 'Bovino';
const DATO_DESCRIPCION = 'Especie bovina productiva';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G01 - Registro de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catalogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI y API) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecucion | ${r.fecha} |
| Dato de prueba | Nombre: \`${DATO_NOMBRE}\` (limite 3-50), Descripcion: \`${DATO_DESCRIPCION}\` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Registro tecnico de red

- Detalle de la peticion HTTP real: ${r.peticionInfo}

## Evidencias visuales

- [01_formulario_especie_ui.png](screenshots/01_formulario_especie_ui.png): formulario diligenciado antes del envio.
- [02_confirmacion_registro_ui.png](screenshots/02_confirmacion_registro_ui.png): registro visible en la tabla despues de la respuesta API.
`;
}

describe('TC-M09-G01 - Registro de Especie Productiva (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Peticion POST capturada durante el registro por UI.';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (fallo la preparacion)'
      : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M09-G01',
      titulo: 'CU-01 - Gestionar Catalogo de Especies Productivas (RF-15)',
      cu: 'CU-01 - Gestionar Catalogo de Especies Productivas',
      rf: 'RF-15',
      tipo: 'Funcional (UI y API)',
      equipo: 'Frontend y QA',
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G01_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G01_resultado.md`, content: renderMd(r) });
  });

  it('registra una especie productiva y confirma sus atributos en UI y API', () => {
    checks.length = 0;

    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G01.');
    }

    cy.intercept('GET', `**${ENDPOINT_ESPECIES}*`).as('listarEspecies');
    cy.intercept('POST', `**${ENDPOINT_ESPECIES}`).as('crearEspecie');

    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');

    // Navegar mediante SPA (Sidebar) para preservar el token JWT en memoria
    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
    cy.wait('@listarEspecies', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
    cy.contains('h2', 'Catálogo de Especies').should('be.visible');

    cy.get('body').then(($body) => {
      const yaExiste = $body.find('tbody tr').toArray().some((row) => {
        const celdas = Array.from(row.querySelectorAll('td'));
        return celdas.some((cell) => cell.textContent?.trim() === DATO_NOMBRE);
      });

      if (yaExiste) {
        add(
          'Precondicion: disponibilidad del dato de prueba',
          `No debe existir una especie llamada "${DATO_NOMBRE}" antes de crearla`,
          `Ya existe "${DATO_NOMBRE}" en el catalogo TEST; no se creo un duplicado.`,
          'FALLA',
        );
        throw new Error(`Precondicion no satisfecha: ya existe la especie "${DATO_NOMBRE}".`);
      }

      add(
        'Precondicion: disponibilidad del dato de prueba',
        `No debe existir una especie llamada "${DATO_NOMBRE}" antes de crearla`,
        `"${DATO_NOMBRE}" no existe en el catalogo TEST.`,
      );
    });

    cy.contains('button', 'Nueva especie').should('be.visible').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('input[name="nombre"]').clear().type(DATO_NOMBRE);
    cy.get('textarea#especie-desc').clear().type(DATO_DESCRIPCION);

    add(
      'Checkpoint 1: diligenciamiento de la especie en UI',
      `Ingresar nombre "${DATO_NOMBRE}" y descripcion "${DATO_DESCRIPCION}"`,
      'Formulario diligenciado con los datos definidos por el caso.',
    );
    cy.screenshot('01_formulario_especie_ui', { overwrite: true });

    cy.contains('button', 'Registrar especie').click();

    cy.wait('@crearEspecie', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      const body = interception.response?.body || {};
      peticionInfo = `POST ${ENDPOINT_ESPECIES} -> HTTP ${status}. Body: ${JSON.stringify(body)}`;

      const esRespuestaValida =
        (status === 201 || status === 200) &&
        typeof body.id_especie === 'number' && body.id_especie > 0 &&
        body.nombre === DATO_NOMBRE &&
        body.descripcion === DATO_DESCRIPCION &&
        body.es_activo === true &&
        typeof body.fecha_creacion === 'string' && body.fecha_creacion.length > 0;

      add(
        'Checkpoint 2: contrato de creacion en API REST',
        'HTTP 201/200 con id_especie, nombre, descripcion, es_activo=true y fecha_creacion',
        esRespuestaValida
          ? `HTTP ${status} OK - ID: ${body.id_especie}, Activo: ${body.es_activo}, Fecha: ${body.fecha_creacion}`
          : `Respuesta no conforme. HTTP ${status}. Body: ${JSON.stringify(body)}`,
        esRespuestaValida ? 'OK' : 'FALLA',
      );

      expect(esRespuestaValida, 'contrato de creacion de especie').to.eq(true);

      cy.contains('tbody tr', DATO_NOMBRE)
        .should('contain.text', DATO_DESCRIPCION)
        .and('contain.text', 'Activo')
        .and('contain.text', `#${body.id_especie}`);

      add(
        'Checkpoint 3: confirmacion visual en el catalogo',
        'La tabla muestra la especie creada, su ID y estado Activo',
        `La tabla muestra ${DATO_NOMBRE} con ID #${body.id_especie} y estado Activo.`,
      );
    });

    cy.screenshot('02_confirmacion_registro_ui', { overwrite: true });
  });
});
