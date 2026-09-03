/// <reference types="cypress" />

const EMAIL = 'supervisor.dev@gmail.com';
const PASSWORD = 'Test1234!';
const API_URL = 'http://localhost:8000/api';

const checks: { paso: string; esperado: string; obtenido: string; estado: string }[] = [];
let jwtToken = '';

describe('TC-M01-085 — Consultar perfil propio con sesión JWT válida', () => {

  // ─── PASO 1: Login para obtener JWT ───────────────────────────────────────
  it('Paso 1 — Login y obtención de JWT (RF-02)', () => {
    cy.intercept('POST', '**/sesiones/').as('loginReq');

    cy.visit('/login');
    cy.get('input[autocomplete="email"]').type(EMAIL);
    cy.get('input[autocomplete="current-password"]').type(PASSWORD, { log: false });
    cy.contains('button', 'Ingresar').click();

    cy.wait('@loginReq').then((interception) => {
      const status = interception.response?.statusCode;
      const token = interception.response?.body?.token;

      jwtToken = token ?? '';

      checks.push({
        paso: 'POST /sesiones/',
        esperado: 'HTTP 200 + JWT válido',
        obtenido: `HTTP ${status} — token: ${token ? token.substring(0, 20) + '...' : 'NO ENCONTRADO'}`,
        estado: status === 200 && token ? 'OK' : 'FALLA',
      });

      expect(status).to.eq(200);
      expect(token).to.exist;
      expect(token.split('.')).to.have.lengthOf(3);
    });

    cy.screenshot('01_login_exitoso');
  });

  // ─── PASO 2: Consultar perfil vía API con JWT ──────────────────────────────
  it('Paso 2 — GET /usuarios/me con JWT válido (RF-13)', () => {
    cy.request({
      method: 'GET',
      url: `${API_URL}/usuarios/me`,
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    }).then((response) => {
      const status = response.status;
      const body = response.body;

      checks.push({
        paso: 'GET /usuarios/me con JWT',
        esperado: 'HTTP 200 + datos del usuario autenticado',
        obtenido: `HTTP ${status} — correo: ${body.correo_electronico ?? body.email ?? 'N/A'}`,
        estado: status === 200 ? 'OK' : 'FALLA',
      });

      expect(status).to.eq(200);
      expect(body).to.exist;
      expect(body.correo_electronico).to.eq(EMAIL);

      const payload = JSON.parse(atob(jwtToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expect(String(body.id_usuario)).to.eq(String(payload.sub));
    });
  });

  // ─── PASO 3: Verificar datos en la UI ─────────────────────────────────────
  it('Paso 3 — Verificar perfil en la interfaz (UI)', () => {
    cy.visit('/perfil');

    cy.location('pathname').should('eq', '/perfil');

    cy.contains(EMAIL).should('be.visible').then(() => {
      checks.push({
        paso: 'UI /perfil muestra datos del usuario',
        esperado: `Correo ${EMAIL} visible en pantalla`,
        obtenido: 'Correo encontrado en UI',
        estado: 'OK',
      });
    });

    cy.screenshot('03_perfil_ui');
  });

  // ─── REPORTE FINAL ────────────────────────────────────────────────────────
  after(() => {
    const veredicto = checks.some(c => c.estado === 'FALLA')
      ? 'CON FALLAS'
      : 'SIN FALLAS BLOQUEANTES';

    const fecha = new Date().toISOString();

    const json = JSON.stringify({
      caso: 'TC-M01-085',
      rf: 'RF-13, RF-02',
      fecha,
      veredicto,
      checkpoints: checks,
    }, null, 2);

    cy.writeFile('RESULTADOS/TC-M01-085_resultado.json', json);

    const filas = checks.map(c =>
      `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`
    ).join('\n');

    const md = `# TC-M01-085 — Consultar perfil propio con sesión JWT válida

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 · RF-13 · RF-02 |
| Tipo / Equipo | Funcional / Seguridad · QA |
| Ambiente (front) | http://localhost:5174 |
| Backend | http://localhost:8000/api |
| Navegador | Electron 118 (headless) |
| Fecha ejecución | ${fecha} |
| Precondiciones | Usuario supervisor.dev@gmail.com con sesión activa, backend en localhost:8000 |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${filas}

## Veredicto: ${veredicto}

## Registro Técnico
- **JWT**: Obtenido vía POST /sesiones/, validado como token de 3 partes.
- **API**: GET /usuarios/me consultado con header Authorization: Bearer {token}.
- **UI**: Verificación visual del correo del usuario en la página /perfil.
- **Hallazgos**:
${checks.map(c => `  - ${c.paso} → ${c.obtenido} (${c.estado})`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_login_exitoso.png](screenshots/tc-m01-085-perfil-jwt.cy.ts/01_login_exitoso.png) — Login exitoso con JWT obtenido.
- [03_perfil_ui.png](screenshots/tc-m01-085-perfil-jwt.cy.ts/03_perfil_ui.png) — Vista del perfil en la interfaz.
`;

    cy.writeFile('RESULTADOS/TC-M01-085_resultado.md', md);
  });

});