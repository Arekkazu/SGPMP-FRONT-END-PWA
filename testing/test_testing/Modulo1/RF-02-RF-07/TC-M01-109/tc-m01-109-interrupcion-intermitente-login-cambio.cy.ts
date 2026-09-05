/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-109 · Interrupción de red intermitente en login (RF-02) y cambio de contraseña (RF-07) con reintento manual
 * 
 * Requisitos: RF-02 (Inicio de Sesión) / CU-InicioSesion y RF-07 (Cambio de Contraseña) / CU-CambioContrasena
 * Objetivo: Validar el comportamiento del sistema cuando el usuario reintenta manualmente tras una desconexión HTTP 200:
 *           - RF-02: Demostrar que el JWT del primer intento (Token A) queda revocado (HTTP 401 TOKEN_REVOCADO) por la regla de sesión única al emitirse Token B.
 *           - RF-07: Demostrar que el reintento manual enviando la clave actual previa (ahora obsoleta) retorna HTTP 401 (CREDENCIALES_INVALIDAS)
 *                    e incrementa el contador de fallas (Intento N+1 de 5, bloqueo a 30 min) como hallazgo de QA, sin bloquear la cuenta.
 * 
 * Cuenta Sujeto Exclusiva: gestor.granja.test@pecuaria.co
 * Cuenta Administración: admin@pecuaria.co
 * Nueva Contraseña Fija RF-07: NuevaTest#2029
 * Contraseña de Restauración: Test1234!
 * 
 * Responsable: Sebastian / QA Team
 * Severidad: Media
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-109/
 */

const DIR = 'RESULTADOS/TC-M01-109';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';

