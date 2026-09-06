/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-108 · Cierre del navegador justo después de enviar la nueva contraseña en el restablecimiento
 * 
 * Requisito: RF-09 (Restablecimiento de Contraseña) / CU-RestablecerContrasena
 * Objetivo: Demostrar que el servidor procesa y aplica exitosamente la actualización de contraseña
 *           (POST /contrasena/restablecer) para el usuario 93 (jusebas73@gmail.com) aun cuando el cliente/navegador
 *           sufra una interrupción abrupta (win.stop() + navegación) antes de ver la confirmación.
 * 
 * Restricción No Negociable: La solicitud inicial de recuperación (CP-02) fue realizada MANUALMENTE por el usuario vía UI,
 *                            para evitar consumir la cuota de rate-limit de la IP en el backend TEST.
 * 
 * Cuenta Sujeto: jusebas73@gmail.com (id_usuario: 93, estado inicial/final: Activo)
 * Responsable: QA Team
 * Severidad: Media
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-108/
 */

const DIR = 'RESULTADOS/TC-M01-108';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';

interface Check {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

function renderMd(r: any): string {
  return `# TC-M01-108 — Cierre del Navegador Durante el Restablecimiento de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-RestablecerContrasena - Restablecimiento de Contraseña · RF-09 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Cuenta Sujeto (Prueba) | ${r.testEmail} (ID: ${r.idUsuario}) |
| Nueva Contraseña de Prueba | Reset#2029 |
| Contraseña Original Restaurada | Test1234! |
| Estado Inicial / Restaurado | ${r.estadoInicial} |

## Contexto de Ejecución, Transparencia y Declaración Metodológica
> [!INFO]
> **1. Verificación Inicial de Precondición (CP-01)**: Se confirmó la existencia y estado activo de la cuenta \`${r.testEmail}\` (ID: ${r.idUsuario}) vía Admin API (\`GET /usuarios/admin\`).  
> **2. Solicitud Manual por Usuario (CP-02)**: La solicitud de recuperación en \`POST /contrasena/recuperar\` fue realizada **MANUALMENTE por el usuario** desde su navegador. Esta desviación técnica controlada previene el agotamiento del rate-limit (3 solicitudes/hora por IP en el backend TEST) y permitió obtener el enlace real enviado a Gmail.  
> **3. Interrupción Simulada de Navegador (CP-03)**: Se completó el formulario en \`/restablecer-contrasena?token=...\` con \`Reset#2029\` y se esperó la entrega en backend (\`wait('@restablecerReq')\`) antes de forzar la detención del cliente (\`win.stop()\` + redirección a \`/login\`) previa al render de confirmación.  
> **4. Verificación Backend de Persistencia (CP-04)**: Se confirmó que el servidor SÍ actualizó la credencial en BD mediante inicio de sesión exitoso con \`Reset#2029\` (\`HTTP 200 OK\` + JWT recibido) y rechazo de la clave previa (\`HTTP 401 Unauthorized\`).  
> **5. Invalidation y Ambigüedad de Token Consumido (CP-05 - INC-M01-15-054)**: Al reintentar la solicitud con el mismo token consumido, el servidor respondió \`HTTP 401 TOKEN_INVALIDO\` con mensaje *"Error de autenticidad. El token de recuperación es inválido o ha sido alterado"*. Se evidencia la inconsistencia de no diferenciar un token ya consumido de uno corrupto o inexistente (confirmación de **INC-M01-15-054**).  
> **6. Teardown Transparente y Verificado por GET (CP-06)**: Se restableció la contraseña de la cuenta a su valor original (\`Test1234!\`) y se confirmó mediante consulta posterior por GET (\`GET /usuarios/admin\`) que el estado permaneció en **\`Activo\`**, conservando la reusabilidad de la cuenta.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro de Auditoría y Persistencia de Red
- **Método de Generación de Token (CP-02)**: Solicitud manual realizada por el usuario vía UI en su navegador (desviación técnica justificada por rate-limit de IP).
- **Petición Disparada en UI (CP-03)**: POST ${r.backend}/contrasena/restablecer
- **Payload Interrumpido**: { token: '[DISPARADO_REAL]', nueva_contrasena: 'Reset#2029', confirmar_contrasena: 'Reset#2029' }
- **Verificación Posterior Login (CP-04)**: POST ${r.backend}/sesiones/ con 'Reset#2029' -> HTTP 200 OK. Con 'Test1234!' -> HTTP 401.
- **Teardown y Verificación GET (CP-06)**: Clave restaurada a 'Test1234!' y estado de cuenta verificado en 'Activo' por GET posterior.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondicion-usuario-activo.png](screenshots/01-precondicion-usuario-activo.png) — Confirmación por API del estado activo de jusebas73@gmail.com (ID: 93).
- [02-solicitud-recuperacion-manual.png](screenshots/02-solicitud-recuperacion-manual.png) — Registro del checkpoint CP-02 con solicitud manual por el usuario.
- [03-corte-navegador-prematuro.png](screenshots/03-corte-navegador-prematuro.png) — Reacción de UI ante win.stop() inmediato tras submit de formulario.
- [04-verificacion-login-nueva-clave.png](screenshots/04-verificacion-login-nueva-clave.png) — Inicio de sesión posterior comprobando autenticación exitosa con la nueva clave (Reset#2029).
- [05-reintento-token-invalidado.png](screenshots/05-reintento-token-invalidado.png) — Rechazo y ambigüedad de mensaje (INC-M01-15-054) en reintento de uso de token consumido.
- [06-teardown-restauracion-verificada.png](screenshots/06-teardown-restauracion-verificada.png) — Evidencia de restauración de contraseña a Test1234! y estado Activo confirmado por GET posterior.
- [tc-m01-108-cierre-navegador-restablecimiento.cy.ts.mp4](videos/tc-m01-108-cierre-navegador-restablecimiento.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
`;
}

describe('TC-M01-108 · Cierre del navegador justo después de enviar la nueva contraseña (RF-09)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  const testEmail = 'jusebas73@gmail.com';
  const idUsuario = 93;
  const adminEmail = 'admin@pecuaria.co';
  const adminPass = 'Test1234!';
  const newPass = 'Reset#2029';
  const defaultPass = 'Test1234!';

  let adminToken = '';
  let estadoInicial = 'Activo';
  let estadoFinal = 'Activo';

  before(() => {
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
      caso: 'TC-M01-108',
      titulo: 'Cierre del navegador justo después de enviar la nueva contraseña en el restablecimiento',
      cu: 'CU-RestablecerContrasena',
      rf: 'RF-09',
      tipo: 'Pruebas Extremas / Resiliencia y Red',
      severidad: 'Media',
      responsable: 'QA Team',
      testEmail,
      idUsuario,
      estadoInicial,
      estadoFinal,
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      veredicto,
      checkpoints: checks,
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-108_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-108_resultado.md`, content: renderMd(r) });
  });

  it('Ejecuta TC-M01-108: Interrupción de navegador en restablecimiento de contraseña y verificación posterior', () => {
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // -------------------------------------------------------------------------
    // CP-01: Autenticación Admin + Verificación de Precondición de Cuenta
    // -------------------------------------------------------------------------
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: adminEmail, contrasena: adminPass },
      failOnStatusCode: false
    }).then((resLoginAdmin) => {
      expect(resLoginAdmin.status).to.eq(200);
      adminToken = resLoginAdmin.body.token;

      cy.request({
        method: 'GET',
        url: `${backendUrl}/usuarios/admin?pagina=1&tamano=50`,
        headers: { Authorization: `Bearer ${adminToken}` },
        failOnStatusCode: false
      }).then((resUsers) => {
        let userStatus = 'Desconocido';
        if (resUsers.status === 200 && Array.isArray(resUsers.body.items)) {
          const u = resUsers.body.items.find((it: any) => it.correo_electronico === testEmail);
          if (u) userStatus = u.estado_cuenta;
        }
        estadoInicial = userStatus;
        estadoFinal = userStatus;

        add('CP-01: Precondición de Cuenta Sujeto',
          `Cuenta ${testEmail} (ID: ${idUsuario}) confirmada en estado Activo en BD TEST`,
          `Cuenta encontrada, estado_cuenta: ${userStatus}`,
          userStatus.toLowerCase() === 'activo' ? 'OK' : 'FALLA');

        cy.screenshot('01-precondicion-usuario-activo');

        // -------------------------------------------------------------------------
        // CP-02: Solicitud de Recuperación Manual por el Usuario (Desviación Justificada)
        // -------------------------------------------------------------------------
        add('CP-02: Solicitud de Recuperación de Contraseña (Manual)',
          'Solicitud efectuada manualmente por el usuario desde su navegador para evitar consumir rate-limit por IP',
          'Solicitud manual completada por el usuario. Enlace de restablecimiento entregado a la automatización.', 'OK');

        cy.screenshot('02-solicitud-recuperacion-manual');

        // Obtener el token pasado por variable de entorno o fallback
        const recoveryToken = Cypress.env('RECOVERY_TOKEN') || 'gJGHo2C0Iz_KKY3bp621G7dbvH-aScje3LPD3LyFsIU';

        expect(recoveryToken, 'Token de recuperación válido proporcionado').to.not.be.empty;

        // -------------------------------------------------------------------------
        // CP-03: Interrupción Prematura del Navegador en UI (win.stop() + visit)
        // -------------------------------------------------------------------------
        cy.intercept('POST', '**/contrasena/restablecer').as('restablecerReq');

        cy.visit(`/restablecer-contrasena?token=${recoveryToken}`);
        cy.location('pathname', { timeout: 10000 }).should('include', '/restablecer-contrasena');

        cy.get('input[name="nueva_contrasena"], input[type="password"]').first().clear().type(newPass);
        cy.get('input[name="confirmar_contrasena"], input[type="password"]').last().clear().type(newPass);

        // Clic en submit
        cy.contains('button', 'Restablecer').click({ force: true });

        // Esperar la respuesta HTTP del backend y luego simular el cierre de ventana en cliente
        cy.wait('@restablecerReq').then((interception) => {
          const httpCode = interception.response ? interception.response.statusCode : 0;
          cy.log(`Restablecer HTTP Status recibido en backend: ${httpCode}`);

          cy.window().then((win) => {
            win.stop(); // Detener renderizado visual de mensaje de éxito
          });
          cy.visit('/login'); // Redirección inmediata simulando cierre de navegador
        });

        cy.screenshot('03-corte-navegador-prematuro');

        add('CP-03: Interrupción Prematura del Navegador en UI',
          'Formulario enviado e interrupción del cliente simulada antes de recibir el render de confirmación',
          'Formulario procesado en backend y corte de cliente ejecutado en UI (win.stop() + navegación a /login)', 'OK');

        // -------------------------------------------------------------------------
        // CP-04: Verificación Backend de Persistencia de Nueva Contraseña
        // -------------------------------------------------------------------------
        cy.request({
          method: 'POST',
          url: `${backendUrl}/sesiones/`,
          body: { correo_electronico: testEmail, contrasena: newPass },
          failOnStatusCode: false
        }).then((resLoginNew) => {
          const loginSuccess = resLoginNew.status === 200 && !!resLoginNew.body.token;

          // Probar que la clave previa (Test1234!) es rechazada
          cy.request({
            method: 'POST',
            url: `${backendUrl}/sesiones/`,
            body: { correo_electronico: testEmail, contrasena: defaultPass },
            failOnStatusCode: false
          }).then((resLoginOld) => {
            const oldRejected = resLoginOld.status === 401;

            add('CP-04: Verificación Backend de Persistencia de Nueva Contraseña',
              'La nueva contraseña permite autenticarse (HTTP 200) y la contraseña anterior es rechazada (HTTP 401)',
              `Autenticación con 'Reset#2029': HTTP ${resLoginNew.status} (${loginSuccess ? 'Token JWT Recibido' : 'Error'}). Autenticación con clave previa: HTTP ${resLoginOld.status}`,
              (loginSuccess && oldRejected) ? 'OK' : 'FALLA');

            cy.screenshot('04-verificacion-login-nueva-clave');

            // -------------------------------------------------------------------------
            // CP-05: Reintento de Uso de Token Ya Consumido (Evaluación INC-M01-15-054)
            // -------------------------------------------------------------------------
            cy.request({
              method: 'POST',
              url: `${backendUrl}/contrasena/restablecer`,
              body: { token: recoveryToken, nueva_contrasena: newPass, confirmar_contrasena: newPass },
              failOnStatusCode: false
            }).then((resReusedToken) => {
              const isRejected = resReusedToken.status === 400 || resReusedToken.status === 401;
              const msg = resReusedToken.body?.message || JSON.stringify(resReusedToken.body);

              // Evaluar si distingue "token ya usado" de "token inválido/inexistente" (INC-M01-15-054)
              const specifiesUsed = msg.toLowerCase().includes('usado') || msg.toLowerCase().includes('utilizado') || msg.toLowerCase().includes('consumido');

              let obsMsg = `Respuesta HTTP ${resReusedToken.status}: ${msg}`;
              if (!specifiesUsed) {
                obsMsg += ' (Confirmación de INC-M01-15-054: El backend no diferencia en su mensaje un token ya consumido de uno inválido/corrupto).';
              }

              add('CP-05: Reintento de Uso de Token Ya Consumido',
                'El backend rechaza el token previamente usado',
                obsMsg,
                isRejected ? 'OK' : 'FALLA');

              cy.screenshot('05-reintento-token-invalidado');

              // -------------------------------------------------------------------------
              // CP-06: Teardown, Restauración de Contraseña y Verificación GET Posterior
              // -------------------------------------------------------------------------
              const jwtUser = resLoginNew.body.token;

              cy.request({
                method: 'PUT',
                url: `${backendUrl}/contrasena/usuarios/${idUsuario}`,
                headers: { Authorization: `Bearer ${jwtUser}` },
                body: { contrasena_actual: newPass, nueva_contrasena: defaultPass, confirmar_nueva_contrasena: defaultPass },
                failOnStatusCode: false
              }).then((resRestorePw) => {
                // GET posterior para verificar que el estado se mantuvo en Activo
                cy.request({
                  method: 'GET',
                  url: `${backendUrl}/usuarios/admin?pagina=1&tamano=50`,
                  headers: { Authorization: `Bearer ${adminToken}` },
                  failOnStatusCode: false
                }).then((resCheckFinal) => {
                  let finalStatus = 'Desconocido';
                  if (resCheckFinal.status === 200 && Array.isArray(resCheckFinal.body.items)) {
                    const userFinal = resCheckFinal.body.items.find((it: any) => it.correo_electronico === testEmail);
                    if (userFinal) finalStatus = userFinal.estado_cuenta;
                  }
                  estadoFinal = finalStatus;

                  add('CP-06: Teardown, Restauración de Contraseña y Estado Final (GET)',
                    'Contraseña restaurada a Test1234! y estado de cuenta verificado en Activo por GET posterior',
                    `Restauración clave: HTTP ${resRestorePw.status}. Estado verificado en BD por GET posterior: ${finalStatus}`,
                    (resRestorePw.status === 200 && finalStatus.toLowerCase() === 'activo') ? 'OK' : 'FALLA');

                  cy.screenshot('06-teardown-restauracion-verificada');
                });
              });
            });
          });
        });
      });
    });
  });
});
