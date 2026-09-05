/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-107 · Pérdida de conexión simulada en la respuesta HTTP 202 de solicitud de recuperación de contraseña
 * 
 * Requisito: RF-08 (Recuperación de Contraseña) / CU-RecuperacionContrasena
 * Objetivo: Demostrar que el servidor procesó el token de recuperación y registró la auditoría aunque el cliente sufra un corte de red en la respuesta HTTP 202,
 *           y evaluar determinísticamente el comportamiento del contador de rate-limit (3 solicitudes/hora por IP) en un reintento posterior.
 * 
 * Cuenta de Prueba Sujeto: gestor.granja.test@pecuaria.co
 * Cuenta de Administración: admin@pecuaria.co
 * 
 * Responsable: Sebastian / QA Team
 * Severidad: Media
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-107/
 */

const DIR = 'RESULTADOS/TC-M01-107';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';

interface Check {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

function renderMd(r: any): string {
  return `# TC-M01-107 — Pérdida de Conexión en Respuesta HTTP 202 (Recuperación de Contraseña)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-RecuperacionContrasena - Recuperación de Contraseña · RF-08 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Cuenta de Prueba (Sujeto) | ${r.testEmail} |
| Cuenta de Administración | admin@pecuaria.co |
| IP Runner Capturada | ${r.runnerIp || 'No detectada'} |
| Intentos Previos Reales por IP (Última Hora) | ${r.intentosPrevios} |
| Total Consumidos Pre-CP04 (N = Previos + CP02) | ${r.totalPreCp04} |
| Respuesta Esperada CP-04 | ${r.esperadoCp04} |
| Respuesta Real CP-04 | HTTP ${r.obtenidoCp04} (${r.codigoRespuestaCp04 || 'OK'}) |

## Contexto de Ejecución y Metodología de Resiliencia
> [!INFO]
> **1. Verificación Inicial de Precondiciones (CP-01)**: Se confirmó vía API la existencia y estado activo de la cuenta \`${r.testEmail}\` en \`GET /usuarios/admin\` con normalización de casing (\`.toUpperCase()\`) y lectura segura del ID de usuario (${r.idUsuario || 'N/A'}).  
> **2. Intercepción Fiel de Respuesta HTTP 202 (CP-02)**: Se utilizó \`req.continue((res) => res.send({ forceNetworkError: true }))\` para garantizar que el servidor backend recibiera el POST real para \`${r.testEmail}\` antes de simular el corte de red en el cliente.  
> **3. Matching Estricto en Auditoría y Captura de IP (CP-03)**: Se validó mediante \`GET /auditoria/\` que el evento fue registrado en la BD para \`${r.testEmail}\` y se capturó la dirección IP real del runner (\`${r.runnerIp || 'Desconocida'}\`).  
> **4. Conteo en Dos Fases por IP Real (CP-03 -> CP-04)**: Una vez obtenida la IP (\`${r.runnerIp}\`), se contabilizaron TODOS los eventos de recuperación originados por esa IP en la última hora (independientemente del correo) para obtener el $N$ real (${r.intentosPrevios}).  
> **5. Evaluación Determinista del Rate-Limit (CP-04)**: Con $N = ${r.totalPreCp04}$ solicitudes consumidas antes del reintento de CP-04:
>    - Si $N < 3$: Se exige \`HTTP 202\` (marcando \`FALLA\` si responde \`HTTP 429\` o \`HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO\`).
>    - Si $N \\ge 3$: Se exige bloqueo de cuota por IP (\`HTTP 429\` o \`HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO\`).

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Cuantitativo de Consumo de Cuota (Rate-Limit IP)
- **Ventana temporal**: Última hora previa a la ejecución.
- **IP real del runner capturada**: \`${r.runnerIp || 'N/A'}\`
- **Solicitudes de recuperación registradas previamente para esa IP (cualquier correo)**: ${r.intentosPrevios}
- **Solicitudes consumidas durante la corrida actual**: ${r.intentosConsumidosTest}
- **Consumo total acumulado en la hora para la IP**: ${r.intentosPrevios + r.intentosConsumidosTest} / 3 por IP
- **Observación de repetibilidad**: ${r.observacionRepetibilidad}

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondiciones-cuenta.png](screenshots/01-precondiciones-cuenta.png) — Verificación de existencia y estado activo de la cuenta ${r.testEmail} vía API Admin.
- [02-corte-red-respuesta.png](screenshots/02-corte-red-respuesta.png) — Captura del cliente experimentando error de red post-envío de formulario de recuperación.
- [03-auditoria-backend.png](screenshots/03-auditoria-backend.png) — Registro de auditoría backend comprobando que la solicitud fue procesada por el servidor y capturando la IP real.
- [04-reintento-ratelimit.png](screenshots/04-reintento-ratelimit.png) — Resultado del reintento evaluando determinísticamente la respuesta del rate-limit según la cuota real de la IP.
- [tc-m01-107-interrupcion-recuperacion.cy.ts.mp4](videos/tc-m01-107-interrupcion-recuperacion.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
`;
}

describe('TC-M01-107 · Pérdida de conexión simulada en la respuesta HTTP 202 (RF-08)', { retries: 0 }, () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  const testEmail = 'gestor.granja.test@pecuaria.co';
  const adminEmail = 'admin@pecuaria.co';
  const adminPass = 'Test1234!';
  
  let adminToken = '';
  let idUsuario = 0;
  let runnerIp = '';
  let intentosPrevios = 0;
  let totalPreCp04 = 0;
  let esperadoCp04 = 'HTTP 202';
  let obtenidoCp04 = 0;
  let codigoRespuestaCp04 = '';
  let intentosConsumidosTest = 0;
  let observacionRepetibilidad = '';

  before(() => {
    // Solución CORS para scripts/assets de Vite bajo el proxy de Cypress
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
      caso: 'TC-M01-107',
      titulo: 'Pérdida de conexión simulada en la respuesta HTTP 202 (Recuperación de Contraseña)',
      cu: 'CU-RecuperacionContrasena',
      rf: 'RF-08',
      tipo: 'Pruebas Extremas / Resiliencia y Red',
      severidad: 'Media',
      responsable: 'Sebastian',
      testEmail,
      idUsuario,
      runnerIp,
      intentosPrevios,
      totalPreCp04,
      esperadoCp04,
      obtenidoCp04,
      codigoRespuestaCp04,
      intentosConsumidosTest,
      observacionRepetibilidad,
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      veredicto,
      checkpoints: checks,
    };

    // Escritura de entregables JSON y Markdown
    const jsonPath = `${DIR}/TC-M01-107_resultado.json`;
    const mdPath = `${DIR}/TC-M01-107_resultado.md`;

    cy.task('writeResult', { file: jsonPath, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: mdPath, content: renderMd(r) });
  });

