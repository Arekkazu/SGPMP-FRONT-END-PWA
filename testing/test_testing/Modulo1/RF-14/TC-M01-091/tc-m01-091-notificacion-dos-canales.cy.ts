/// <reference types="cypress" />

const EMAIL = Cypress.env('USER_EMAIL') || 'ingeniero@pecuaria.co';
const PASSWORD = Cypress.env('USER_PASSWORD') || 'CAMBIAR_EN_ENVIRONMENT';
const API_URL = Cypress.env('API_URL') || 'http://localhost:8000';

type Estado = 'OK' | 'FALLA';
type Checkpoint = { request: string; esperado: string; obtenido: string; estado: Estado };

function renderReport(result: { fecha: string; checkpoints: Checkpoint[]; veredicto: string }) {
  return `# TC-M01-091 — Generar notificación por correo y notificación interna simultáneamente

| Campo | Valor |
|---|---|
| Requisito | RF-14 |
| Herramienta | Cypress |
| Usuario | ${EMAIL} |
| Backend | ${API_URL} |
| Fecha | ${result.fecha} |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
${result.checkpoints.map((item) => `| ${item.request} | ${item.esperado} | ${item.obtenido} | **${item.estado}** |`).join('\n')}

## Veredicto: ${result.veredicto}

## Evidencia

- CAMBIO_CONTRASENA se consulta en la bandeja interna mediante GET /notificaciones.
- El despacho EMAIL y su estado SMTP se validan en la prueba Pytest del servicio central; Cypress valida la representación interna.
`;
}

describe('TC-M01-091 - Notificación de cambio de contraseña en dos canales', () => {
  const checkpoints: Checkpoint[] = [];

  it('muestra en la bandeja interna el evento CAMBIO_CONTRASENA', () => {
    expect(EMAIL, 'USER_EMAIL debe ser un correo real').to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(PASSWORD, 'USER_PASSWORD debe ser la contraseña real del usuario')
      .not.to.equal('CAMBIAR_EN_ENVIRONMENT');

    cy.intercept('POST', '**/sesiones/').as('login');
    cy.intercept('GET', 'http://localhost:8000/notificaciones*').as('notifications');

    cy.request({
      method: 'POST',
      url: `${API_URL}/sesiones/`,
      body: { correo_electronico: EMAIL, contrasena: PASSWORD },
    }).then((loginResponse) => {
      expect(loginResponse.status).to.eq(200);
      expect(loginResponse.body.token).to.be.a('string').and.not.empty;
      checkpoints.push({
        request: 'POST /sesiones/',
        esperado: 'HTTP 200 + JWT válido',
        obtenido: `HTTP ${loginResponse.status} + JWT recibido`,
        estado: 'OK',
      });

      cy.intercept('POST', '**/sesiones/', {
        statusCode: 200,
        body: loginResponse.body,
      }).as('login');

      cy.visit('/login');
      cy.get('input[autocomplete="email"]').type(EMAIL);
      cy.get('input[autocomplete="current-password"]').type(PASSWORD, { log: false });
      cy.contains('button', 'Ingresar').click();

      cy.wait('@login').its('response.statusCode').should('eq', 200);
      cy.wait('@notifications').then((interception) => {
        expect(interception.request.url).to.contain(`${API_URL}/notificaciones`);
        expect(interception.request.headers.authorization).to.match(/^Bearer\s+\S+/);
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body.items).to.be.an('array');
        expect(interception.response?.body.items.some((item: { tipo_evento: number }) => item.tipo_evento === 6)).to.eq(true);
        checkpoints.push({
          request: 'GET /notificaciones',
          esperado: 'HTTP 200 + evento CAMBIO_CONTRASENA visible',
          obtenido: `HTTP ${interception.response?.statusCode} + evento tipo 6 encontrado`,
          estado: 'OK',
        });
      });

      cy.get('button[aria-haspopup="dialog"]').click();
      cy.wait('@notifications').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body.items.some((item: { tipo_evento: number }) => item.tipo_evento === 6)).to.eq(true);
      });
      cy.get('[role="dialog"]').then(($dialog) => {
        const visible = $dialog.find('.notification-tray__item').toArray()
          .some((item) => item.textContent?.includes('Cambio de contraseña'));
        checkpoints.push({
          request: 'Bandeja interna UI',
          esperado: 'La interfaz muestra la notificación Cambio de contraseña',
          obtenido: visible ? 'Notificación visible en la bandeja' : 'La bandeja no muestra el evento',
          estado: visible ? 'OK' : 'FALLA',
        });
        expect(visible, 'Notificación interna visible en UI').to.eq(true);
      });
    });
  });

  afterEach(() => {
    const veredicto = checkpoints.some((item) => item.estado === 'FALLA')
      ? 'CON FALLAS'
      : 'SIN FALLAS BLOQUEANTES';
    const fecha = new Date().toISOString();
    const result = { fecha, checkpoints, veredicto };

    cy.task('writeResult', {
      file: 'RESULTADOS/TC-M01-091/TC-M01-091_resultado.json',
      content: JSON.stringify(result, null, 2),
    });
    cy.task('writeResult', {
      file: 'RESULTADOS/TC-M01-091/TC-M01-091_resultado.md',
      content: renderReport(result),
    });
  });
});
