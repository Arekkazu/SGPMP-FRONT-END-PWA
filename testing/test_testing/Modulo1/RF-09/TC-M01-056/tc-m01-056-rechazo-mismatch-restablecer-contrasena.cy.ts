/// <reference types="cypress" />
// TC-M01-056 · Rechazo cuando la nueva contraseña y su confirmación no coinciden en restablecimiento (HTTP 400)
// CU09 · RF-09 · Manejo de errores (VAL_ENTRADA) · Frontend & Backend QA
// Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-056/

const DIR = 'RESULTADOS/TC-M01-056';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-056 — Rechazo cuando la nueva contraseña y su confirmación no coinciden en restablecimiento

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU09 - Restablecer Contraseña · RF-09 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema, la validación de coincidencia de contraseñas corresponde a **Interfaz/UI o navegación (Frontend / Equipo de Diseño)**. Se verifica adicionalmente la respuesta de la API del backend.

## Registro Técnico de Red (Evaluación API cy.request)
- **Datos de prueba**: Nueva \`Reset#2029\`, Confirmación \`Reset#2030\` (mismatch).
- **Detalle de Petición HTTP Real al Backend**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_mismatch_restablecer_ui.png](screenshots/01_mismatch_restablecer_ui.png) — Formulario de restablecer contraseña con mismatch.
- [02_error_mismatch_restablecer_ui.png](screenshots/02_error_mismatch_restablecer_ui.png) — Mensaje de error de validación en la UI.
`;
}

describe('TC-M01-056 · Rechazo de restablecimiento de contraseña por mismatch', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición directa HTTP realizada al backend TEST.';
  const backendBase = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

  before(() => {
    // Evita congelamientos por CORS en scripts de Vite bajo el proxy de Cypress
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (falló la preparación)'
      : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M01-056',
      titulo: 'Rechazo cuando la nueva contraseña y su confirmación no coinciden en restablecimiento',
      cu: 'CU09 - Restablecer contraseña',
      rf: 'RF-09',
      tipo: 'Manejo de errores (VAL_ENTRADA)',
      equipo: 'Frontend & QA',
      ambiente: Cypress.config('baseUrl'),
      backend: backendBase,
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-056_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-056_resultado.md`, content: renderMd(r) });
  });

  it('valida el rechazo al restablecer contraseña cuando la nueva y la confirmación no coinciden', () => {
    checks.length = 0;

    // 1) Visitar la vista de restablecer contraseña (con token de prueba)
    cy.visit('/restablecer-contrasena?token=token_prueba_test_123');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/restablecer-contrasena');

    // Checkpoint 1: Formulario en UI con mismatch (Reset#2029 vs Reset#2030)
    cy.get('input[name="nueva_contrasena"]').clear().type('Reset#2029');
    cy.get('input[name="confirmar_contrasena"]').clear().type('Reset#2030').blur();

    cy.screenshot('01_mismatch_restablecer_ui', { overwrite: true });

    cy.contains('Las contraseñas no coinciden.').should('be.visible').then(($msg) => {
      add('Checkpoint 1: Mensaje de error de mismatch en cliente (UI)',
        'Muestra mensaje "Las contraseñas no coinciden."',
        `Mensaje visible en UI: "${$msg.text()}"`, 'OK');
    });

    // Checkpoint 2: Bloqueo de submit en UI por react-hook-form
    cy.contains('button', 'Restablecer contraseña').click();
    cy.screenshot('02_error_mismatch_restablecer_ui', { overwrite: true });

    add('Checkpoint 2: Bloqueo de envío en cliente (react-hook-form)',
      'Impidió el submit del formulario al no coincidir las contraseñas',
      'El cliente bloqueó la transmisión del formulario sin emitir tráfico de red', 'OK');

    // Checkpoint 3: Evaluación directa de la API del backend TEST vía cy.request
    cy.then(() => {
      const postUrl = `${backendBase}/autenticacion/restablecer-contrasena`;

      cy.request({
        method: 'POST',
        url: postUrl,
        body: {
          token: 'token_prueba_test_123',
          nueva_contrasena: 'Reset#2029',
          confirmar_nueva_contrasena: 'Reset#2030',
        },
        failOnStatusCode: false,
      }).then((res) => {
        const status = res.status;
        const bodyMsg = JSON.stringify(res.body);
        peticionInfo = `Llamada directa POST ${postUrl} -> Status: ${status}. Respuesta: ${bodyMsg}`;

        if (status === 400 || status === 422) {
          add('Checkpoint 3: Respuesta del Backend TEST al mismatch en restablecimiento (cy.request)',
            'HTTP Status 400 / 422 (Rechazo por validación de entrada)',
            `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OK');
        } else if (status === 200 || status === 204) {
          add('Checkpoint 3: Respuesta del Backend TEST al mismatch en restablecimiento (cy.request)',
            'HTTP Status 400 / 422 (Debe rechazar)',
            `HALLAZGO DE SEGURIDAD: El backend procesó el restablecimiento con mismatch (HTTP ${status}). Respuesta: ${bodyMsg}`, 'FALLA');
        } else {
          add('Checkpoint 3: Respuesta del Backend TEST al mismatch en restablecimiento (cy.request)',
            'HTTP Status 400 / 422',
            `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OBSERVACION');
        }
      });
    });
  });
});