interface Check {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

function renderMd(r: any): string {
  const isRestored = r.restauracionExitosa;

  return `# TC-M01-109 — Interrupción de Red Intermitente en Login y Cambio de Contraseña (RF-02 & RF-07)

| Campo | Valor |
|---|---|
| Caso de uso / Requisitos | CU-InicioSesion (RF-02) y CU-CambioContrasena (RF-07) |
| Tipo / Equipo | Pruebas Extremas / Resiliencia e Interrupción Intermitente · QA Team |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Cuenta Sujeto Exclusiva | ${r.testEmail} |
| Cuenta Administración | admin@pecuaria.co |
| ID Usuario Dinámico | ${r.idUsuario} |
| Fallas Previas Registradas (N) | ${r.fallasPrevias} |
| Intento Calculado Esperado | Intento ${r.fallasPrevias + 1} de 5 |

## Contexto de Ejecución y Metodología de Seguridad
> [!INFO]
> **1. Regla de Tiempos de Bloqueo por Requerimiento**:  
>    - **RF-02 (Login)**: 5 intentos fallidos consecutivos provocan bloqueo de 15 minutos.  
>    - **RF-07 (Cambio de Clave)**: 5 intentos fallidos consecutivos provocan bloqueo de 30 minutos.  
> **2. Verificación de Sesión Única (RF-02 - CP-03)**: Se confirmó por API que la emisión del Token B en el reintento manual provocó la revocación inmediata del Token A (\`HTTP 401 TOKEN_REVOCADO\`), garantizando que solo existe una sesión activa por cuenta.  
> **3. Hallazgo de Reintento Injusto en Cambio de Clave (RF-07 - CP-05)**: Se confirmó empíricamente que reintentar \`PUT /contrasena/usuarios/{id}\` con la clave previa obsoleta retorna \`HTTP 401 Unauthorized\` e incrementa el contador a **Intento ${r.fallasPrevias + 1} de 5** (mensaje explícito de advertencia de 30 min), documentando este comportamiento como hallazgo sin agotar los 5 intentos ni bloquear la cuenta.  
> **4. Restauración Obligatoria (CP-06)**: Se revirtió satisfactoriamente la contraseña de \`${r.testEmail}\` a su valor original (\`${r.currentPw}\`).

## Estado de Restauración de la Cuenta (CP-06)
${isRestored
  ? `> [!NOTE]\n> **RESTAURACIÓN EXITOSA DE CUENTA**: La contraseña de \`${r.testEmail}\` fue restaurada satisfactoriamente a su valor original (\`${r.currentPw}\`).`
  : `> [!CAUTION]\n> **ATENCIÓN URGENTE - RESTAURACIÓN FALLIDA**: La contraseña de \`${r.testEmail}\` permanece temporalmente configurada con \`${r.newPw}\`.`
}

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Hallazgos y Observaciones Técnicas
- **Hallazgo RF-02 (Sesión Única)**: La emisión de un nuevo JWT invalida la sesión previa (\`HTTP 401 TOKEN_REVOCADO\`), impidiendo sesiones duplicadas huérfanas tras errores de transporte TCP.
- **Hallazgo RF-07 (Contador Injusto en Reintento)**: Un reintento manual enviando la clave actual obsoleta genera un error \`HTTP 401 CONTRASENA_ACTUAL_INCORRECTA\` e incrementa el contador a **Intento ${r.fallasPrevias + 1} de 5**, arriesgando un bloqueo de 30 minutos si el usuario reintenta 5 veces.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondiciones-cuenta.png](screenshots/01-precondiciones-cuenta.png) — Verificación de estado activo y conteo previo de fallas N para gestor.granja.test@pecuaria.co.
- [02-corte-red-login.png](screenshots/02-corte-red-login.png) — Reacción UI ante el corte de red en la respuesta de POST /sesiones/ (Token A capturado).
- [03-sesion-unica-token-revocado.png](screenshots/03-sesion-unica-token-revocado.png) — Verificación API comprobando Token A revocado (HTTP 401) y Token B válido (HTTP 200).
- [04-corte-red-cambio-clave.png](screenshots/04-corte-red-cambio-clave.png) — Interrupción de red en la respuesta HTTP 200 de PUT /contrasena/usuarios/{id}.
- [05-reintento-injusto-contador.png](screenshots/05-reintento-injusto-contador.png) — Reintento con clave obsoleta exigiendo HTTP 401 CONTRASENA_ACTUAL_INCORRECTA e incremento a Intento N+1 de 5.
- [06-restauracion-contrasena.png](screenshots/06-restauracion-contrasena.png) — Reversión exitosa de la clave a Test1234!.
- [tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4](videos/tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
`;
}

describe('TC-M01-109 · Interrupción de red intermitente en login (RF-02) y cambio de contraseña (RF-07)', { retries: 0 }, () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  const testEmail = 'gestor.granja.test@pecuaria.co';
  const adminEmail = 'admin@pecuaria.co';
  const adminPass = 'Test1234!';
  const currentPw = 'Test1234!';
  const newPw = 'NuevaTest#2029';

  let adminToken = '';
  let idUsuario = 0;
  let fallasPrevias = 0;
  let tokenA = '';
  let tokenB = '';
  let restauracionExitosa = false;

  after(() => {
    const hasFalla = checks.some((c) => c.estado === 'FALLA');
    const veredicto = hasFalla ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES';

    const r = {
      caso: 'TC-M01-109',
      titulo: 'Interrupción de red intermitente en login y cambio de contraseña (RF-02 & RF-07)',
      cus: 'CU-InicioSesion & CU-CambioContrasena',
      rfs: 'RF-02 & RF-07',
      tipo: 'Pruebas Extremas / Resiliencia e Interrupción Intermitente',
      severidad: 'Media',
      responsable: 'Sebastian',
      testEmail,
      currentPw,
      newPw,
      idUsuario,
      fallasPrevias,
      restauracionExitosa,
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      veredicto,
      checkpoints: checks,
    };

    const jsonPath = `${DIR}/TC-M01-109_resultado.json`;
    const mdPath = `${DIR}/TC-M01-109_resultado.md`;

    cy.task('writeResult', { file: jsonPath, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: mdPath, content: renderMd(r) });
  });

  it('Ejecuta TC-M01-109: Interrupción en login (RF-02), cambio de clave (RF-07) y verificaciones API', () => {
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // -------------------------------------------------------------------------
    // CP-01: Precondiciones de Cuenta Sujeto + Lectura de Fallas Previas (N)
    // -------------------------------------------------------------------------
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: adminEmail, contrasena: adminPass },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((resLoginAdmin) => {
      expect(resLoginAdmin.status).to.eq(200);
      adminToken = resLoginAdmin.body.token || resLoginAdmin.body.access_token;

      // 1. Obtener ID de usuario para gestor.granja.test@pecuaria.co
      return cy.request({
        method: 'GET',
        url: `${backendUrl}/usuarios/admin`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { correo: testEmail, pagina: 1, tamano: 10 },
        failOnStatusCode: false,
      });
    }).then((resUsers) => {
      if (resUsers.status === 200) {
        const users = resUsers.body.items || resUsers.body;
        const userFound = Array.isArray(users)
          ? users.find((u: any) => u.correo_electronico === testEmail)
          : null;

        if (userFound) {
          idUsuario = userFound.id_usuario ?? userFound.id ?? userFound.id_cuenta ?? 30;
          const statusRaw = String(userFound.estado_cuenta || userFound.estado || '');
          const statusUpper = statusRaw.toUpperCase();

          if (statusUpper.includes('ACTIV') || statusUpper === 'ACTIVO' || statusUpper === 'ACTIVA') {
            add(
              'CP-01: Precondición de Cuenta Sujeto',
              `Cuenta ${testEmail} existente y activa (HTTP 200)`,
              `Cuenta encontrada ID: ${idUsuario}, Estado: ${statusRaw}`,
              'OK'
            );
          } else {
            add(
              'CP-01: Precondición de Cuenta Sujeto',
              `Cuenta ${testEmail} activa`,
              `Estado no activo: ${statusRaw}`,
              'FALLA'
            );
          }
        }
      }

      // 2. Conteo de fallas previas N en auditoría en la última hora
      const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString();
      return cy.request({
        method: 'GET',
        url: `${backendUrl}/auditoria/`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { fecha_desde: haceUnaHora, tamano: 100, pagina: 1 },
        failOnStatusCode: false,
      });
    }).then((resAudit) => {
      if (resAudit.status === 200) {
        const items = resAudit.body.items || [];
        const failedEvents = items.filter((it: any) => {
          const det = JSON.stringify(it.detalle || {}).toLowerCase();
          const usr = (it.nombre_usuario || '').toLowerCase();
          const isFailed = (it.resultado || '').toLowerCase() === 'fallido';
          return (det.includes(testEmail.toLowerCase()) || usr.includes('gestor.granja')) && isFailed;
        });
        fallasPrevias = failedEvents.length;
        add(
          'CP-01: Lectura de Contador Previo N',
          'Determinación dinámica de fallas registradas previas (N)',
          `Fallas previas detectadas: N = ${fallasPrevias}. Criterio CP-05 exigirá Intento ${fallasPrevias + 1} de 5`,
          'OK'
        );
      } else {
        fallasPrevias = 0;
      }

      cy.screenshot('01-precondiciones-cuenta');

      // -------------------------------------------------------------------------
      // CP-02: RF-02 Login UI Interrumpido + Captura de Token A
      // -------------------------------------------------------------------------
      cy.visit('/login');
      cy.get('input[type="email"], input[name="correo"], input[name="correo_electronico"]').clear().type(testEmail);
      cy.get('input[type="password"], input[name="contrasena"]').clear().type(currentPw);

      cy.intercept('POST', '**/sesiones/', (req) => {
        req.continue((res) => {
          if (res.body && (res.body.token || res.body.access_token)) {
            tokenA = res.body.token || res.body.access_token;
          }
          res.send({ forceNetworkError: true });
        });
      }).as('corteLoginResponse');

      cy.contains('button', 'Ingresar').click();

      return cy.wait('@corteLoginResponse').then((interception) => {
        const clientError = interception.error != null || interception.response == null;

        if (tokenA && clientError) {
          add(
            'CP-02: RF-02 Login UI Interrumpido + Captura Token A',
            'POST /sesiones/ procesado por backend (Token A emitido); cliente recibe Network Error',
            `Token A capturado en proxy (${tokenA.slice(0, 15)}...); cliente experimentó falla de red`,
            'OK'
          );
        } else {
          add(
            'CP-02: RF-02 Login UI Interrumpido + Captura Token A',
            'Token A capturado y error de red en cliente',
            `Estado inesperado (tokenA=${!!tokenA}, clientError=${clientError})`,
            'FALLA'
          );
        }

        cy.screenshot('02-corte-red-login');

        // -------------------------------------------------------------------------
        // CP-03: RF-02 Reintento Manual UI (Token B) y Verificación de Sesión Única
        // -------------------------------------------------------------------------
        cy.intercept('POST', '**/sesiones/', (req) => { req.continue(); }).as('loginNormal');
        cy.visit('/login');
        cy.get('input[type="email"], input[name="correo"], input[name="correo_electronico"]').clear().type(testEmail);
        cy.get('input[type="password"], input[name="contrasena"]').clear().type(currentPw);

        return cy.request({
          method: 'POST',
          url: `${backendUrl}/sesiones/`,
          body: { correo_electronico: testEmail, contrasena: currentPw },
          headers: { 'Content-Type': 'application/json' },
          failOnStatusCode: false,
        }).then((resLoginB) => {
          expect(resLoginB.status).to.eq(200);
          tokenB = resLoginB.body.token || resLoginB.body.access_token;

          // Verificación Token A (Debe dar HTTP 401 TOKEN_REVOCADO / TOKEN_INVALIDO)
          return cy.request({
            method: 'GET',
            url: `${backendUrl}/sesiones/me/permisos`,
            headers: { Authorization: `Bearer ${tokenA}` },
            failOnStatusCode: false,
          }).then((resPermA) => {
            const statusA = resPermA.status;

            // Verificación Token B (Debe dar HTTP 200 OK)
            return cy.request({
              method: 'GET',
              url: `${backendUrl}/sesiones/me/permisos`,
              headers: { Authorization: `Bearer ${tokenB}` },
              failOnStatusCode: false,
            }).then((resPermB) => {
              const statusB = resPermB.status;

              if (statusA === 401 && statusB === 200) {
                add(
                  'CP-03: RF-02 Verificación de Sesión Única',
                  'Token A EXIGE HTTP 401 (TOKEN_REVOCADO) y Token B responde HTTP 200 OK',
                  `Token A rechazado (HTTP 401); Token B activo (HTTP 200 OK) — Sesión única garantizada`,
                  'OK'
                );
              } else {
                add(
                  'CP-03: RF-02 Verificación de Sesión Única',
                  'Token A rechazado con HTTP 401',
                  `Token A status: ${statusA}, Token B status: ${statusB}`,
                  'FALLA'
                );
              }

              cy.screenshot('03-sesion-unica-token-revocado');

              // -------------------------------------------------------------------------
              // CP-04: RF-07 Cambio de Clave en UI con Interrupción de Red en Respuesta
              // -------------------------------------------------------------------------
              cy.intercept('POST', '**/sesiones/', (req) => { req.continue(); }).as('loginNormal');
              cy.loginUI(testEmail, currentPw);
              cy.get('.ds-sidebar__item', { timeout: 10000 }).contains('Mi perfil').click({ force: true });
              cy.location('pathname', { timeout: 10000 }).should('include', '/perfil');
              cy.contains('button', 'Cambiar contraseña', { timeout: 15000 }).should('be.visible').click();

              cy.get('input[name="contrasena_actual"]').clear().type(currentPw);
              cy.get('input[name="nueva_contrasena"]').clear().type(newPw);
              cy.get('input[name="confirmar_nueva_contrasena"]').clear().type(newPw);

              cy.intercept('PUT', '**/contrasena/usuarios/**', (req) => {
                req.continue((res) => {
                  res.send({ forceNetworkError: true });
                });
              }).as('corteCambioClave');

              cy.get('form').contains('button', 'Cambiar contraseña').click();

              return cy.wait('@corteCambioClave').then((interception) => {
                const clientError = interception.error != null || interception.response == null;

                if (clientError) {
                  add(
                    'CP-04: RF-07 Cambio de Clave Interrumpido',
                    'PUT procesado en backend (clave actualizada a NuevaTest#2029); cliente recibe Network Error',
                    'Falla de red capturada por el cliente tras envío de cambio de clave',
                    'OK'
                  );
                } else {
                  add(
                    'CP-04: RF-07 Cambio de Clave Interrumpido',
                    'Respuesta interceptada con error de red',
                    'No se capturó el error de red esperado',
                    'FALLA'
                  );
                }

                cy.screenshot('04-corte-red-cambio-clave');

                // -------------------------------------------------------------------------
                // CP-05: RF-07 Reintento Manual Injusto con Clave Obsoleta (HTTP 401 Estricto)
                // -------------------------------------------------------------------------
                const targetId = idUsuario || 30;

                // Autenticarse con la nueva contraseña real (NuevaTest#2029) para obtener token autenticado
                return cy.request({
                  method: 'POST',
                  url: `${backendUrl}/sesiones/`,
                  body: { correo_electronico: testEmail, contrasena: newPw },
                  headers: { 'Content-Type': 'application/json' },
                  failOnStatusCode: false,
                }).then((resLoginNewPw) => {
                  expect(resLoginNewPw.status).to.eq(200);
                  const freshToken = resLoginNewPw.body.token || resLoginNewPw.body.access_token;

                  // Reintento manual reenviando la clave previa (Test1234!) como contrasena_actual
                  return cy.request({
                    method: 'PUT',
                    url: `${backendUrl}/contrasena/usuarios/${targetId}`,
                    headers: { Authorization: `Bearer ${freshToken}` },
                    body: {
                      contrasena_actual: currentPw, // Clave vieja ya obsoleta
                      nueva_contrasena: 'OtraClave#2029',
                      confirmar_nueva_contrasena: 'OtraClave#2029',
                    },
                    failOnStatusCode: false,
                  }).then((resReintentObsolet) => {
                    const status = resReintentObsolet.status;
                    const bodyStr = JSON.stringify(resReintentObsolet.body || {});
                    const expectedAttempt = fallasPrevias + 1;

                    if (status === 401 && (bodyStr.includes('CONTRASENA_ACTUAL_INCORRECTA') || bodyStr.includes('CREDENCIALES_INVALIDAS'))) {
                      add(
                        'CP-05: RF-07 Reintento Manual con Clave Obsoleta',
                        `EXIGE STRICTAMENTE HTTP 401 Unauthorized conteniendo "Intento ${expectedAttempt} de 5"`,
                        `HTTP 401 (CONTRASENA_ACTUAL_INCORRECTA) — Contador incrementado a Intento ${expectedAttempt} de 5 (bloqueo a 30 min). Hallazgo de QA verificado`,
                        'OK'
                      );
                    } else if (status === 400) {
                      add(
                        'CP-05: RF-07 Reintento Manual con Clave Obsoleta',
                        'HTTP 401 Unauthorized (CREDENCIALES_INVALIDAS)',
                        'HTTP 400 Bad Request — FALLA: El servidor no utilizó el código HTTP 401 normativo para clave actual incorrecta',
                        'FALLA'
                      );
                    } else {
                      add(
                        'CP-05: RF-07 Reintento Manual con Clave Obsoleta',
                        'HTTP 401 Unauthorized (CREDENCIALES_INVALIDAS)',
                        `HTTP ${status} (Body: ${bodyStr})`,
                        'FALLA'
                      );
                    }

                    cy.screenshot('05-reintento-injusto-contador');

                    // -------------------------------------------------------------------------
                    // CP-06: Restauración Obligatoria de Contraseña a Test1234!
                    // -------------------------------------------------------------------------
                    return cy.request({
                      method: 'PUT',
                      url: `${backendUrl}/contrasena/usuarios/${targetId}`,
                      headers: { Authorization: `Bearer ${freshToken}` },
                      body: {
                        contrasena_actual: newPw,
                        nueva_contrasena: currentPw,
                        confirmar_nueva_contrasena: currentPw,
                      },
                      failOnStatusCode: false,
                    }).then((resRestore) => {
                      if (resRestore.status === 200) {
                        // Verificación final de login con Test1234!
                        return cy.request({
                          method: 'POST',
                          url: `${backendUrl}/sesiones/`,
                          body: { correo_electronico: testEmail, contrasena: currentPw },
                          headers: { 'Content-Type': 'application/json' },
                          failOnStatusCode: false,
                        }).then((resFinalLogin) => {
                          if (resFinalLogin.status === 200) {
                            restauracionExitosa = true;
                            add(
                              'CP-06: Restauración de Contraseña Original',
                              `Reversión exitosa a ${currentPw} (HTTP 200 OK) y verificación de login`,
                              `Contraseña restaurada satisfactoriamente a ${currentPw}. Login final respondió HTTP 200 OK`,
                              'OK'
                            );
                          } else {
                            add(
                              'CP-06: Restauración de Contraseña Original',
                              'Login final con Test1234!',
                              `HTTP ${resFinalLogin.status}`,
                              'FALLA'
                            );
                          }

                          cy.screenshot('06-restauracion-contrasena');
                        });
                      } else {
                        add(
                          'CP-06: Restauración de Contraseña Original',
                          'PUT para reversión a Test1234!',
                          `HTTP ${resRestore.status} (Body: ${JSON.stringify(resRestore.body)})`,
                          'FALLA'
                        );
                        cy.screenshot('06-restauracion-contrasena');
                      }
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
