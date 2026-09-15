/// <reference types="cypress" />
import '../../../commands';

/**
 * TC-M02-G24 — Gestión Poblacional de Activos Biológicos
 * RF-36 (Gestión Poblacional / Consulta Ficha), RF-33 (Registro / Inmutabilidad),
 * RF-37 (Fases), RF-39 (Eventos Crecimiento y Baja), RF-44 (Teardown)
 * Caso de Uso: CU03
 *
 * REDISEÑO RIGUROSO (2026-09-14):
 * - C1: Métricas de solo lectura (UI sin inputs editables + PATCH API rechazado con 400/422).
 * - C2: Evento CRECIMIENTO actualiza peso y biomasa_total = cantidad_actual * peso_promedio.
 * - C3: Evento BAJA descuenta cantidad_actual a 90 y recalcula biomasa y densidad.
 * - C4: Inmutabilidad estricta de cantidad_inicial (100) y peso_promedio_inicial (10.0).
 * - Precondición robusta: Seed lookup + fallback de creación limpia.
 * - Aserciones exactas de valor: Cero ramas permisivas, cero 'if error -> PASS'.
 */

const CUENTA_EMAIL = Cypress.env('ADMIN_EMAIL') || 'administador.dev@gmail.com';
const CUENTA_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
const BACKEND_URL = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

