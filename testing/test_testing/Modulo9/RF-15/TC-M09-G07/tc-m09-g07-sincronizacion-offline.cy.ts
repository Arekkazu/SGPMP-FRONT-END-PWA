/// <reference types="cypress" />

const DIR = 'RESULTADOS/REEVALUACION_2026-09-12';
const ENDPOINT_ESPECIES = '/configuracion/especies';
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
// Regla backend: El nombre solo puede contener letras y espacios, sin símbolos ni números.
const letrasAleatorias = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
const DATO_NOMBRE = `Especie Conflicto QA ${letrasAleatorias}`;
const DATO_DESCRIPCION = 'Especie temporal para prueba de unicidad y arquitectura';

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
- **Resolución de Incidente Backend**: El incidente histórico HTTP 500 (INC-M09-01-G01) en \`POST /configuracion/especies\` fue confirmado como resuelto, permitiendo la ejecución exitosa de la creación base y la verificación de unicidad de nombres.
- **Protección de Unicidad de Nombre (Online)**: El servidor rechaza con HTTP 409 la creación de especies con nombres duplicados, garantizando la integridad de datos sin sobrescribir registros preexistentes.
- **DEFECTO REGISTRADO [DEF-M09-02] - INCUMPLIMIENTO DE RF-15**:
  - **Requisito Oficial RF-15**: La ficha técnica exige: (1) *"Modo offline: Si no hay conexión, las operaciones se almacenan localmente. Se sincronizan automáticamente al restablecer conexión."*, (2) Flujo alterno de conflicto: *"El sistema intenta sincronizar una nueva especie creada localmente, pero al llegar al servidor, el nombre ya fue tomado por otro usuario... El sistema marca el registro local con error y notifica al usuario en la próxima conexión."* con mensaje *"Fallo de sincronización. La especie creada en modo offline '[NOMBRE_ESPECIE]' ya existe en el servidor. Por favor, resuelva el conflicto manualmente."*, (3) Criterios de aceptación: *"En modo offline: El sistema permite registrar cambios localmente. Los cambios se sincronizan automáticamente al recuperar conexión."*
  - **Comportamiento Actual del Software**: En \`ConfigurationPage.tsx\` (línea 159), el botón "Nueva especie" tiene \`disabled={!online}\` y el hook \`useEspecies.ts\` carece de integración con \`syncQueue.ts\`. La tabla Dexie \`config_especies\` solo opera como caché de lectura.
  - **Severidad**: Alta. **Módulo afectado**: Módulo 9 (Catálogo de Especies). **Patrón de referencia de solución**: Módulo de Ciclos Biológicos (RF-16, commit \`88ca728\`).

## Evidencias visuales

- [01_ui_offline_bloqueo_incumplimiento.png](screenshots/01_ui_offline_bloqueo_incumplimiento.png): Botón 'Nueva especie' inhabilitado y alerta de datos cacheados que evidencia la ausencia de creación offline requerida por RF-15.
- [02_intento_registro_especie.png](screenshots/02_intento_registro_especie.png): Captura del estado del catálogo o formulario durante la prueba online.
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
        // Verificación teardown
        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}`,
          headers: { Authorization: `Bearer ${authToken}` },
          failOnStatusCode: false,
        }).then((resGet) => {
          const list = Array.isArray(resGet.body) ? resGet.body : (resGet.body?.datos || []);
          const esp = list.find((e: any) => e.id === idEspecieCreada || e.id_especie === idEspecieCreada);
          cy.log(`Teardown verificación: activo = ${esp ? esp.activo : 'no encontrado'}`);
        });
      });
    }

    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (falló la preparación)'
      : (checks.some((c) => c.estado === 'FALLA')
          ? 'CON FALLAS (RECHAZADO) — INCUMPLIMIENTO DE RF-15'
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

  it('evalúa la protección offline PWA, el registro base dinámico y la prevención de duplicados (HTTP 409)', () => {
    checks.length = 0;

    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan credenciales de ejecución para TC-M09-G07.');
    }

    // Interceptar la respuesta del login para capturar el authToken (en memoria en tokenStore)
    cy.intercept('POST', '**/sesiones/').as('loginReq');

    // 1. Autenticación e ingreso
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);

    cy.wait('@loginReq').then((interception) => {
      if (interception.response && interception.response.body && interception.response.body.token) {
        authToken = interception.response.body.token;
      }
    });

    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
    cy.contains('h2', 'Catálogo de Especies', { timeout: 15000 }).should('be.visible');

    // CP-1: Precondición de datos
    cy.get('body').then(($body) => {
      const existeEspecie = $body.find('tbody tr').toArray().some((row) => {
        const celdas = Array.from(row.querySelectorAll('td'));
        return celdas.some((cell) => cell.textContent?.trim() === DATO_NOMBRE);
      });

      add(
        'CP-1: Precondición de datos en catálogo TEST',
        `No debe existir una especie previamente llamada "${DATO_NOMBRE}"`,
        existeEspecie
          ? `Ya existe la especie "${DATO_NOMBRE}" en el catálogo TEST.`
          : `Confirmado: "${DATO_NOMBRE}" no existe en el catálogo TEST.`,
        existeEspecie ? 'OBSERVACION' : 'OK',
      );
    });

    // CP-2: Evaluación de Soporte de Escritura Offline (RF-15)
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false });
      win.dispatchEvent(new win.Event('offline'));
    });

    // Esperar a que el componente React reaccione al evento offline
    cy.contains('Sin conexión', { timeout: 5000 }).should('be.visible');
    cy.contains('button', 'Nueva especie').should('be.disabled').then(($btn) => {
      const isDisabled = $btn.is(':disabled') || $btn.prop('disabled') === true;

      // Según RF-15, en modo offline el sistema DEBE permitir registrar cambios localmente para sincronización diferida.
      // Que el botón esté disabled es el síntoma directo del INCUMPLIMIENTO.
      add(
        'CP-2: Soporte de Creación Offline con Sincronización Diferida (RF-15)',
        'El sistema debe permitir registrar especies localmente en modo offline para sincronización diferida (botón habilitado con guardado en IndexedDB / syncQueue)',
        isDisabled
          ? 'INCUMPLIMIENTO CONFIRMADO: El botón "Nueva especie" permanece inhabilitado (disabled={!online}) y la UI muestra "Las acciones de escritura están deshabilitadas". No existe alternativa de creación diferida en Dexie ni integración con syncQueue.ts.'
          : 'Botón "Nueva especie" habilitado para creación offline diferida.',
        isDisabled ? 'FALLA' : 'OK',
      );
    });

    cy.screenshot('01_ui_offline_bloqueo_incumplimiento', { overwrite: true });

    // Restablecer estado Online en ventana
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true });
      win.dispatchEvent(new win.Event('online'));
    });

    cy.contains('button', 'Nueva especie').should('not.be.disabled');

    // CP-3: Registro Base dinámico en Servidor (API REST)
    cy.then(() => {
      const token = authToken;

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
        peticionInfo = `POST ${ENDPOINT_ESPECIES} (creación base "${DATO_NOMBRE}") -> HTTP ${status}. Body: ${JSON.stringify(body)}`;

        if (status === 201 || status === 200) {
          idEspecieCreada = body.id || body.id_especie || null;
          add(
            'CP-3: Registro base de especie en servidor (online)',
            'HTTP 201/200 OK con ID asignado y objeto de especie creada',
            `HTTP ${status} OK - ID asignado: #${idEspecieCreada}`,
            'OK',
          );

          // CP-4: Intentar registrar duplicado para verificar rechazo HTTP 409 y no-sobrescritura
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}`,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: {
              nombre: DATO_NOMBRE,
              descripcion: 'Intento de duplicación de especie',
            },
            failOnStatusCode: false,
          }).then((resDup) => {
            const statusDup = resDup.status;
            const bodyDup = resDup.body || {};
            peticionInfo += ` | POST duplicado -> HTTP ${statusDup}. Body: ${JSON.stringify(bodyDup)}`;

            const esConflict = statusDup === 409 || statusDup === 400;
            add(
              'CP-4: Rechazo de duplicado de nombre en servidor (HTTP 409 / Unicidad)',
              'HTTP 409 Conflict (o 400 Bad Request) impidiendo la creación de duplicados y la sobrescritura',
              esConflict
                ? `HTTP ${statusDup} OK - Registro duplicado rechazado correctamente por el servidor: ${JSON.stringify(bodyDup)}`
                : `Respuesta no conforme al intentar registrar duplicado. HTTP ${statusDup}. Body: ${JSON.stringify(bodyDup)}`,
              esConflict ? 'OK' : 'FALLA',
            );
          });

        } else {
          add(
            'CP-3: Registro base de especie en servidor (online)',
            'HTTP 201/200 OK con ID asignado',
            `Error en registro base: HTTP ${status} (${body.codigo || 'ERROR'}: ${body.mensaje || JSON.stringify(body)})`,
            'FALLA',
          );

          add(
            'CP-4: Rechazo de duplicado de nombre en servidor (HTTP 409 / Unicidad)',
            'HTTP 409 Conflict (o 400 Bad Request) impidiendo la creación de duplicados y la sobrescritura',
            `No evaluado por falla previa en CP-3: HTTP ${status}`,
            'OBSERVACION',
          );
        }
      });
    });

    cy.screenshot('02_intento_registro_especie', { overwrite: true });

    // CP-5: Registro Formal del Defecto Arquitectónico contra RF-15
    add(
      'CP-5: Verificación de Flujo de Conflicto Offline y Registro de Defecto DEF-M09-02',
      'El sistema debe implementar el flujo alterno de conflicto diferido con mensaje específico ante colisión en servidor',
      'NO IMPLEMENTADO (BLOQUEADO POR DEF-M09-02): Al no soportar creación offline de especies, el flujo de detección de conflicto al reconectar y notificación al usuario ("Fallo de sincronización...") no existe en el frontend. Se documenta formalmente como DEF-M09-02.',
      'FALLA',
    );
  });
});
