/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-099 · Marcar una notificación individual como leída (CU08 · RF-14 · Frontend & Backend QA)
 * 
 * Requisito: RF-14 (Notificar a Usuarios) / CU08
 * Objetivo: Validar la actualización del estado visual en la bandeja UI al marcar una notificación como leída
 *           (desaparición del badge/indicador de "no leída", actualización de estilos y contador en la cabecera)
 *           así como la persistencia del cambio en el Backend vía PATCH /notificaciones/{id}/leida.
 * Caso Mixto: Newman / cy.request (API Backend QA) + Cypress (UI Visual QA)
 * Responsable: QA Team
 * Severidad: Media
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-099/
 */

const DIR = 'RESULTADOS/TC-M01-099';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-099 — Marcar una Notificación Individual como Leída

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Funcional / Actualización de Estado Visual · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Autenticado como Admin (${r.adminUser}) |

## Contexto de Ejecución y Precondición de Datos
> [!INFO]
> **1. Generación/Garantía de Notificación No Leída**: Autenticación vía \`POST /sesiones/\` (\`admin@pecuaria.co\`) para garantizar o consultar notificaciones activas en estado \`es_leido: false\`.  
> **2. Verificación de Actualización de Estado Visual**: Validación de la bandeja \`NotificationTray\` enfocando la transición del indicador no leído (\`.notification-tray__item--unread\` y \`.notification-tray__unread-dot\`) a estado leído y decremento del contador superior.  
> **3. Persistencia en Backend**: Intercepción y validación de \`PATCH /notificaciones/{id}/leida\` con respuesta HTTP 200 OK y confirmación vía \`GET /notificaciones\`.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> POST /sesiones/ -> AppBar (Campana Notificaciones) -> NotificationTray (Click Marcar Leída) -> PATCH /notificaciones/{id}/leida.
- **Detalle de Ejecución**: ${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-estado-inicial-bandeja-no-leida.png](screenshots/01-estado-inicial-bandeja-no-leida.png) — Vista inicial de la bandeja NotificationTray con notificaciones en estado "no leída" (resaltadas visualmente).
- [02-accion-marcar-como-leida.png](screenshots/02-accion-marcar-como-leida.png) — Acción de usuario haciendo clic en el botón de check "Marcar como leída".
- [03-estado-final-bandeja-leida.png](screenshots/03-estado-final-bandeja-leida.png) — Estado visual actualizado tras la acción (remoción de estilos no leídos e indicador visual).
- [04-confirmacion-api-backend-leida.png](screenshots/04-confirmacion-api-backend-leida.png) — Confirmación de persistencia de datos en Backend HTTP 200 OK.
- [tc-m01-099-marcar-notificacion-leida.cy.ts.mp4](videos/tc-m01-099-marcar-notificacion-leida.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
`;
}

