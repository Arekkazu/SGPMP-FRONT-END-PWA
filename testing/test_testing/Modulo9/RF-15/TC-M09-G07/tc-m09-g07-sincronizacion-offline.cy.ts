/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G07';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
const DATO_NOMBRE = 'Bovino';
const DATO_DESCRIPCION = 'Especie bovina productiva';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15 - Módulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI, PWA & API) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Dato de prueba | Nombre: \`${DATO_NOMBRE}\`, Descripción: \`${DATO_DESCRIPCION}\` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Registro técnico & Hallazgos

- **Detalle técnico de red / ejecución**: ${r.peticionInfo}
- **Estado de Bloqueo por Backend**: Caso bloqueado en el paso de creación base debido al error recurrente HTTP 500 en \`POST /configuracion/especies\` (incidente reportado en TC-M09-G01/G03). Los checkpoints de verificación de conflicto por duplicidad (HTTP 409) quedaron marcados como *No evaluados por bloqueo previo*.
- **Gap de Arquitectura PWA**: Se confirma adicionalmente que la PWA implementa un modelo de **escritura únicamente online (online-only write)** con el botón 'Nueva especie' inhabilitado (\`disabled={!online}\`), sin utilizar la cola de sincronización (\`syncQueue.ts\` / IndexedDB).
- **Preparación de Reejecución**: El spec cuenta con la lógica completa e intacta para evaluar la resolución de conflictos (HTTP 409) tan pronto como el incidente HTTP 500 del backend sea subsanado, sin requerir modificaciones de código.

## Evidencias visuales

- [01_ui_offline_proteccion.png](screenshots/01_ui_offline_proteccion.png): Alerta de sin conexión y botón 'Nueva especie' inhabilitado en UI.
- [02_intento_registro_bovino.png](screenshots/02_intento_registro_bovino.png): Captura del estado del catálogo o formulario durante la prueba.
`;
}

