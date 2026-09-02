/// <reference types="cypress" />
// TC-M01-086 · Acceso a /perfil con JWT inválido o expirado (HTTP 401)
// CU13 · RF-13 · Pruebas de Seguridad (JWT / Control de Acceso) · Frontend & Backend QA
// Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-086/

const DIR = 'RESULTADOS/TC-M01-086';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-086 — Acceso a /perfil con JWT inválido o expirado

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU13 - Consultar Perfil · RF-13 |
| Tipo / Equipo | Pruebas de Seguridad (JWT) · Frontend & QA |
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
> **IMPORTANTE**: La seguridad de rutas corresponde de forma compartida a **Diseño/Frontend** (redirección a \`/login\` en la SPA si no hay token) y al **Backend** (rechazo con \`HTTP 401 Unauthorized\` ante llamadas con tokens alterados o caducados).

## Registro Técnico de Red (Evaluación API cy.request)
- **Token de Prueba**: JWT con firma inválida / expirado.
- **Detalle de Petición HTTP Real al Backend**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_redireccion_login_sin_jwt.png](screenshots/01_redireccion_login_sin_jwt.png) — Intento de acceso directo a /perfil sin sesión -> Redirección automática a /login.
- [02_respuesta_backend_jwt_invalido.png](screenshots/02_respuesta_backend_jwt_invalido.png) — Respuesta HTTP 401 del backend al enviar token manipulado.
`;
}

describe('TC-M01-086 · Validación de seguridad JWT en vista /perfil', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición directa HTTP realizada al backend TEST.';
  const backendBase = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
  const tokenInvalido = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid_signature';

  before(() => {
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
      caso: 'TC-M01-086',
      titulo: 'Acceso a /perfil con JWT inválido o expirado',
      cu: 'CU13 - Consultar Perfil',
      rf: 'RF-13',
      tipo: 'Pruebas de Seguridad (JWT)',
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

    cy.task('writeResult', { file: `${DIR}/TC-M01-086_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-086_resultado.md`, content: renderMd(r) });
  });

  it('valida la redirección en UI y la respuesta HTTP 401 al consultar /perfil sin token válido', () => {
    checks.length = 0;

    // Checkpoint 1: Intento de navegación directa en UI a /perfil sin token autenticado
    cy.clearLocalStorage();
    cy.visit('/perfil');

    // La SPA debe bloquear la ruta protegida y redirigir inmediatamente a /login
    cy.location('pathname', { timeout: 15000 }).should('eq', '/login');
    cy.screenshot('01_redireccion_login_sin_jwt', { overwrite: true });

    add('Checkpoint 1: Protección de ruta en la UI (SPA)',
      'Impidió el acceso a /perfil y redirigió a /login',
      'Acceso bloqueado en el cliente; redirección exitosa a /login', 'OK');

    // Checkpoint 2: Consulta directa a la API GET /usuarios/me enviando JWT manipulado (cy.request)
    cy.then(() => {
      const meUrl = `${backendBase}/usuarios/me`;

      cy.request({
        method: 'GET',
        url: meUrl,
        headers: { Authorization: `Bearer ${tokenInvalido}` },
        failOnStatusCode: false,
      }).then((res) => {
        const status = res.status;
        const bodyMsg = JSON.stringify(res.body);
        peticionInfo = `Llamada directa GET ${meUrl} con Bearer token manipulado -> Status: ${status}. Respuesta: ${bodyMsg}`;

        if (status === 401) {
          add('Checkpoint 2: Respuesta del Backend TEST a JWT inválido/expirado (cy.request / API)',
            'HTTP Status 401 Unauthorized',
            `HTTP ${status} - Respuesta del servidor: ${bodyMsg}`, 'OK');
        } else {
          add('Checkpoint 2: Respuesta del Backend TEST a JWT inválido/expirado (cy.request / API)',
            'HTTP Status 401 Unauthorized (Debe rechazar)',
            `HALLAZGO DE SEGURIDAD: El backend no devolvió 401 ante token inválido (HTTP ${status}). Respuesta: ${bodyMsg}`, 'FALLA');
        }

        cy.screenshot('02_respuesta_backend_jwt_invalido', { overwrite: true });
      });
    });
  });
});
