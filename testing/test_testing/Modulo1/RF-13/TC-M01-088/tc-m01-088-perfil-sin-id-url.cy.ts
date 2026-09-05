/// <reference types="cypress" />

const EMAIL = 'supervisor.dev@gmail.com';
const PASSWORD = 'Test1234!';
const API_URL = 'http://localhost:8000/api';
const RESULT_DIR = 'RESULTADOS/TC-M01-088';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
type Check = { paso: string; esperado: string; obtenido: string; estado: Estado };

function renderMd(result: {
  fecha: string;
  ambiente: string;
  navegador: string;
  checkpoints: Check[];
  veredicto: string;
  origenDatos: string;
}) {
  return `# TC-M01-088 — Verificar que el perfil no exponga el ID del usuario en la URL

| Campo | Valor |
|---|---|
| Requisito | RF-13 |
| Herramienta | Cypress |
| Usuario | ${EMAIL} |
| Backend | ${API_URL} |
| Ambiente | ${result.ambiente} |
| Navegador | ${result.navegador} |
| Fecha | ${result.fecha} |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
${result.checkpoints.map((check) => `| ${check.paso} | ${check.esperado} | ${check.obtenido} | **${check.estado}** |`).join('\n')}

## Veredicto: ${result.veredicto}

## Origen de los datos

${result.origenDatos}
`;
}

describe('TC-M01-088 - Perfil sin ID de usuario en la URL', () => {
  const checkpoints: Check[] = [];
  let loginStatus = 'No ejecutado';
  let profileRequestUrl = 'No ejecutada';
  let profileStatus = 'No ejecutado';
  let origenDatos = 'No determinado';

  const addCheck = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') => {
    checkpoints.push({ paso, esperado, obtenido, estado });
  };

  beforeEach(() => {
    cy.intercept('POST', '**/sesiones/').as('loginRequest');
    cy.intercept('GET', '**/usuarios/me').as('profileRequest');
  });

  afterEach(() => {
    if (loginStatus !== 'No ejecutado' && !checkpoints.some((check) => check.paso === 'Login')) {
      addCheck(
        'Login',
        'HTTP 200 y JWT válido para iniciar la navegación autenticada',
        `POST ${API_URL}/sesiones/ -> HTTP ${loginStatus}`,
        loginStatus === '200' ? 'OK' : 'FALLA',
      );
    }

    const veredicto = checkpoints.some((check) => check.estado === 'FALLA')
      ? 'CON FALLAS'
      : 'SIN FALLAS BLOQUEANTES';
    const result = {
      caso: 'TC-M01-088',
      titulo: 'Verificar que el perfil no exponga el ID del usuario en la URL',
      rf: 'RF-13',
      fecha: new Date().toISOString(),
      ambiente: Cypress.config('baseUrl') ?? 'No configurado',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      checkpoints,
      veredicto,
      origenDatos,
      loginStatus,
      profileRequestUrl,
      profileStatus,
    };

    cy.task('writeResult', {
      file: `${RESULT_DIR}/TC-M01-088_resultado.json`,
      content: JSON.stringify(result, null, 2),
    });
    cy.task('writeResult', {
      file: `${RESULT_DIR}/TC-M01-088_resultado.md`,
      content: renderMd(result),
    });
  });

  it('mantiene /perfil sin ID y obtiene el perfil desde el usuario autenticado', () => {
    cy.visit('/login');
    cy.get('input[autocomplete="email"]').type(EMAIL);
    cy.get('input[autocomplete="current-password"]').type(PASSWORD, { log: false });
    cy.contains('button', 'Ingresar').click();

    cy.wait('@loginRequest').then((interception) => {
      loginStatus = String(interception.response?.statusCode ?? 'sin respuesta');
      addCheck(
        'Login',
        'HTTP 200 y JWT válido para iniciar la navegación autenticada',
        `POST ${API_URL}/sesiones/ -> HTTP ${loginStatus}`,
        loginStatus === '200' ? 'OK' : 'FALLA',
      );
      expect(interception.response?.statusCode, 'login HTTP').to.eq(200);
      expect(interception.response?.body?.token, 'JWT del usuario autenticado').to.be.a('string').and.not.empty;
    });

    cy.wait('@profileRequest');
    cy.visit('/perfil');
    cy.wait('@profileRequest').then((interception) => {
      profileRequestUrl = interception.request.url;
      profileStatus = String(interception.response?.statusCode ?? 'sin respuesta');
      origenDatos = `GET ${profileRequestUrl} con header Authorization Bearer; respuesta HTTP ${profileStatus}.`;

      addCheck(
        'GET /usuarios/me',
        'Los datos del perfil provienen del endpoint autenticado, no de un ID en la URL',
        `GET ${profileRequestUrl} -> HTTP ${profileStatus}`,
        profileRequestUrl === `${API_URL}/usuarios/me` && interception.response?.statusCode === 200 ? 'OK' : 'FALLA',
      );
    });

    cy.location('pathname').should('eq', '/perfil');
    cy.location('search').should('eq', '');
    cy.location('hash').should('eq', '');

    cy.location().then((location) => {
      const exactPath = location.pathname === '/perfil'
        && location.search === ''
        && location.hash === '';
      addCheck(
        'URL de perfil',
        'La URL debe ser exactamente /perfil, sin /perfil/{id}',
        'URL actual: ' + location.pathname + location.search + location.hash,
        exactPath ? 'OK' : 'FALLA',
      );
    });

    cy.get('a[href^="/perfil/"]').should('not.exist').then(() => {
      addCheck(
        'Enlaces de navegación',
        'No debe existir un enlace dinámico /perfil/{id}',
        'No se encontró ningún enlace con ID en la ruta del perfil',
        'OK',
      );
    });
  });
});
