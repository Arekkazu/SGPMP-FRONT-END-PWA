/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-089 · Verificar que la contraseña nunca sea visible en el perfil (CU07 · RF-13 · Frontend & Backend QA)
 * 
 * Requisito: RF-13 (Consultar Historial y Auditoría) / CU07
 * Objetivo: Verificar la privacidad de la contraseña en la respuesta HTTP de la API (JSON HTTP 200), en el DOM HTML y en el almacenamiento web (localStorage/sessionStorage).
 * Responsable: Sebastian
 * Severidad: Alta
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-089/
 */

const DIR = 'RESULTADOS/TC-M01-089';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-089 — Verificar que la contraseña nunca sea visible en el perfil

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Seguridad / Privacidad · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | Sebastian |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Autenticado como Admin (${r.adminUser}) |

## Diagnóstico de Privacidad de Perfil
> [!NOTE]
> Verificación integral de privacidad del perfil de usuario conforme a RF-13 (CU07): inspección de ausencia de contraseña en capa de API REST (JSON), árbol DOM/HTML de la aplicación y almacenamiento web del cliente (localStorage / sessionStorage).

## Evidencia Completa de Llaves del JSON Genuino de Respuesta de la API (HTTP 200 OK)
> [!INFO]
> **Llaves presentes en la respuesta HTTP GET /usuarios/1/detalle**:  
> \`${r.llavesJSON ? r.llavesJSON.join(', ') : 'No disponible'}\`

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /usuarios -> Clic en "Ver detalle" (Apertura de Modal) -> API /usuarios/1/detalle (Admin Profile) -> Almacenamiento Web & DOM.
- **Detalle de Ejecución**: ${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG y Video .MP4)
- [01_perfil_detalle_seguridad.png](screenshots/01_perfil_detalle_seguridad.png) — Vista del modal de detalle de usuario abierto para verificación de privacidad.
- [tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4](videos/tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4) — Grabación en video del flujo de navegación y validación de seguridad.
`;
}

