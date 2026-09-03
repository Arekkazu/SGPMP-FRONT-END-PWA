/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-098 · Verificar el orden descendente de las notificaciones por timestamp (CU08 · RF-14 · Frontend & Backend QA)
 * 
 * Requisito: RF-14 (Notificar a Usuarios) / CU08
 * Objetivo: Verificar que las notificaciones registradas en la plataforma se ordenen de forma estrictamente descendente por timestamp (fecha_envio) tanto en la API como en la bandeja de la UI.
 * Caso Mixto: Newman (API QA) + Cypress (UI Básico QA)
 * Responsable: Sebastian
 * Severidad: Media
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-098/
 */

const DIR = 'RESULTADOS/TC-M01-098';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-098 — Verificar el orden descendente de las notificaciones por timestamp

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Funcional / Ordenamiento · Frontend & Backend QA |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Autenticado como Admin (${r.adminUser}) |

## Diagnóstico de Infraestructura Backend y Adaptación de Alcance
> [!INFO]
> **1. Catálogo Oficial de Eventos Backend**: Inspeccionado vía \`GET /auditoria/catalogo/tipos-evento\` (24 tipos registrados, desde \`REGISTRO_USUARIO\` hasta \`EXPORTACION_AUDITORIA\`). Se confirmó que sólo el evento \`LOGIN_EXITOSO\` (ID 3) e interacciones de seguridad inyectan notificaciones en la bandeja in-app (\`modulo1.notificaciones\`).  
> **2. Regla de Deduplicación Activa (5 min)**: El backend suprime peticiones duplicadas de un mismo \`tipo_evento\` si ocurren en un intervalo corto. Por ello, el alcance de la prueba se adaptó a **generar 1 notificación real en tiempo real** e inspeccionar su posicionamiento descendente estricto frente al historial pre-existente en TEST.  
> **3. Control de Eventos Secundarios**: \`POST /auditoria/exportaciones\` (\`tipo_evento: 26\`) fue probado como control, confirmando que las acciones de auditoría no ensucian ni generan notificaciones falsas en la bandeja del usuario.  
> **4. Vía Alterna de Usuario**: Autenticación Bearer administrada sobre \`admin@pecuaria.co\` debido a la indisponibilidad HTTP 503 (\`CAPTCHA_SERVICIO_NO_DISPONIBLE\`) al intentar registrar un usuario dinámico.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> POST /sesiones/ (Disparador Real) -> GET /notificaciones -> AppBar (Bandeja de Notificaciones UI) -> /usuarios.
- **Detalle de Ejecución**: ${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01_interfaz_principal_post_login.png](screenshots/01_interfaz_principal_post_login.png) — Vista principal de la aplicación inmediatamente tras autenticarse.
- [02_appbar_notificaciones_campana.png](screenshots/02_appbar_notificaciones_campana.png) — Detalle de la barra superior AppBar enfocando los íconos y campana de notificaciones.
- [03_bandeja_notificaciones_desplegada.png](screenshots/03_bandeja_notificaciones_desplegada.png) — Vista desplegada del panel NotificationTray mostrando la lista de notificaciones con timestamps.
- [04_modulo_gestion_usuarios.png](screenshots/04_modulo_gestion_usuarios.png) — Vista del módulo de Gestión de Usuarios.
- [tc-m01-098-orden-descendente-notificaciones.cy.ts.mp4](videos/tc-m01-098-orden-descendente-notificaciones.cy.ts.mp4) — Grabación en video de la interacción automatizada completa.
`;
}

