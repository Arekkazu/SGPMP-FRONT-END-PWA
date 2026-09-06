/// <reference types="cypress" />
import './commands';

/**
 * TC-M01-101 · Verificar comportamiento de notificaciones cuando el sistema está offline
 *
 * Requisito: RF-14 (Notificar a los usuarios) / CU08
 * Objetivo: confirmar que la bandeja de notificaciones (src/notificaciones/) cae a la
 * caché local (IndexedDB vía Dexie, notificacionesTable.ts) cuando el backend no responde,
 * en vez de romperse o vaciarse -- y que vuelve a mostrar datos en vivo al reconectar.
 * Comportamiento esperado, leído en useNotificaciones.ts: si `notificacionesApi.listar()`
 * falla, se cae a `obtenerNotificacionesCache()` y se marca `fromCache=true`, lo que la UI
 * (NotificationTray.tsx) traduce en el aviso "Sin conexión: mostrando las notificaciones
 * guardadas en este dispositivo." (clave i18n notificationtray.sin_conexion_mostrando_las_notificaciones).
 *
 * Cuenta de prueba: gestor.granja.test@pecuaria.co (ya usada limpia en TC-M01-107/085
 * de esta misma sesión). El login en sí genera al menos una notificación (LOGIN_EXITOSO,
 * RF-14), así que siempre debería haber algo que cachear.
 *
 * Responsable: Juan Hernando / QA Team
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-101/
 */

const DIR = 'RESULTADOS/TC-M01-101';
const MENSAJE_OFFLINE = 'Sin conexión: mostrando las notificaciones guardadas en este dispositivo.';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-101 — Notificaciones offline (RF-14)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Resiliencia / Offline · Frontend & QA |
| Responsable | Juan Hernando |
| Ambiente (front) | ${r.ambiente} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Cuenta de prueba | ${r.testEmail} |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**
`;
}

describe('TC-M01-101 · Notificaciones con el sistema offline (RF-14)', { retries: 0 }, () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  const testEmail = 'gestor.granja.test@pecuaria.co';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => { res.headers['access-control-allow-origin'] = '*'; });
    }).as('assets');
  });

  it('Ejecuta TC-M01-101: la bandeja cae a caché local offline y se recupera al reconectar', () => {
    cy.loginUI(testEmail, 'Test1234!');

    // CP-01: en línea, la bandeja debe mostrar notificaciones reales, sin aviso offline.
    cy.get('button[aria-haspopup="dialog"]').click();
    cy.get('.notification-tray', { timeout: 10000 }).should('be.visible');
    cy.get('body', { timeout: 10000 }).should(($body) => {
      // Se espera a que termine "Cargando notificaciones…" antes de leer el resultado.
      expect($body.text()).not.to.include('Cargando notificaciones');
    }).then(($body) => {
      const totalItems = $body.find('.notification-tray__item').length;
      const sinAvisoOffline = !$body.text().includes('Sin conexión');
      if (totalItems > 0 && sinAvisoOffline) {
        add('CP-01: Bandeja en línea', 'Notificaciones reales visibles, sin aviso de modo offline', `${totalItems} notificación(es) reales, sin aviso offline`, 'OK');
      } else if (totalItems === 0) {
        add('CP-01: Bandeja en línea', 'Notificaciones reales visibles, sin aviso de modo offline', 'La cuenta no tiene ninguna notificación registrada — no se puede validar el fallback a caché en los pasos siguientes', 'OBSERVACION');
      } else {
        add('CP-01: Bandeja en línea', 'Notificaciones reales visibles, sin aviso de modo offline', 'Aparece el aviso de "Sin conexión" estando en línea (inesperado)', 'FALLA');
      }
    });

    cy.get('#notification-tray-close').click();

    // CP-02/CP-03: offline -> reabrir y refrescar debe caer a la caché local, no romperse.
    cy.setNetwork(true);
    cy.get('button[aria-haspopup="dialog"]').click();
    cy.get('[aria-label="Actualizar notificaciones"]').click({ force: true });

    cy.get('.notification-tray', { timeout: 10000 }).then(($tray) => {
      const texto = $tray.text();
      const muestraAvisoOffline = texto.includes(MENSAJE_OFFLINE);
      const totalItems = $tray.find('.notification-tray__item').length;
      if (muestraAvisoOffline && totalItems > 0) {
        add('CP-02/03: Bandeja offline (fallback a caché)', `Aviso "${MENSAJE_OFFLINE}" visible, lista no vacía`, `Aviso offline visible, ${totalItems} notificación(es) desde caché local`, 'OK');
      } else if (muestraAvisoOffline && totalItems === 0) {
        add('CP-02/03: Bandeja offline (fallback a caché)', `Aviso "${MENSAJE_OFFLINE}" visible, lista no vacía`, 'Aviso offline visible, pero la lista quedó vacía (sin notificaciones cacheadas para mostrar)', 'FALLA');
      } else {
        add('CP-02/03: Bandeja offline (fallback a caché)', `Aviso "${MENSAJE_OFFLINE}" visible, lista no vacía`, `No apareció el aviso offline esperado. Contenido visible: ${texto.slice(0, 200)}`, 'FALLA');
      }
    });

    cy.get('#notification-tray-close').click();

    // CP-04: reconectar -> el aviso offline debe desaparecer y volver a mostrar datos en vivo.
    cy.setNetwork(false);
    cy.get('button[aria-haspopup="dialog"]').click();
    cy.intercept('GET', '**/notificaciones*').as('refrescoOnline');
    cy.get('[aria-label="Actualizar notificaciones"]').click({ force: true });
    cy.wait('@refrescoOnline', { timeout: 10000 }).then((interception) => {
      cy.log('DIAGNOSTICO refresco tras reconectar: status=' + interception.response?.statusCode);
      add(
        'CP-04-DIAG: Llamada real al reconectar',
        'La solicitud GET /notificaciones responde 200 tras restaurar la red',
        `HTTP ${interception.response?.statusCode ?? 'sin respuesta'} — body: ${JSON.stringify(interception.response?.body).slice(0, 200)}`,
        interception.response?.statusCode === 200 ? 'OK' : 'FALLA',
      );
    });
    cy.get('.notification-tray', { timeout: 10000 }).should(($tray) => {
      expect($tray.text()).not.to.include('Cargando notificaciones');
    }).then(($tray) => {
      const sigueOffline = $tray.text().includes(MENSAJE_OFFLINE);
      add('CP-04: Reconexión', 'El aviso de "Sin conexión" desaparece al reconectar', sigueOffline ? 'El aviso offline persiste después de reconectar (no refrescó)' : 'El aviso offline ya no aparece — volvió a modo en línea', sigueOffline ? 'FALLA' : 'OK');
    });

    cy.get('body').then(() => {
      const hasFalla = checks.some((c) => c.estado === 'FALLA');
      const veredicto = hasFalla ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES';
      const r = {
        caso: 'TC-M01-101',
        testEmail,
        ambiente: Cypress.config('baseUrl'),
        navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
        fecha: new Date().toISOString(),
        veredicto,
        checkpoints: checks,
      };
      cy.task('writeResult', { file: `${DIR}/TC-M01-101_resultado.json`, content: JSON.stringify(r, null, 2) });
      cy.task('writeResult', { file: `${DIR}/TC-M01-101_resultado.md`, content: renderMd(r) });
    });
  });
});
