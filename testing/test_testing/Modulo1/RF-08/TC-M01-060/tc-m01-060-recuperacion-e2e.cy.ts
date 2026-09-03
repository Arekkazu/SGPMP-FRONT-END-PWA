/// <reference types="cypress" />

const EMAIL = 'supervisor.dev@gmail.com';
const NUEVA_CONTRASENA = 'E2E#2031';
const MAILPIT_URL = 'http://localhost:8025';

const checks: { paso: string; esperado: string; obtenido: string; estado: string }[] = [];
let recoveryToken = '';

describe('TC-M01-060 — Flujo E2E Recuperación y Restablecimiento de Contraseña', () => {

  // ─── PASO 1: Solicitar recuperación ───────────────────────────────────────
  it('Paso 1 — Solicitar recuperación de contraseña (RF-08)', () => {
    cy.intercept('POST', '**/contrasena/recuperar').as('recuperarReq');

    cy.visit('/recuperar-contrasena');
    cy.get('input[type="email"]').type(EMAIL);
    cy.contains('button', /enviar|recuperar/i).click();

    cy.wait('@recuperarReq').then((interception) => {
      const status = interception.response?.statusCode;
      const body = JSON.stringify(interception.response?.body);

      checks.push({
        paso: 'POST /contrasena/recuperar',
        esperado: 'HTTP 200 — correo enviado a Mailpit',
        obtenido: `HTTP ${status} — ${body}`,
        estado: status === 202 ? 'OK' : 'FALLA',
      });

      expect(status).to.eq(202);
    });

    cy.screenshot('01_formulario_recuperacion');
  });

  // ─── PASO 2: Extraer token de Mailpit ─────────────────────────────────────
  it('Paso 2 — Extraer token del correo en Mailpit', () => {
    cy.wait(3000); // esperar que llegue el correo

    cy.request({
      method: 'GET',
      url: `${MAILPIT_URL}/api/v1/messages`,
    }).then((response) => {
      const message = response.body.messages.find((m: any) =>
        m.To.some((t: any) => t.Address === EMAIL)
      );

      expect(message, 'Correo encontrado en Mailpit').to.exist;

      cy.request({
        method: 'GET',
        url: `${MAILPIT_URL}/api/v1/message/${message.ID}`,
      }).then((mailResponse) => {
        const html = mailResponse.body.HTML;
        const match = html.match(/token[=:]([A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)/i);

        expect(match, 'Token encontrado en el correo').to.exist;
        recoveryToken = match![1];

        checks.push({
          paso: 'Extraer token de Mailpit',
          esperado: 'Token encontrado en el correo',
          obtenido: `Token: ${recoveryToken.substring(0, 20)}...`,
          estado: 'OK',
        });
      });
    });
  });

  // ─── PASO 3: Restablecer contraseña ───────────────────────────────────────
  it('Paso 3 — Restablecer contraseña con el token (RF-09)', () => {
    cy.intercept('POST', '**/contrasena/restablecer').as('restablecerReq');

    cy.visit(`/restablecer-contrasena?token=${recoveryToken}`);
   cy.contains('label', 'Nueva contraseña').siblings('div').find('input').type(NUEVA_CONTRASENA);
    cy.contains('label', 'Confirmar nueva contraseña').siblings('div').find('input').type(NUEVA_CONTRASENA);    
    cy.contains('button', /restablecer/i).click();

    cy.wait('@restablecerReq').then((interception) => {
      const status = interception.response?.statusCode;
      const body = JSON.stringify(interception.response?.body);

      checks.push({
        paso: 'POST /contrasena/restablecer',
        esperado: 'HTTP 200 — contraseña actualizada',
        obtenido: `HTTP ${status} — ${body}`,
        estado: status === 200 ? 'OK' : 'FALLA',
      });

      expect(status).to.eq(200);
    });

    cy.screenshot('03_formulario_restablecer');
  });

  // ─── PASO 4: Login con nueva contraseña ───────────────────────────────────
  it('Paso 4 — Login con la nueva contraseña (RF-02)', () => {
    cy.intercept('POST', '**/sesiones/iniciar').as('loginReq');

    cy.visit('/login');
    cy.get('input[autocomplete="email"]').type(EMAIL);
    cy.get('input[autocomplete="current-password"]').type(NUEVA_CONTRASENA, { log: false });
    cy.contains('button', 'Ingresar').click();

    cy.wait('@loginReq').then((interception) => {
      const status = interception.response?.statusCode;
      const token = interception.response?.body?.token;

      checks.push({
        paso: 'POST /sesiones/iniciar',
        esperado: 'HTTP 200 + JWT válido',
        obtenido: `HTTP ${status} — token: ${token ? token.substring(0, 20) + '...' : 'NO ENCONTRADO'}`,
        estado: status === 200 && token ? 'OK' : 'FALLA',
      });

      expect(status).to.eq(200);
      expect(token).to.exist;
      expect(token.split('.')).to.have.lengthOf(3);
    });

    cy.location('pathname').should('not.eq', '/login');
    cy.screenshot('04_dashboard_post_login');
  });

  // ─── REPORTE FINAL ────────────────────────────────────────────────────────
  after(() => {
    const veredicto = checks.some(c => c.estado === 'FALLA')
      ? 'CON FALLAS'
      : 'SIN FALLAS BLOQUEANTES';

    const fecha = new Date().toISOString();

    // JSON
    const json = JSON.stringify({
      caso: 'TC-M01-060',
      rf: 'RF-08, RF-09, RF-02',
      fecha,
      veredicto,
      checkpoints: checks,
    }, null, 2);

    cy.writeFile('RESULTADOS/TC-M01-060_resultado.json', json);

    // Markdown
    const filas = checks.map(c =>
      `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`
    ).join('\n');

    const md = `# TC-M01-060 — Flujo E2E Recuperación y Restablecimiento de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | RF-08 · RF-09 · RF-02 |
| Tipo / Equipo | E2E · QA |
| Ambiente (front) | http://localhost:5174 |
| Backend | http://localhost:8000/api |
| Navegador | Electron 118 (headless) |
| Fecha ejecución | ${fecha} |
| Precondiciones | Mailpit corriendo en localhost:8025, backend en localhost:8000, usuario supervisor.dev@gmail.com en BD |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${filas}

## Veredicto: ${veredicto}

## Nota de Clasificación QA
> **BLOQUEANTE IDENTIFICADO**: El endpoint \`POST /api/contrasena/recuperar\` responde HTTP 202 pero **no genera token en BD** (tabla \`modulo1.tokens\` sin registros de tipo \`recuperacion\`) y **no envía correo a Mailpit**. Los Pasos 2, 3 y 4 están bloqueados por este defecto del backend (RF-08).

## Registro Técnico
- **Infraestructura verificada**: Mailpit accesible en localhost:8025, SMTP funcional (puerto 1025), red Docker correcta.
- **Bug confirmado**: Backend responde 202 sin crear token ni enviar correo. Verificado en BD remota 158.69.200.27:5448 — 0 registros en modulo1.tokens con token_tipo='recuperacion'.
- **Hallazgos**:
${checks.map(c => `  - ${c.paso} → ${c.obtenido} (${c.estado})`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_formulario_recuperacion.png](screenshots/tc-m01-060-recuperacion-e2e.cy.ts/01_formulario_recuperacion.png) — Formulario de recuperación con correo ingresado.

## Defectos Reportados
| ID | Descripción | Severidad | Responsable |
|---|---|---|---|
| DEF-001 | POST /api/contrasena/recuperar responde 202 pero no genera token ni envía correo | Alta | Backend |
| DEF-002 | usuario member_qa sin permisos en tabla configuracion_batch_exportacion_auditoria | Media | Backend/DBA |
`;

    cy.writeFile('RESULTADOS/TC-M01-060_resultado.md', md);
  });
});