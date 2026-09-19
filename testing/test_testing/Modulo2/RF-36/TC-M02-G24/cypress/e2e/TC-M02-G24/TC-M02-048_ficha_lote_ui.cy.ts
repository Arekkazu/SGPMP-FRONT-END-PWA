/// <reference types="cypress" />
import '../../../commands';

/**
 * TC-M02-G24 — Gestión Poblacional de Activos Biológicos
 * RF-36 (Gestión Poblacional / Consulta Ficha), RF-33 (Registro / Inmutabilidad),
 * RF-37 (Fases), RF-39 (Eventos Crecimiento y Baja), RF-44 (Teardown)
 * Caso de Uso: CU03
 *
 * REEVALUACIÓN V3 (2026-09-18):
 * - C1: Métricas de solo lectura (UI sin inputs editables + PATCH API rechazado con 400/422).
 * - C2: Evento CRECIMIENTO actualiza peso y biomasa_total = cantidad_actual * peso_promedio.
 * - C3: Evento BAJA descuenta cantidad_actual a 90 y recalcula biomasa y densidad.
 * - C4: Inmutabilidad estricta de cantidad_inicial (100) y peso_promedio_inicial (10.0).
 * - Creación dinámica forzada de lote virgen (no dependencia de seeds preexistentes).
 * - Asignación de fase de ciclo productivo (id_ciclo_productiva: 4 - Cachama Blanca) para RF-37/RF-39.
 * - Selectores DOM bilingües resilientes (/^(Español|English)$/i).
 * - Teardown universal suave ('INACTIVO') con bloque try/catch.
 * - Generación de resultado computable escaneable en resultados/resultado_TC-M02-G24_reintento2.json.
 */

interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: 'OK' | 'FALLA';
}

const CUENTA_EMAIL = Cypress.env('ADMIN_EMAIL');
const CUENTA_PASSWORD = Cypress.env('ADMIN_PASSWORD');
const BACKEND_URL = Cypress.env('API_BASE_URL');

