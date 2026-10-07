/// <reference types="cypress" />

type EstadoCheckpoint = 'OK' | 'FALLA';

interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: EstadoCheckpoint;
}

describe('TC-M09-G07-v2.0 - Sincronización offline y conflicto de nombres (RF-15 v1.1)', () => {
  const checkpoints: Checkpoint[] = [];
  const registrarCheckpoint = (
    paso: string,
    esperado: string,
    obtenido: string,
    estado: EstadoCheckpoint
  ) => {
    checkpoints.push({ paso, esperado, obtenido, estado });
  };

  let runId = '';
  let nombreConflicto = '';
  let nombreExitoso = '';
  let idServer1: number | null = null;
  let idServer2: number | null = null;
  const descripcionPrueba = 'Especie de prueba automatizada TC-M09-G07-v2.0';

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  before(() => {
    // 1. Login único inicial en UI
    cy.loginUI();

    // 2. Obtener / Generar run_id compartido (6 letras A-Z)
    cy.getRunId().then((id) => {
      runId = id;
      nombreConflicto = `Pavo Conflicto ${runId}`;
      nombreExitoso = `Pavo Real ${runId}`;
      cy.log(`Run ID asignado: ${runId}`);
      cy.log(`Especie 1: ${nombreConflicto}`);
      cy.log(`Especie 2: ${nombreExitoso}`);

      // 3. Preflight: asegurar que no existen previamente en servidor TEST
      cy.preflightEspecieNombres([nombreConflicto, nombreExitoso]);
    });

    // 4. Purgar syncQueue en IndexedDB antes de comenzar la navegación
    cy.purgarIndexedDB();
  });

  after(() => {
    // Asegurar restauración de red en el navegador
    cy.setOnline(true);

    // Teardown en backend vía PATCH .../desactivar con el token vigente
    const teardownStatus: Record<string, any> = {};

    cy.token().then((tok) => {
      const idsParaDesactivar: number[] = [];
      if (idServer1) idsParaDesactivar.push(idServer1);
      if (idServer2) idsParaDesactivar.push(idServer2);

      if (idsParaDesactivar.length > 0) {
        cy.wrap(idsParaDesactivar).each((id: number) => {
          cy.request({
            method: 'PATCH',
            url: `${Cypress.env('API_BASE_URL')}/configuracion/especies/${id}/desactivar`,
            headers: { Authorization: `Bearer ${tok}` },
            failOnStatusCode: false,
          }).then((res) => {
            teardownStatus[`id_${id}`] = res.status;
          });
        });
      }
    });

    // Purgar IndexedDB final
    cy.purgarIndexedDB();

    // Guardar evidencias/teardown_cypress.json
    cy.task('writeResult', {
      file: 'evidencias/teardown_cypress.json',
      content: JSON.stringify(teardownStatus, null, 2),
    });

    // Escribir evidencias/cypress_checkpoints.json
    cy.task('writeResult', {
      file: 'evidencias/cypress_checkpoints.json',
      content: JSON.stringify(checkpoints, null, 2),
    });
  });

  it('Ejecuta flujo continuo de sincronización offline: sub-caso 1 (conflicto 409) y sub-caso 2 (sync exitoso)', () => {
    // CP-01: Sesión autenticada en UI
    cy.token().then((tok) => {
      const tieneToken = typeof tok === 'string' && tok.length > 0;
      registrarCheckpoint(
        'CP-01',
        'Llamada POST a /sesiones/ responde HTTP 200/201 con token JWT y redirige a la aplicación',
        tieneToken ? 'Sesión establecida correctamente con token JWT en memoria' : 'Token no obtenido',
        tieneToken ? 'OK' : 'FALLA'
      );
    });

    // 1. Navegación a /configuracion y enganche de refresh
    cy.capturarRefresh();
    cy.visit('/configuracion');

    // CP-02: Navegación a /configuracion respetando sidebar sin force:true
    cy.contains('.ds-sidebar__item:not(.ds-sidebar__item--locked)', /configuración|configuration/i, { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.contains('h2', /catálogo de especies|species catalog/i, { timeout: 20000 })
      .should('be.visible')
      .then(() => {
        registrarCheckpoint(
          'CP-02',
          'Navegación fluida a /configuracion con renderizado del Catálogo de Especies sin force:true',
          'Catálogo de especies visible en /configuracion',
          'OK'
        );
      });

    // Esperar carga inicial de tabla
    cy.get('tbody', { timeout: 15000 }).should('exist');

    // =========================================================================
    // SUB-CASO 1: CONFLICTO DE NOMBRE EN MODO OFFLINE
    // =========================================================================

    // CP-03: Simulación offline y verificación del botón "Nueva especie"
    cy.setOnline(false);

    // Verificar banner sin conexión
    cy.contains(/sin conexión|offline/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/se guardarán localmente|saved locally/i, { timeout: 10000 }).should('be.visible');

    let botonNuevaEspecieHabilitado = false;
    cy.contains('button', /nueva especie|new species/i, { timeout: 10000 }).then(($btn) => {
      botonNuevaEspecieHabilitado = !$btn.is(':disabled') && $btn.prop('disabled') !== true;

      registrarCheckpoint(
        'CP-03',
        'Banner offline visible y botón "Nueva especie" habilitado para permitir creación diferida en Dexie',
        botonNuevaEspecieHabilitado
          ? 'Banner offline visible y botón Nueva especie habilitado correctamente'
          : 'botón Nueva especie deshabilitado en modo offline',
        botonNuevaEspecieHabilitado ? 'OK' : 'FALLA'
      );
    });

    cy.then(() => {
      if (!botonNuevaEspecieHabilitado) {
        // Si el botón no está habilitado, abortar sub-caso 1
        registrarCheckpoint(
          'CP-04',
          'Creación offline de especie con encolamiento en syncQueue',
          'Sub-caso 1 abortado: botón Nueva especie deshabilitado en offline',
          'FALLA'
        );
        registrarCheckpoint(
          'CP-05',
          'Creación concurrente server-side',
          'Sub-caso 1 abortado: dependiente de CP-03/CP-04',
          'FALLA'
        );
        registrarCheckpoint(
          'CP-06',
          'Detección de conflicto tras reconexión',
          'Sub-caso 1 abortado: dependiente de CP-03/CP-04',
          'FALLA'
        );
        registrarCheckpoint(
          'CP-07',
          'Preservación de registro en servidor',
          'Sub-caso 1 abortado: dependiente de CP-03/CP-04',
          'FALLA'
        );
      } else {
        // CP-04: Crear especie offline
        cy.contains('button', /nueva especie|new species/i).click();

        cy.get('input[name="nombre"]', { timeout: 10000 })
          .should('be.visible')
          .clear()
          .type(nombreConflicto);

        cy.get('#especie-desc').clear().type(descripcionPrueba);

        cy.contains('button[type="submit"]', /registrar especie|register species|guardar|save/i).click();

        // 6: Poll de syncQueue con 40 intentos x 500ms (20s de margen)
        const esperarCola = (intentos: number): any =>
          cy.window().then((win) =>
            new Cypress.Promise((resolve) => {
              const req = win.indexedDB.open('sgpmp');
              req.onsuccess = (e: any) => {
                const idb = e.target.result;
                if (!idb.objectStoreNames.contains('syncQueue')) {
                  idb.close();
                  if (intentos <= 0) resolve(false);
                  else setTimeout(() => resolve(esperarCola(intentos - 1)), 500);
                  return;
                }
                const tx = idb.transaction('syncQueue', 'readonly');
                const getAll = tx.objectStore('syncQueue').getAll();
                getAll.onsuccess = () => {
                  const arr = getAll.result || [];
                  const hay = arr.some(
                    (r: any) => r.modulo === 'config_especies' && r.payload?.dto?.nombre === nombreConflicto
                  );
                  idb.close();
                  if (hay || intentos <= 0) resolve(hay);
                  else setTimeout(() => resolve(esperarCola(intentos - 1)), 500);
                };
                getAll.onerror = () => {
                  idb.close();
                  resolve(false);
                };
              };
              req.onerror = () => resolve(false);
            })
          );

        cy.wrap(null)
          .then(() => esperarCola(40))
          .then((hayEnCola: boolean) => {
            // Comprobar fila optimista en el DOM tras submit offline
            cy.get('body').then(($b) => {
              const hayEnDom = $b.text().includes(nombreConflicto);
              const cumpleCP04 = hayEnCola && hayEnDom;

              registrarCheckpoint(
                'CP-04',
                `Especie "${nombreConflicto}" encolada en syncQueue (IndexedDB) y mostrada optimistamente en la tabla`,
                cumpleCP04
                  ? 'Especie encolada en syncQueue y fila visible en la tabla antes de sincronizar'
                  : (!hayEnCola
                      ? 'Especie no encontrada en syncQueue de IndexedDB'
                      : 'la UI no insertó fila optimista tras submit offline'),
                cumpleCP04 ? 'OK' : 'FALLA'
              );

              if (!hayEnCola) {
                registrarCheckpoint('CP-05', 'Creación concurrente server-side', 'dependiente de CP-04', 'FALLA');
                registrarCheckpoint('CP-06', 'Detección de conflicto tras reconexión', 'dependiente de CP-04', 'FALLA');
                registrarCheckpoint('CP-07', 'Preservación de registro en servidor', 'dependiente de CP-04', 'FALLA');
                return;
              }

              // CP-05: Crear especie homónima server-side con cy.request
              cy.token().then((tok) => {
                cy.request({
                  method: 'POST',
                  url: `${Cypress.env('API_BASE_URL')}/configuracion/especies`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                    'Content-Type': 'application/json',
                  },
                  body: {
                    nombre: nombreConflicto,
                    descripcion: descripcionPrueba,
                    grupo_manejo: 'AVES',
                  },
                  failOnStatusCode: false,
                }).then((resServer) => {
                  const status = resServer.status;
                  const okServer = status === 201 || status === 200;
                  if (okServer) {
                    idServer1 = resServer.body?.id_especie || resServer.body?.id || null;
                  }

                  registrarCheckpoint(
                    'CP-05',
                    `Creación concurrente server-side de "${nombreConflicto}" responde HTTP 201/200 OK con ID asignado`,
                    okServer
                      ? `HTTP ${status} OK con id_especie=${idServer1}`
                      : `Fallo server-side HTTP ${status}: ${JSON.stringify(resServer.body)}`,
                    okServer ? 'OK' : 'FALLA'
                  );
                });
              });

              // CP-06: Restablecer conexión -> sync diferido -> 3: existencia en DOM, sin click Descartar
              cy.setOnline(true);

              // Espera de sincronización diferida
              cy.wrap(null).then(() => esperar(3000));

              cy.get('body').then(($b) => {
                const $alerta = $b.find('.ds-alert--error');
                if ($alerta.length === 0) {
                  registrarCheckpoint(
                    'CP-06',
                    'Alerta de conflicto con texto bilingüe y botón Descartar',
                    'no apareció .ds-alert--error tras reconexión',
                    'FALLA'
                  );
                } else {
                  const texto = $alerta.text();
                  const ok = /fallo de sincronización|sync failed/i.test(texto) && texto.includes(nombreConflicto);
                  registrarCheckpoint(
                    'CP-06',
                    'Alerta de conflicto con texto bilingüe y botón Descartar',
                    ok
                      ? 'Alerta de conflicto renderizada reactivamente con texto bilingüe'
                      : `texto de alerta no coincide con el conflicto esperado (Texto: "${texto.slice(0, 100)}")`,
                    ok ? 'OK' : 'FALLA'
                  );
                }
              });

              // CP-07: Verificar que el registro preexistente en el servidor NO fue sobrescrito
              cy.token().then((tok) => {
                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_BASE_URL')}/configuracion/especies?solo_activas=false`,
                  headers: { Authorization: `Bearer ${tok}` },
                  failOnStatusCode: false,
                }).then((resListado) => {
                  const items = Array.isArray(resListado.body) ? resListado.body : resListado.body?.items || [];
                  const itemServer = items.find((i: any) => (i.id_especie || i.id) === idServer1);

                  const intacto =
                    itemServer &&
                    itemServer.nombre === nombreConflicto &&
                    itemServer.descripcion === descripcionPrueba &&
                    itemServer.es_activo === true;

                  registrarCheckpoint(
                    'CP-07',
                    `El registro base en el servidor (#${idServer1}) conserva nombre, descripción y estado activo sin sobrescritura`,
                    intacto
                      ? `Registro #${idServer1} intacto en backend con datos originales`
                      : `Discrepancia o registro alterado en backend para id #${idServer1}`,
                    intacto ? 'OK' : 'FALLA'
                  );
                });
              });
            });
          });
      }
    });

    // =========================================================================
    // SUB-CASO 2: SINCRONIZACIÓN EXITOSA SIN CONFLICTO (RF-15 v1.1)
    // =========================================================================

    // 1: Limpieza DOM y recarga limpia de configuración antes de sub-caso 2
    cy.visit('/configuracion');
    cy.get('a[href="/configuracion"]', { timeout: 30000 }).should('not.have.class', 'ds-sidebar__item--locked');
    cy.get('tbody', { timeout: 15000 }).should('exist');

    // Entrar nuevamente a offline para sub-caso 2
    cy.setOnline(false);
    cy.contains(/sin conexión|offline/i, { timeout: 10000 }).should('be.visible');

    // Abrir modal y crear especie exitosa
    cy.contains('button', /nueva especie|new species/i).click();

    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(nombreExitoso);

    cy.get('#especie-desc').clear().type(descripcionPrueba);

    cy.contains('button[type="submit"]', /registrar especie|register species|guardar|save/i).click();

    // CP-08: Verificar en syncQueue mediante poll y evaluar campo grupo_manejo
    const esperarColaExitoso = (intentos: number): any =>
      cy.window().then((win) =>
        new Cypress.Promise((resolve) => {
          const req = win.indexedDB.open('sgpmp');
          req.onsuccess = (e: any) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains('syncQueue')) {
              idb.close();
              if (intentos <= 0) resolve(null);
              else setTimeout(() => resolve(esperarColaExitoso(intentos - 1)), 500);
              return;
            }
            const tx = idb.transaction('syncQueue', 'readonly');
            const getAll = tx.objectStore('syncQueue').getAll();
            getAll.onsuccess = () => {
              const registros = getAll.result || [];
              const op = registros.find(
                (r: any) => r.modulo === 'config_especies' && r.payload?.dto?.nombre === nombreExitoso
              );
              idb.close();
              if (op || intentos <= 0) resolve(op || null);
              else setTimeout(() => resolve(esperarColaExitoso(intentos - 1)), 500);
            };
            getAll.onerror = () => {
              idb.close();
              resolve(null);
            };
          };
          req.onerror = () => resolve(null);
        })
      );

    cy.wrap(null)
      .then(() => esperarColaExitoso(40))
      .then((opOffline: any) => {
        const dto = opOffline?.payload?.dto;
        const tieneGrupoManejo =
          dto &&
          Object.prototype.hasOwnProperty.call(dto, 'grupo_manejo') &&
          dto.grupo_manejo !== null &&
          dto.grupo_manejo !== undefined;

        registrarCheckpoint(
          'CP-08',
          `Especie "${nombreExitoso}" encolada en syncQueue con campo grupo_manejo=AVES`,
          tieneGrupoManejo
            ? `Especie encolada con grupo_manejo=${dto.grupo_manejo}`
            : 'campo grupo_manejo ausente en el payload offline enviado por la UI',
          tieneGrupoManejo ? 'OK' : 'FALLA'
        );
      });

    // CP-09: Restablecer conexión -> sync diferido automático -> checkBackendSync
    cy.setOnline(true);

    cy.token().then((tok) => {
      const consultarBackend = (intentosRestantes: number): Cypress.Chainable<any> => {
        return cy.request({
          method: 'GET',
          url: `${Cypress.env('API_BASE_URL')}/configuracion/especies?solo_activas=false`,
          headers: { Authorization: `Bearer ${tok}` },
          failOnStatusCode: false,
        }).then((res) => {
          const items = Array.isArray(res.body) ? res.body : res.body?.items || [];
          const encontrado = items.find((x: any) => x.nombre === nombreExitoso);
          if (encontrado || intentosRestantes <= 1) {
            return cy.wrap(encontrado || null);
          }
          cy.wait(1000);
          return consultarBackend(intentosRestantes - 1);
        });
      };

      consultarBackend(15).then((especieSincronizada: any) => {
        if (!especieSincronizada) {
          registrarCheckpoint(
            'CP-09',
            `Especie "${nombreExitoso}" persistida en servidor tras sync automático con grupo_manejo=AVES`,
            'Especie no encontrada en el servidor tras la reconexión',
            'FALLA'
          );
        } else {
          idServer2 = especieSincronizada.id_especie || especieSincronizada.id || null;
          const tieneGrupoManejoServer =
            Object.prototype.hasOwnProperty.call(especieSincronizada, 'grupo_manejo') &&
            especieSincronizada.grupo_manejo !== null &&
            especieSincronizada.grupo_manejo !== undefined;

          const grupoEsAves =
            tieneGrupoManejoServer && String(especieSincronizada.grupo_manejo).toUpperCase() === 'AVES';

          registrarCheckpoint(
            'CP-09',
            `Especie "${nombreExitoso}" persistida en servidor tras sync automático con grupo_manejo=AVES`,
            grupoEsAves
              ? `Especie sincronizada exitosamente en backend (ID #${idServer2}) con grupo_manejo=AVES`
              : 'campo grupo_manejo ausente en la respuesta del servidor tras el sync',
            grupoEsAves ? 'OK' : 'FALLA'
          );
        }
      });
    });
  });
});