  it('Ejecuta TC-M01-107: Simulación de interrupción en respuesta 202 y validación API/Auditoría', () => {
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // -------------------------------------------------------------------------
    // CP-01: Autenticación Admin + Verificación de Cuenta + Conteo Aproximado Previo
    // -------------------------------------------------------------------------
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: adminEmail, contrasena: adminPass },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((resLogin) => {
      expect(resLogin.status).to.eq(200);
      adminToken = resLogin.body.token || resLogin.body.access_token;

      // 1. Verificar existencia y estado activo de gestor.granja.test@pecuaria.co en /usuarios/admin
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
          idUsuario = userFound.id_usuario ?? userFound.id ?? userFound.id_cuenta ?? 0;
          const statusRaw = String(userFound.estado_cuenta || userFound.estado || '');
          const statusUpper = statusRaw.toUpperCase();

          if (statusUpper.includes('ACTIV') || statusUpper === 'ACTIVO' || statusUpper === 'ACTIVA') {
            add(
              'CP-01: Precondición de Cuenta',
              `Cuenta ${testEmail} existente y activa (HTTP 200)`,
              `Cuenta encontrada ID: ${idUsuario}, Estado: ${statusRaw}`,
              'OK'
            );
          } else {
            add(
              'CP-01: Precondición de Cuenta',
              `Cuenta ${testEmail} activa (no PENDIENTE / ELIMINADO)`,
              `Estado de cuenta inválido: ${statusRaw}`,
              'FALLA'
            );
          }
        } else {
          add(
            'CP-01: Precondición de Cuenta',
            `Cuenta ${testEmail} existente en BD TEST`,
            `No se encontró el correo ${testEmail} en el listado de usuarios`,
            'FALLA'
          );
        }
      } else {
        add(
          'CP-01: Precondición de Cuenta',
          `Consulta HTTP 200 OK a /usuarios/admin`,
          `HTTP ${resUsers.status}`,
          'FALLA'
        );
      }

      // 2. Conteo aproximado inicial por correo en la última hora
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
        const recoveryEvents = items.filter((it: any) => {
          const d = JSON.stringify(it.detalle || {}).toLowerCase();
          const usr = (it.nombre_usuario || '').toLowerCase();
          return d.includes(testEmail.toLowerCase()) || usr.includes('gestor.granja');
        });
        intentosPrevios = recoveryEvents.length;
      } else {
        intentosPrevios = 0;
      }