describe('TC-M01-089 · Verificar que la contraseña nunca sea visible en el perfil', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = '';
  let llavesRespuestaJSON: string[] = [];

  before(() => {
    // Evita congelamientos por CORS en scripts de Vite bajo el proxy de Cypress
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const hasFalla = checks.some((c) => c.estado === 'FALLA');
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO'
      : (hasFalla ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M01-089',
      titulo: 'Verificar que la contraseña nunca sea visible en el perfil',
      cu: 'CU07 - Consultar Historial y Auditoría',
      rf: 'RF-13',
      tipo: 'Seguridad / Privacidad',
      severidad: 'Alta',
      responsable: 'Sebastian',
      adminUser: 'admin@pecuaria.co',
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('BACKEND_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      llavesJSON: llavesRespuestaJSON,
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: [
        `Llaves detectadas en el JSON genuino de perfil (HTTP 200 OK): ${llavesRespuestaJSON.join(', ') || 'Ninguna'}`,
        ...checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      ],
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-089_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-089_resultado.md`, content: renderMd(r) });
  });

  it('valida que la contraseña no aparezca en la red (API JSON), DOM/HTML ni almacenamiento cliente (localStorage/sessionStorage)', () => {
    checks.length = 0;

    // 1) Login como administrador
    cy.loginUI('admin@pecuaria.co', 'Test1234!');

    // 2) Navegar al módulo /usuarios
    cy.contains('button.ds-sidebar__item', 'Gestión de usuarios', { timeout: 15000 })
      .should('not.have.class', 'ds-sidebar__item--locked')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('eq', '/usuarios');
    cy.contains('h1', 'Usuarios', { timeout: 15000 }).should('be.visible');

    add(
      'Checkpoint 1: Autenticación y Carga de Sesión',
      'Inicio de sesión exitoso como admin en la interfaz y navegación a /usuarios',
      'Sesión autenticada correctamente como admin@pecuaria.co y vista /usuarios cargada',
      'OK'
    );

    // 3) Interceptar la petición de detalle y abrir el modal desde la tabla UI
    cy.intercept('GET', '**/usuarios/*/detalle').as('getDetalle');

    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('button[aria-label*="Ver detalle"]').click({ force: true });
    });

    cy.wait('@getDetalle', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode ?? 0;
      const ok = status === 200;
      add(
        'Checkpoint 2: Apertura de Modal de Detalle desde Tabla',
        'Apertura exitosa del modal con datos del usuario (HTTP 200 OK)',
        ok ? `Modal cargado correctamente (HTTP ${status})` 
           : `Error HTTP ${status} al abrir el detalle`,
        ok ? 'OK' : 'FALLA'
      );
    });

    cy.get('div[role="dialog"]', { timeout: 12000 }).should('be.visible');

    // Tomar captura de pantalla de la evidencia de UI del modal abierto
    cy.screenshot('01_perfil_detalle_seguridad', { overwrite: true });

    // 4) Consultar el detalle de usuario genuino vía API (ID 1 - Perfil Admin) usando autenticación Bearer para verificar privacidad de contraseña sobre JSON real
    const backendUrl = Cypress.env('BACKEND_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: 'admin@pecuaria.co', contrasena: 'Test1234!' }
    }).then((resLogin) => {
      const token = resLogin.body.token;

      cy.request({
        method: 'GET',
        url: `${backendUrl}/usuarios/1/detalle`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((resDetail) => {
        peticionInfo = `Consulta de perfil genuino GET ${backendUrl}/usuarios/1/detalle -> HTTP ${resDetail.status} OK`;

        if (resDetail.status === 200 && resDetail.body) {
          const body = resDetail.body;
          llavesRespuestaJSON = Object.keys(body);

          // Buscar llaves de contraseña
          const llavesSensibles = llavesRespuestaJSON.filter((k) => {
            const lk = k.toLowerCase();
            return lk.includes('contrasena') || lk.includes('password') || lk.includes('clave') || lk.includes('hash') || lk.includes('secret');
          });

          let tieneClaveExpuesta = false;
          let detalleExposicion = '';

          if (llavesSensibles.length > 0) {
            llavesSensibles.forEach((k) => {
              const val = body[k];
              if (val !== null && val !== undefined && val !== '') {
                tieneClaveExpuesta = true;
                detalleExposicion += `Llave '${k}' expuesta con valor '${val}'. `;
              }
            });
          }

          add(
            'Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK)',
            'La respuesta HTTP 200 OK de la API no contiene el campo de contraseña ni hashes expuestos',
            tieneClaveExpuesta
              ? `FALLA DE SEGURIDAD: ${detalleExposicion}`
              : `OK - Ninguna propiedad de contraseña expuesta. Llaves totales (${llavesRespuestaJSON.length}): [${llavesRespuestaJSON.join(', ')}]`,
            tieneClaveExpuesta ? 'FALLA' : 'OK'
          );
        } else {
          add(
            'Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK)',
            'Respuesta HTTP 200 OK de perfil de usuario',
            `Respuesta inesperada HTTP ${resDetail.status}`,
            'FALLA'
          );
        }
      });
    });

    // 5) Inspección de la Capa DOM/HTML renderizada
    cy.get('body').then(($body) => {
      const inputsPassword = $body.find('input[type="password"]').length;
      const textoBody = $body.text();

      // Verificar que la clave del admin ('Test1234!') no esté renderizada en el DOM
      const contienePasswordConocida = textoBody.includes('Test1234!');

      const totalExposicionesDOM = inputsPassword + (contienePasswordConocida ? 1 : 0);

      add(
        'Checkpoint 4: Verificación de Privacidad en Capa de DOM/HTML (Renderizado Cliente)',
        '0 elementos input[type="password"] ni texto plano de contraseña (Test1234!) visible o en atributos del DOM',
        totalExposicionesDOM === 0
          ? 'OK - Confirmado: 0 elementos HTML o textos con la contraseña expuestos en la interfaz'
          : `FALLA DE SEGURIDAD: Se detectó la contraseña expuesta en el DOM (${totalExposicionesDOM} coincidencia(s))`,
        totalExposicionesDOM === 0 ? 'OK' : 'FALLA'
      );
    });

    // 6) Inspección de Almacenamiento Web del Cliente (localStorage / sessionStorage)
    cy.window().then((win) => {
      const localKeys = Object.keys(win.localStorage);
      const sessionKeys = Object.keys(win.sessionStorage);

      let exposedInStorage = false;
      let storageDetail = '';

      localKeys.forEach((k) => {
        const val = win.localStorage.getItem(k) || '';
        if (val.includes('Test1234!')) {
          exposedInStorage = true;
          storageDetail += `localStorage['${k}'] contiene contraseña plana. `;
        }
      });

      sessionKeys.forEach((k) => {
        const val = win.sessionStorage.getItem(k) || '';
        if (val.includes('Test1234!')) {
          exposedInStorage = true;
          storageDetail += `sessionStorage['${k}'] contiene contraseña plana. `;
        }
      });

      add(
        'Checkpoint 5: Verificación de Almacenamiento en Cliente (localStorage / sessionStorage)',
        'La contraseña de prueba NO debe ser almacenada en texto plano en localStorage ni sessionStorage',
        exposedInStorage
          ? `FALLA DE PRIVACIDAD: ${storageDetail}`
          : `OK - Confirmado: 0 credenciales en texto plano encontradas en almacenamiento web (${localKeys.length} llaves en localStorage, ${sessionKeys.length} llaves en sessionStorage)`,
        exposedInStorage ? 'FALLA' : 'OK'
      );
    });
  });
});
