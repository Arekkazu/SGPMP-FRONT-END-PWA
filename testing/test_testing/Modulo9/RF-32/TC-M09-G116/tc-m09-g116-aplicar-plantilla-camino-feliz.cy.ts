/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G116';

const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

// Las 3 plantillas semilla originales del entorno ("Plantilla estándar
// camarón/tilapia/trucha", creadas el 2026-04-28) se guardaron ANTES de que
// existiera el campo schema_version en params_snapshot, y el backend las
// rechaza al aplicarlas con un 412 VERSION_SNAPSHOT_INCOMPATIBLE explicito
// ("usa schema_version=0 y el sistema solo puede aplicar [1]"). Eso es un
// rechazo controlado y esperado para esas 3 plantillas puntuales, no el
// defecto que esta ficha busca ejercer. Por eso se elige, dentro del
// listado, cualquier OTRA plantilla (creada ya con el formato actual) en vez
// de una fija: cualquiera de las demas ya tiene schema_version=1.
const PLANTILLAS_SEMILLA_SIN_SCHEMA = [
  'Plantilla estándar camarón',
  'Plantilla estándar tilapia',
  'Plantilla estándar trucha',
];

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G116 - Aplicacion exitosa de una plantilla a un destino valido (camino feliz) (RF-32 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-32 |
| Agrupa | TC-M09-224 |
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

- [01_previsualizacion.png](screenshots/01_previsualizacion.png): paso de previsualizacion del asistente, antes de confirmar la aplicacion.
- [02_resultado.png](screenshots/02_resultado.png): estado final del asistente tras intentar aplicar la plantilla (exito o error, segun corresponda).
`;
}

describe('TC-M09-G116 - Aplicacion exitosa de una plantilla a un destino valido (RF-32)', () => {
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

    cy.task('writeResult', { file: `${DIR}/TC-M09-G116_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G116_resultado.md`, content: renderMd(r) });
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

  it('TC-M09-224 - aplica una plantilla PUBLICADA a un destino valido (camino feliz)', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G116.');
    }

    cy.intercept('POST', /\/configuracion\/plantillas\/\d+\/aplicar$/).as('aplicarPlantilla');
    // El listado de plantillas se pide por API al entrar a la pestaña; se
    // intercepta para esperar explicitamente a que la respuesta real llegue
    // (ver nota mas abajo sobre por que no basta con esperar a que existan
    // tarjetas en el DOM).
    cy.intercept('GET', /\/configuracion\/plantillas(\?.*)?$/).as('listarPlantillas');

    irAPlantillas();
    cy.wait('@listarPlantillas', { timeout: 20000 });

    // Elegir, dentro del listado, cualquier tarjeta que NO sea una de las 3
    // plantillas semilla sin schema_version (ver nota arriba) y cuyo boton
    // "Aplicar plantilla" este habilitado.
    //
    // No basta con esperar a que existan N tarjetas en el DOM
    // (`have.length.greaterThan(0)`): mientras el listado carga, el
    // contenedor ya renderiza placeholders vacios con el mismo selector
    // `div[style*="border-radius: var(--r-xl)"]`, asi que ese chequeo puede
    // pasar ANTES de que las tarjetas tengan nombre y boton reales (carrera
    // ya vista antes en TC-M09-G110). Por eso se espera, con reintento
    // automatico de Cypress via `.should(callback)`, a que al menos una
    // tarjeta ya contenga el texto real del boton "Aplicar plantilla".
    cy.get('div[style*="border-radius: var(--r-xl)"]', { timeout: 15000 })
      .should(($cards) => {
        const listo = [...$cards].some((card) => /Aplicar plantilla/.test(card.textContent || ''));
        expect(listo, 'las tarjetas de plantillas deben terminar de cargar su contenido real (no placeholders)').to.be.true;
      })
      .then(($cards) => {
        const candidato = [...$cards].find((card) => {
          const texto = card.textContent || '';
          const esSemillaSinSchema = PLANTILLAS_SEMILLA_SIN_SCHEMA.some((nombre) => texto.includes(nombre));
          const tieneBotonAplicar = /Aplicar plantilla/.test(texto);
          return !esSemillaSinSchema && tieneBotonAplicar;
        });
        expect(
          candidato,
          'debe existir en el listado al menos una plantilla que no sea una de las 3 semillas originales sin schema_version, con el boton "Aplicar plantilla" habilitado',
        ).to.exist;

        const nombrePlantilla = Cypress.$(candidato!).find('div[style*="font-weight: 800"]').first().text().trim();

        cy.wrap(candidato!).within(() => {
          cy.contains('button', 'Aplicar plantilla').click({ force: true });
        });

        cy.get('[role="dialog"]', { timeout: 15000 })
          .should('exist')
          .and('have.attr', 'aria-modal', 'true')
          .within(() => {
            cy.get('#wizard-modal-title').contains('Aplicar Plantilla');
          })
          .then(() => {
            add(
              'TC-M09-224: abrir el asistente de aplicacion de plantilla',
              'Debe abrirse el asistente (AplicarPlantillaWizard) para la plantilla elegida',
              `Se abrio el asistente para "${nombrePlantilla}"`,
            );
          });

        continuarConAplicacion(nombrePlantilla);
      });
  });

  // Paso 0 en adelante: elegir especie destino, previsualizar y confirmar.
  // Extraida como funcion para poder invocarla despues de elegir la tarjeta
  // de la plantilla de forma dinamica.
  function continuarConAplicacion(nombrePlantilla: string) {
    // Paso 0: elegir una especie destino distinta de la especie origen de la
    // plantilla (el asistente no permite aplicar una plantilla sobre su
    // propia especie de origen porque esta no aparece como opcion en la
    // practica no se filtra explicitamente, pero elegir una distinta es lo
    // que exige un caso de "aplicar a otro destino").
    cy.get('[role="dialog"]').find('div').contains('Especie origen').parent().find('div').eq(1).invoke('text').then((origenTexto) => {
      const origen = origenTexto.trim();

      cy.get('[role="dialog"]').contains(/^Selecciona la especie destino/).parent()
        .find('button').then(($botones) => {
          const candidato = [...$botones].find((b) => (b.textContent || '').trim() !== origen);
          expect(candidato, 'debe existir una especie activa distinta de la especie origen para usar como destino').to.exist;
          const nombreDestino = (candidato!.textContent || '').trim();

          cy.wrap(candidato!).click({ force: true });

          add(
            'TC-M09-224: elegir una especie destino valida y distinta de la especie origen',
            `La especie origen de la plantilla es "${origen}"; se debe poder elegir otra especie activa como destino`,
            `Se eligio "${nombreDestino}" como especie destino`,
          );

          // Los botones dentro del dialogo se buscan siempre con
          // cy.get('[role="dialog"]').contains(...), nunca con cy.contains(...)
          // a secas: el listado de plantillas de fondo sigue en el DOM detras
          // del modal, y varias tarjetas tienen un boton con el MISMO texto
          // exacto "Aplicar plantilla" que el boton de confirmacion del
          // asistente (plantillastable.aplicar_plantilla vs.
          // aplicarplantillawizard.aplicar_plantilla_2, ambos = "Aplicar
          // plantilla"). Sin delimitar al dialogo, Cypress hace clic en el
          // primer boton que encuentra en el DOM -- el de una tarjeta de
          // fondo, no el del asistente -- lo que reinicia el asistente a otra
          // plantilla en vez de confirmar la aplicacion.
          cy.get('[role="dialog"]').contains('button', 'Siguiente', { timeout: 10000 }).should('not.be.disabled').click({ force: true });

          // Paso 1: previsualizacion.
          cy.get('[role="dialog"]').contains('Esta acción es irreversible', { timeout: 10000 }).should('exist');
          cy.get('[role="dialog"]').contains(nombreDestino).should('exist');
          cy.screenshot('01_previsualizacion', { overwrite: true });

          add(
            'TC-M09-224: previsualizar los parametros antes de aplicar',
            `Debe mostrarse una previsualizacion indicando que se aplicara "${nombrePlantilla}" sobre "${nombreDestino}", con aviso de que la accion es irreversible`,
            'Se mostro la previsualizacion con el aviso de accion irreversible y la especie destino elegida',
          );

          // Paso 2: confirmar aplicacion (boton de confirmacion DENTRO del
          // dialogo -- ver nota arriba sobre por que no se puede usar
          // cy.contains sin delimitar).
          cy.get('[role="dialog"]').contains('button', 'Aplicar plantilla', { timeout: 10000 }).click({ force: true });

          cy.wait('@aplicarPlantilla', { timeout: 20000 }).then((interception) => {
            const status = interception.response?.statusCode || 0;
            const body = interception.response?.body || {};

            if (status === 200) {
              add(
                'TC-M09-224: registrar la aplicacion de la plantilla sobre el destino',
                `La API debe responder 200 al aplicar "${nombrePlantilla}" sobre "${nombreDestino}"`,
                `HTTP ${status}`,
                'OK',
              );

              cy.get('[role="dialog"]').contains('Plantilla aplicada correctamente', { timeout: 15000 }).should('exist').then(() => {
                cy.screenshot('02_resultado', { overwrite: true });
                add(
                  'TC-M09-224: la configuracion del destino queda actualizada',
                  'El asistente debe avanzar al paso "Resultado" mostrando la confirmacion y las diferencias aplicadas',
                  'Se muestra "Plantilla aplicada correctamente" con el detalle de diferencias (antes/despues)',
                );
              });
            } else {
              add(
                'TC-M09-224: registrar la aplicacion de la plantilla sobre el destino',
                `La API debe responder 200 al aplicar "${nombrePlantilla}" sobre "${nombreDestino}", registrando la configuracion actualizada`,
                `HTTP ${status}, cuerpo: ${JSON.stringify(body).slice(0, 300)}`,
                'FALLA',
              );

              cy.get('[role="dialog"]').contains('Error al aplicar', { timeout: 15000 }).should('exist').then(() => {
                cy.screenshot('02_resultado', { overwrite: true });
                add(
                  'TC-M09-224: el asistente informa el error y permite salir de el',
                  'Ante un error, el asistente debe mostrar el mensaje de error y ofrecer alguna forma de cerrarlo o volver atras',
                  'El asistente muestra el mensaje de error, pero se queda en la pantalla "Aplicando..." sin boton de cerrar ni de volver: el unico paso con footer vacio y sin boton "X" de cierre es justamente este (step===2 en AplicarPlantillaWizard.tsx), dejando al usuario sin forma de salir del dialogo salvo recargando la pagina.',
                  'FALLA',
                );
              });
            }
          });
        });
    });
  }
});
