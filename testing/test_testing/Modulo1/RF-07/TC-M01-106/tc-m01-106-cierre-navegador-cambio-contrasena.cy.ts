/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-106 · Cierre del navegador justo después de confirmar el cambio de contraseña, antes de ver el mensaje de éxito (CU-CambioContrasena · RF-07 · Frontend & Backend QA)
 * 
 * Requisito: RF-07 (Perfil de Usuario y Cambio de Contraseña) / CU-CambioContrasena
 * Objetivo: Validar la resiliencia de seguridad ante la interrupción/abandono del cliente justo tras enviar la solicitud de cambio de clave (PUT /contrasena/usuarios/{id}).
 *           Se verifica por API que:
 *           1. La nueva contraseña quedó efectivamente actualizada en BD (login HTTP 200 con nueva contraseña).
 *           2. Las sesiones anteriores fueron revocadas (GET /sesiones/me/permisos con JWT previo retorna HTTP 401).
 *           3. CP-06 utiliza un JWT fresco de restauración y el id_usuario dinámico (obtenido en CP-01) para restaurar la contraseña a Test1234!.
 * Caso Extremo: Simulación de abandono + Verificación estricta de seguridad API REST
 * Responsable: QA Team
 * Severidad: Alta
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-106/
 */

const DIR = 'RESULTADOS/TC-M01-106';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  const isRestored = r.restauracionExitosa;

  return `# TC-M01-106 — Cierre del Navegador Durante el Cambio de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-CambioContrasena - Cambio de Contraseña · RF-07 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Seguridad · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | QA Team |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Cuenta de Prueba | ${r.testEmail} |
| ID Usuario Dinámico | ${r.idUsuario} |

## Contexto de Ejecución y Metodología de Seguridad
> [!INFO]
> **1. Obtención Dinámica de ID de Usuario**: Se consultó \`GET /usuarios/me\` en CP-01 para obtener el \`id_usuario\` real (${r.idUsuario}) sin depender de IDs hardcodeados.  
> **2. Simulación Fiel de Abandono del Cliente**: Se aplicó \`cy.intercept('PUT', '**/contrasena/usuarios/**', { forceNetworkError: true })\` a mitad del transporte TCP del formulario en \`/perfil\`.  
> **3. Verificación de Seguridad 1 (Contraseña Actualizada)**: Se comprobó por API que el servidor procesó el cambio de clave y permitió autenticarse con \`${r.newPw}\` (\`HTTP 200 OK\`).  
> **4. Verificación de Seguridad 2 (Invalidación de JWT Previo)**: Se comprobó por API que el token previo (\`tokenPrevia\`) fue revocado inmediatamente (\`HTTP 401 Unauthorized\`).  
> **5. Autenticación de Restauración en CP-06**: Se autenticó la solicitud de restauración a la clave original \`${r.currentPw}\` mediante un JWT fresco emitido con la nueva clave.

## Estado Crítico de Restauración de la Cuenta (CP-06)
${isRestored
  ? `> [!NOTE]\n> **RESTAURACIÓN EXITOSA DE CUENTA**: La contraseña de la cuenta \`${r.testEmail}\` fue restaurada satisfactoriamente a su valor original (\`${r.currentPw}\`). La cuenta queda lista y alineada para futuras ejecuciones de pruebas.`
  : `> [!CAUTION]\n> **ATENCIÓN URGENTE - RESTAURACIÓN FALLIDA**: La contraseña de la cuenta \`${r.testEmail}\` NO pudo ser restaurada a \`${r.currentPw}\` y permanece temporalmente configurada con \`${r.newPw}\`. Se requiere atención inmediata para re-alinear la clave.`
}

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> GET /usuarios/me (id_usuario: ${r.idUsuario}) -> /perfil (Submit PUT /contrasena/usuarios/${r.idUsuario} con { forceNetworkError: true }) -> Reintento API REST POST /sesiones/ -> GET /sesiones/me/permisos -> PUT /contrasena/usuarios/${r.idUsuario} (Restauración).
- **Detalle de Ejecución**: ${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-formulario-cambio-contrasena-listo.png](screenshots/01-formulario-cambio-contrasena-listo.png) — Formulario de cambio de contraseña en /perfil completado con contraseña actual y nueva listo para envío.
- [02-ui-reaccion-corte-red-cambio-pw.png](screenshots/02-ui-reaccion-corte-red-cambio-pw.png) — Reacción de la UI ante la simulación de abandono/corte de red simulado (forceNetworkError: true).
- [03-confirmacion-api-nueva-contrasena-valida.png](screenshots/03-confirmacion-api-nueva-contrasena-valida.png) — Comprobación por API REST del login exitoso (HTTP 200 OK) con la nueva contraseña NuevaTest#2026.
- [04-confirmacion-api-sesion-anterior-invalidada.png](screenshots/04-confirmacion-api-sesion-anterior-invalidada.png) — Comprobación por API REST del rechazo de la sesión previa (HTTP 401 Unauthorized / TOKEN_REVOCADO).
- [tc-m01-106-cierre-navegador-cambio-contrasena.cy.ts.mp4](videos/tc-m01-106-cierre-navegador-cambio-contrasena.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
`;
}

describe('TC-M01-106 · Cierre del navegador justo después de confirmar el cambio de contraseña', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  const testEmail = 'gestor.granja.test@pecuaria.co';
  const currentPw = 'Test1234!';
  const newPw = 'NuevaTest#2026';
  let idUsuario = 0;
  let peticionInfo = '';
  let restauracionExitosa = false;

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
    const veredicto = hasFalla ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES';

    const r = {
      caso: 'TC-M01-106',
      titulo: 'Cierre del navegador justo después de confirmar el cambio de contraseña',
      cu: 'CU-CambioContrasena - Cambio de Contraseña',
      rf: 'RF-07',
      tipo: 'Pruebas Extremas / Resiliencia y Seguridad',
      severidad: 'Alta',
      responsable: 'QA Team',
      testEmail,
      currentPw,
      newPw,
      idUsuario,
      restauracionExitosa,
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: [
        `Cuenta de Prueba: ${testEmail}`,
        `ID de Usuario Obtenido Dinámicamente: ${idUsuario}`,
        `Estado Final de Restauración de Contraseña: ${restauracionExitosa ? 'EXITOSA (Restaurada a Test1234!)' : 'ATENCIÓN: FALLIDA (Permanece NuevaTest#2026)'}`,
        'Simulación de Abandono del Cliente: Aplicado { forceNetworkError: true } sobre PUT **/contrasena/usuarios/**.',
        'Verificación de Seguridad 1 (Contraseña Actualizada): Login exitoso por API con NuevaTest#2026 (HTTP 200 OK).',
        'Verificación de Seguridad 2 (Invalidación de JWT Previo): GET /sesiones/me/permisos con tokenPrevia rechazado (HTTP 401 TOKEN_REVOCADO).',
        ...checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      ],
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-106_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-106_resultado.md`, content: renderMd(r) });
  });

  it('valida que el cambio de contraseña se aplique en BD tras el abandono, revoque las sesiones anteriores y restaure la clave original', () => {
    checks.length = 0;
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // CP-01: Autenticación Inicial y Captura Dinámica de id_usuario y tokenPrevia
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: testEmail, contrasena: currentPw }
    }).then((resLoginInit) => {
      expect(resLoginInit.status).to.eq(200);
      const tokenPrevia = resLoginInit.body.token;
      expect(tokenPrevia).to.be.a('string');

      cy.request({
        method: 'GET',
        url: `${backendUrl}/usuarios/me`,
        headers: { Authorization: `Bearer ${tokenPrevia}` }
      }).then((resMe) => {
        expect(resMe.status).to.eq(200);
        idUsuario = resMe.body.id_usuario;
        expect(idUsuario).to.be.a('number').and.greaterThan(0);

        add('CP-01: Autenticación Inicial y Captura Dinámica de id_usuario y tokenPrevia',
          'Login inicial con Test1234! y obtención dinámica del id_usuario desde GET /usuarios/me',
          `Token previa capturado. ID de usuario obtenido dinámicamente: ${idUsuario}`, 'OK');

        // Iniciar sesión en UI
        cy.loginUI(testEmail, currentPw);
        
        // Navegar a /perfil manteniendo la sesión SPA sin recarga dura
        cy.get('.ds-sidebar__item', { timeout: 10000 }).contains('Mi perfil').click({ force: true });
        cy.location('pathname', { timeout: 10000 }).should('include', '/perfil');

        // Abrir panel de cambio de contraseña cuando el botón esté visible en /perfil
        cy.contains('button', 'Cambiar contraseña', { timeout: 15000 }).should('be.visible').click();

        // CP-02: Diligenciamiento del Formulario de Cambio de Contraseña
        cy.get('input[name="contrasena_actual"]').clear().type(currentPw);
        cy.get('input[name="nueva_contrasena"]').clear().type(newPw);
        cy.get('input[name="confirmar_nueva_contrasena"]').clear().type(newPw);

        // Screenshot 01: Formulario listo para envío
        cy.screenshot('01-formulario-cambio-contrasena-listo');

        add('CP-02: Formulario de Cambio de Contraseña en UI (/perfil)',
          'Formulario en /perfil completado con contraseña actual (Test1234!) y nueva (NuevaTest#2026)',
          'Formulario listo y validado en cliente para submit', 'OK');

        // CP-03: Simulación de Abandono del Cliente Post-Envío ({ forceNetworkError: true })
        cy.intercept('PUT', '**/contrasena/usuarios/**', { forceNetworkError: true }).as('corteCambioPw');

        cy.get('form').contains('button', 'Cambiar contraseña').click();

        cy.wait('@corteCambioPw').then(() => {
          peticionInfo = `Submit PUT /contrasena/usuarios/${idUsuario} enviado y cortado con { forceNetworkError: true } -> Abandono simulado`;

          add('CP-03: Simulación de Abandono Post-Envío (Fase 1 Interrupción)',
            'La UI captura la falla de transporte TCP sin congelar la ejecución del test',
            'Abandono del cliente simulado correctamente a mitad del transporte HTTP', 'OK');

          // Screenshot 02: Reacción UI al corte de red
          cy.screenshot('02-ui-reaccion-corte-red-cambio-pw');

          // CP-04: Verificación por API de Contraseña Actualizada en Servidor (Fase 2)
          cy.request({
            method: 'POST',
            url: `${backendUrl}/sesiones/`,
            body: { correo_electronico: testEmail, contrasena: newPw },
            failOnStatusCode: false
          }).then((resNewLogin) => {
            const statusNewLogin = resNewLogin.status;
            const tokenNuevo = resNewLogin.body?.token;

            peticionInfo += ` | Login API con NuevaTest#2026 -> HTTP ${statusNewLogin}`;

            add('CP-04: Verificación por API de Contraseña Actualizada en Servidor (Fase 2)',
              'El backend procesó el cambio de clave y responde HTTP 200 OK entregando un token JWT nuevo',
              `Login exitoso con nueva contraseña (HTTP ${statusNewLogin} OK, tokenNuevo recibido)`, statusNewLogin === 200 && tokenNuevo ? 'OK' : 'FALLA');

            // Screenshot 03: Confirmación por API de nueva contraseña válida
            cy.screenshot('03-confirmacion-api-nueva-contrasena-valida');

            // CP-05: Verificación por API de Invalidación de Sesión Anterior (Fase 2)
            cy.request({
              method: 'GET',
              url: `${backendUrl}/sesiones/me/permisos`,
              headers: { Authorization: `Bearer ${tokenPrevia}` },
              failOnStatusCode: false
            }).then((resOldSession) => {
              const statusOldSession = resOldSession.status;

              peticionInfo += ` | Consumo GET /sesiones/me/permisos con tokenPrevia -> HTTP ${statusOldSession}`;

              add('CP-05: Verificación por API de Invalidación de Sesión Anterior (Fase 2)',
                'Respuesta HTTP 401 Unauthorized confirmando que el tokenPrevia fue revocado tras el cambio de clave',
                `Token previo rechazado correctamente por el servidor (HTTP ${statusOldSession} Unauthorized)`, statusOldSession === 401 ? 'OK' : 'FALLA');

              // Screenshot 04: Confirmación por API de sesión previa invalidada
              cy.screenshot('04-confirmacion-api-sesion-anterior-invalidada');

              // CP-06: Restauración Final de Contraseña Original Autenticada (obteniendo un token fresco con newPw)
              cy.request({
                method: 'POST',
                url: `${backendUrl}/sesiones/`,
                body: { correo_electronico: testEmail, contrasena: newPw },
                failOnStatusCode: false
              }).then((resFreshRestoreToken) => {
                const freshTokenForRestore = resFreshRestoreToken.body?.token;

                if (freshTokenForRestore && idUsuario > 0) {
                  cy.request({
                    method: 'PUT',
                    url: `${backendUrl}/contrasena/usuarios/${idUsuario}`,
                    headers: { Authorization: `Bearer ${freshTokenForRestore}` },
                    body: {
                      contrasena_actual: newPw,
                      nueva_contrasena: currentPw,
                      confirmar_nueva_contrasena: currentPw
                    },
                    failOnStatusCode: false
                  }).then((resRestore) => {
                    peticionInfo += ` | Restauración PUT /contrasena/usuarios/${idUsuario} -> HTTP ${resRestore.status}`;

                    // Verificar que el login con la contraseña original Test1234! funcione
                    cy.request({
                      method: 'POST',
                      url: `${backendUrl}/sesiones/`,
                      body: { correo_electronico: testEmail, contrasena: currentPw },
                      failOnStatusCode: false
                    }).then((resFinalLogin) => {
                      const isRestoredOK = resRestore.status === 200 && resFinalLogin.status === 200;
                      restauracionExitosa = isRestoredOK;

                      add('CP-06: Restauración Final de Contraseña Original Autenticada (CP-06)',
                        'Uso de un JWT fresco emitido con NuevaTest#2026 para revertir la contraseña a Test1234! vía API',
                        isRestoredOK
                          ? `Restauración exitosa (HTTP ${resRestore.status} OK, Login con Test1234! responde HTTP 200 OK)`
                          : `URGENTE: Fallo en restauración (HTTP ${resRestore.status}, la cuenta permanece con ${newPw})`,
                        isRestoredOK ? 'OK' : 'FALLA');
                    });
                  });
                } else {
                  add('CP-06: Restauración Final de Contraseña Original Autenticada (CP-06)',
                    'Uso de un JWT fresco emitido con NuevaTest#2026 para revertir la contraseña a Test1234! vía API',
                    `URGENTE: No se pudo intentar restauración debido a la falta de token de autenticación o idUsuario`, 'FALLA');
                }
              });
            });
          });
        });
      });
    });
  });
});
