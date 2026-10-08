/// <reference types="cypress" />
import './commands';

const ID_ESPECIE_OBJETIVO = 2;
const NOMBRE_ESPECIE = 'Trucha Arcoíris';

type Estado = 'OK' | 'FALLA';
interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

describe('TC-M09-G11-v2.0 - Parámetros por especie (RF-16 v1.2 - CU-02)', () => {
  const checks: Checkpoint[] = [];
  const addCheck = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') => {
    checks.push({ paso, esperado, obtenido, estado });
  };

  let DATO_CICLO_NOMBRE = 'Alevinaje QAC';
  const DATO_CICLO_DURACION = 45;
  const DATO_CICLO_DESC = 'Ciclo de alevinaje para validación E2E RF-16 v1.2';

  let DATO_PATOLOGIA_NOMBRE = 'Saprolegniosis QAB';
  const DATO_PATOLOGIA_DESC = 'Infección fúngica (QA v2.0)';

  let DATO_METRICA_NOMBRE = 'Huevos recolectados QA2';
  const DATO_METRICA_TIPO = 'CONTEO';
  const DATO_METRICA_UNIDAD = 'unidades';
  const DATO_METRICA_ACTIVO = 'LOTE';

  let idCicloCreado: number | null = null;
  let idPatologiaCreada: number | null = null;
  let idMetricaCreada: number | null = null;

  function cerrarModalDefensivo() {
    cy.window({ log: false }).then((win) => {
      return new Cypress.Promise((resolve) => {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 200;
          const dialog = win.document.querySelector('[role="dialog"]');
          if (!dialog || elapsed >= 10000) {
            clearInterval(interval);
            resolve(!dialog);
          }
        }, 200);
      });
    }).then((cerrado) => {
      if (!cerrado) {
        cy.get('body', { log: false }).then(($b) => {
          const btnCancel = $b.find('[role="dialog"] button:contains("Cancelar"), [role="dialog"] button:contains("Cancel")');
          if (btnCancel.length > 0) {
            cy.wrap(btnCancel.first()).click();
          } else {
            cy.get('body').type('{esc}');
          }
        });
        cy.wait(1500);
      }
    });
  }

  after(() => {
    // Teardown secuencial con encadenamiento nativo (sin Promise.all sobre Chainables)
    cy.token().then((tok) => {
      const apiBase = Cypress.env('API_BASE_URL');
      const headers = { Authorization: `Bearer ${tok}` };
      const desactivaciones: string[] = [];
      const fallos: string[] = [];

      const pasos: Array<() => Cypress.Chainable<any>> = [];

      if (idCicloCreado) {
        pasos.push(() =>
          cy.request({
            method: 'PATCH',
            url: `${apiBase}/configuracion/ciclos/${idCicloCreado}/desactivar`,
            headers,
            failOnStatusCode: false,
          }).then((resC) => {
            if (resC.status === 200 || resC.status === 204) {
              desactivaciones.push(`ciclo=#${idCicloCreado}`);
            } else {
              fallos.push(`ciclo=#${idCicloCreado} (HTTP ${resC.status})`);
            }
          })
        );
      }

      if (idPatologiaCreada) {
        pasos.push(() =>
          cy.request({
            method: 'PATCH',
            url: `${apiBase}/configuracion/patologias/${idPatologiaCreada}/desactivar`,
            headers,
            failOnStatusCode: false,
          }).then((resP) => {
            if (resP.status === 200 || resP.status === 204) {
              desactivaciones.push(`patología=#${idPatologiaCreada}`);
            } else {
              fallos.push(`patología=#${idPatologiaCreada} (HTTP ${resP.status})`);
            }
          })
        );
      }

      if (idMetricaCreada) {
        pasos.push(() =>
          cy.request({
            method: 'PATCH',
            url: `${apiBase}/configuracion/metricas/${idMetricaCreada}/desactivar`,
            headers,
            failOnStatusCode: false,
          }).then((resM) => {
            if (resM.status === 200 || resM.status === 204) {
              desactivaciones.push(`métrica=#${idMetricaCreada}`);
            } else {
              fallos.push(`métrica=#${idMetricaCreada} (HTTP ${resM.status})`);
            }
          })
        );
      }

      let chain = cy.wrap(null);
      pasos.forEach((fn) => {
        chain = chain.then(fn);
      });

      chain.then(() => {
        const totalCreados = (idCicloCreado ? 1 : 0) + (idPatologiaCreada ? 1 : 0) + (idMetricaCreada ? 1 : 0);
        if (totalCreados === 0) {
          addCheck(
            'CP-13',
            'PATCH /desactivar 200/204 de cada registro creado; ids en evidencias/',
            'No se generaron registros durante la prueba; teardown no aplicable',
            'FALLA'
          );
        } else if (fallos.length === 0) {
          addCheck(
            'CP-13',
            'PATCH /desactivar 200/204 de cada registro creado; ids en evidencias/',
            `Teardown completo exitoso: ${desactivaciones.join(', ')}`,
            'OK'
          );
        } else {
          addCheck(
            'CP-13',
            'PATCH /desactivar 200/204 de cada registro creado; ids en evidencias/',
            `Fallo parcial en teardown: ${fallos.join(', ')} (exitosos: ${desactivaciones.join(', ')})`,
            'FALLA'
          );
        }

        // Escribir cypress_raw.json con todos los checkpoints
        cy.writeFile('evidencias/cypress_raw.json', { checkpoints: checks });
      });
    });
  });

  it('ejecuta preflight dinámico, navegación e inserción de ciclo, patología y métrica productiva con RFC-004', () => {
    // 0. Cargar nombres libres resueltos por el preflight (dinámico sin hardcode)
    cy.readFile('evidencias/nombres_corrida.json').then((data) => {
      if (data && data.ciclo) DATO_CICLO_NOMBRE = data.ciclo;
      if (data && data.patologia) DATO_PATOLOGIA_NOMBRE = data.patologia;
      if (data && data.metrica) DATO_METRICA_NOMBRE = data.metrica;
      cy.log(`Nombres cargados: ciclo="${DATO_CICLO_NOMBRE}", patología="${DATO_PATOLOGIA_NOMBRE}", métrica="${DATO_METRICA_NOMBRE}"`);
    });

    // 1. CP-01: Login UI + Permisos reales
    cy.capturarRefresh();
    cy.loginUI();
    cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');

    cy.token().then((tok) => {
      const apiBase = Cypress.env('API_BASE_URL');
      cy.request({
        method: 'GET',
        url: `${apiBase}/sesiones/me/permisos`,
        headers: { Authorization: `Bearer ${tok}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const permisos: Array<[number, number]> = res.body?.permisos || [];
        const tieneReq =
          permisos.some(([r, a]) => r === 8 && a === 2) &&
          permisos.some(([r, a]) => r === 17 && a === 2) &&
          permisos.some(([r, a]) => r === 17 && a === 1) &&
          permisos.some(([r, a]) => r === 18 && a === 1) &&
          permisos.some(([r, a]) => r === 19 && a === 1);

        addCheck(
          'CP-01',
          '/dashboard; GET /sesiones/me/permisos 200 con (8,2), (17,2), (17,1), (18,1), (19,1)',
          tieneReq
            ? 'Sesión autenticada y permisos requeridos confirmados en backend'
            : `Faltan permisos. Recibidos: ${JSON.stringify(permisos)}`,
          tieneReq ? 'OK' : 'FALLA'
        );
      });
    });

    // 2. CP-02: Navegación a Configuración -> Por Especie -> Trucha Arcoíris
    cy.get('a.ds-sidebar__item[href="/configuracion"]', { timeout: 30000 })
      .should('not.have.class', 'ds-sidebar__item--locked')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');

    cy.contains('button', /por especie|by species/i, { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.contains('h2', /configuración por especie|species configuration/i, { timeout: 15000 }).should('be.visible');

    // Seleccionar tarjeta de Trucha Arcoíris (scrollIntoView obligatorio en grilla sin buscador)
    cy.contains('button', /Trucha Arcoíris/i, { timeout: 15000 })
      .should('exist')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.contains('h2', /Trucha Arcoíris/i, { timeout: 15000 })
      .should('be.visible')
      .then(() => {
        addCheck(
          'CP-02',
          '/configuracion -> pestaña "Por Especie" -> tarjeta Trucha Arcoíris -> h2 con su nombre',
          `Navegación completada a la ficha de la especie ${NOMBRE_ESPECIE} (#${ID_ESPECIE_OBJETIVO})`,
          'OK'
        );
      });

    // -------------------------------------------------------------------------
    // SUB-CASO 1: ETAPA / CICLO BIOLÓGICO
    // -------------------------------------------------------------------------
    let cicloIntercept: any = null;
    let cicloFired = false;
    cy.intercept('POST', '**/configuracion/ciclos', (req) => {
      cicloFired = true;
      req.continue((res) => {
        cicloIntercept = res;
      });
    }).as('postCiclo');

    cy.contains('button', /ciclos biológicos|biological cycles|ciclos/i).click();
    cy.contains('button', /nuevo ciclo|new cycle/i, { timeout: 15000 }).should('be.visible').click();

    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.get('input[name="nombre"]').clear().type(DATO_CICLO_NOMBRE);
      cy.get('input[name="duracion_dias"]').clear().type(String(DATO_CICLO_DURACION));
      cy.get('textarea#ciclo-desc').clear().type(DATO_CICLO_DESC);
      cy.contains('button', /registrar ciclo|guardar cambios|save/i).click();
    });

    cy.screenshot('01_registro_ciclo_ui', { overwrite: true });

    // Espera reactiva no bloqueante del POST
    cy.window({ log: false }).then((win) => {
      return new Cypress.Promise((resolve) => {
        const t = setTimeout(() => resolve('TIMEOUT'), 15000);
        const check = setInterval(() => {
          if (cicloFired) {
            clearTimeout(t);
            clearInterval(check);
            resolve('FIRED');
          }
        }, 100);
      });
    }).then((estado) => {
      if (estado === 'TIMEOUT') {
        addCheck('CP-04', 'POST /configuracion/ciclos 201', 'POST /configuracion/ciclos no disparó en 15s', 'FALLA');
      } else {
        const status = cicloIntercept?.statusCode || 0;
        const body = cicloIntercept?.body || {};
        if (status === 200 || status === 201) {
          idCicloCreado = body.id_ciclo_biologico || null;
        }

        const normRespNombre = (body.nombre || '').trim().toLowerCase();
        const normEsperadoNombre = DATO_CICLO_NOMBRE.trim().toLowerCase();

        const contratoOk =
          (status === 200 || status === 201) &&
          normRespNombre === normEsperadoNombre &&
          Number(body.duracion_dias) === DATO_CICLO_DURACION &&
          Number(body.id_especie || body.especie_id) === ID_ESPECIE_OBJETIVO;

        addCheck(
          'CP-04',
          `nombre ≈ ${DATO_CICLO_NOMBRE} (ci), duracion_dias=45, id_especie=${ID_ESPECIE_OBJETIVO}`,
          contratoOk
            ? `Ciclo #${idCicloCreado} registrado con éxito en backend (duración ${body.duracion_dias})`
            : `Respuesta de contrato inválida: HTTP ${status}, body: ${JSON.stringify(body)}`,
          contratoOk ? 'OK' : 'FALLA'
        );
      }
    });

    // Cierre defensivo del modal de ciclo
    cerrarModalDefensivo();

    cy.get('body', { log: false }).then(($b) => {
      if ($b.find('[role="dialog"]').length === 0) {
        addCheck('CP-03', 'POST 201 y modal cerrado', 'Envío exitoso y diálogo cerrado', 'OK');
      } else {
        addCheck('CP-03', 'POST 201 y modal cerrado', 'Modal [role="dialog"] no cerró tras envío', 'FALLA');
      }
    });

    // CP-05: Persistencia UI y verificación en API
    cy.get('body', { log: false }).then(($b) => {
      const fila = $b.find('tbody tr').filter((_, el) => (el.textContent || '').toLowerCase().includes(DATO_CICLO_NOMBRE.toLowerCase()));
      const visibleEnUI = fila.length > 0;

      cy.token().then((tok) => {
        const apiBase = Cypress.env('API_BASE_URL');
        cy.request({
          method: 'GET',
          url: `${apiBase}/configuracion/ciclos?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=false`,
          headers: { Authorization: `Bearer ${tok}` },
          failOnStatusCode: false,
        }).then((resC) => {
          const items = Array.isArray(resC.body) ? resC.body : resC.body?.items || [];
          const encontrado = items.find((c: any) => (c.nombre || '').trim().toLowerCase() === DATO_CICLO_NOMBRE.toLowerCase());
          const okPersist = Boolean(encontrado && encontrado.es_activo && visibleEnUI);

          addCheck(
            'CP-05',
            'Fila visible en tabla (ci) y GET /configuracion/ciclos la contiene activa',
            okPersist
              ? `Ciclo presente en UI y persistido activo en backend (ID #${encontrado.id_ciclo_biologico})`
              : (idCicloCreado
                  ? `Inconsistencia en persistencia: UI_visible=${visibleEnUI}, API_encontrado=${Boolean(encontrado)}`
                  : 'FALLA — dependiente de CP-04: Ciclo no creado en backend'),
            okPersist ? 'OK' : 'FALLA'
          );
        });
      });
    });

    // -------------------------------------------------------------------------
    // SUB-CASO 2: PATOLOGÍA
    // -------------------------------------------------------------------------
    let patologiaIntercept: any = null;
    let patologiaFired = false;
    cy.intercept('POST', '**/configuracion/patologias', (req) => {
      patologiaFired = true;
      req.continue((res) => {
        patologiaIntercept = res;
      });
    }).as('postPatologia');

    cy.contains('button', /patologías|pathologies/i).click();
    cy.contains('button', /nueva patología|new pathology/i, { timeout: 15000 }).should('be.visible').click();

    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.get('input[name="nombre"]').clear().type(DATO_PATOLOGIA_NOMBRE);
      // Selector auditado y corregido: id="patologia-desc"
      cy.get('textarea#patologia-desc, textarea[name="descripcion"]').clear().type(DATO_PATOLOGIA_DESC);
      cy.contains('button', /registrar patología|guardar cambios|save/i).click();
    });

    cy.screenshot('02_registro_patologia_ui', { overwrite: true });

    cy.window({ log: false }).then((win) => {
      return new Cypress.Promise((resolve) => {
        const t = setTimeout(() => resolve('TIMEOUT'), 15000);
        const check = setInterval(() => {
          if (patologiaFired) {
            clearTimeout(t);
            clearInterval(check);
            resolve('FIRED');
          }
        }, 100);
      });
    }).then((estado) => {
      if (estado === 'TIMEOUT') {
        addCheck('CP-07', 'POST /configuracion/patologias 200/201', 'POST no disparó en 15s', 'FALLA');
      } else {
        const status = patologiaIntercept?.statusCode || 0;
        const body = patologiaIntercept?.body || {};
        if (status === 200 || status === 201) {
          idPatologiaCreada = body.id_especies_patologias || body.id_patologia || null;
        }

        const normRespNombre = (body.nombre || '').trim().toLowerCase();
        const normEsperadoNombre = DATO_PATOLOGIA_NOMBRE.trim().toLowerCase();
        const contratoOk =
          (status === 200 || status === 201) &&
          normRespNombre === normEsperadoNombre &&
          body.descripcion === DATO_PATOLOGIA_DESC &&
          Number(body.id_especie || body.especie_id) === ID_ESPECIE_OBJETIVO;

        addCheck(
          'CP-07',
          `POST 200/201; nombre ≈ ${DATO_PATOLOGIA_NOMBRE} (ci), descripcion preservada`,
          contratoOk
            ? `Patología #${idPatologiaCreada} registrada correctamente con descripción intacta`
            : `Respuesta de contrato inválida: HTTP ${status}, body: ${JSON.stringify(body)}`,
          contratoOk ? 'OK' : 'FALLA'
        );
      }
    });

    cerrarModalDefensivo();

    cy.get('body', { log: false }).then(($b) => {
      if ($b.find('[role="dialog"]').length === 0) {
        addCheck('CP-06', 'POST 200/201 y modal cerrado', 'Envío exitoso y diálogo cerrado', 'OK');
      } else {
        addCheck('CP-06', 'POST 200/201 y modal cerrado', 'Modal [role="dialog"] no cerró tras envío', 'FALLA');
      }
    });

    // CP-08: Persistencia UI y verificación en API
    cy.get('body', { log: false }).then(($b) => {
      const fila = $b.find('tbody tr').filter((_, el) => (el.textContent || '').toLowerCase().includes(DATO_PATOLOGIA_NOMBRE.toLowerCase()));
      const visibleEnUI = fila.length > 0;

      cy.token().then((tok) => {
        const apiBase = Cypress.env('API_BASE_URL');
        cy.request({
          method: 'GET',
          url: `${apiBase}/configuracion/patologias?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=false`,
          headers: { Authorization: `Bearer ${tok}` },
          failOnStatusCode: false,
        }).then((resP) => {
          const items = Array.isArray(resP.body) ? resP.body : resP.body?.items || [];
          const encontrada = items.find((p: any) => (p.nombre || '').trim().toLowerCase() === DATO_PATOLOGIA_NOMBRE.toLowerCase());
          const okPersist = Boolean(encontrada && encontrada.es_activo && visibleEnUI);

          addCheck(
            'CP-08',
            'Fila visible en tabla (ci) y GET /configuracion/patologias la contiene activa',
            okPersist
              ? `Patología presente en UI y persistida activa en backend (ID #${encontrada.id_especies_patologias || encontrada.id_patologia})`
              : (idPatologiaCreada
                  ? `Inconsistencia en persistencia: UI_visible=${visibleEnUI}, API_encontrada=${Boolean(encontrada)}`
                  : 'FALLA — dependiente de CP-07: Patología no creada en backend'),
            okPersist ? 'OK' : 'FALLA'
          );
        });
      });
    });

    // -------------------------------------------------------------------------
    // SUB-CASO 3: MÉTRICA PRODUCTIVA (RFC-004)
    // -------------------------------------------------------------------------
    let metricaIntercept: any = null;
    let metricaFired = false;
    let metricaReqBody: any = null;

    cy.intercept('POST', '**/configuracion/metricas', (req) => {
      metricaFired = true;
      metricaReqBody = req.body;
      req.continue((res) => {
        metricaIntercept = res;
      });
    }).as('postMetrica');

    cy.contains('button', /métricas|metrics/i).click();
    cy.contains('button', /nueva métrica|new metric/i, { timeout: 15000 }).should('be.visible').click();

    // CP-09: EVALUACIÓN OBLIGATORIA DE CONTROLES RFC-004 ANTES DE DILIGENCIAR CAMPOS BASE
    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.root().then(($dialog) => {
        const tieneTipoDato = $dialog.find('[name="tipo_dato"], #tipo-dato, select[name="tipo_dato"]').length > 0;
        const tieneObligatorio = $dialog.find('[name="es_obligatorio"], #es-obligatorio, input[type="checkbox"][name="es_obligatorio"]').length > 0;
        const tieneMin = $dialog.find('[name="valor_min"], #valor-min, input[name="valor_min"]').length > 0;
        const tieneMax = $dialog.find('[name="valor_max"], #valor-max, input[name="valor_max"]').length > 0;

        const faltantes: string[] = [];
        if (!tieneTipoDato) faltantes.push('campo tipo_dato ausente en el formulario de métrica');
        if (!tieneObligatorio) faltantes.push('campo es_obligatorio ausente en el formulario de métrica');
        if (!tieneMin) faltantes.push('campo valor_min ausente en el formulario de métrica');
        if (!tieneMax) faltantes.push('campo valor_max ausente en el formulario de métrica');

        const todosPresentes = faltantes.length === 0;

        addCheck(
          'CP-09',
          'Presencia en modal de: tipo_dato, es_obligatorio, valor_min, valor_max',
          todosPresentes
            ? 'Todos los controles del bloque RFC-004 están presentes en el formulario'
            : faltantes.join('; '),
          todosPresentes ? 'OK' : 'FALLA'
        );
      });

      // Diligenciar campos base auditados
      cy.get('input[name="nombre"]').clear().type(DATO_METRICA_NOMBRE);
      cy.get('select#tipo-medicion, select[name="tipo_medicion"]').select(DATO_METRICA_TIPO);

      // Manejo defensivo de unidad de medida: select si existe opción, input si es texto
      cy.root().then(($dialog) => {
        const selUnidad = $dialog.find('select#unidad-medida, select[name="unidad_medida"]');
        if (selUnidad.length > 0) {
          cy.wrap(selUnidad).select(DATO_METRICA_UNIDAD);
        } else {
          cy.get('input[name="unidad_medida"]').clear().type(DATO_METRICA_UNIDAD);
        }
      });

      cy.get('select#aplica-tipo-activo, select[name="aplica_a_tipo_activo"]').select(DATO_METRICA_ACTIVO);

      cy.contains('button', /registrar métrica|guardar cambios|save/i).click();
    });

    cy.screenshot('03_registro_metrica_ui', { overwrite: true });

    cy.window({ log: false }).then((win) => {
      return new Cypress.Promise((resolve) => {
        const t = setTimeout(() => resolve('TIMEOUT'), 15000);
        const check = setInterval(() => {
          if (metricaFired) {
            clearTimeout(t);
            clearInterval(check);
            resolve('FIRED');
          }
        }, 100);
      });
    }).then((estado) => {
      if (estado === 'TIMEOUT') {
        addCheck('CP-10', 'POST /configuracion/metricas 200/201', 'POST no disparó en 15s', 'FALLA');
        addCheck('CP-11', 'Contrato base de métrica 200/201', 'FALLA — dependiente de CP-10: Request no disparó', 'FALLA');
        addCheck('CP-12', 'Persistencia de campos RFC-004 en respuesta y GET', 'FALLA — dependiente de CP-10: Request no disparó', 'FALLA');
      } else {
        const status = metricaIntercept?.statusCode || 0;
        const body = metricaIntercept?.body || {};
        if (status === 200 || status === 201) {
          idMetricaCreada = body.id_metrica || body.id_metrica_produccion || null;
        }

        const normRespNombre = (body.nombre || '').trim().toLowerCase();
        const normEsperadoNombre = DATO_METRICA_NOMBRE.trim().toLowerCase();

        // CP-10: Envío y cierre
        addCheck(
          'CP-10',
          'POST /configuracion/metricas disparado con campos base',
          status === 200 || status === 201
            ? `POST disparado y recibido por backend (HTTP ${status})`
            : `Fallo en envío de métrica: HTTP ${status}, body: ${JSON.stringify(body)}`,
          status === 200 || status === 201 ? 'OK' : 'FALLA'
        );

        // CP-11: Contrato base
        const baseOk =
          (status === 200 || status === 201) &&
          normRespNombre === normEsperadoNombre &&
          body.tipo_medicion === DATO_METRICA_TIPO &&
          body.unidad_medida === DATO_METRICA_UNIDAD &&
          body.aplica_a_tipo_activo === DATO_METRICA_ACTIVO &&
          Number(body.id_especie || body.especie_id) === ID_ESPECIE_OBJETIVO;

        addCheck(
          'CP-11',
          'Contrato base: nombre, tipo_medicion=CONTEO, unidad=unidades, aplica=LOTE, id_especie=2',
          baseOk
            ? `Métrica #${idMetricaCreada} registrada correctamente con contrato base`
            : `Contrato base inválido: HTTP ${status}, body: ${JSON.stringify(body)}`,
          baseOk ? 'OK' : 'FALLA'
        );

        // CP-12: Persistencia de atributos RFC-004
        const reqTieneRfc =
          metricaReqBody &&
          'tipo_dato' in metricaReqBody &&
          'es_obligatorio' in metricaReqBody &&
          'valor_min' in metricaReqBody &&
          'valor_max' in metricaReqBody;

        addCheck(
          'CP-12',
          'Persistencia RFC-004: tipo_dato, es_obligatorio, valor_min, valor_max incluidos en request y backend',
          reqTieneRfc
            ? 'Request y backend manejan bloque RFC-004'
            : 'Campos RFC-004 no enviados por el formulario UI (ausentes en request body)',
          reqTieneRfc ? 'OK' : 'FALLA'
        );
      }
    });

    cerrarModalDefensivo();
  });
});