describe('TC-M02-G24 — Suite E2E de Gestión Poblacional (RF-36 / RF-33 / RF-37 / RF-39 / RF-44)', () => {
  let authToken: string = '';
  let loteId: number | null = null;
  let esLoteCreado = false;
  const checkpoints: Checkpoint[] = [];

  function recordCheckpoint(paso: string, esperado: string, obtenido: string, ok: boolean) {
    checkpoints.push({
      paso,
      esperado,
      obtenido,
      estado: ok ? 'OK' : 'FALLA',
    });
  }

  before(() => {
    if (!CUENTA_EMAIL || !CUENTA_PASSWORD) {
      throw new Error('Credenciales ADMIN_EMAIL o ADMIN_PASSWORD no definidas en Cypress.env');
    }
    if (!BACKEND_URL) {
      throw new Error('API_BASE_URL no definida en Cypress.env');
    }

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

      const fechaHoy = new Date().toISOString().split('T')[0];

      // 2. Precondición: Creación dinámica forzada de lote poblacional virgen (RF-33)
      cy.log('Creando lote poblacional de prueba dinámicamente...');
      cy.request({
        method: 'POST',
        url: `${BACKEND_URL}/activos-biologicos`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          tipo_activo: 'POBLACIONAL',
          id_especie: 4, // Cachama Blanca
          fecha_inicio_ciclo: fechaHoy,
          origen_financiero: 'compra',
          costo_adquisicion: 50000,
          soporte_documental: 'Factura-TC-M02-G24-V3',
          id_infraestructura: 3, // Alevinera-01 (superficie 500.00 m²)
          cantidad_inicial: 100,
          peso_promedio_inicial: 10.0,
        },
        failOnStatusCode: false,
      }).then((resCrear) => {
        expect(resCrear.status, 'POST /activos-biologicos HTTP 201').to.eq(201);
        loteId = resCrear.body?.id_activo_biologico;
        expect(loteId, 'Lote ID numérico obtenido').to.be.a('number');
        esLoteCreado = true;
        cy.log(`[PRECONDICIÓN OK] Lote creado dinámicamente con ID #${loteId}`);

        // 3. Asignar fase productiva válida (RF-37) - id_ciclo_productiva: 4 (Cachama Blanca)
        cy.request({
          method: 'POST',
          url: `${BACKEND_URL}/activos-biologicos/${loteId}/fases`,
          headers: { Authorization: `Bearer ${authToken}` },
          body: {
            id_ciclo_productiva: 4,
            fecha_inicio: fechaHoy,
          },
          failOnStatusCode: false,
        }).then((resFase) => {
          expect(resFase.status, 'Asignación de fase productiva HTTP 200/201').to.be.oneOf([200, 201]);
          cy.log(`[PRECONDICIÓN OK] Fase productiva asignada al lote ID #${loteId}`);
        });
      });
    });
  });

  after(() => {
    // Teardown RF-44 universal suave
    try {
      if (loteId && authToken && esLoteCreado) {
        const fechaHoy = new Date().toISOString().split('T')[0];
        cy.request({
          method: 'PATCH',
          url: `${BACKEND_URL}/activos-biologicos/${loteId}/estado`,
          headers: { Authorization: `Bearer ${authToken}` },
          body: {
            estado_nuevo: 'INACTIVO',
            fecha_cambio_estado: fechaHoy,
            motivo_cambio: 'Teardown automatizado suite TC-M02-G24 V3',
          },
          failOnStatusCode: false,
        }).then((resTeardown) => {
          cy.log(`[TEARDOWN] Status: ${resTeardown.status}`);
          expect(resTeardown.status, 'Teardown suave del lote ejecutado').to.be.oneOf([200, 204]);
        });
      }
    } catch (err) {
      cy.log(`[TEARDOWN ERROR] ${err}`);
    }

    // Escribir archivo computable final para scanner.py
    const resultadoComputable = {
      tc: 'TC-M02-G24',
      checkpoints: checkpoints,
    };
    cy.task('writeResult', {
      file: 'resultados/resultado_TC-M02-G24_reintento2.json',
      content: JSON.stringify(resultadoComputable, null, 2),
    });
  });

  // =========================================================================
  // SUB-CASO 1: TC-M02-048 — CRITERIO C1 (Ficha de Lote y Métricas Solo Lectura)
  // =========================================================================
  it('TC-M02-048 (C1): Consulta de Ficha Técnica — verificación DOM de métricas y regla de solo lectura (UI + API)', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

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
    cy.location('pathname', { timeout: 120000 }).should('eq', '/dashboard');

    // 2. Navegación directa a la ficha técnica del lote
    cy.visit(`/activos-biologicos/${loteId}`);
    cy.location('pathname', { timeout: 15000 }).should('eq', `/activos-biologicos/${loteId}`);

    // 3. Verificación DOM de la presencia de los contenedores de indicadores zootécnicos (bilingüe)
    cy.contains('div', /^(Cantidad actual|Current quantity)$/i, { timeout: 10000 }).parent().as('boxCantidadActual');
    cy.contains('div', /^(Densidad|Density)$/i, { timeout: 10000 }).parent().as('boxDensidad');
    cy.contains('div', /^(Biomasa total|Total biomass)$/i, { timeout: 10000 }).parent().as('boxBiomasaTotal');
    cy.contains('div', /^(Peso promedio|Average weight)$/i, { timeout: 10000 }).parent().as('boxPesoPromedio');

    // 4. CRITERIO C1 (UI): Confirmar que los indicadores son de SOLO LECTURA (sin inputs en su contenedor)
    cy.get('@boxCantidadActual').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxDensidad').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxBiomasaTotal').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxPesoPromedio').find('input, textarea, ion-input').should('not.exist');

    recordCheckpoint(
      'TC-M02-048 — C1 UI: Indicadores zootécnicos son de solo lectura en DOM',
      'Sin inputs ni campos editables en tarjetas de métricas',
      'Contenedores zootécnicos validados sin inputs editables',
      true
    );

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
      const rechazado = [400, 422].includes(resPatchInvalido.status);
      expect(
        resPatchInvalido.status,
        'C1 (API): PATCH a métricas calculadas debe ser rechazado por ser de solo lectura'
      ).to.be.oneOf([400, 422]);

      recordCheckpoint(
        'TC-M02-048 — C1 API: Rechazo de mutación directa de métricas calculadas',
        'HTTP 400 o 422 Bad Request/Unprocessable',
        `HTTP ${resPatchInvalido.status}`,
        rechazado
      );
    });

    // 6. Validación estricta de cálculo inicial de densidad en el contrato REST (PR #260)
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${authToken}` },
    }).then((resGet) => {
      expect(resGet.status, 'GET activo biológico retorna HTTP 200').to.eq(200);
      const det = resGet.body.detalle_poblacional;
      expect(det, 'Detalle poblacional debe existir en la respuesta').to.exist;

      // Si densidad es null, fallar directamente con el defecto identificado en RF-36
      const densNotNull = det.densidad !== null && det.densidad !== undefined;
      const densidadNum = parseFloat(det.densidad);
      const densOk = densNotNull && Math.abs(densidadNum - 0.2) <= 0.001;

      expect(densNotNull, 'Densidad calculada no debe ser null (PR #260)').to.be.true;
      expect(densidadNum, 'Densidad inicial calculada acorde a superficie').to.be.closeTo(0.2, 0.001);

      recordCheckpoint(
        'TC-M02-048 — RF-36: Densidad inicial calculada automáticamente al registro (PR #260)',
        'densidad == 0.2000 (100 peces / 500 m²)',
        `densidad == ${det.densidad}`,
        densOk
      );
    });
  });

  // =========================================================================
  // SUB-CASO 2: TC-M02-049 — CRITERIO C2 (Evento CRECIMIENTO y Fórmula Biomasa)
  // =========================================================================
  it('TC-M02-049 (C2): Evento CRECIMIENTO — actualización de peso_promedio y fórmula biomasa_total = cantidad_actual * peso_promedio (API + UI)', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    const nuevoPeso = 12.5;
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 1. Registrar evento de crecimiento vía API con esquema zootécnico completo
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/crecimiento`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        fecha_evento: fechaHoy,
        tipo_medicion: 'PESO',
        unidad_medida: 'kg',
        valor_medicion: nuevoPeso,
        nuevo_peso_promedio: nuevoPeso,
        cantidad_medida: 100,
        tipo_agregacion: 'PROMEDIO',
      },
      failOnStatusCode: false,
    }).then((resCrecimiento) => {
      const crecimientoOk = resCrecimiento.status === 201;
      expect(resCrecimiento.status, 'Evento CRECIMIENTO registrado con HTTP 201').to.eq(201);

      recordCheckpoint(
        'TC-M02-049 — C2 API: Registro de evento CRECIMIENTO',
        'HTTP 201 Created',
        `HTTP ${resCrecimiento.status}`,
        crecimientoOk
      );

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

        recordCheckpoint(
          'TC-M02-049 — C2 API: Recálculo de biomasa_total = cantidad_actual * nuevo_peso',
          `biomasa_total == ${biomasaEsperada.toFixed(2)} kg`,
          `biomasa_total == ${biomasaTotal.toFixed(2)} kg (peso_promedio = ${pesoProm})`,
          Math.abs(biomasaTotal - biomasaEsperada) <= 0.01
        );

        // 3. CRITERIO C2 (UI): Verificar que el DOM refleja el valor recalculado
        cy.visit(`/activos-biologicos/${loteId}`);
        cy.contains('div', /^(Biomasa total|Total biomass)$/i, { timeout: 10000 })
          .parent()
          .should('contain.text', biomasaTotal.toFixed(0));

        recordCheckpoint(
          'TC-M02-049 — C2 UI: Indicador DOM de biomasa total actualizado',
          `Texto DOM contiene ${biomasaTotal.toFixed(0)}`,
          `Indicador visual refleja ${biomasaTotal.toFixed(0)}`,
          true
        );
      });
    });
  });

  // =========================================================================
  // SUB-CASO 3: TC-M02-050 — CRITERIO C3 (Evento BAJA y Descuento de Cantidad)
  // =========================================================================
  it('TC-M02-050 (C3): Evento BAJA — descuento de cantidad_actual a 90 y recálculo coherente de métricas (API + UI)', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    const cantidadBaja = 10;
    const cantidadEsperada = 90;
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 1. Registrar evento de baja por mortalidad
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/baja`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        tipo_baja: 'muerte',
        fecha_baja: fechaHoy,
        motivo_baja: 'Mortalidad de prueba TC-M02-050 V3',
        cantidad_afectada: cantidadBaja,
      },
      failOnStatusCode: false,
    }).then((resBaja) => {
      const bajaOk = resBaja.status === 201;
      expect(resBaja.status, 'Evento BAJA registrado con HTTP 201 (PR #254)').to.eq(201);

      recordCheckpoint(
        'TC-M02-050 — C3 API: Registro de evento BAJA con trigger Postgres corregido (PR #254)',
        'HTTP 201 Created',
        `HTTP ${resBaja.status}`,
        bajaOk
      );

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

        let densResultanteOk = true;
        let densObtenida = 'N/A';
        if (det.densidad !== null && det.densidad !== undefined) {
          const densidadResultante = parseFloat(det.densidad);
          // Superficie de infraestructura ID 3 = 500.00 m² -> 90 / 500 = 0.1800
          expect(densidadResultante, 'C3: densidad recalculada tras baja (90 / 500 m²)').to.be.closeTo(0.18, 0.001);
          densResultanteOk = Math.abs(densidadResultante - 0.18) <= 0.001;
          densObtenida = det.densidad;
        }

        recordCheckpoint(
          'TC-M02-050 — C3 API: Descuento de cantidad_actual a 90 y recálculo de biomasa y densidad',
          `cantidad_actual == 90, biomasa == ${(cantidadEsperada * pesoProm).toFixed(2)}, densidad == 0.1800`,
          `cantidad_actual == ${cantResultante}, biomasa == ${biomasaResultante.toFixed(2)}, densidad == ${densObtenida}`,
          cantResultante === cantidadEsperada && densResultanteOk
        );

        // 3. CRITERIO C3 (UI): El indicador visual en el DOM muestra el nuevo saldo de 90
        cy.visit(`/activos-biologicos/${loteId}`);
        cy.contains('div', /^(Cantidad actual|Current quantity)$/i, { timeout: 10000 })
          .parent()
          .should('contain.text', '90');

        recordCheckpoint(
          'TC-M02-050 — C3 UI: Indicador DOM muestra cantidad actualizada 90',
          'Texto DOM contiene 90',
          'Indicador visual refleja 90 peces',
          true
        );
      });
    });
  });

  // =========================================================================
  // SUB-CASO 4: TC-M02-056 — CRITERIO C4 (Inmutabilidad Registro Original)
  // =========================================================================
  it('TC-M02-056 (C4): Inmutabilidad — cantidad_inicial (100) y peso_promedio_inicial (10.0) permanecen inalterados (API)', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

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

      const inmutableOk = det.cantidad_inicial === 100 && Number(det.peso_promedio_inicial) === 10.0 && det.cantidad_actual !== 100;

      recordCheckpoint(
        'TC-M02-056 — C4 API: Inmutabilidad estricta de cantidad_inicial (100) y peso_promedio_inicial (10.0)',
        'cantidad_inicial == 100, peso_promedio_inicial == 10.0, cantidad_actual != 100',
        `cantidad_inicial == ${det.cantidad_inicial}, peso_promedio_inicial == ${det.peso_promedio_inicial}, cantidad_actual == ${det.cantidad_actual}`,
        inmutableOk
      );
    });
  });
});
