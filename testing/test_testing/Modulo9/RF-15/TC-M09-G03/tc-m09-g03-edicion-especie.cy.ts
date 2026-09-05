/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G03';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

const DATO_BUSQUEDA_ORIGINAL = 'Cachama Blanca';
const DATO_DESCRIPCION_ORIGINAL = 'Pez de agua dulce tropical con alta adaptabilidad a sistemas extensivos e intensivos.';
const DATO_NOMBRE_NUEVO = 'Cachama';
const DATO_DESCRIPCION_NUEVA = 'Especie de uso pecuario general.';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G03 - Edición de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Registro editado | ID #${r.idEspecie ?? 'N/A'} — de \`${DATO_BUSQUEDA_ORIGINAL}\` a \`${DATO_NOMBRE_NUEVO}\` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Registro técnico de red

- Detalle de la petición HTTP real de edición: ${r.peticionInfo}
- Detalle de la restauración (Teardown): ${r.teardownInfo}

## Evidencias visuales

- [01_formulario_edicion_especie_ui.png](screenshots/01_formulario_edicion_especie_ui.png): Formulario de edición diligenciado con los nuevos datos.
- [02_confirmacion_edicion_ui.png](screenshots/02_confirmacion_edicion_ui.png): Registro actualizado visible en el catálogo UI.
`;
}

describe('TC-M09-G03 - Edición de Especie Productiva (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición PATCH capturada durante la edición por UI.';
  let teardownInfo = 'Rutina de teardown no ejecutada aún.';

  let idEspecieEditar: number | null = null;
  let fechaActualizacionPrevia: string | null = null;

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    // Teardown garantizado en after(): Restaura el registro a "Cachama Blanca" usando GET fresco para evitar HTTP 412
    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    const escribirResultados = () => {
      const veredicto = checks.length === 0
        ? 'NO EJECUTADO (falló la preparación)'
        : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

      const r = {
        caso: 'TC-M09-G03',
        titulo: 'CU-01 - Gestionar Catálogo de Especies Productivas (RF-15)',
        cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
        rf: 'RF-15',
        tipo: 'Funcional Híbrida (UI y API)',
        equipo: 'Frontend y QA',
        ambiente: Cypress.config('baseUrl'),
        backend: Cypress.env('API_BASE_URL'),
        navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
        fecha: new Date().toISOString(),
        idEspecie: idEspecieEditar,
        peticionInfo,
        teardownInfo,
        checkpoints: checks,
        veredicto,
        hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      };

      cy.task('writeResult', { file: `${DIR}/TC-M09-G03_resultado.json`, content: JSON.stringify(r, null, 2) });
      cy.task('writeResult', { file: `${DIR}/TC-M09-G03_resultado.md`, content: renderMd(r) });
    };

    if (!idEspecieEditar) {
      teardownInfo = 'No se capturó un ID de especie válido; no se requirió restauración en BD.';
      escribirResultados();
      return;
    }

    // 1. Autenticar vía API para obtener token fresco para el teardown
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: CUENTA_EJECUCION_EMAIL, contrasena: CUENTA_EJECUCION_PASSWORD },
      failOnStatusCode: false,
    }).then((resLogin) => {
      const token = resLogin.body?.token;

      if (!token) {
        teardownInfo = 'No se pudo obtener token de autenticación API para el teardown.';
        add(
          'CP-6: Restauración Teardown (Reversión a "Cachama Blanca")',
          'Obtener GET fresco y restaurar registro a "Cachama Blanca" vía PATCH',
          'Fallo de autenticación API en teardown.',
          'FALLA'
        );
        escribirResultados();
        return;
      }

      // 2. GET fresco para obtener fecha_actualizacion vigente antes de la reversión (evita HTTP 412)
      cy.request({
        method: 'GET',
        url: `${backendUrl}${ENDPOINT_ESPECIES}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((resList) => {
        const lista = Array.isArray(resList.body) ? resList.body : (resList.body?.items ?? []);
        const especieActual = lista.find((e: any) => e.id_especie === idEspecieEditar);

        const fechaFresca = especieActual?.fecha_actualizacion ?? new Date().toISOString();

        // 3. Enviar PATCH de reversión a "Cachama Blanca" y descripción original
        cy.request({
          method: 'PATCH',
          url: `${backendUrl}${ENDPOINT_ESPECIES}/${idEspecieEditar}`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            nombre: DATO_BUSQUEDA_ORIGINAL,
            descripcion: DATO_DESCRIPCION_ORIGINAL,
            fecha_actualizacion: fechaFresca,
          },
          failOnStatusCode: false,
        }).then((resPatch) => {
          const st = resPatch.status;
          teardownInfo = `PATCH /configuracion/especies/${idEspecieEditar} -> HTTP ${st}. Body: ${JSON.stringify(resPatch.body)}`;

          if (st === 200 || st === 201) {
            add(
              'CP-6: Restauración Teardown (Reversión a "Cachama Blanca")',
              'Registro de especie restaurado exitosamente a "Cachama Blanca" con su descripción original',
              `Restauración exitosa (HTTP ${st}). Registro #${idEspecieEditar} restaurado a "${DATO_BUSQUEDA_ORIGINAL}".`,
              'OK'
            );
          } else {
            add(
              'CP-6: Restauración Teardown (Reversión a "Cachama Blanca")',
              'Registro de especie restaurado exitosamente a "Cachama Blanca" con su descripción original',
              `Fallo en restauración. HTTP ${st}. Body: ${JSON.stringify(resPatch.body)}`,
              'FALLA'
            );
          }
          escribirResultados();
        });
      });
    });
  });

  it('edita una especie activa existente con datos válidos y verifica la actualización de fecha_actualizacion en UI y API', () => {
    checks.length = 0;

    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // 0. Verificación previa por API REST de que "Cachama Blanca" está ACTIVA antes de iniciar UI
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: CUENTA_EJECUCION_EMAIL, contrasena: CUENTA_EJECUCION_PASSWORD },
    }).then((resLogin) => {
      const token = resLogin.body.token;

      cy.request({
        method: 'GET',
        url: `${backendUrl}${ENDPOINT_ESPECIES}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((resList) => {
        const lista = Array.isArray(resList.body) ? resList.body : (resList.body?.items ?? []);
        const especiePrevia = lista.find((e: any) => e.nombre === DATO_BUSQUEDA_ORIGINAL || e.nombre === DATO_NOMBRE_NUEVO);

        if (!especiePrevia) {
          add(
            'CP-2: Localización de registro "Cachama Blanca"',
            `Confirmar presencia de "${DATO_BUSQUEDA_ORIGINAL}" activa en la API`,
            `Especie "${DATO_BUSQUEDA_ORIGINAL}" no encontrada en la API TEST.`,
            'FALLA'
          );
          throw new Error(`Especie de prueba "${DATO_BUSQUEDA_ORIGINAL}" no existe en el backend.`);
        }

        if (!especiePrevia.es_activo) {
          add(
            'CP-2: Localización de registro "Cachama Blanca"',
            `Confirmar es_activo: true para "${DATO_BUSQUEDA_ORIGINAL}"`,
            `Prueba abortada: la especie "${DATO_BUSQUEDA_ORIGINAL}" (ID #${especiePrevia.id_especie}) se encuentra inactiva (es_activo: false).`,
            'FALLA'
          );
          throw new Error(`Especie de prueba "${DATO_BUSQUEDA_ORIGINAL}" está inactiva.`);
        }

        idEspecieEditar = especiePrevia.id_especie;
        fechaActualizacionPrevia = especiePrevia.fecha_actualizacion;

        cy.intercept('GET', `**${ENDPOINT_ESPECIES}*`).as('listarEspecies');
        cy.intercept('PATCH', `**${ENDPOINT_ESPECIES}/*`).as('editarEspecie');

        // 1. CP-1: Autenticación Admin y navegación SPA
        cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
        cy.location('pathname', { timeout: 15000 }).should('not.eq', '/login');
        cy.wait(1500);

        cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
          .should('be.visible')
          .click({ force: true });

        cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
        cy.wait('@listarEspecies', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
        cy.contains('h2', 'Catálogo de Especies').should('be.visible');

        add(
          'CP-1: Autenticación y Navegación SPA',
          'Inicio de sesión exitoso como Admin y navegación a /configuracion',
          'Sesión autenticada como admin@pecuaria.co y catálogo cargado por GET /configuracion/especies.',
          'OK'
        );

        // 2. CP-2: Localización asíncrona de la especie activa en la tabla
        cy.get('table tbody tr', { timeout: 15000 }).should('have.length.gte', 1);

        cy.contains('tbody tr', DATO_BUSQUEDA_ORIGINAL, { timeout: 15000 })
          .should('be.visible')
          .then(($row) => {
            add(
              'CP-2: Localización de registro "Cachama Blanca"',
              `Ubicar en la tabla la especie activa "${DATO_BUSQUEDA_ORIGINAL}" y capturar su ID`,
              `Registro activo localizado exitosamente en UI. Especie ID #${idEspecieEditar} ("${DATO_BUSQUEDA_ORIGINAL}").`,
              'OK'
            );
          });

        // 3. Abrir modal de edición
        cy.contains('tbody tr', `#${idEspecieEditar}`)
          .find('button[aria-label*="Editar"]')
          .click({ force: true });

        cy.get('[role="dialog"]').should('be.visible');
        cy.contains('h2', 'Editar especie').should('be.visible');

        // 4. CP-3: Diligenciamiento de edición en UI
        cy.get('input[name="nombre"]').clear().type(DATO_NOMBRE_NUEVO);
        cy.get('textarea#especie-desc').clear().type(DATO_DESCRIPCION_NUEVA);

        add(
          'CP-3: Diligenciamiento de Edición UI',
          `Ingresar nombre "${DATO_NOMBRE_NUEVO}" y descripción "${DATO_DESCRIPCION_NUEVA}"`,
          'Campos de nombre y descripción actualizados con datos de prueba válidos.',
          'OK'
        );

        cy.screenshot('01_formulario_edicion_especie_ui', { overwrite: true });

        // Guardar cambios
        cy.contains('button', 'Guardar cambios').click();

        // 5. CP-4 & CP-5: Interceptación PATCH y validación de contrato y avance de fecha
        cy.wait('@editarEspecie', { timeout: 15000 }).then((interception) => {
          const status = interception.response?.statusCode || 0;
          const body = interception.response?.body || {};
          peticionInfo = `PATCH ${ENDPOINT_ESPECIES}/${idEspecieEditar} -> HTTP ${status}. Body: ${JSON.stringify(body)}`;

          const esExitosa = (status === 200 || status === 201) && body.nombre === DATO_NOMBRE_NUEVO;

          add(
            'CP-4: Contrato API PATCH de Edición',
            'Respuesta HTTP 200/201 con objeto actualizado (nombre="Cachama")',
            esExitosa
              ? `HTTP ${status} OK - ID: ${body.id_especie}, Nombre: "${body.nombre}", Descripcion: "${body.descripcion}"`
              : `Respuesta no conforme. HTTP ${status}. Body: ${JSON.stringify(body)}`,
            esExitosa ? 'OK' : 'FALLA'
          );

          expect(esExitosa, 'contrato API PATCH de edición').to.eq(true);

          const fechaNueva = body.fecha_actualizacion;
          const fechaAvanzo = typeof fechaNueva === 'string' && fechaNueva !== fechaActualizacionPrevia;

          add(
            'CP-5: Verificación de fecha_actualizacion',
            'La propiedad fecha_actualizacion debe actualizarse a un timestamp posterior/distinto',
            fechaAvanzo
              ? `Fecha de actualización modificada correctamente: de "${fechaActualizacionPrevia ?? 'N/A'}" a "${fechaNueva}".`
              : `La fecha de actualización no cambió o es nula. Previa: "${fechaActualizacionPrevia}", Nueva: "${fechaNueva}".`,
            fechaAvanzo ? 'OK' : 'FALLA'
          );

          expect(fechaAvanzo, 'avance del timestamp fecha_actualizacion').to.eq(true);

          // Verificar actualización visual en la tabla
          cy.contains('tbody tr', `#${idEspecieEditar}`)
            .should('contain.text', DATO_NOMBRE_NUEVO)
            .and('contain.text', DATO_DESCRIPCION_NUEVA);

          cy.screenshot('02_confirmacion_edicion_ui', { overwrite: true });
        });
      });
    });
  });
});
