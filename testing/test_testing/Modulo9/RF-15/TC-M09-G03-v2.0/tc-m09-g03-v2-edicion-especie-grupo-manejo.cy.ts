/// <reference types="cypress" />
import type { EspecieItem } from './commands';

interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: 'OK' | 'FALLA';
}

describe('TC-M09-G03-v2.0 · CU-01 – Edición de especie con grupo_manejo y verificación de conjunto admisible (RF-15 v1.1)', () => {
  const checkpoints: Checkpoint[] = [];
  const addCheck = (paso: string, esperado: string, obtenido: string, estado: 'OK' | 'FALLA') => {
    checkpoints.push({ paso, esperado, obtenido, estado });
  };

  let targetEspecie: EspecieItem | null = null;
  let targetId = 0;
  let nombreOriginal = '';
  let descripcionOriginal = '';
  let grupoManejoOriginal = '';
  let fechaActualizacionPrevia = '';
  let campoFechaDetectado = 'fecha_actualizacion';
  let wrapperDetectado = 'objeto directo';
  let nombreNuevo = '';
  let descripcionNueva = '';
  let patchCount = 0;

  const adminEmail = Cypress.env('ADMIN_EMAIL');
  const adminPassword = Cypress.env('TEST_ADMIN_PASSWORD') || Cypress.env('ADMIN_PASSWORD');
  const apiUrl = Cypress.env('API_BASE_URL');

  before(() => {
    // 1.2 Interceptors de login y refresh
    cy.intercept('POST', '**/sesiones/').as('postLogin');
    cy.intercept('POST', '**/sesiones/refresh', (req) => {
      req.continue((res) => {
        const t = res.body?.token || res.body?.access_token || (res.body?.data && res.body.data.token);
        if (t) {
          Cypress.env('CAPTURED_TOKEN', t);
        }
      });
    }).as('postRefresh');

    // Interceptor con contador para el PATCH de edición
    cy.intercept('PATCH', '**/configuracion/especies/*', (req) => {
      patchCount++;
      req.continue();
    }).as('patchEspecie');

    // 1. CP-01: Login UI
    cy.loginUI(adminEmail, adminPassword).then((token) => {
      Cypress.env('CAPTURED_TOKEN', token);
      cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');
      addCheck(
        'CP-01',
        'Inicio de sesión exitoso como Administrador y redirección a /dashboard',
        'Autenticación correcta y llegada a /dashboard',
        'OK'
      );

      // 2. Preflight de solo lectura
      return cy.preflightEspecie(token).then((candidata) => {
        targetEspecie = candidata;
        targetId = candidata.id_especie || candidata.id || 0;
        nombreOriginal = candidata.nombre;
        descripcionOriginal = candidata.descripcion || '';
        grupoManejoOriginal = (candidata.grupo_manejo || '').trim();

        if (candidata.fecha_actualizacion_especie !== undefined && candidata.fecha_actualizacion_especie !== null) {
          campoFechaDetectado = 'fecha_actualizacion_especie';
          fechaActualizacionPrevia = candidata.fecha_actualizacion_especie;
        } else {
          campoFechaDetectado = 'fecha_actualizacion';
          fechaActualizacionPrevia = candidata.fecha_actualizacion || '';
        }

        nombreNuevo = `${nombreOriginal} Editado`;
        descripcionNueva = `Descripción actualizada para ${nombreOriginal} (QA v2.0)`;

        cy.task('writeResult', {
          file: 'evidencias/target_especie_preflight.json',
          content: JSON.stringify(
            {
              id_especie: targetId,
              nombreOriginal,
              descripcionOriginal,
              grupoManejoOriginal,
              campoFechaDetectado,
              fechaActualizacionPrevia,
              nombreNuevo,
            },
            null,
            2
          ),
        });
      });
    });
  });

  after(() => {
    // 1.5 Teardown SIEMPRE: revierte con el token vigente leído en cy.then(), failOnStatusCode: false
    cy.then(() => {
      const tok = Cypress.env('CAPTURED_TOKEN') as string;
      if (targetId && tok) {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/configuracion/especies?solo_activas=false`,
          headers: { Authorization: `Bearer ${tok}` },
          failOnStatusCode: false,
        }).then((resList) => {
          const raw = resList.body;
          const lista: EspecieItem[] = Array.isArray(raw)
            ? raw
            : (raw.items || raw.data || raw.especies || []);
          const item = lista.find((x) => (x.id_especie || x.id) === targetId);
          const fechaFresca = item
            ? (item.fecha_actualizacion || item.fecha_actualizacion_especie || '')
            : '';

          cy.request({
            method: 'PATCH',
            url: `${apiUrl}/configuracion/especies/${targetId}`,
            headers: { Authorization: `Bearer ${tok}` },
            body: {
              nombre: nombreOriginal,
              descripcion: descripcionOriginal,
              fecha_actualizacion: fechaFresca || undefined,
            },
            failOnStatusCode: false,
          }).then((resPatch) => {
            cy.task('writeResult', {
              file: 'evidencias/teardown_cypress.json',
              content: JSON.stringify(
                {
                  id_especie: targetId,
                  nombre_restaurado: nombreOriginal,
                  descripcion_restaurada: descripcionOriginal,
                  statusCode: resPatch.status,
                  body: resPatch.body,
                  fecha: new Date().toISOString(),
                },
                null,
                2
              ),
            });
          });
        });
      }
    });

    // Guardar checkpoints de Cypress
    cy.then(() => {
      cy.task('writeResult', {
        file: 'evidencias/cypress_checkpoints.json',
        content: JSON.stringify(checkpoints, null, 2),
      });
    });
  });

  // 1.1 UN SOLO it() continuo
  it('G03-v2.0: Edición válida de especie y verificación de ausencia de grupo_manejo en UI', () => {
    cy.then(() => {
      expect(targetId, 'ID de especie objetivo válido').to.be.above(0);

      // 1.4 a) Visitar /configuracion y verificar sidebar desbloqueado
      cy.visit('/configuracion');
      cy.get('a[href="/configuracion"]', { timeout: 30000 })
        .should('not.have.class', 'ds-sidebar__item--locked');
      cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');

      addCheck(
        'CP-02',
        'Navegación a /configuracion respetando el estado de permisos del menú lateral (sin clase ds-sidebar__item--locked)',
        'Llegada a /configuracion tras desbloqueo de permisos',
        'OK'
      );

      // 1.4 b) Bloque sub-caso 1:
      // Esperar tabla
      cy.get('table tbody tr', { timeout: 15000 }).should('have.length.gte', 1);

      // Filtrar por buscador
      cy.get('input[placeholder*="Buscar"], input[placeholder*="Search"]', { timeout: 15000 })
        .should('be.visible')
        .clear()
        .type(nombreOriginal, { delay: 20 });
      cy.get('tbody tr', { timeout: 15000 }).should('have.length.gte', 1);

      // Localizar fila
      cy.contains('tbody tr', nombreOriginal, { timeout: 15000 })
        .should('be.visible')
        .and('contain.text', `#${targetId}`)
        .find('button[aria-label*="Editar"], button[aria-label*="Edit"]')
        .first()
        .should('be.visible')
        .click();

      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('h2', 'Editar especie').should('be.visible');

      cy.get('input[name="nombre"]').should('have.value', nombreOriginal);
      cy.get('textarea#especie-desc').should('have.value', descripcionOriginal);

      addCheck(
        'CP-03',
        'Apertura del modal de edición con nombre y descripción precargados',
        `Modal abierto para especie ID #${targetId} con nombre "${nombreOriginal}" precargado`,
        'OK'
      );

      // CP-04: Diligenciamiento y clic en Guardar cambios
      cy.get('input[name="nombre"]').clear().type(nombreNuevo);
      cy.get('textarea#especie-desc').clear().type(descripcionNueva);

      cy.screenshot('01_formulario_edicion_valida', { overwrite: true });

      patchCount = 0;
      cy.contains('button', /guardar cambios/i).click();

      // Verificación con patchCount
      cy.wait(1000);
      cy.then(() => {
        if (patchCount === 0) {
          cy.get('body').then(($body) => {
            const errorMsg = $body.find('[role="alert"], .error, [aria-invalid="true"]').text().trim() || 'validación de formulario bloqueó el envío';
            addCheck(
              'CP-04',
              'Envío de formulario con datos válidos produce PATCH HTTP 200',
              `formulario no disparó PATCH: ${errorMsg}`,
              'FALLA'
            );
            addCheck(
              'CP-05',
              'El campo fecha_actualizacion (o fecha_actualizacion_especie) se actualiza automáticamente con un nuevo timestamp',
              'dependiente de CP-04: PATCH no se ejecutó',
              'FALLA'
            );
          });
        } else {
          cy.wait('@patchEspecie', { timeout: 10000 }).then((interception) => {
            const status = interception.response?.statusCode || 0;
            const resBody = interception.response?.body || {};

            let unwrapped = resBody;
            if (resBody.data && typeof resBody.data === 'object' && !Array.isArray(resBody.data)) {
              unwrapped = resBody.data;
              wrapperDetectado = 'data';
            } else if (resBody.item && typeof resBody.item === 'object') {
              unwrapped = resBody.item;
              wrapperDetectado = 'item';
            } else if (resBody.especie && typeof resBody.especie === 'object') {
              unwrapped = resBody.especie;
              wrapperDetectado = 'especie';
            } else {
              wrapperDetectado = 'objeto directo';
            }

            const es200 = status === 200;
            addCheck(
              'CP-04',
              'Envío de formulario con datos válidos produce PATCH HTTP 200',
              `PATCH respondió HTTP ${status} (wrapper detectado: "${wrapperDetectado}")`,
              es200 ? 'OK' : 'FALLA'
            );

            // Ajuste A: CP-05
            let fechaNueva = '';
            let campoUsado = '';
            if (unwrapped.fecha_actualizacion_especie !== undefined && unwrapped.fecha_actualizacion_especie !== null) {
              fechaNueva = String(unwrapped.fecha_actualizacion_especie).trim();
              campoUsado = 'fecha_actualizacion_especie';
            } else if (unwrapped.fecha_actualizacion !== undefined && unwrapped.fecha_actualizacion !== null) {
              fechaNueva = String(unwrapped.fecha_actualizacion).trim();
              campoUsado = 'fecha_actualizacion';
            } else {
              campoUsado = campoFechaDetectado;
            }

            if (!fechaNueva || fechaNueva.length === 0) {
              addCheck(
                'CP-05',
                'El campo fecha_actualizacion (o fecha_actualizacion_especie) se actualiza automáticamente con un nuevo timestamp',
                `campo ${campoUsado} ausente en respuesta del PATCH`,
                'FALLA'
              );
            } else {
              const fechaCambio = typeof fechaNueva === 'string' && fechaNueva.trim().length > 0 && fechaNueva !== fechaActualizacionPrevia;
              addCheck(
                'CP-05',
                'El campo fecha_actualizacion (o fecha_actualizacion_especie) se actualiza automáticamente con un nuevo timestamp',
                fechaCambio
                  ? `Timestamp actualizado correctamente (${campoUsado}): de "${fechaActualizacionPrevia}" a "${fechaNueva}"`
                  : `Timestamp no cambió (${campoUsado}): previo="${fechaActualizacionPrevia}", nuevo="${fechaNueva}"`,
                fechaCambio ? 'OK' : 'FALLA'
              );
            }
          });
        }
      });

      // 1.4 c) Bloque sub-caso 2:
      // Volver a filtrar por el buscador
      cy.get('input[placeholder*="Buscar"], input[placeholder*="Search"]', { timeout: 15000 })
        .should('be.visible')
        .clear()
        .type(nombreNuevo, { delay: 20 });
      cy.get('tbody tr', { timeout: 15000 }).should('have.length.gte', 1);

      // Abrir modal de nuevo
      cy.contains('tbody tr', nombreNuevo, { timeout: 15000 })
        .should('be.visible')
        .and('contain.text', `#${targetId}`)
        .find('button[aria-label*="Editar"], button[aria-label*="Edit"]')
        .first()
        .should('be.visible')
        .click();

      cy.get('[role="dialog"]').should('be.visible');

      // Inspeccionar control grupo_manejo en UI
      cy.get('body').then(($body) => {
        const hasGrupo = $body.find('select[name="grupo_manejo"], input[name="grupo_manejo"]').length > 0;
        if (!hasGrupo) {
          addCheck(
            'CP-07',
            '400 (propuesto, no normativo)',
            'control grupo_manejo ausente en formulario de edición',
            'FALLA'
          );
        } else {
          const $select = $body.find('select[name="grupo_manejo"]');
          if ($select.length > 0) {
            const hasReptiles = $select.find('option[value="REPTILES"]').length > 0;
            if (!hasReptiles) {
              addCheck(
                'CP-07',
                '400 (propuesto, no normativo)',
                'select grupo_manejo no ofrece la opción REPTILES',
                'FALLA'
              );
            } else {
              cy.get('select[name="grupo_manejo"]').select('REPTILES');
              cy.contains('button', /guardar cambios/i).click();
              cy.wait('@patchEspecie', { timeout: 10000 }).then((interception) => {
                const st = interception.response?.statusCode;
                addCheck(
                  'CP-07',
                  '400 (propuesto, no normativo)',
                  `HTTP ${st}`,
                  st === 400 ? 'OK' : 'FALLA'
                );
              });
            }
          } else {
            cy.get('input[name="grupo_manejo"]').clear().type('REPTILES');
            cy.contains('button', /guardar cambios/i).click();
            cy.wait('@patchEspecie', { timeout: 10000 }).then((interception) => {
              const st = interception.response?.statusCode;
              addCheck(
                'CP-07',
                '400 (propuesto, no normativo)',
                `HTTP ${st}`,
                st === 400 ? 'OK' : 'FALLA'
              );
            });
          }
        }
      });

      // Cerrar modal sin forzar
      cy.contains('button', /cancelar|cancel/i).click();
      cy.get('[role="dialog"]').should('not.exist');

      // 1.4 d) CP-06: Conservación de grupo_manejo vía API con token vigente dentro de cy.then()
      cy.then(() => {
        const tok = Cypress.env('CAPTURED_TOKEN') as string;
        return cy.request({
          method: 'GET',
          url: `${apiUrl}/configuracion/especies?solo_activas=false`,
          headers: { Authorization: `Bearer ${tok}` },
          failOnStatusCode: false,
        });
      }).then((resList) => {
        if (resList.status !== 200) {
          addCheck(
            'CP-06',
            'El campo grupo_manejo permanece sin cambios tras la edición de nombre y descripción verificado vía API',
            `GET verificación respondió HTTP ${resList.status}: ${JSON.stringify(resList.body).substring(0, 80)}`,
            'FALLA'
          );
        } else {
          const raw = resList.body;
          const lista: EspecieItem[] = Array.isArray(raw)
            ? raw
            : (raw.items || raw.data || raw.especies || []);
          const itemActual = lista.find((x) => (x.id_especie || x.id) === targetId);

          const campoPresente = itemActual && Object.prototype.hasOwnProperty.call(itemActual, 'grupo_manejo') && itemActual.grupo_manejo !== null && itemActual.grupo_manejo !== undefined;

          if (!campoPresente) {
            addCheck(
              'CP-06',
              'El campo grupo_manejo permanece sin cambios tras la edición de nombre y descripción verificado vía API',
              'campo grupo_manejo ausente en respuesta del catálogo',
              'FALLA'
            );
          } else if (!grupoManejoOriginal || grupoManejoOriginal.length === 0) {
            addCheck(
              'CP-06',
              'El campo grupo_manejo permanece sin cambios tras la edición de nombre y descripción verificado vía API',
              'grupo_manejo no vino en el preflight',
              'FALLA'
            );
          } else {
            const grupoActual = String(itemActual.grupo_manejo).trim();
            const grupoConserva = grupoActual === grupoManejoOriginal;
            addCheck(
              'CP-06',
              'El campo grupo_manejo permanece sin cambios tras la edición de nombre y descripción verificado vía API',
              `grupo_manejo en catálogo API: original="${grupoManejoOriginal}", actual="${grupoActual}"`,
              grupoConserva ? 'OK' : 'FALLA'
            );
          }
        }
      });
    });
  });
});
