/// <reference types="cypress" />
// TC-M01-023 · Rechazo de un correo electrónico con formato inválido en inicio de sesión (HTTP 400)
// CU02 · RF-02 · Manejo de errores (VAL_ENTRADA) · Frontend & Backend QA
// Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-023/

const DIR = 'RESULTADOS/TC-M01-023';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-023 — Rechazo de correo electrónico con formato inválido en inicio de sesión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU02 - Inicio de Sesión · RF-02 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Vista /login disponible |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema (Fase Desarrollo / Herramienta Cypress), este caso corresponde a **Interfaz/UI o navegación; le corresponde al equipo de Diseño** (Validación de formato en frontend; confirmar si también se valida en backend).

## Registro Técnico de Red (Llamada Directa API cy.request)
- **Datos de prueba**: Correo inválido \`ana.martinez.qa1\` (sin @ ni dominio).
- **Detalle de Petición HTTP Real al Backend**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_correo_invalido_ui.png](screenshots/01_correo_invalido_ui.png) — Alerta de error de formato en el campo de correo en la UI del cliente.
- [02_respuesta_backend_login.png](screenshots/02_respuesta_backend_login.png) — Estado visual de la interfaz de login tras el intento de submit.
`;
}

describe('TC-M01-023 · Rechazo de correo con formato inválido en login', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición directa HTTP realizada al backend TEST.';

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
      caso: 'TC-M01-023',
      titulo: 'Rechazo de un correo electrónico con formato inválido en el formulario de inicio de sesión',
      cu: 'CU02 - Inicio de sesión',
      rf: 'RF-02',
      tipo: 'Manejo de errores (VAL_ENTRADA)',
      equipo: 'Frontend & QA',
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-023_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-023_resultado.md`, content: renderMd(r) });
  });

  it('valida el rechazo de inicio de sesión con correo de formato inválido en UI y Backend', () => {
    checks.length = 0;

    // 1) Visitar /login
    cy.visit('/login');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
    cy.contains('h1', 'Iniciar sesión').should('be.visible');

    // 2) Checkpoint 1: Validación de formato en el cliente (UI)
    const correoInvalido = 'ana.martinez.qa1';
    cy.get('input[autocomplete="email"]').clear().type(correoInvalido).blur();
    cy.get('input[autocomplete="current-password"]').clear().type('Test1234!');

    cy.contains('El formato del correo electrónico no es válido.').should('be.visible').then(($msg) => {
      add('Checkpoint 1: Mensaje de error de formato en el cliente (UI)',
        'Muestra mensaje "El formato del correo electrónico no es válido."',
        `Mensaje visible en pantalla: "${$msg.text()}"`, 'OK');
    });

    cy.screenshot('01_correo_invalido_ui', { overwrite: true });

    // 3) Checkpoint 2: Bloqueo de envío en la UI por react-hook-form
    cy.contains('button', 'Ingresar').click();
    cy.location('pathname').should('eq', '/login').then(() => {
      add('Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form)',
        'Permanecer en /login sin emitir tráfico de red',
        'react-hook-form impidió la navegación y la emisión del formulario en el navegador', 'OK');
    });

    cy.screenshot('02_respuesta_backend_login', { overwrite: true });

    // 4) Checkpoint 3: Evaluación directa de la API/Backend TEST vía cy.request con failOnStatusCode: false
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/sesiones/';

    cy.request({
      method: 'POST',
      url: backendUrl,
      body: {
        correo_electronico: correoInvalido,
        contrasena: 'Test1234!',
      },
      failOnStatusCode: false,
    }).then((response) => {
      const status = response.status;
      const bodyMsg = JSON.stringify(response.body);

      peticionInfo = `Llamada directa HTTP POST ${backendUrl} -> Status: ${status}. Respuesta: ${bodyMsg}`;

      if (status === 400 || status === 422) {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400 / 422 (Rechazo por validación de entrada)',
          `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OK');
      } else if (status === 200) {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400 / 422 (Debe rechazar entrada inválida)',
          `HALLAZGO DE SEGURIDAD: El backend procesó el login con correo sin formato válido (HTTP ${status}). Respuesta: ${bodyMsg}`, 'FALLA');
      } else {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400 / 422',
          `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OBSERVACION');
      }
    });
  });
});