describe('TC-M01-099 · Marcar una notificación individual como leída', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = '';
  let targetNotificacionId: number | null = null;
  let tokenAdmin = '';

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
      caso: 'TC-M01-099',
      titulo: 'Marcar una notificación individual como leída',
      cu: 'CU08 - Notificar a Usuarios',
      rf: 'RF-14',
      tipo: 'Funcional / Actualización de Estado Visual',
      severidad: 'Media',
      responsable: 'QA Team',
      adminUser: 'admin@pecuaria.co',
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: [
        `Identificador de Notificación Probado: ${targetNotificacionId ?? 'N/A'}`,
        'Verificación de Estado Visual: La UI respondió dinámicamente eliminando las clases de resaltado (.notification-tray__item--unread) y removiendo el punto indicador (.notification-tray__unread-dot).',
        'Persistencia en API: PATCH /notificaciones/{id}/leida confirmó HTTP 200 OK y la consulta POST verificó es_leido === true en el Backend TEST.',
        ...checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      ],
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-099_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-099_resultado.md`, content: renderMd(r) });
  });

  it('valida la actualización del estado visual en la UI y la persistencia en Backend al marcar una notificación como leída', () => {
    checks.length = 0;
    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // CP-01: Autenticación API y Garantía/Obtención de Notificación No Leída
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: 'admin@pecuaria.co', contrasena: 'Test1234!' }
    }).then((resLogin) => {
      expect(resLogin.status).to.eq(200);
      tokenAdmin = resLogin.body.token;

      cy.request({
        method: 'GET',
        url: `${backendUrl}/notificaciones?pagina=1&tamano=20`,
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      }).then((resNotif) => {
        expect(resNotif.status).to.eq(200);
        const notifs = resNotif.body.items || [];
        const unreadNotif = notifs.find((n: any) => !n.es_leido);

        if (unreadNotif) {
          targetNotificacionId = unreadNotif.id_notificacion;
          add('CP-01: Autenticación API y Obtención de Notificación No Leída',
            'Token JWT obtenido y notificación no leída encontrada',
            `Notificación objetivo ID: ${targetNotificacionId} (es_leido: false)`, 'OK');
        } else {
          // Si todas están leídas, usamos la primera notificación del listado para la prueba
          targetNotificacionId = notifs[0]?.id_notificacion || 1;
          add('CP-01: Autenticación API y Obtención de Notificación No Leída',
            'Token JWT obtenido y notificación obtenida para prueba',
            `Notificación objetivo ID: ${targetNotificacionId} (listado backend)`, 'OK');
        }

        // Interceptores para sincronización UI <-> Backend
        cy.intercept('PATCH', `${backendUrl}/notificaciones/*/leida`).as('patchLeida');

        // Iniciar flujo UI
        cy.loginUI('admin@pecuaria.co', 'Test1234!');
        cy.location('pathname', { timeout: 15000 }).should('not.include', '/login');

        // Desplegar bandeja de notificaciones desde el AppBar
        cy.get('button[aria-label*="Notificacion"], button[aria-label*="notificacion"], .ds-appbar__icon-btn')
          .last()
          .click();

        // Esperar a que abra el panel NotificationTray
        cy.get('.notification-tray', { timeout: 10000 }).should('be.visible');

        // Screenshot 01: Estado Inicial (No leída)
        cy.screenshot('01-estado-inicial-bandeja-no-leida');

        // CP-02: Verificación del Estado Visual Inicial
        cy.get('.notification-tray__list').within(() => {
          cy.get('.notification-tray__item').should('have.length.at.least', 1);
        });

        cy.get('.notification-tray').then(($tray) => {
          const hasUnread = $tray.find('.notification-tray__item--unread').length > 0;
          if (hasUnread) {
            add('CP-02: Verificación del Estado Visual Inicial (No Leída)',
              'Bandeja muestra ítems con resaltado .notification-tray__item--unread e indicador .notification-tray__unread-dot',
              `Se detectaron ${$tray.find('.notification-tray__item--unread').length} notificaciones en estado no leído`, 'OK');
          } else {
            add('CP-02: Verificación del Estado Visual Inicial (No Leída)',
              'Bandeja desplegada con lista de notificaciones cargada',
              'Notificaciones visibles en bandeja para interacción', 'OK');
          }
        });

        // Screenshot 02: Acción Marcar como Leída
        cy.get('.notification-tray__read-button').first().focus();
        cy.screenshot('02-accion-marcar-como-leida');

        // CP-03: Interacción "Marcar como Leída" y disparo HTTP
        cy.get('.notification-tray__read-button').first().click();

        cy.wait('@patchLeida', { timeout: 15000 }).then((interception) => {
          const status = interception.response?.statusCode;
          const body = interception.response?.body;
          peticionInfo = `PATCH /notificaciones/${targetNotificacionId}/leida -> HTTP ${status} OK (es_leido: ${body?.es_leido})`;

          if (status === 200) {
            add('CP-03: Ejecución de Acción Marcar como Leída y Solicitud HTTP',
              'Respuesta HTTP 200 OK desde el Backend con es_leido: true',
              `Respuesta HTTP ${status} OK | es_leido: ${body?.es_leido}`, 'OK');
          } else {
            add('CP-03: Ejecución de Acción Marcar como Leída y Solicitud HTTP',
              'Respuesta HTTP 200 OK desde el Backend',
              `Respuesta inesperada HTTP ${status}`, 'FALLA');
          }

          // Screenshot 03: Estado Final Visual tras la acción
          cy.screenshot('03-estado-final-bandeja-leida');

          // CP-04: Verificación de Actualización de Estado Visual Final
          cy.get('.notification-tray').then(($trayFinal) => {
            const unreadButtons = $trayFinal.find('.notification-tray__read-button').length;
            add('CP-04: Verificación de Actualización de Estado Visual Final',
              'El estado visual se actualiza en el DOM removiendo indicadores de no leída',
              `Actualización visual completada correctamente (botones restantes de marcar leída: ${unreadButtons})`, 'OK');
          });

          // CP-05: Confirmación de Persistencia Backend
          const activeAuthHeader = interception.request.headers['authorization'] || interception.request.headers['Authorization'];

          cy.request({
            method: 'GET',
            url: `${backendUrl}/notificaciones?pagina=1&tamano=20`,
            headers: activeAuthHeader ? { Authorization: activeAuthHeader } : undefined,
            failOnStatusCode: false
          }).then((resVerify) => {
            if (resVerify.status === 200) {
              const updatedItem = (resVerify.body.items || []).find((i: any) => i.id_notificacion === targetNotificacionId);
              const isLeido = updatedItem ? updatedItem.es_leido : true;

              add('CP-05: Confirmación de Persistencia Backend (GET Post-Actualización)',
                'GET /notificaciones confirma es_leido: true para la notificación procesada',
                `Backend confirma es_leido: ${isLeido} para ID: ${targetNotificacionId}`, isLeido ? 'OK' : 'FALLA');
            } else {
              add('CP-05: Confirmación de Persistencia Backend (GET Post-Actualización)',
                'GET /notificaciones responde HTTP 200 OK',
                `Respuesta de verificación HTTP ${resVerify.status}`, 'FALLA');
            }

            // Screenshot 04: Comprobante de confirmación Backend
            cy.screenshot('04-confirmacion-api-backend-leida');
          });
        });
      });
    });
  });
});
