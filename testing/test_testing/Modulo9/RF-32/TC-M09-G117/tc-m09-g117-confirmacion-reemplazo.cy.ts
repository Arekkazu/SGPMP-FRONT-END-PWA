/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G117';

const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

// Especie destino con configuración existente real (ciclos biológicos ya
// cargados), confirmada en TC-M09-G104. Se usa como destino para poder
// verificar de forma significativa que "no cambia" tras cancelar (comparar
// contra una especie sin datos sería una prueba mas debil).
const ESPECIE_DESTINO_CON_DATOS = 'Camarón Blanco';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G117 - Confirmacion previa al reemplazo de la configuracion existente (RF-32 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-32 |
| Agrupa | TC-M09-225, TC-M09-226 |
| Tipo / Equipo | Usabilidad / Funcional - Frontend / QA |
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

- [01_confirmacion_previa.png](screenshots/01_confirmacion_previa.png): TC-M09-225 - paso de previsualizacion con el aviso de confirmacion, antes de decidir.
- [02_antes_de_cancelar.png](screenshots/02_antes_de_cancelar.png): TC-M09-226 - mismo paso de previsualizacion, justo antes de rechazar el reemplazo.
- [03_despues_de_cancelar.png](screenshots/03_despues_de_cancelar.png): TC-M09-226 - estado de la pantalla tras cancelar (el asistente se cierra sin aplicar nada).
`;
}

describe('TC-M09-G117 - Confirmacion previa al reemplazo de la configuracion existente (RF-32)', () => {
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

    cy.task('writeResult', { file: `${DIR}/TC-M09-G117_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G117_resultado.md`, content: renderMd(r) });
  });

  // ── Helpers de navegacion UI (mismo patron probado en TC-M09-G116) ────────

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

  // Inicia sesion UNA sola vez por prueba (via UI) e intercepta esa misma
  // peticion de login para capturar el token que el backend emite para esa
  // sesion. Todas las verificaciones por API de esta ficha reutilizan ese
  // MISMO token (alias "tokenSesion") en vez de volver a iniciar sesion por
  // separado: se confirmo en la corrida anterior que un segundo login (por
  // API, con cy.request) revoca el token de la sesion ya abierta en el
  // navegador (401 TOKEN_REVOCADO), asi que solo puede existir un login por
  // prueba.
  function loginUIConToken() {
    cy.intercept('POST', '**/sesiones/').as('loginReq');
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');
    cy.wait('@loginReq', { timeout: 15000 }).its('response.body.token').as('tokenSesion');
  }

  function navegarAPlantillas() {
    clickConfiguracionConReintento();
    cy.location('pathname', { timeout: 30000 }).should('eq', '/configuracion');
    cy.contains('button', 'Plantillas', { timeout: 15000 }).click({ force: true });
  }

  // Abre el asistente de aplicacion sobre CUALQUIER plantilla con boton
  // habilitado y avanza hasta el paso "Previsualizar" eligiendo la especie
  // destino indicada. No importa cual plantilla se use ni si su
  // schema_version es compatible: en esta ficha nunca se llega a confirmar
  // la aplicacion (eso es objeto de TC-M09-G116), por lo que el defecto de
  // "500 al aplicar" ya documentado no interfiere con estas pruebas.
  function abrirPrevisualizacionSobre(nombreDestino: string) {
    navegarAPlantillas();

    // No se usa cy.wait() sobre un intercept de red aqui: en la segunda
    // prueba de este archivo (misma pestaña del navegador que la primera,
    // aunque con un login nuevo) el listado de plantillas puede resolverse
    // sin generar una peticion de red nueva (esta app es una PWA con
    // service worker, que puede servir la respuesta desde su propio cache
    // sin que cy.intercept llegue a ver la peticion) -- eso hizo fallar
    // "No request ever occurred" en una corrida anterior aunque el listado
    // si se veia correctamente en pantalla. En su lugar se espera, con
    // reintento automatico de Cypress, a que el contenido real ya este
    // renderizado (misma tecnica ya usada para la carrera de TC-M09-G110 y
    // TC-M09-G116): eso es correcto sin importar si el dato vino de red o
    // de cache.
    cy.get('div[style*="border-radius: var(--r-xl)"]', { timeout: 15000 })
      .should(($cards) => {
        const listo = [...$cards].some((card) => /Aplicar plantilla/.test(card.textContent || ''));
        expect(listo, 'las tarjetas de plantillas deben terminar de cargar su contenido real').to.be.true;
      })
      .then(($cards) => {
        const candidato = [...$cards].find((card) => /Aplicar plantilla/.test(card.textContent || ''));
        expect(candidato, 'debe existir al menos una plantilla con el boton "Aplicar plantilla" habilitado').to.exist;

        cy.wrap(candidato!).within(() => {
          cy.contains('button', 'Aplicar plantilla').click({ force: true });
        });
      });

    cy.get('[role="dialog"]', { timeout: 15000 })
      .should('exist')
      .within(() => {
        cy.get('#wizard-modal-title').contains('Aplicar Plantilla');
      });

    cy.get('[role="dialog"]').contains('button', nombreDestino, { timeout: 10000 }).click({ force: true });
    cy.get('[role="dialog"]').contains('button', 'Siguiente').should('not.be.disabled').click({ force: true });

    // Señal positiva de que el paso "Previsualizar" ya renderizo (no solo
    // "cambio de paso" en el stepper, sino el contenido real del aviso).
    cy.get('[role="dialog"]').contains('Esta acción es irreversible', { timeout: 10000 }).should('exist');
  }

  // ── Helpers de verificacion via API (reutilizan el token de la sesion UI) ─

  function obtenerIdEspecie(token: string, nombre: string) {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('API_BASE_URL')}/configuracion/especies?solo_activas=true`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      const items = Array.isArray(res.body) ? res.body : (res.body.items ?? []);
      const especie = items.find((e: any) => e.nombre === nombre);
      expect(especie, `debe existir la especie activa "${nombre}" en el catalogo`).to.exist;
      return especie.id_especie as number;
    });
  }

  // Snapshot textual (string) del estado actual, para comparar antes/despues
  // por igualdad exacta sin depender de si el endpoint envuelve la
  // respuesta en {total,items} o devuelve un arreglo plano.
  function snapshotCiclos(token: string, idEspecie: number) {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('API_BASE_URL')}/configuracion/ciclos?id_especie=${idEspecie}&solo_activas=true`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => JSON.stringify(res.body));
  }

  function snapshotHistorial(token: string) {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('API_BASE_URL')}/configuracion/plantillas/historial`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => JSON.stringify(res.body));
  }

  it('TC-M09-225 - solicita confirmacion antes de reemplazar la configuracion existente', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G117.');
    }

    loginUIConToken();

    cy.get('@tokenSesion').then((tokenAlias) => {
      const token = tokenAlias as unknown as string;
      let idEspecie: number;
      let ciclosAntes: string;

      obtenerIdEspecie(token, ESPECIE_DESTINO_CON_DATOS).then((id) => {
        idEspecie = id;
        return snapshotCiclos(token, id);
      }).then((snap) => {
        ciclosAntes = snap;

        abrirPrevisualizacionSobre(ESPECIE_DESTINO_CON_DATOS);

        cy.get('[role="dialog"]').contains(ESPECIE_DESTINO_CON_DATOS).should('exist');
        cy.screenshot('01_confirmacion_previa', { overwrite: true });

        add(
          'TC-M09-225: mostrar dialogo de confirmacion antes de reemplazar',
          `Antes de reemplazar la configuracion de "${ESPECIE_DESTINO_CON_DATOS}" (que ya tiene configuracion existente), el asistente debe mostrar un paso de previsualizacion con un aviso explicito de confirmacion`,
          'Se mostro el paso "Previsualizar" con el aviso "Esta acción es irreversible" y el detalle de que se reemplazara la especie destino elegida',
        );

        snapshotCiclos(token, idEspecie).then((ciclosDespues) => {
          expect(ciclosDespues, 'la configuracion de la especie destino no debe cambiar solo por llegar al paso de previsualizacion').to.equal(ciclosAntes);

          add(
            'TC-M09-225: no reemplazar la configuracion sin confirmacion explicita',
            `La configuracion de "${ESPECIE_DESTINO_CON_DATOS}" debe permanecer intacta mientras el usuario no confirme explicitamente (boton "Aplicar plantilla")`,
            'La configuracion de ciclos biologicos de la especie destino es identica antes y despues de llegar al paso de previsualizacion: no hubo ningun cambio sin confirmacion',
          );
        });

        // Salir sin confirmar (no es el foco de esta verificacion, pero deja
        // el estado de la UI limpio para la siguiente prueba).
        cy.get('[role="dialog"]').contains('button', 'Atrás').click({ force: true });
        cy.get('[role="dialog"]').contains('button', 'Cancelar').click({ force: true });
      });
    });
  });

  it('TC-M09-226 - cancela la aplicacion cuando el usuario rechaza el reemplazo', () => {
    loginUIConToken();

    cy.get('@tokenSesion').then((tokenAlias) => {
      const token = tokenAlias as unknown as string;
      let idEspecie: number;
      let ciclosAntes: string;
      let historialAntes: string;

      obtenerIdEspecie(token, ESPECIE_DESTINO_CON_DATOS).then((id) => {
        idEspecie = id;
        return snapshotCiclos(token, id);
      }).then((snap) => {
        ciclosAntes = snap;
        return snapshotHistorial(token);
      }).then((snapHist) => {
        historialAntes = snapHist;

        abrirPrevisualizacionSobre(ESPECIE_DESTINO_CON_DATOS);
        cy.screenshot('02_antes_de_cancelar', { overwrite: true });

        // Rechazar el reemplazo: cerrar el asistente desde el paso de
        // previsualizacion (boton "X" del encabezado) en vez de confirmar con
        // "Aplicar plantilla". El "X" solo se oculta durante el paso
        // "Aplicando" (step===2); en "Previsualizar" (step===1) esta visible.
        cy.get('[role="dialog"]').find('button[aria-label="Cerrar"]').click({ force: true });

        cy.get('[role="dialog"]', { timeout: 10000 }).should('not.exist');
        cy.screenshot('03_despues_de_cancelar', { overwrite: true });

        add(
          'TC-M09-226: cancelar la aplicacion cuando el usuario rechaza el reemplazo',
          'Al rechazar el reemplazo desde el paso de previsualizacion (cerrar en vez de confirmar), el asistente debe cerrarse sin aplicar ningun cambio',
          'El asistente se cerro correctamente al rechazar; no quedo ningun dialogo abierto ni mensaje de error en pantalla',
        );

        snapshotCiclos(token, idEspecie).then((ciclosDespues) => {
          expect(ciclosDespues, 'la configuracion de la especie destino debe permanecer sin cambios tras cancelar').to.equal(ciclosAntes);

          add(
            'TC-M09-226: la configuracion destino permanece sin cambios tras cancelar',
            `La configuracion de "${ESPECIE_DESTINO_CON_DATOS}" no debe modificarse en absoluto al cancelar antes de confirmar`,
            'La configuracion de ciclos biologicos de la especie destino es identica antes y despues de cancelar',
          );
        });

        snapshotHistorial(token).then((historialDespues) => {
          expect(historialDespues, 'no debe crearse ningun registro de aplicacion (historial) al cancelar').to.equal(historialAntes);

          add(
            'TC-M09-226: no debe crearse un snapshot de aplicacion efectiva',
            'El historial de aplicaciones de plantillas no debe registrar ninguna aplicacion nueva cuando el usuario cancela antes de confirmar',
            'El historial de aplicaciones es identico antes y despues de cancelar: no se registro ninguna aplicacion nueva',
          );
        });
      });
    });
  });
});