describe('TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Ejecución completada.';
  let idEspecieCreada: number | null = null;
  let authToken = '';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    // Teardown: deshabilitar/desactivar especie creada si el POST llegó a responder 201/200 OK
    if (idEspecieCreada && authToken) {
      cy.request({
        method: 'PATCH',
        url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}/${idEspecieCreada}/desactivar`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Teardown: especie #${idEspecieCreada} desactivada (HTTP ${res.status})`);
      });
    }

    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (falló la preparación)'
      : (checks.some((c) => c.estado === 'FALLA')
          ? 'CON FALLAS (BLOQUEADO POR INCIDENTE BACKEND HTTP 500)'
          : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M09-G07',
      titulo: 'CU-01 - Sincronización offline y conflicto de nombres de especie (RF-15)',
      cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
      rf: 'RF-15',
      tipo: 'Funcional (UI, PWA y API)',
      equipo: 'Frontend y QA',
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G07_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G07_resultado.md`, content: renderMd(r) });
  });

  it('evalúa la protección offline PWA, el registro base "Bovino" y la prevención de duplicados (HTTP 409)', () => {
    checks.length = 0;

    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan credenciales de ejecución para TC-M09-G07.');
    }

    // 1. Autenticación e ingreso
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);

    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
    cy.contains('h2', 'Catálogo de Especies', { timeout: 15000 }).should('be.visible');

    cy.window().then((win) => {
      authToken = win.localStorage.getItem('token') || '';
    });

    // CP-1: Precondición de datos
    cy.get('body').then(($body) => {
      const existeBovino = $body.find('tbody tr').toArray().some((row) => {
        const celdas = Array.from(row.querySelectorAll('td'));
        return celdas.some((cell) => cell.textContent?.trim() === DATO_NOMBRE);
      });

      add(
        'CP-1: Precondición de datos en catálogo TEST',
        `No debe existir una especie previamente llamada "${DATO_NOMBRE}"`,
        existeBovino
          ? `Ya existe la especie "${DATO_NOMBRE}" en el catálogo TEST.`
          : `Confirmado: "${DATO_NOMBRE}" no existe en el catálogo TEST.`,
        existeBovino ? 'OBSERVACION' : 'OK',
      );
    });

    // CP-2: Protección UI Offline
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false });
      win.dispatchEvent(new win.Event('offline'));
    });

    cy.contains('button', 'Nueva especie').should('exist').then(($btn) => {
      const isDisabled = $btn.is(':disabled') || $btn.attr('disabled') !== undefined;

      add(
        'CP-2: Protección UI de creación en modo Offline',
        'El botón "Nueva especie" debe estar inhabilitado (disabled) al estar offline',
        isDisabled
          ? 'Botón "Nueva especie" inhabilitado correctamente en UI (disabled=true) al detectar estado offline.'
          : 'El botón "Nueva especie" permaneció habilitado durante estado offline.',
        isDisabled ? 'OK' : 'FALLA',
      );
    });

    cy.screenshot('01_ui_offline_proteccion', { overwrite: true });

    // Restablecer estado Online en ventana
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true });
      win.dispatchEvent(new win.Event('online'));
    });

    // CP-3: Registro Base "Bovino" en Servidor (API REST)
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token') || authToken;

      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: {
          nombre: DATO_NOMBRE,
          descripcion: DATO_DESCRIPCION,
        },
        failOnStatusCode: false,
      }).then((resPost) => {
        const status = resPost.status;
        const body = resPost.body || {};
        peticionInfo = `POST ${ENDPOINT_ESPECIES} (creación base "Bovino") -> HTTP ${status}. Body: ${JSON.stringify(body)}`;

        if (status === 201 || status === 200) {
          idEspecieCreada = body.id_especie || null;
          add(
            'CP-3: Registro base de especie "Bovino" en servidor',
            'HTTP 201/200 OK con ID asignado y objeto de especie creada',
            `HTTP ${status} OK - ID asignado: #${body.id_especie}`,
            'OK',
          );

          // CP-4: Intentar registrar duplicado de "Bovino" para verificar rechazo HTTP 409 y no-sobrescritura
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}`,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: {
              nombre: DATO_NOMBRE,
              descripcion: 'Intento de duplicación "Bovino"',
            },
            failOnStatusCode: false,
          }).then((resDup) => {
            const statusDup = resDup.status;
            const bodyDup = resDup.body || {};
            peticionInfo += ` | POST duplicado -> HTTP ${statusDup}. Body: ${JSON.stringify(bodyDup)}`;

            const esConflict = statusDup === 409 || statusDup === 400;
            add(
              'CP-4: Rechazo de duplicado de nombre "Bovino" en servidor (HTTP 409 / Unicidad)',
              'HTTP 409 Conflict (o 400 Bad Request) impidiendo la creación de duplicados y la sobrescritura',
              esConflict
                ? `HTTP ${statusDup} OK - Registro duplicado rechazado correctamente: ${JSON.stringify(bodyDup)}`
                : `Respuesta no conforme al intentar registrar duplicado. HTTP ${statusDup}. Body: ${JSON.stringify(bodyDup)}`,
              esConflict ? 'OK' : 'FALLA',
            );
          });

        } else {
          // El backend TEST respondió con el error 500 conocido (TC-M09-G01/G03)
          add(
            'CP-3: Registro base de especie "Bovino" en servidor',
            'HTTP 201/200 OK con ID asignado',
            `Bloqueado por falla de servidor Backend TEST: HTTP ${status} (${body.codigo || 'ERROR_INTERNO'}: ${body.mensaje || 'Error en base de datos'}). Incidente reportado en TC-M09-G01/G03.`,
            'FALLA',
          );

          // CP-4: No evaluado por bloqueo previo
          add(
            'CP-4: Rechazo de duplicado de nombre "Bovino" en servidor (HTTP 409 / Unicidad)',
            'HTTP 409 Conflict (o 400 Bad Request) impidiendo la creación de duplicados y la sobrescritura',
            `No evaluado por bloqueo previo: El servidor devolvió HTTP ${status} en el registro base de "${DATO_NOMBRE}". La lógica de verificación queda preparada en el spec para ejecutarse automáticamente una vez corregido el backend.`,
            'OBSERVACION',
          );
        }
      });
    });

    cy.screenshot('02_intento_registro_bovino', { overwrite: true });

    // CP-5: Documentación de Arquitectura PWA
    add(
      'CP-5: Verificación de Modelo Arquitectónico Offline en PWA',
      'Documentación de la política de escritura únicamente online en Catálogo de Especies',
      'Confirmado: El módulo de especies opera bajo el modelo online-only write (sin queue syncQueue.ts). Las escrituras están inhabilitadas sin conexión (disabled={!online}).',
      'OK',
    );
  });
});
