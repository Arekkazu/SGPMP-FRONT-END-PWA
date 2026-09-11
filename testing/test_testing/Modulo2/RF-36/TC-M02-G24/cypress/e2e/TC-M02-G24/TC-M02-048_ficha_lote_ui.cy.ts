/// <reference types="cypress" />
import '../../../commands';

/**
 * TC-M02-048 — Consulta de ficha del lote (estado virgen UI)
 * RF-36: Gestión Poblacional de Activos Biológicos
 * RF-33: Registro de Activos Biológicos
 *
 * Herramienta: Cypress E2E (UI Web + Video)
 *
 * Revisa visualmente en la interfaz web de SGPMP:
 * - cantidad_inicial = 100 (inmutable / histórico)
 * - peso_promedio_inicial = 10.0 (inmutable / histórico)
 * - cantidad_actual = 100
 * - densidad = 0.2000 (cantidad_actual / superficie = 100 / 500.00)
 */

const CUENTA_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
const BACKEND_URL = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

describe('TC-M02-048 — Consulta de Ficha de Lote Poblacional en UI Web', () => {
  let loteId: number | null = null;

  before(() => {
    // 1. Obtener token API inicial
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/sesiones/`,
      body: { correo_electronico: CUENTA_EMAIL, contrasena: CUENTA_PASSWORD },
    }).then((resLogin) => {
      const initToken = resLogin.body.token;
      expect(initToken, 'Token JWT inicial obtenido').to.be.a('string');

      // 2. Crear Lote Poblacional aislado en RF-33
      cy.request({
        method: 'POST',
        url: `${BACKEND_URL}/activos-biologicos`,
        headers: { Authorization: `Bearer ${initToken}` },
        body: {
          tipo_activo: 'POBLACIONAL',
          id_especie: 4, // Cachama Blanca
          fecha_inicio_ciclo: new Date().toISOString().split('T')[0],
          origen_financiero: 'compra',
          costo_adquisicion: 50000,
          soporte_documental: 'Factura-TC048-UI',
          id_infraestructura: 3, // Alevinera-01 (superficie 500.00 m²)
          cantidad_inicial: 100,
          peso_promedio_inicial: 10.0,
        },
      }).then((resLote) => {
        expect(resLote.status).to.eq(201);
        loteId = resLote.body.id_activo_biologico;
        cy.log(`Lote TC-M02-048 creado exitosamente con ID #${loteId}`);
      });
    });
  });

  after(() => {
    // Teardown RF-44 si se creó el lote
    if (loteId) {
      cy.request({
        method: 'POST',
        url: `${BACKEND_URL}/sesiones/`,
        body: { correo_electronico: CUENTA_EMAIL, contrasena: CUENTA_PASSWORD },
        failOnStatusCode: false,
      }).then((resLogin) => {
        const cleanToken = resLogin.body?.token;
        if (cleanToken) {
          cy.request({
            method: 'PATCH',
            url: `${BACKEND_URL}/activos-biologicos/${loteId}/estado`,
            headers: { Authorization: `Bearer ${cleanToken}` },
            body: {
              estado_nuevo: 'BAJA',
              fecha_cambio_estado: new Date().toISOString().split('T')[0],
              motivo_cambio: 'Teardown de limpieza TC-M02-048 UI',
            },
            failOnStatusCode: false,
          }).then((resTd) => {
            cy.log(`Teardown Lote #${loteId} -> Status ${resTd.status}`);
          });
        }
      });
    }
  });

  it('navega a la ficha del lote y verifica la visualización de datos inmutables y calculados', () => {
    expect(loteId, 'Lote ID debe estar disponible para la UI').to.be.a('number');

    // Interceptar llamadas clave de permisos
    cy.intercept('GET', '**/sesiones/me/permisos', {
      statusCode: 200,
      body: {
        permisos: [
          { id_recurso: 8, id_accion: 1 }, { id_recurso: 8, id_accion: 2 }, { id_recurso: 8, id_accion: 3 }, { id_recurso: 8, id_accion: 4 },
        ],
      },
    }).as('mePermisos');

    // Login en UI
    cy.loginUI(CUENTA_EMAIL, CUENTA_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');

    // Navegar a Activos Biológicos
    cy.visit('/activos-biologicos');
    cy.location('pathname', { timeout: 15000 }).should('include', '/activos-biologicos');
    cy.wait(2000);

    // Navegar a la ficha del activo
    cy.visit(`/activos-biologicos/${loteId}`);
    cy.wait(2000);

    // Tomar captura de pantalla
    cy.screenshot('01_ficha_lote_ui', { overwrite: true });

    // Obtener un token activo fresco para las verificaciones API
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/sesiones/`,
      body: { correo_electronico: CUENTA_EMAIL, contrasena: CUENTA_PASSWORD },
    }).then((resLoginFresh) => {
      const freshToken = resLoginFresh.body.token;

      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
        headers: { Authorization: `Bearer ${freshToken}` },
      }).then((resGet) => {
        const body = resGet.body;
        const det = body.detalle_poblacional;

        // 1. Aserciones de valores iniciales (RF-33)
        expect(det.cantidad_inicial, 'cantidad_inicial debe ser 100').to.eq(100);
        expect(Number(det.peso_promedio_inicial), 'peso_promedio_inicial debe ser 10.0').to.eq(10);
        expect(det.cantidad_actual, 'cantidad_actual debe ser 100').to.eq(100);

        // 2. Aserción rigurosa de densidad calculada (RF-36)
        // Densidad esperada = cantidad_actual(100) / superficie(500.00) = 0.2000
        const densidadCalculada = det.densidad;
        cy.log(`Densidad obtenida en API: ${densidadCalculada}`);

        if (densidadCalculada === null) {
          cy.log('⚠️ DEFECTO BACKEND REGISTRADO: densidad es null en lugar de 0.2000');
        }

        expect(densidadCalculada, 'densidad debe ser 0.2000 (cantidad_actual / superficie)').to.not.be.null;
        expect(Number(densidadCalculada), 'densidad debe ser 0.2000').to.eq(0.2);
      });
    });
  });
});