      cy.screenshot('01-precondiciones-cuenta');

      // -------------------------------------------------------------------------
      // CP-02: Envío de Solicitud con Interrupción en la Respuesta HTTP 202
      // -------------------------------------------------------------------------
      const startTimeCp02 = new Date(Date.now() - 5000).toISOString();

      cy.visit('/recuperar-contrasena');
      cy.get('input[type="email"], input[name="correo"], input[name="correo_electronico"]')
        .clear()
        .type(testEmail);

      cy.intercept('POST', '**/contrasena/recuperar', (req) => {
        req.continue((res) => {
          res.send({ forceNetworkError: true });
        });
      }).as('recuperarInterrumpido');

      cy.contains('button', /enviar|recuperar/i).click();

      return cy.wait('@recuperarInterrumpido').then((interception) => {
        const reqSent = !!interception.request;
        const clientError = interception.error != null || interception.response == null;

        if (reqSent && clientError) {
          add(
            'CP-02: Interrupción de Red en Respuesta 202',
            'Solicitud enviada al backend real y respuesta interceptada con error de red en cliente',
            `POST enviado exitosamente al backend; cliente recibió falla de red (forceNetworkError)`,
            'OK'
          );
        } else {
          add(
            'CP-02: Interrupción de Red en Respuesta 202',
            'Respuesta interceptada con falla de red',
            `Estado inesperado de intercepción (reqSent=${reqSent}, clientError=${clientError})`,
            'FALLA'
          );
        }

        intentosConsumidosTest += 1;
        cy.screenshot('02-corte-red-respuesta');

        // -------------------------------------------------------------------------
        // CP-03: Auditoría Backend + Captura de IP Real + Re-evaluación Completa por IP
        // -------------------------------------------------------------------------
        return cy.request({
          method: 'GET',
          url: `${backendUrl}/auditoria/`,
          headers: { Authorization: `Bearer ${adminToken}` },
          qs: { fecha_desde: startTimeCp02, tamano: 50, pagina: 1 },
          failOnStatusCode: false,
        }).then((resAuditPost) => {
          if (resAuditPost.status === 200) {
            const items = resAuditPost.body.items || [];
            const auditMatch = items.find((it: any) => {
              const detalleStr = JSON.stringify(it.detalle || {}).toLowerCase();
              const usr = (it.nombre_usuario || '').toLowerCase();
              return detalleStr.includes(testEmail.toLowerCase()) || usr.includes('gestor.granja');
            });

            if (auditMatch) {
              runnerIp = auditMatch.direccion_ip || '';
              add(
                'CP-03: Auditoría Backend Post-Interrupción',
                `Evento de recuperación registrado en BD exigiendo coincidencia con ${testEmail}`,
                `Evento ID ${auditMatch.id_evento} registrado a las ${auditMatch.fecha_evento} (IP: ${runnerIp || 'N/A'}, Resultado: ${auditMatch.resultado})`,
                'OK'
              );

              // Re-evaluar auditoría de la última hora FILTRANDO POR IP COMPLETA (cualquier correo desde esa IP)
              if (runnerIp) {
                const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString();
                return cy.request({
                  method: 'GET',
                  url: `${backendUrl}/auditoria/`,
                  headers: { Authorization: `Bearer ${adminToken}` },
                  qs: { fecha_desde: haceUnaHora, tamano: 100, pagina: 1 },
                  failOnStatusCode: false,
                }).then((resAuditIp) => {
                  if (resAuditIp.status === 200) {
                    const ipItems = resAuditIp.body.items || [];
                    // Filtrar TODOS los eventos de recuperación solicitados desde runnerIp antes de CP-02
                    const ipEventsBefore = ipItems.filter((it: any) => {
                      const matchIp = it.direccion_ip === runnerIp;
                      const dateOk = new Date(it.fecha_evento) < new Date(startTimeCp02);
                      const det = JSON.stringify(it.detalle || {}).toLowerCase();
                      const desc = (it.descripcion || '').toLowerCase();
                      return matchIp && dateOk && (det.includes('recuper') || desc.includes('recuper'));
                    });
                    intentosPrevios = ipEventsBefore.length;
                  }
                });
              }
            } else {
              add(
                'CP-03: Auditoría Backend Post-Interrupción',
                `Registro explícito de evento para ${testEmail} post-interrupción`,
                `No se encontró evento en auditoría con el correo de prueba ${testEmail}`,
                'FALLA'
              );
            }
          } else {
            add(
              'CP-03: Auditoría Backend Post-Interrupción',
              'Consulta exitosa HTTP 200 OK a /auditoria/',
              `HTTP ${resAuditPost.status}`,
              'FALLA'
            );
          }

          cy.screenshot('03-auditoria-backend');
        });
      }).then(() => {
        // -------------------------------------------------------------------------
        // CP-04: Reintento de Usuario y Evaluación Determinista de Rate-Limit por IP (< 3 / >= 3)
        // -------------------------------------------------------------------------
        totalPreCp04 = intentosPrevios + 1; // +1 por CP-02

        if (totalPreCp04 < 3) {
          esperadoCp04 = 'HTTP 202';
        } else {
          esperadoCp04 = 'HTTP 429 o HTTP 422 (LIMITE_SOLICITUDES_EXCEDIDO)';
        }

        return cy.request({
          method: 'POST',
          url: `${backendUrl}/contrasena/recuperar`,
          body: { correo_electronico: testEmail },
          headers: { 'Content-Type': 'application/json' },
          failOnStatusCode: false,
        }).then((resRetry) => {
          obtenidoCp04 = resRetry.status;
          codigoRespuestaCp04 = resRetry.body?.error_code || (obtenidoCp04 === 202 ? 'EXITOSO' : 'DESCONOCIDO');
          intentosConsumidosTest += 1;

          const isRateLimited = obtenidoCp04 === 429 || (obtenidoCp04 === 422 && JSON.stringify(resRetry.body).includes('LIMITE_SOLICITUDES_EXCEDIDO'));

          if (totalPreCp04 < 3) {
            if (obtenidoCp04 === 202) {
              add(
                'CP-04: Reintento y Rate-Limit (N < 3)',
                `Con N=${totalPreCp04} solicitudes previas en IP (< 3), la solicitud (N+1=${totalPreCp04 + 1}) EXIGE HTTP 202`,
                `HTTP 202 OK — El reintento fue aceptado sin penalización prematura`,
                'OK'
              );
            } else if (isRateLimited) {
              add(
                'CP-04: Reintento y Rate-Limit (N < 3)',
                `Con N=${totalPreCp04} solicitudes previas en IP (< 3), la solicitud (N+1=${totalPreCp04 + 1}) EXIGE HTTP 202`,
                `HTTP ${obtenidoCp04} (${codigoRespuestaCp04}) — FALLA: El servidor penalizó el reintento prematuramente`,
                'FALLA'
              );
            } else {
              add(
                'CP-04: Reintento y Rate-Limit (N < 3)',
                `HTTP 202`,
                `HTTP ${obtenidoCp04} (Respuesta: ${JSON.stringify(resRetry.body)})`,
                'FALLA'
              );
            }
          } else {
            // totalPreCp04 >= 3
            if (isRateLimited) {
              add(
                'CP-04: Reintento y Rate-Limit (N >= 3)',
                `Con N=${totalPreCp04} solicitudes previas en IP (>= 3), la cuota ya estaba agotada y se EXIGE bloqueo`,
                `HTTP ${obtenidoCp04} (${codigoRespuestaCp04}) — Bloqueo de cuota por IP de 3/hora aplicado correctamente`,
                'OK'
              );
            } else if (obtenidoCp04 === 202) {
              add(
                'CP-04: Reintento y Rate-Limit (N >= 3)',
                `Con N=${totalPreCp04} solicitudes previas en IP (>= 3), la cuota ya estaba agotada y se EXIGE bloqueo`,
                `HTTP 202 OK — FALLA: El servidor permitió exceder la cuota estricta de 3/hora por IP`,
                'FALLA'
              );
            } else {
              add(
                'CP-04: Reintento y Rate-Limit (N >= 3)',
                `Bloqueo HTTP 429/422`,
                `HTTP ${obtenidoCp04} (Respuesta: ${JSON.stringify(resRetry.body)})`,
                'FALLA'
              );
            }
          }

          observacionRepetibilidad = `La prueba consumió ${intentosConsumidosTest} solicitud(es) de la cuota de 3/hora por IP (Total acumulado IP ${runnerIp || 'local'}: ${totalPreCp04 + 1}).`;
          cy.screenshot('04-reintento-ratelimit');
        });
      });
    });
  });
});