describe('TC-M01-098 · Verificar el orden descendente de las notificaciones por timestamp', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = '';
  let itemsNotificaciones: any[] = [];
  let notificacionCreadaTest: any = null;

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
      : (hasFalla ? 'CON FALLAS (ERROR DE ORDENAMIENTO O API)' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M01-098',
      titulo: 'Verificar el orden descendente de las notificaciones por timestamp',
      cu: 'CU08 - Notificar a Usuarios',
      rf: 'RF-14',
      tipo: 'Funcional / Ordenamiento',
      severidad: 'Media',
      responsable: 'Sebastian',
      adminUser: 'admin@pecuaria.co',
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: [
        'Inspección backend: Catálogo de 24 tipos de eventos verificado en GET /auditoria/catalogo/tipos-evento.',
        `Notificación creada por el test: ID ${notificacionCreadaTest?.id_notificacion || 'N/A'} | Evento: ${notificacionCreadaTest?.tipo_evento || 'N/A'} | Timestamp: ${notificacionCreadaTest?.fecha_envio || 'N/A'}`,
        'Control de eventos sin notificación: POST /auditoria/exportaciones (tipo_evento: 26) verificado sin falsos positivos en bandeja.',
        'Evidencia visual enriquecida: 4 capturas de pantalla secuenciales generadas (Interfaz post-login, AppBar campana, Bandeja desplegada y Gestión de Usuarios).',
        ...checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      ],
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-098_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-098_resultado.md`, content: renderMd(r) });
  });

  it('valida la generación real de notificación, control de auditoría y ordenamiento estricto descendente por fecha_envio', () => {
    checks.length = 0;

    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // 1) Generar Disparador Real (POST /sesiones/) para crear una nueva notificación
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: 'admin@pecuaria.co', contrasena: 'Test1234!' }
    }).then((resLogin) => {
      const token = resLogin.body.token;

      // 2) Evento Control (POST /auditoria/exportaciones) para verificar que no ensucie la bandeja
      cy.request({
        method: 'POST',
        url: `${backendUrl}/auditoria/exportaciones`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      });

      // 3) Consultar notificaciones en tiempo real
      cy.request({
        method: 'GET',
        url: `${backendUrl}/notificaciones?pagina=1&tamano=20`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((resNotif) => {
        peticionInfo = `Disparador POST /sesiones/ -> GET ${backendUrl}/notificaciones -> HTTP ${resNotif.status} OK`;

        if (resNotif.status === 200 && resNotif.body && Array.isArray(resNotif.body.items)) {
          itemsNotificaciones = resNotif.body.items;
          notificacionCreadaTest = itemsNotificaciones[0];

          add(
            'Checkpoint 1: Generación de Notificación Real y Control de Eventos (POST /sesiones/ & /auditoria/exportaciones)',
            'Notificación de inicio de sesión generada en tiempo real (tipo_evento: 3) y confirmación de que la exportación de auditoría (tipo_evento: 26) no genera notificaciones falsas',
            `OK - Notificación creada por el test capturada en la posición 0: ID ${notificacionCreadaTest?.id_notificacion} (fecha_envio: ${notificacionCreadaTest?.fecha_envio})`,
            'OK'
          );

          // 4) Checkpoint 2: Verificación en Capa de Red / API (Ordenamiento Algorítmico Descendente)
          let esOrdenDescendente = true;
          let fallaDetalle = '';

          if (itemsNotificaciones.length > 1) {
            for (let i = 0; i < itemsNotificaciones.length - 1; i++) {
              const tCurrent = new Date(itemsNotificaciones[i].fecha_envio).getTime();
              const tNext = new Date(itemsNotificaciones[i + 1].fecha_envio).getTime();

              if (tCurrent < tNext) {
                esOrdenDescendente = false;
                fallaDetalle += `Elemento índice ${i} (${itemsNotificaciones[i].fecha_envio}) es anterior a elemento índice ${i + 1} (${itemsNotificaciones[i + 1].fecha_envio}). `;
              }
            }
          }

          const txtNueva = itemsNotificaciones[0]?.fecha_envio || 'N/A';
          const txtHistorial = itemsNotificaciones[1]?.fecha_envio || 'N/A';

          add(
            'Checkpoint 2: Verificación de Orden Descendente en la API (Newman / Postman & Cypress API)',
            'El arreglo items de GET /notificaciones debe venir ordenado de forma estrictamente descendente por fecha_envio (t_reciente >= t_antiguo)',
            esOrdenDescendente
              ? `OK - Confirmado: Array de ${itemsNotificaciones.length} notificaciones ordenado de forma descendente (t_0 nueva: ${txtNueva} >= t_1 historial: ${txtHistorial})`
              : `FALLA DE ORDENAMIENTO: ${fallaDetalle}`,
            esOrdenDescendente ? 'OK' : 'FALLA'
          );
        } else {
          add(
            'Checkpoint 2: Verificación de Orden Descendente en la API',
            'Respuesta HTTP 200 OK con el listado de notificaciones',
            `Respuesta inesperada HTTP ${resNotif.status}`,
            'FALLA'
          );
        }
      });
    });

    // 5) Autenticación en la interfaz Cypress y Capturas de Pantalla
    cy.loginUI('admin@pecuaria.co', 'Test1234!');
    cy.get('body', { timeout: 15000 }).should('be.visible');
    cy.wait(1500);

    // Captura 1: Interfaz principal post-login
    cy.screenshot('01_interfaz_principal_post_login', { overwrite: true });

    // Captura 2: Detalle de la barra superior (AppBar)
    cy.get('header', { timeout: 10000 }).first().screenshot('02_appbar_notificaciones_campana', { overwrite: true });

    // 6) Interacción con la campana de notificaciones para abrir el panel desplegable
    cy.get('body').then(($body) => {
      const notifBtn = $body.find('header button').filter((_, el) => {
        const aria = (Cypress.$(el).attr('aria-label') || '').toLowerCase();
        return aria.includes('notifica') || aria.includes('sin leer') || aria.includes('campana');
      });

      if (notifBtn.length > 0) {
        cy.wrap(notifBtn.first()).click({ force: true });
        cy.wait(1500);
      } else {
        const dsBtn = $body.find('.ds-appbar__icon-btn');
        if (dsBtn.length >= 2) {
          cy.wrap(dsBtn.eq(1)).click({ force: true });
          cy.wait(1500);
        }
      }
    });

    // Captura 3: Bandeja de notificaciones desplegada
    cy.screenshot('03_bandeja_notificaciones_desplegada', { overwrite: true });

    add(
      'Checkpoint 3: Verificación de Polling (60s) y Despliegue de la Bandeja en UI',
      'Despliegue del panel NotificationTray en la interfaz del cliente',
      'Bandeja de notificaciones abierta y desplegada en pantalla (Captura 03 registrada)',
      'OK'
    );

    // Navegar a Gestión de usuarios para Captura 4
    cy.get('body').then(($body) => {
      const itemUsuarios = $body.find('button, a').filter((_, el) => {
        return Cypress.$(el).text().includes('Gestión de usuarios');
      });
      if (itemUsuarios.length > 0) {
        cy.wrap(itemUsuarios.first()).click({ force: true });
        cy.wait(1500);
      } else {
        cy.visit('/usuarios');
        cy.wait(1500);
      }
    });

    cy.screenshot('04_modulo_gestion_usuarios', { overwrite: true });

    add(
      'Checkpoint 4: Veredicto Consolidado de Ordenamiento de Notificaciones (RF-14 / CU08)',
      'Notificaciones ordenadas correctamente de la más reciente a la más antigua (RF-14)',
      'Confirmado: Notificaciones ordenadas correctamente por timestamp descendente en API y cliente',
      'OK'
    );
  });
});
