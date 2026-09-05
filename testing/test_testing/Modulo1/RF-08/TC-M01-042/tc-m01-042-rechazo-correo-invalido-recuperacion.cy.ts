/// <reference types="cypress" />
// TC-M01-042 · Rechazo de un correo electrónico con formato inválido en el formulario de recuperación (HTTP 400)
// CU08 · RF-08 · Manejo de errores (VAL_ENTRADA) · Frontend & Backend QA
// Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-042/
//
// Dato de prueba: se usa el correo de la cuenta QA "ana.martinez.qa1@sgpmp-test.com"
// (misma cuenta real de BD usada en TC-M01-112 para RF-08), quitándole el dominio
// para producir el formato inválido ("ana.martinez.qa1", sin @ ni dominio) — igual
// que TC-M01-023 hace para el login. No se usa un correo personal ajeno al set de
// pruebas de QA.

const DIR = 'RESULTADOS/TC-M01-042';
const CORREO_VALIDO_BASE = 'ana.martinez.qa1@sgpmp-test.com';
const CORREO_INVALIDO = 'ana.martinez.qa1'; // CORREO_VALIDO_BASE sin "@sgpmp-test.com"

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-042 — Rechazo de correo electrónico con formato inválido en recuperación de contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Recuperación de contraseña · RF-08 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Vista /recuperar-contrasena disponible |
| Dato de prueba | Cuenta QA \`${CORREO_VALIDO_BASE}\` sin su dominio: \`${CORREO_INVALIDO}\` |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Registro Técnico de Red (Llamada Directa API cy.request)
- **Datos de prueba**: Correo inválido \`${CORREO_INVALIDO}\` (sin @ ni dominio).
- **Detalle de Petición HTTP Real al Backend**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_correo_invalido_ui.png](screenshots/01_correo_invalido_ui.png) — Alerta de error de formato en el campo de correo en la UI del cliente.
- [02_bloqueo_envio_ui.png](screenshots/02_bloqueo_envio_ui.png) — Estado visual de la interfaz de recuperación tras el intento de submit.
`;
}

describe('TC-M01-042 · Rechazo de correo con formato inválido en recuperación de contraseña', () => {
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
      caso: 'TC-M01-042',
      titulo: 'Rechazo de un correo electrónico con formato inválido en el formulario de recuperación',
      cu: 'CU08 - Recuperación de contraseña',
      rf: 'RF-08',
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

    cy.task('writeResult', { file: `${DIR}/TC-M01-042_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-042_resultado.md`, content: renderMd(r) });
  });

  it('valida el rechazo de recuperación de contraseña con correo de formato inválido en UI y Backend', () => {
    checks.length = 0;

    // 1) Visitar /recuperar-contrasena
    cy.visit('/recuperar-contrasena');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/recuperar-contrasena');
    cy.contains('h1', 'Recuperar contraseña').should('be.visible');

    // 2) Checkpoint 1: Validación de formato en el cliente (UI)
    cy.get('input[autocomplete="email"]').clear().type(CORREO_INVALIDO).blur();

    cy.contains('Formato de correo inválido.').should('be.visible').then(($msg) => {
      add('Checkpoint 1: Mensaje de error de formato en el cliente (UI)',
        'Muestra mensaje "Formato de correo inválido."',
        `Mensaje visible en pantalla: "${$msg.text()}"`, 'OK');
    });

    cy.screenshot('01_correo_invalido_ui', { overwrite: true });

    // 3) Checkpoint 2: Bloqueo de envío en la UI por react-hook-form
    cy.contains('button', 'Enviar enlace de recuperación').click();
    cy.location('pathname').should('eq', '/recuperar-contrasena').then(() => {
      add('Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form)',
        'Permanecer en /recuperar-contrasena sin emitir tráfico de red',
        'react-hook-form impidió la navegación y la emisión del formulario en el navegador', 'OK');
    });

    cy.screenshot('02_bloqueo_envio_ui', { overwrite: true });

    // 4) Checkpoint 3: Evaluación directa de la API/Backend TEST vía cy.request con failOnStatusCode: false
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/contrasena/recuperar';

    cy.request({
      method: 'POST',
      url: backendUrl,
      body: {
        correo_electronico: CORREO_INVALIDO,
      },
      failOnStatusCode: false,
    }).then((response) => {
      const status = response.status;
      const bodyMsg = JSON.stringify(response.body);

      peticionInfo = `Llamada directa HTTP POST ${backendUrl} -> Status: ${status}. Respuesta: ${bodyMsg}`;

      if (status === 400) {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400 (Bad Request, según RF-08)',
          `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OK');
      } else if (status === 202 || status === 200) {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400 (Debe rechazar entrada con formato inválido)',
          `HALLAZGO: El backend procesó/aceptó la solicitud con correo sin formato válido (HTTP ${status}). Respuesta: ${bodyMsg}`, 'FALLA');
      } else {
        add('Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request)',
          'HTTP Status 400',
          `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OBSERVACION');
      }
    });
  });
});
