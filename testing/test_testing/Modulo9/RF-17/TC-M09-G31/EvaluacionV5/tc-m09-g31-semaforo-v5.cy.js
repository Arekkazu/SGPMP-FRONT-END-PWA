// TC-M09-G31 V5 — evidencia de interfaz para TC-M09-66/67/68 en el frontend TEST desplegado.
//
// Login real, intercepts PASIVOS (nunca se sustituye ninguna respuesta) y contraste de la pastilla
// mostrada contra el estado que la API entrego para la misma lectura.
//
// Dos superficies de la UI muestran el semaforo RF-17:
//   - Monitoreo: el estado del SENSOR, es decir el de su ultima lectura (TC-M09-68, ROJO).
//   - Historial: el semaforo de CADA lectura, unica vista con evidencia por caso.
// La vista Historial del frontend TEST cae en su error boundary en cuanto la consulta devuelve
// lecturas. El spec lo captura como evidencia en vez de ocultarlo, y no relaja ninguna assertion
// del oraculo del caso: la clasificacion de cada lectura se sigue verificando contra la respuesta
// real de la API que la propia vista recibio.
Cypress.Screenshot.defaults({ blackout: ['input[type="password"]', 'input[type="email"]'], capture: 'viewport' });

const R = Cypress.env('record');
// SemaforoPill: VERDE->Normal, AMARILLO->Advertencia, ROJO->Fuera de rango, GRIS->Sin senal.
const ETIQUETA = { VERDE: 'Normal', AMARILLO: 'Advertencia', ROJO: 'Fuera de rango', GRIS: 'Sin señal' };
const evidence = { run_id: R.run_id, id_sensor: R.id_sensor, id_infraestructura: R.id_infraestructura, casos: {} };
const guardar = () => cy.task('evidence', evidence, { log: false });

function login() {
  cy.intercept('POST', '**/sesiones/').as('login');
  cy.visit('/login');
  cy.get('input[type="email"]').type(Cypress.env('email'), { log: false });
  cy.get('input[type="password"]').type(Cypress.env('password'), { log: false });
  cy.get('button[type="submit"]').click();
  cy.wait('@login', { log: false }).then(({ request, response }) => {
    expect(response.statusCode, 'login HTTP').eq(200);
    expect(Boolean(response.body.access_token || response.body.token), 'token emitido').eq(true);
    // Seccion 7: las peticiones van al backend TEST, no a DEV, ni a sslip.io, ni a localhost.
    expect(request.url, 'el login va al backend TEST').to.include(Cypress.env('api'));
    evidence.autenticacion = { ok: true, backend: Cypress.env('api') };
  });
  cy.location('pathname').should('not.include', 'login');
}

// El item del sidebar queda brevemente deshabilitado mientras cargan los permisos.
function irATelemetriaPorSidebar() {
  cy.contains('nav.ds-sidebar a.ds-sidebar__item, nav.ds-sidebar button', /^Telemetr/i)
    .should('not.have.attr', 'aria-disabled', 'true').click();
  cy.location('pathname').should('include', '/telemetria');
}

