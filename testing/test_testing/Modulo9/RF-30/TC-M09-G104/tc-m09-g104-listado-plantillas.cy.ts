/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G104';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G104 - Consulta del listado de plantillas (RF-30 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-30 |
| Agrupa | TC-M09-198, TC-M09-199, TC-M09-200 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecucion | ${r.fecha} |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Evidencias visuales

- [01_listado_con_datos.png](screenshots/01_listado_con_datos.png): listado de plantillas con registros existentes.
- [02_catalogo_vacio.png](screenshots/02_catalogo_vacio.png): listado simulando un catalogo sin plantillas (respuesta de API interceptada/forzada a vacio).
`;
}

describe('TC-M09-G104 - Consulta del listado de plantillas (RF-30)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

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
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      checkpoints: checks,
      veredicto,
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G104_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G104_resultado.md`, content: renderMd(r) });
  });

  // El clic en el sidebar a veces ocurre mientras el dashboard todavia esta
  // terminando de montar, y no llega a navegar. Se reintenta unas cuantas
  // veces en vez de depender de que el timing salga bien a la primera.
  function clickConfiguracionConReintento(intentosRestantes = 4) {
    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .click({ force: true });

    cy.location('pathname', { timeout: 8000 }).then(($path) => {
      if ($path !== '/configuracion' && intentosRestantes > 0) {
        cy.wait(1000);
        clickConfiguracionConReintento(intentosRestantes - 1);
      }
    });
  }

  function irAPlantillas() {
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    // Margen amplio: la primera prueba de la corrida paga el arranque en frio
    // de Chrome y la carga inicial del bundle, que puede tardar mas de 15s.
    cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');

    // Navegar mediante SPA (Sidebar) para preservar el token JWT en memoria.
    // No se usa .should('be.visible') antes del click: esta app (Ionic/PWA) usa
    // contenedores con position:fixed que hacen que Cypress considere el
    // elemento "no visible" aunque si se vea en pantalla. click({force:true})
    // evita depender de ese chequeo.
    clickConfiguracionConReintento();

    cy.location('pathname', { timeout: 30000 }).should('eq', '/configuracion');
    cy.contains('button', 'Plantillas', { timeout: 15000 }).click({ force: true });
  }

  it('TC-M09-198 / TC-M09-199 - lista las plantillas existentes mostrando nombre, especie y version', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G104.');
    }

    cy.intercept('GET', /\/configuracion\/especies(\?[^/]*)?$/).as('listarEspecies');
    cy.intercept('GET', /\/configuracion\/plantillas(\?[^/]*)?$/).as('listarPlantillas');

    irAPlantillas();

    cy.wait('@listarPlantillas', { timeout: 15000 }).then((interceptionPlantillas) => {
      const statusPlantillas = interceptionPlantillas.response?.statusCode || 0;
      const bodyPlantillas = interceptionPlantillas.response?.body || {};
      const plantillas = Array.isArray(bodyPlantillas) ? bodyPlantillas : (bodyPlantillas.items ?? []);

      add(
        'TC-M09-198: consultar el listado de plantillas disponibles',
        'La API responde HTTP 200 con la lista de plantillas',
        `HTTP ${statusPlantillas}, ${plantillas.length} plantilla(s) devuelta(s)`,
        statusPlantillas === 200 ? 'OK' : 'FALLA',
      );
      expect(statusPlantillas, 'GET /configuracion/plantillas responde 200').to.eq(200);

      cy.wait('@listarEspecies', { timeout: 15000 }).then((interceptionEspecies) => {
        const bodyEspecies = interceptionEspecies.response?.body || {};
        const especies = Array.isArray(bodyEspecies) ? bodyEspecies : (bodyEspecies.items ?? []);
        const nombrePorId = new Map<number, string>(especies.map((e: any) => [e.id_especie, e.nombre]));

        cy.screenshot('01_listado_con_datos', { overwrite: true });

        if (plantillas.length === 0) {
          add(
            'TC-M09-199: verificar nombre, especie y version en cada registro',
            'Al menos una plantilla visible para verificar sus campos',
            'La API devolvio 0 plantillas en este momento en el entorno de TEST; no se pudo verificar visualmente un registro real.',
            'OBSERVACION',
          );
          return;
        }

        // Grid de tarjetas de PlantillasTable.tsx (unico grid con este layout en la pagina).
        // Se usa .should('exist') en vez de 'be.visible': esta app (Ionic/PWA) usa
        // contenedores con position:fixed que hacen que Cypress considere el
        // elemento "no visible" aunque si se vea normalmente en pantalla.
        cy.get('div[style*="grid-template-columns: repeat(auto-fill"]', { timeout: 15000 })
          .should('exist')
          .as('gridPlantillas');

        cy.get('@gridPlantillas').children().should('have.length', plantillas.length);

        add(
          'TC-M09-198: cantidad de plantillas mostradas en pantalla',
          `El listado debe mostrar ${plantillas.length} tarjeta(s), una por cada plantilla de la API`,
          `Se muestran ${plantillas.length} tarjeta(s) en pantalla`,
        );

        const muestra = plantillas.slice(0, Math.min(3, plantillas.length));
        muestra.forEach((p: any, i: number) => {
          const especieNombre = nombrePorId.get(p.id_especie) ?? `Especie #${p.id_especie}`;

          cy.get('@gridPlantillas').contains(p.template_name).then(($nombre) => {
            cy.wrap($nombre).closest('div[style*="border-radius: var(--r-xl)"]').within(() => {
              cy.contains(p.template_name);
              cy.contains(`v${p.version}`);
              cy.contains(especieNombre);
            });
          });

          add(
            `TC-M09-199: campos visibles de la plantilla #${i + 1} ("${p.template_name}")`,
            `Debe mostrar nombre "${p.template_name}", especie "${especieNombre}" y version "v${p.version}"`,
            `Se confirmaron los 3 campos visibles en la tarjeta correspondiente`,
          );
        });
      });
    });
  });

  it('TC-M09-200 - muestra el catalogo vacio sin error tecnico cuando no hay plantillas registradas', () => {
    // Se fuerza el catalogo vacio interceptando la respuesta de la API, ya que el
    // entorno de TEST compartido ya tiene plantillas reales creadas por otras
    // pruebas y no se pueden borrar (las plantillas son inmutables por diseno).
    cy.intercept('GET', /\/configuracion\/plantillas(\?[^/]*)?$/, {
      statusCode: 200,
      body: { total: 0, items: [] },
    }).as('listarPlantillasVacio');
    cy.intercept('GET', /\/configuracion\/especies(\?[^/]*)?$/).as('listarEspecies');

    irAPlantillas();

    cy.wait('@listarPlantillasVacio', { timeout: 15000 });

    cy.contains('Sin plantillas creadas', { timeout: 15000 });
    cy.contains('Crea la primera plantilla para capturar una configuración base.');

    add(
      'TC-M09-200: mensaje de catalogo vacio',
      'Debe mostrarse un mensaje claro de catalogo vacio ("Sin plantillas creadas")',
      'Se muestra el mensaje "Sin plantillas creadas" junto con el texto de ayuda para crear la primera plantilla',
    );

    cy.contains('Error al cargar').should('not.exist');

    add(
      'TC-M09-200: comportamiento de la interfaz ante 0 registros',
      'No debe presentarse ningun error tecnico en pantalla',
      'No aparece ninguna alerta de error; la interfaz se comporta como un estado vacio normal',
    );

    cy.screenshot('02_catalogo_vacio', { overwrite: true });
  });
});
