// TC-M09-G31 V3 — evidencia de interfaz para TC-M09-66/67/68.
// Intercepts pasivos (nunca stubs de respuesta) y login real. La UI se contrasta contra la
// respuesta real de la API: se verifica que la pastilla mostrada corresponda al estado que el
// backend entrego para el sensor (Monitoreo) y para cada medicion del fixture (Historial).
Cypress.Screenshot.defaults({ blackout: ['input[type="password"]', 'input[type="email"]'], capture: 'viewport' });

const R = Cypress.env('record');
// SemaforoPill: VERDE->Normal, AMARILLO->Advertencia, ROJO->Fuera de rango, GRIS->Sin senal.
const ETIQUETA = { VERDE: 'Normal', AMARILLO: 'Advertencia', ROJO: 'Fuera de rango', GRIS: 'Sin señal' };
const evidence = { casos: {} };
const guardar = () => cy.task('evidence', evidence, { log: false });

function login() {
  cy.intercept('POST', '**/sesiones/').as('login');
  cy.visit('/login');
  cy.get('input[type="email"]').type(Cypress.env('email'), { log: false });
  cy.get('input[type="password"]').type(Cypress.env('password'), { log: false });
  cy.get('button[type="submit"]').click();
  cy.wait('@login', { log: false }).then(({ response }) => {
    expect(response.statusCode).eq(200);
    expect(Boolean(response.body.token), 'token issued').eq(true);
    evidence.autenticacion = { ok: true, correo: Cypress.env('email') };
  });
  cy.location('pathname').should('not.include', 'login');
}

// El item del sidebar queda brevemente deshabilitado mientras cargan los permisos.
function irATelemetriaPorSidebar() {
  cy.contains('nav.ds-sidebar a.ds-sidebar__item, nav.ds-sidebar button', /^Telemetr/i)
    .should('not.have.attr', 'aria-disabled', 'true').click();
  cy.location('pathname').should('include', '/telemetria');
}

describe('TC-M09-G31 V3 — clasificacion semaforica RF-17 en la interfaz', () => {
  it('Monitoreo: la UI muestra para el sensor del fixture el estado que entrega la API', () => {
    login();
    irATelemetriaPorSidebar();
    cy.intercept('GET', '**/iot/monitoreo/dashboard*').as('dashboard');
    cy.contains('a, button', /^Monitoreo$/).click();
    cy.wait('@dashboard', { log: false }).then(({ response }) => {
      expect(response.statusCode).eq(200);
      const s = (response.body.sensores || []).find((x) => x.id_sensor === R.id_sensor);
      expect(s, 'sensor ' + R.id_sensor + ' en el dashboard').to.not.be.undefined;
      evidence.dashboard = {
        id_sensor: s.id_sensor, ultimo_valor: s.ultimo_valor, estado_semaforo_api: s.estado_semaforo,
        etiqueta_ui: ETIQUETA[s.estado_semaforo],
        // Lo que deberia mostrar si la clasificacion RF-17 se aplicara a la ultima medicion.
        esperado_por_rf17: R.casos['TC-M09-68'].esperado, etiqueta_ui_si_rf17: ETIQUETA[R.casos['TC-M09-68'].esperado],
      };
      cy.contains('div', R.nombre_sensor).should('be.visible').parents().eq(2).within(() => {
        cy.contains(ETIQUETA[s.estado_semaforo]).should('be.visible');
      });
    });
    cy.screenshot('monitoreo-dashboard', { capture: 'viewport' });
    cy.then(guardar);
  });

  it('Historial: cada medicion del fixture muestra su propio semaforo (TC-66/67/68)', () => {
    // Defecto observado en el frontend desplegado: la vista Historial lanza una excepcion no
    // capturada al renderizar las tarjetas de estadisticas. Se registra el error y se toma
    // captura del estado resultante; no se relaja ninguna assertion de G31.
    cy.on('uncaught:exception', (err) => {
      evidence.historial_defecto_frontend = { error: err.message.split('\n')[0], componente_probable: 'EstadisticasCards (fmt -> toFixed sobre Decimal serializado como string)' };
      return false;
    });
    login();
    cy.intercept('GET', '**/iot/monitoreo/historial*').as('historial');
    cy.visit('/telemetria/historial');
    cy.wait('@historial', { log: false }).then(({ response }) => {
      expect(response.statusCode).eq(200);
      const items = response.body.items || [];
      const est = response.body.resumen_estadistico || response.body.estadisticas || [];
      evidence.historial_api = {
        total: response.body.total,
        tipos_en_estadisticas: est.slice(0, 2).map((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v === null ? 'null' : typeof v]))),
      };
      Object.entries(R.casos).forEach(([caso, datos]) => {
        const l = items.find((x) => x.id_telemetria === datos.id_telemetria);
        expect(l, caso + ': lectura ' + datos.id_telemetria + ' presente en la respuesta del historial').to.not.be.undefined;
        evidence.casos[caso] = {
          id_telemetria: l.id_telemetria, valor: l.valor, valor_ajustado: l.valor_ajustado,
          esperado: datos.esperado, etiqueta_ui_si_rf17: ETIQUETA[datos.esperado],
          api_historial: l.estado_semaforo_historico, etiqueta_ui_segun_api: ETIQUETA[l.estado_semaforo_historico],
          id_umbral_ambiental: l.id_umbral_ambiental, id_especie: l.id_especie,
        };
      });
    });
    cy.screenshot('historial-defecto-frontend', { capture: 'viewport' });
    cy.then(guardar);
    // La tabla del historial es el unico lugar de la UI con semaforo por medicion. Si la vista
    // no renderiza, la evidencia visual por caso no existe: se declara bloqueada, no aprobada.
    cy.get('body').then(($b) => {
      const tablaVisible = $b.find('table').length > 0;
      cy.then(() => { evidence.historial_tabla_renderizada = tablaVisible; });
      expect(tablaVisible, 'la vista Historial renderiza la tabla con el semaforo por medicion').eq(true);
    });
    Object.keys(R.casos).forEach((caso) => {
      cy.then(() => {
        const d = evidence.casos[caso];
        cy.contains('td', String(d.valor)).should('be.visible').parent('tr').within(() => {
          cy.contains(d.etiqueta_ui_segun_api).should('be.visible');
        });
        cy.screenshot(caso.replace('TC-M09-', 'tc'), { capture: 'viewport' });
      });
    });
    cy.then(guardar);
  });
});