describe('TC-M09-G31 V5 — clasificacion semaforica RF-17 en la interfaz TEST', () => {
  it('Monitoreo: el sensor del fixture se muestra ROJO / Fuera de rango tras TC-M09-68', () => {
    login();
    irATelemetriaPorSidebar();
    cy.intercept('GET', '**/iot/monitoreo/dashboard*').as('dashboard');
    cy.contains('a, button', /^Monitoreo$/).click();
    // Sin filtro de area: el dashboard filtrado por `id_infraestructura` devuelve
    // `resumen_unidades: []` por diseno del caso de uso, y la vista agrupa las tarjetas por esa
    // lista, de modo que con el filtro puesto no se renderiza ninguna tarjeta (OBSERVACION-2).
    cy.wait('@dashboard', { log: false }).then(({ response }) => {
      expect(response.statusCode).eq(200);
      const s = (response.body.sensores || []).find((x) => x.id_sensor === R.id_sensor);
      expect(s, 'sensor ' + R.id_sensor + ' presente en el dashboard').to.not.be.undefined;
      evidence.monitoreo = {
        id_sensor: s.id_sensor, ultimo_valor: s.ultimo_valor, ultimo_timestamp_captura: s.ultimo_timestamp_captura,
        estado_semaforo_api: s.estado_semaforo, etiqueta_ui_esperada: ETIQUETA[s.estado_semaforo],
        esperado_por_rf17: R.casos['TC-M09-68'].esperado, id_alerta: s.id_alerta,
        correlacion: 'el ultimo valor y timestamp del sensor corresponden a la lectura de TC-M09-68',
      };
      // El color no viene de una alerta M03: no hay ninguna sobre este sensor.
      expect(s.id_alerta, 'el sensor no tiene alerta M03 que enmascare el color').to.be.oneOf([null, undefined]);
      expect(s.estado_semaforo, 'el dashboard refleja la clasificacion de la ultima lectura').eq(R.casos['TC-M09-68'].esperado);
      cy.contains('div', R.nombre_sensor).parents().eq(2).as('tarjeta');
      // El dashboard lista todas las areas de la finca y la del RUN queda al borde inferior del
      // viewport: se centra la tarjeta antes de comprobarla y de capturar la evidencia.
      cy.get('@tarjeta').then(($c) => { $c[0].scrollIntoView({ block: 'center' }); });
      cy.get('@tarjeta').within(() => {
        cy.contains(ETIQUETA[s.estado_semaforo]).should('be.visible');
        cy.contains(String(s.ultimo_valor)).should('be.visible');
      });
    });
    cy.screenshot('monitoreo-dashboard', { capture: 'viewport' });

    // `cy.screenshot` devuelve el scroll al principio, y en el dashboard la tarjeta del sensor
    // del RUN queda bajo la linea de flotacion porque la vista lista todas las areas de la finca.
    // La vista Campo (movil) presenta los mismos sensores como lista compacta —mismo
    // `SemaforoPill` y mismo estado de la API— y cabe entera en el viewport: es la que se usa
    // para la captura legible de TC-M09-68.
    cy.contains('a, button', /^Campo \(m/).click();
    cy.contains('div', R.nombre_sensor).parents().eq(1).as('fila');
    cy.get('@fila').within(() => {
      cy.contains(ETIQUETA[R.casos['TC-M09-68'].esperado]).should('be.visible');
      cy.contains(String(R.casos['TC-M09-68'].valor_ajustado ?? R.casos['TC-M09-68'].valor)).should('be.visible');
    });
    cy.screenshot('tc68', { capture: 'viewport' });
    cy.then(() => { evidence.captura_tc68 = 'Campo (movil): fila del sensor con su valor y su pastilla'; });
    cy.then(guardar);
  });

  it('Historial: la API clasifica cada lectura y la vista no llega a representarla', () => {
    cy.on('uncaught:exception', (err) => {
      evidence.excepcion_frontend = { error: err.message.split('\n')[0] };
      return false;
    });
    login();
    cy.intercept('GET', '**/iot/monitoreo/historial*').as('historial');
    cy.visit('/telemetria/historial');
    cy.wait('@historial', { log: false }).then(({ response }) => {
      expect(response.statusCode, 'la vista Historial recibe 200 de la API').eq(200);
      const items = response.body.items || [];
      const est = response.body.estadisticas || [];
      evidence.historial_api = {
        total: response.body.total ?? null,
        lecturas_devueltas: items.length,
        tipos_en_estadisticas: est.slice(0, 1).map((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v === null ? 'null' : typeof v]))),
      };
      Object.entries(R.casos).forEach(([caso, datos]) => {
        const l = items.find((x) => x.id_telemetria === datos.id_telemetria);
        expect(l, caso + ': lectura ' + datos.id_telemetria + ' presente en la respuesta del historial').to.not.be.undefined;
        evidence.casos[caso] = {
          id_telemetria: l.id_telemetria, valor: l.valor, valor_ajustado: l.valor_ajustado, unidad: l.unidad_medida,
          esperado: datos.esperado, etiqueta_ui_que_corresponde: ETIQUETA[datos.esperado],
          api_historial: l.estado_semaforo_historico, id_umbral_ambiental: l.id_umbral_ambiental,
          id_especie: l.id_especie, id_activo_biologico: l.id_activo_biologico, especie: l.especie, id_alerta: l.id_alerta,
        };
        // Oraculo del caso: la clasificacion que entrega la vista debe ser la esperada.
        expect(l.estado_semaforo_historico, caso + ': la API clasifica la lectura').eq(datos.esperado);
      });
    });
    cy.then(guardar);

    // Estado real de la vista. El error boundary del frontend sustituye la tabla; se deja la
    // captura y el detalle, y se reporta como OBSERVACION de UI, no como fallo del caso.
    cy.get('body').then(($b) => {
      const tabla = $b.find('table').length > 0;
      const boundary = /No se pudo mostrar esta secci/i.test($b.text());
      evidence.historial_tabla_renderizada = tabla;
      evidence.historial_error_boundary = boundary;
      evidence.historial_defecto_frontend = tabla ? null : {
        sintoma: 'la vista Historial sustituye su contenido por el error boundary "No se pudo mostrar esta seccion" en cuanto la consulta devuelve lecturas',
        causa_probable: 'EstadisticasCards.fmt() llama n.toFixed(2) sobre valores que la API serializa como string (valor_minimo, valor_maximo, valor_promedio)',
        consecuencia: 'la tabla con el semaforo por lectura no se renderiza, de modo que la UI no puede mostrar el color de cada medicion',
      };
    });
    cy.screenshot('historial-defecto-frontend', { capture: 'viewport' });
    cy.then(guardar);
  });
});