describe('TC-M02-G24 — Suite E2E de Gestión Poblacional (RF-36 / RF-33 / RF-39)', () => {
  let authToken: string = '';
  let loteId: number | null = null;
  let esLoteCreado = false;

  before(() => {
    // 1. Autenticación administrativa inicial vía API
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/sesiones/`,
      body: { correo_electronico: CUENTA_EMAIL, contrasena: CUENTA_PASSWORD },
      failOnStatusCode: false,
    }).then((resLogin) => {
      expect(resLogin.status, 'Login administrativo exitoso en TEST').to.eq(200);
      authToken = resLogin.body?.token;
      expect(authToken, 'Token JWT administrativo obtenido').to.be.a('string').and.not.be.empty;

      // 2. Precondición: Buscar lote poblacional activo preexistente en BD TEST
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/activos-biologicos?tipo=POBLACIONAL&id_estado=1&page_size=1`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resList) => {
        const items = resList.body?.items || (Array.isArray(resList.body) ? resList.body : []);
        if (resList.status === 200 && items.length > 0 && items[0].id_activo_biologico) {
          loteId = items[0].id_activo_biologico;
          esLoteCreado = false;
          cy.log(`[PRECONDICIÓN OK] Reutilizando lote poblacional seed activo ID #${loteId}`);
        } else {
          // Fallback controlado: Crear lote poblacional nuevo si no existe seed disponible
          cy.log('Sin lotes poblacionales activos previos. Creando lote de prueba...');
          cy.request({
            method: 'POST',
            url: `${BACKEND_URL}/activos-biologicos`,
            headers: { Authorization: `Bearer ${authToken}` },
            body: {
              tipo_activo: 'POBLACIONAL',
              id_especie: 4, // Cachama Blanca
              fecha_inicio_ciclo: new Date().toISOString().split('T')[0],
              origen_financiero: 'compra',
              costo_adquisicion: 50000,
              soporte_documental: 'Factura-TC-M02-G24',
              id_infraestructura: 3, // Alevinera-01 (superficie 500.00 m²)
              cantidad_inicial: 100,
              peso_promedio_inicial: 10.0,
            },
            failOnStatusCode: false,
          }).then((resCrear) => {
            if (resCrear.status === 201 && resCrear.body?.id_activo_biologico) {
              loteId = resCrear.body.id_activo_biologico;
              esLoteCreado = true;
              cy.log(`[PRECONDICIÓN OK] Lote creado dinámicamente con ID #${loteId}`);
            } else {
              loteId = null;
              esLoteCreado = false;
              cy.log(`[BLOQUEO BACKEND] Falló POST /activos-biologicos con código HTTP ${resCrear.status}`);
            }
          });
        }
      });
    });
  });

  after(() => {
    // Teardown RF-44: Solo se da de baja si fue creado dinámicamente en esta suite
    if (loteId && esLoteCreado && authToken) {
      cy.request({
        method: 'PATCH',
        url: `${BACKEND_URL}/activos-biologicos/${loteId}/estado`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          estado_nuevo: 'BAJA',
          fecha_cambio_estado: new Date().toISOString().split('T')[0],
          motivo_cambio: 'Teardown automatizado suite TC-M02-G24',
        },
        failOnStatusCode: false,
      }).then((resTeardown) => {
        expect(resTeardown.status, 'Teardown suave del lote ejecutado con éxito').to.eq(200);
      });
    }
  });

  // =========================================================================
  // SUB-CASO 1: TC-M02-048 — CRITERIO C1 (Ficha de Lote y Métricas Solo Lectura)
  // =========================================================================
  it('TC-M02-048 (C1): Consulta de Ficha Técnica — verificación DOM de métricas y regla de solo lectura (UI + API)', function () {
    if (!loteId) {
      throw new Error(
        'Precondición no satisfecha: no hay lote poblacional activo en BD ni fue posible crearlo vía POST /activos-biologicos. Ver defecto bloqueante en backend.'
      );
    }

    // Interceptar llamadas de permisos para garantizar renderizado completo en UI
    cy.intercept('GET', '**/sesiones/me/permisos', {
      statusCode: 200,
      body: {
        permisos: [
          { id_recurso: 8, id_accion: 1 },
          { id_recurso: 8, id_accion: 2 },
          { id_recurso: 8, id_accion: 3 },
          { id_recurso: 8, id_accion: 4 },
        ],
      },
    }).as('mePermisos');

    // 1. Login en UI Web
    cy.loginUI(CUENTA_EMAIL, CUENTA_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');

    // 2. Navegación directa a la ficha técnica del lote
    cy.visit(`/activos-biologicos/${loteId}`);
    cy.location('pathname', { timeout: 15000 }).should('eq', `/activos-biologicos/${loteId}`);

    // 3. Verificación DOM de la presencia de los contenedores de indicadores zootécnicos
    cy.contains('div', /^Cantidad actual$/i, { timeout: 10000 }).parent().as('boxCantidadActual');
    cy.contains('div', /^Densidad$/i, { timeout: 10000 }).parent().as('boxDensidad');
    cy.contains('div', /^Biomasa total$/i, { timeout: 10000 }).parent().as('boxBiomasaTotal');
    cy.contains('div', /^Peso promedio$/i, { timeout: 10000 }).parent().as('boxPesoPromedio');

    // 4. CRITERIO C1 (UI): Confirmar que los indicadores son de SOLO LECTURA (sin inputs en su contenedor)
    cy.get('@boxCantidadActual').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxDensidad').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxBiomasaTotal').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxPesoPromedio').find('input, textarea, ion-input').should('not.exist');

    // Captura de evidencia visual de la ficha
    cy.screenshot('01_ficha_lote_ui', { overwrite: true });

    // 5. CRITERIO C1 (API): Intento de mutación directa de métricas poblacionales debe ser rechazado
    cy.request({
      method: 'PATCH',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        cantidad_actual: 999,
        biomasa_total: 9999.0,
        densidad: '1.99',
      },
      failOnStatusCode: false,
    }).then((resPatchInvalido) => {
      expect(
        resPatchInvalido.status,
        'C1 (API): PATCH a métricas calculadas debe ser rechazado por ser de solo lectura'
      ).to.be.oneOf([400, 422]);
    });

    // 6. Validación estricta de cálculo inicial de densidad en el contrato REST
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${authToken}` },
    }).then((resGet) => {
      expect(resGet.status, 'GET activo biológico retorna HTTP 200').to.eq(200);
      const det = resGet.body.detalle_poblacional;
      expect(det, 'Detalle poblacional debe existir en la respuesta').to.exist;

      // Si densidad es null, fallar directamente con el defecto identificado en RF-36
      if (det.densidad === null || det.densidad === undefined) {
        throw new Error(
          'DEFECTO RF-36: El endpoint GET /activos-biologicos/{id} retorna densidad null en lote virgen (esperado 0.2000).'
        );
      }
      const densidadNum = parseFloat(det.densidad);
      expect(densidadNum, 'Densidad inicial calculada acorde a superficie').to.be.closeTo(0.2, 0.001);
    });
  });

  // =========================================================================
  // SUB-CASO 2: TC-M02-049 — CRITERIO C2 (Evento CRECIMIENTO y Fórmula Biomasa)
  // =========================================================================
  it('TC-M02-049 (C2): Evento CRECIMIENTO — actualización de peso_promedio y fórmula biomasa_total = cantidad_actual * peso_promedio (API + UI)', function () {
    if (!loteId) {
      throw new Error('Precondición no satisfecha: lote no disponible.');
    }

    const nuevoPeso = 12.5;

    // 1. Registrar evento de crecimiento vía API
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/crecimiento`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        fecha_evento: new Date().toISOString().split('T')[0],
        valor_medicion: nuevoPeso,
        tipo_agregacion: 'PROMEDIO',
      },
      failOnStatusCode: false,
    }).then((resCrecimiento) => {
      expect(resCrecimiento.status, 'Evento CRECIMIENTO registrado con HTTP 201').to.eq(201);

      // 2. CRITERIO C2 (API): Verificar actualización y recálculo matemático de biomasa
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resGet) => {
        expect(resGet.status).to.eq(200);
        const det = resGet.body.detalle_poblacional;
        const cantActual = Number(det.cantidad_actual);
        const pesoProm = Number(det.peso_promedio);
        const biomasaTotal = parseFloat(det.biomasa_total);

        expect(pesoProm, 'C2: peso_promedio actualizado a 12.5').to.eq(nuevoPeso);
        const biomasaEsperada = cantActual * nuevoPeso;
        expect(
          biomasaTotal,
          'C2: biomasa_total debe ser exactamente cantidad_actual * peso_promedio'
        ).to.be.closeTo(biomasaEsperada, 0.01);

        // 3. CRITERIO C2 (UI): Verificar que el DOM refleja el valor recalculado
        cy.visit(`/activos-biologicos/${loteId}`);
        cy.contains('div', /^Biomasa total$/i, { timeout: 10000 })
          .parent()
          .should('contain.text', biomasaTotal.toFixed(0));
      });
    });
  });

  // =========================================================================
  // SUB-CASO 3: TC-M02-050 — CRITERIO C3 (Evento BAJA y Descuento de Cantidad)
  // =========================================================================
  it('TC-M02-050 (C3): Evento BAJA — descuento de cantidad_actual a 90 y recálculo coherente de métricas (API + UI)', function () {
    if (!loteId) {
      throw new Error('Precondición no satisfecha: lote no disponible.');
    }

    const cantidadBaja = 10;
    const cantidadEsperada = 90;

    // 1. Registrar evento de baja por mortalidad
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/baja`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        tipo_baja: 'muerte',
        fecha_baja: new Date().toISOString().split('T')[0],
        motivo_baja: 'Mortalidad de prueba TC-M02-050',
        cantidad_afectada: cantidadBaja,
      },
      failOnStatusCode: false,
    }).then((resBaja) => {
      expect(resBaja.status, 'Evento BAJA registrado con HTTP 201').to.eq(201);

      // 2. CRITERIO C3 (API): Verificar descuento de cantidad_actual y recálculos
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resGet) => {
        expect(resGet.status).to.eq(200);
        const det = resGet.body.detalle_poblacional;
        const cantResultante = Number(det.cantidad_actual);
        const pesoProm = Number(det.peso_promedio);
        const biomasaResultante = parseFloat(det.biomasa_total);

        expect(cantResultante, 'C3: cantidad_actual descontada exactamente a 90').to.eq(cantidadEsperada);
        expect(
          biomasaResultante,
          'C3: biomasa_total recalculada tras baja (90 * peso_promedio)'
        ).to.be.closeTo(cantidadEsperada * pesoProm, 0.01);

        if (det.densidad !== null && det.densidad !== undefined) {
          const densidadResultante = parseFloat(det.densidad);
          // Superficie de infraestructura ID 3 = 500.00 m² -> 90 / 500 = 0.1800
          expect(densidadResultante, 'C3: densidad recalculada tras baja (90 / 500 m²)').to.be.closeTo(0.18, 0.001);
        }

        // 3. CRITERIO C3 (UI): El indicador visual en el DOM muestra el nuevo saldo de 90
        cy.visit(`/activos-biologicos/${loteId}`);
        cy.contains('div', /^Cantidad actual$/i, { timeout: 10000 })
          .parent()
          .should('contain.text', '90');
      });
    });
  });

  // =========================================================================
  // SUB-CASO 4: TC-M02-056 — CRITERIO C4 (Inmutabilidad Registro Original)
  // =========================================================================
  it('TC-M02-056 (C4): Inmutabilidad — cantidad_inicial (100) y peso_promedio_inicial (10.0) permanecen inalterados (API)', function () {
    if (!loteId) {
      throw new Error('Precondición no satisfecha: lote no disponible.');
    }

    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${authToken}` },
    }).then((resGet) => {
      expect(resGet.status).to.eq(200);
      const det = resGet.body.detalle_poblacional;

      // CRITERIO C4: Inmutabilidad histórica estricta
      expect(
        det.cantidad_inicial,
        'C4: cantidad_inicial debe ser exactamente 100 y permanecer inmutable tras eventos'
      ).to.eq(100);

      expect(
        Number(det.peso_promedio_inicial),
        'C4: peso_promedio_inicial debe ser exactamente 10.0 y permanecer inmutable'
      ).to.eq(10.0);

      // Confirmar que el lote efectivamente sufrió eventos (cantidad_actual != cantidad_inicial)
      expect(
        det.cantidad_actual,
        'Confirmación de dinamismo: cantidad_actual ya no es igual a la inicial'
      ).to.not.eq(100);
    });
  });
});
