/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G105';

// Cuenta con permisos sobre plantillas (Administrador o Ingeniero de Campo).
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

// Cuenta SIN ningun permiso sobre el recurso "plantillas" (rol Productor), usada
// para el caso negativo. Es una cuenta de prueba fija del entorno de TEST
// (ver claude/usuarios_prueba_estado.md), no una credencial real de un usuario.
const CUENTA_NO_AUTORIZADA_EMAIL = Cypress.env('PRODUCTOR_EMAIL') || 'daniiella.vargass@gmail.com';
const CUENTA_NO_AUTORIZADA_PASSWORD = Cypress.env('PRODUCTOR_PASSWORD') || '@Daniela1';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G105 - Acceso a los flujos de creacion y aplicacion de plantillas desde el listado (RF-30 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-30 |
| Agrupa | TC-M09-201, TC-M09-202 |
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

- [01_modal_creacion_plantilla.png](screenshots/01_modal_creacion_plantilla.png): modal de creacion de plantilla abierto desde el listado.
- [02_wizard_aplicar_plantilla.png](screenshots/02_wizard_aplicar_plantilla.png): wizard de aplicacion de plantilla abierto desde una tarjeta del listado.
- [03_pestana_plantillas_no_visible.png](screenshots/03_pestana_plantillas_no_visible.png): usuario sin permisos, la pestana "Plantillas" no aparece en Configuracion.
`;
}

describe('TC-M09-G105 - Acceso a los flujos de creacion y aplicacion de plantillas desde el listado (RF-30)', () => {
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

    cy.task('writeResult', { file: `${DIR}/TC-M09-G105_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G105_resultado.md`, content: renderMd(r) });
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

  function irAConfiguracion(email: string, password: string) {
    cy.loginUI(email, password);
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
  }

  function irAPlantillas(email: string, password: string) {
    irAConfiguracion(email, password);
    cy.contains('button', 'Plantillas', { timeout: 15000 }).click({ force: true });
  }

  it('TC-M09-201 - Administrador accede a la creacion de una nueva plantilla desde el listado', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G105.');
    }

    irAPlantillas(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);

    cy.contains('button', 'Nueva plantilla', { timeout: 15000 }).click({ force: true });

    cy.get('[role="dialog"]', { timeout: 15000 })
      .should('exist')
      .and('have.attr', 'aria-modal', 'true')
      .within(() => {
        cy.get('#plantilla-modal-title').contains('Nueva Plantilla de Configuración');
      });

    add(
      'TC-M09-201: abrir el flujo de creacion desde el boton "Nueva plantilla"',
      'Debe abrirse el dialogo de creacion de plantilla (PlantillaModal) con su titulo correspondiente',
      'Se abrio un dialogo (role="dialog", aria-modal="true") con el titulo "Nueva Plantilla de Configuración"',
    );

    // El flujo debe conservarse como una superposicion sobre el modulo de
    // Configuracion, no como una navegacion a otra pantalla.
    cy.location('pathname').should('eq', '/configuracion');

    add(
      'TC-M09-201: conservar el contexto del modulo Configuracion al abrir el flujo',
      'La ruta debe seguir siendo /configuracion (el flujo se abre como superposicion, no como navegacion)',
      'La ruta se mantuvo en /configuracion mientras el dialogo de creacion estaba abierto',
    );

    cy.screenshot('01_modal_creacion_plantilla', { overwrite: true });

    // Se cierra el dialogo para dejar la pantalla limpia antes del siguiente caso.
    cy.get('[role="dialog"]').find('button[aria-label="Cerrar"]').click({ force: true });
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('TC-M09-202 - Administrador accede a la aplicacion de una plantilla desde el listado', () => {
    cy.intercept('GET', /\/configuracion\/plantillas(\?[^/]*)?$/).as('listarPlantillas');

    irAPlantillas(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);

    cy.wait('@listarPlantillas', { timeout: 15000 }).then((interception) => {
      const body = interception.response?.body || {};
      const plantillas = Array.isArray(body) ? body : (body.items ?? []);

      if (plantillas.length === 0) {
        add(
          'TC-M09-202: abrir el flujo de aplicacion desde una tarjeta del listado',
          'Al menos una plantilla visible para poder abrir el flujo de aplicacion',
          'La API devolvio 0 plantillas en este momento en el entorno de TEST; no se pudo ejercer el flujo sobre un registro real.',
          'OBSERVACION',
        );
        return;
      }

      const primera = plantillas[0];

      cy.contains('div[style*="border-radius: var(--r-xl)"]', primera.template_name, { timeout: 15000 })
        .within(() => {
          cy.contains('button', 'Aplicar plantilla').click({ force: true });
        });

      cy.get('[role="dialog"]', { timeout: 15000 })
        .should('exist')
        .and('have.attr', 'aria-modal', 'true')
        .within(() => {
          cy.get('#wizard-modal-title').contains('Aplicar Plantilla');
          // El subtitulo del wizard muestra el nombre de la plantilla elegida en
          // el listado: confirma que el contexto (que plantilla se va a aplicar)
          // viaja correctamente desde la tarjeta hasta el flujo.
          cy.contains(primera.template_name);
          // Primer paso del stepper: "Seleccionar especie".
          cy.contains('Seleccionar especie');
        });

      add(
        'TC-M09-202: abrir el flujo de aplicacion desde el boton "Aplicar plantilla" de una tarjeta',
        `Debe abrirse el asistente de aplicacion (AplicarPlantillaWizard) para "${primera.template_name}", iniciando en el paso "Seleccionar especie"`,
        `Se abrio un dialogo (role="dialog", aria-modal="true") titulado "Aplicar Plantilla" mostrando "${primera.template_name}" y el paso "Seleccionar especie" activo`,
      );

      cy.location('pathname').should('eq', '/configuracion');

      add(
        'TC-M09-202: conservar el contexto del modulo Configuracion al abrir el flujo',
        'La ruta debe seguir siendo /configuracion (el asistente se abre como superposicion, no como navegacion)',
        'La ruta se mantuvo en /configuracion mientras el asistente de aplicacion estaba abierto',
      );

      cy.screenshot('02_wizard_aplicar_plantilla', { overwrite: true });

      cy.get('[role="dialog"]').find('button[aria-label="Cerrar"]').click({ force: true });
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  it('TC-M09-201/202 - Un usuario sin permisos sobre plantillas no puede ver ni acceder a estos flujos', () => {
    if (!CUENTA_NO_AUTORIZADA_EMAIL || !CUENTA_NO_AUTORIZADA_PASSWORD) {
      throw new Error('Faltan las credenciales de la cuenta sin autorizacion para ejecutar el caso negativo de TC-M09-G105.');
    }

    irAConfiguracion(CUENTA_NO_AUTORIZADA_EMAIL, CUENTA_NO_AUTORIZADA_PASSWORD);

    // El rol de esta cuenta (Productor) no tiene ningun permiso sobre el recurso
    // "plantillas" (ni siquiera lectura), por lo que ConfigurationPage.tsx filtra
    // la pestana "Plantillas" completamente fuera de la barra de navegacion.
    //
    // La pagina tiene mas de un <nav> (el menu lateral y la barra de pestanas de
    // Configuracion), asi que no se puede usar .within() sobre cy.get('nav')
    // (exige un unico elemento). En su lugar se busca el boton "Plantillas"
    // dentro de CUALQUIER <nav> y se afirma que no existe en ninguno.
    cy.get('nav', { timeout: 15000 }).should('have.length.greaterThan', 0);
    cy.get('nav').find('button').contains('Plantillas').should('not.exist');

    cy.screenshot('03_pestana_plantillas_no_visible', { overwrite: true });

    add(
      'TC-M09-201/202: un usuario sin permisos sobre plantillas no ve la pestana "Plantillas"',
      'La pestana "Plantillas" no debe aparecer en la barra de navegacion de Configuracion para un rol sin permisos sobre el recurso',
      'La pestana "Plantillas" no esta presente en la barra de navegacion; el usuario no tiene forma de llegar a los flujos de creacion ni de aplicacion',
    );
  });
});
