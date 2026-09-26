/// <reference types="cypress" />
import '../../commands';

/**
 * TC-M02-G24 — Gestión Poblacional de Activos Biológicos
 * RF-36 (Gestión Poblacional / Consulta Ficha), RF-33 (Registro / Inmutabilidad),
 * RF-37 (Fases), RF-39 (Eventos Crecimiento y Baja), RF-44 (Teardown)
 * Caso de Uso: CU03
 *
 * FASE 3 CORRECTIVA 4 — ARQUITECTURA DE DOS BLOQUES SECUENCIALES:
 * - BLOQUE API (Primero): 048, 049, 050, 056, TEARDOWN.
 *   Ejecuta todas las mutaciones y aserciones REST sin tocar la UI.
 * - BLOQUE UI (Segundo): UN SOLO it() con UN SOLO cy.visit para 048, 049, 050.
 *   Elimina la caducidad de cookies por múltiples navegaciones con rotación de refresh_token.
 * - FIDELIDAD RUNNER-VS-JSON:
 *   afterEach captura el estado final de cada test; after() garantiza que
 *   si el runner tiene Failing >= 1, el JSON contiene al menos un FALLA.
 * - Reporte computable generado en: resultados/resultado_TC-M02-G24_reintento5.json
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
  let biomasaFinalEsperada: number = 1125;
  const checkpoints: Checkpoint[] = [];
  const failedRunnerTests: Array<{ title: string; err: string }> = [];

  function getAuthToken(): string {
    return Cypress.env('CURRENT_AUTH_TOKEN') || authToken;
  }

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

    // Login único vía API con cy.session para abastecer el almacén de cookies del navegador
    cy.session([CUENTA_EMAIL], () => {
      cy.request({
        method: 'POST',
        url: `${BACKEND_URL}/sesiones/`,
        body: {
          correo_electronico: CUENTA_EMAIL,
          contrasena: CUENTA_PASSWORD,
        },
      }).then((resLogin) => {
        expect(resLogin.status, 'Login administrativo exitoso por API').to.eq(200);
        authToken = resLogin.body?.token;
        Cypress.env('CURRENT_AUTH_TOKEN', authToken);
      });
    });

    cy.then(() => {
      authToken = Cypress.env('CURRENT_AUTH_TOKEN') || authToken;
      expect(authToken, 'Token JWT administrativo obtenido vía API').to.be.a('string').and.not.be.empty;

      const fechaHoy = new Date().toISOString().split('T')[0];

      // 1. Precondición de densidad máxima por especie en M09 (idempotente)
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/configuracion/especies`,
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        failOnStatusCode: false,
      }).then((resEspecies) => {
        const esp4 = resEspecies.body?.items?.find((e: any) => e.id_especie === 4);
        if (esp4 && !esp4.densidad_maxima_por_especie) {
          cy.request({
            method: 'PATCH',
            url: `${BACKEND_URL}/configuracion/especies/4`,
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            body: {
              nombre: esp4.nombre,
              descripcion: esp4.descripcion,
              densidad_maxima_por_especie: 2.0,
              fecha_actualizacion: esp4.fecha_actualizacion,
            },
            failOnStatusCode: false,
          });
        }

        // 2. Precondición: Creación dinámica forzada de lote poblacional virgen (RF-33)
        cy.log('Creando lote poblacional de prueba dinámicamente...');
        cy.request({
          method: 'POST',
          url: `${BACKEND_URL}/activos-biologicos`,
          headers: { Authorization: `Bearer ${getAuthToken()}` },
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
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            body: {
              id_ciclo_productiva: 4,
              fecha_inicio: fechaHoy,
            },
            failOnStatusCode: false,
          }).then((resFase) => {
            expect(resFase.status, 'Asignación de fase productiva HTTP 200/201').to.be.oneOf([200, 201]);
            cy.log(`[PRECONDICIÓN OK] Fase productiva asignada al lote ID #${loteId}`);

            // 4. Verificar que el token sigue vivo
            cy.request({
              method: 'GET',
              url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
              headers: { Authorization: `Bearer ${getAuthToken()}` },
            }).then((resCheck) => {
              expect(resCheck.status, 'Verificación inicial token vivo').to.eq(200);
            });
          });
        });
      });
    });
  });

  beforeEach(function () {
    cy.session([CUENTA_EMAIL], () => {
      cy.request({
        method: 'POST',
        url: `${BACKEND_URL}/sesiones/`,
        body: {
          correo_electronico: CUENTA_EMAIL,
          contrasena: CUENTA_PASSWORD,
        },
      }).then((resLogin) => {
        expect(resLogin.status, 'Login administrativo exitoso por API').to.eq(200);
        authToken = resLogin.body?.token;
        Cypress.env('CURRENT_AUTH_TOKEN', authToken);
      });
    });

    cy.then(() => {
      authToken = Cypress.env('CURRENT_AUTH_TOKEN') || authToken;
    });
  });

  afterEach(function () {
    const test = this.currentTest as any;
    const isFinalAttempt = !test?._retries || (test?._currentRetry >= test?._retries);
    if (test && test.state === 'failed' && isFinalAttempt) {
      const errText = test.err ? test.err.message : 'Fallo en runner';
      failedRunnerTests.push({
        title: test.title,
        err: errText,
      });
      const shortErr = test.err ? test.err.message.slice(0, 150).replace(/\n/g, ' ') : 'Error no controlado';
      recordCheckpoint(
        `RUNNER — ${test.title.split(' — ')[0] || test.title}`,
        'Test ejecutado sin fallas ni excepciones de runner',
        `Fallo runner: ${shortErr}`,
        false
      );

      // TAREA 2: Captura de evidencia de fallo (screenshot + DOM body)
      if (test.title && test.title.includes('UI')) {
        cy.screenshot(`FALLO-${test.title}`);
        cy.document().then((doc) => {
          const bodyHtml = doc?.body?.innerHTML || '';
          const sesionExpiradaDetectada = /No se pudo restaurar tu sesi[oó]n|sesi[oó]n expirada|expired session/i.test(bodyHtml);
          cy.log(`[EVIDENCIA FALLO] ¿Modal de sesión expirada detectado en DOM?: ${sesionExpiradaDetectada}`);
          cy.task('writeResult', {
            file: `cypress/screenshots/FALLO-${test.title.replace(/[/\\?%*:|"<>]/g, '_')}.html`,
            content: bodyHtml,
          });
        });
      } else {
        cy.screenshot(`FALLO-${test.title}`);
      }
    }
  });

  after(() => {
    // Salvaguarda final de fidelidad runner-vs-JSON (§4.2.c)
    const hayFallasEnJson = checkpoints.some((c) => c.estado === 'FALLA');
    if (failedRunnerTests.length > 0 && !hayFallasEnJson) {
      recordCheckpoint(
        'SUITE — Fidelidad runner',
        'Reporte debe reflejar Failing del runner',
        `${failedRunnerTests.length} Failing en runner, 0 FALLA en JSON previo`,
        false
      );
    }

    // 1. PRIMERO: Escribir archivo computable final para scanner.py (asegura reporte siempre)
    const resultadoComputable = {
      tc: 'TC-M02-G24',
      checkpoints: checkpoints,
    };
    cy.task('writeResult', {
      file: 'resultados/resultado_TC-M02-G24_reintento5.json',
      content: JSON.stringify(resultadoComputable, null, 2),
    });
    cy.log('[AFTER] Reporte escrito antes del cierre final.');
  });

  // =========================================================================
  // BLOQUE 1: API REST (Todas las mutaciones y verificaciones HTTP primero)
  // =========================================================================

  it('API — 048: métricas son de solo lectura (PATCH rechazado)', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    // 1. CRITERIO C1 (API): Intento de mutación directa de métricas poblacionales debe ser rechazado
    cy.request({
      method: 'PATCH',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
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

    // 2. Validación estricta de cálculo inicial de densidad en el contrato REST (PR #260)
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    }).then((resGet) => {
      expect(resGet.status, 'GET activo biológico retorna HTTP 200').to.eq(200);
      const det = resGet.body.detalle_poblacional;
      expect(det, 'Detalle poblacional debe existir en la respuesta').to.exist;

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

  it('API — 049: POST evento CRECIMIENTO → recalcula biomasa', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    const nuevoPeso = 12.5;
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 1. Registrar evento de crecimiento vía API con esquema zootécnico completo
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/crecimiento`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
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
        headers: { Authorization: `Bearer ${getAuthToken()}` },
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
      });
    });
  });

  it('API — 050: POST evento BAJA → descuenta cantidad', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    const cantidadBaja = 10;
    const cantidadEsperada = 90;
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 1. Registrar evento de baja por mortalidad
    cy.request({
      method: 'POST',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/eventos/baja`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
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
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      }).then((resGet) => {
        expect(resGet.status).to.eq(200);
        const det = resGet.body.detalle_poblacional;
        const cantResultante = Number(det.cantidad_actual);
        const pesoProm = Number(det.peso_promedio);
        const biomasaResultante = parseFloat(det.biomasa_total);
        biomasaFinalEsperada = biomasaResultante;

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
      });
    });
  });

  it('API — 056: GET inmutabilidad de cantidad_inicial / peso_promedio_inicial', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
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

  it('API — TEARDOWN: PATCH estado INACTIVO', function () {
    expect(loteId, 'Precondición loteId existente').to.be.a('number');

    const fechaHoy = new Date().toISOString().split('T')[0];
    cy.request({
      method: 'PATCH',
      url: `${BACKEND_URL}/activos-biologicos/${loteId}/estado`,
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: {
        estado_nuevo: 'INACTIVO',
        fecha_cambio_estado: fechaHoy,
        motivo_cambio: 'Teardown automatizado suite TC-M02-G24 V3',
      },
      failOnStatusCode: false,
    }).then((resTeardown) => {
      cy.log(`[TEARDOWN] Status: ${resTeardown.status} para Lote #${loteId}`);
      expect(resTeardown.status, 'Teardown PATCH HTTP 200/204').to.be.oneOf([200, 204]);

      // Verificación de estado final del lote
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/activos-biologicos/${loteId}`,
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        failOnStatusCode: false,
      }).then((resGetFinal) => {
        const estadoFinal = resGetFinal.body?.nombre_estado || resGetFinal.body?.estado || 'DESCONOCIDO';
        cy.log(`[TEARDOWN AUDIT] Lote #${loteId} cerrado con estado: ${estadoFinal}`);
      });
    });
  });

  // =========================================================================
  // BLOQUE 2: UI WEB (Verificación integral en una sola visita)
  // =========================================================================

  it('UI — Verificación integral del DOM en una sola visita', function () {
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

    cy.intercept('POST', '**/sesiones/refresh').as('refreshSession');

    // UN SOLO cy.visit en todo el spec
    cy.visit(`/activos-biologicos/${loteId}`);

    // Esperar a que la pantalla esté lista UNA SOLA VEZ con timeout de 30000ms
    cy.contains('div', /^(Cantidad actual|Current quantity)$/i, { timeout: 30000 });

    // --- UI-048: solo lectura ---
    cy.contains('div', /^(Cantidad actual|Current quantity)$/i).parent().as('boxCantidadActual');
    cy.contains('div', /^(Densidad|Density)$/i).parent().as('boxDensidad');
    cy.contains('div', /^(Biomasa total|Total biomass)$/i).parent().as('boxBiomasaTotal');
    cy.contains('div', /^(Peso promedio|Average weight)$/i).parent().as('boxPesoPromedio');

    // Confirmar que los indicadores son de SOLO LECTURA (sin inputs en su contenedor)
    cy.get('@boxCantidadActual').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxDensidad').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxBiomasaTotal').find('input, textarea, ion-input').should('not.exist');
    cy.get('@boxPesoPromedio').find('input, textarea, ion-input').should('not.exist');

    cy.get('@boxCantidadActual').then(($b1) => {
      cy.get('@boxDensidad').then(($b2) => {
        cy.get('@boxBiomasaTotal').then(($b3) => {
          cy.get('@boxPesoPromedio').then(($b4) => {
            const inputsCount = $b1.find('input, textarea, ion-input').length
              + $b2.find('input, textarea, ion-input').length
              + $b3.find('input, textarea, ion-input').length
              + $b4.find('input, textarea, ion-input').length;
            const soloLecturaOk = inputsCount === 0;
            expect(soloLecturaOk, 'Contenedores de métricas deben ser de solo lectura (sin inputs)').to.be.true;

            recordCheckpoint(
              'TC-M02-048 — C1 UI: Indicadores zootécnicos son de solo lectura en DOM',
              'Sin inputs ni campos editables en tarjetas de métricas (inputsCount == 0)',
              `Inputs editables encontrados en tarjetas: ${inputsCount}`,
              soloLecturaOk
            );
          });
        });
      });
    });

    // --- UI-049: biomasa total reflejada ---
    cy.contains('div', /^(Biomasa total|Total biomass)$/i)
      .parent()
      .invoke('text')
      .then((textoDom) => {
        const esperadoStr = String(Math.round(biomasaFinalEsperada));
        const domBiomasaOk = textoDom.includes(esperadoStr);
        expect(domBiomasaOk, `DOM debe contener la biomasa calculada (${esperadoStr})`).to.be.true;

        recordCheckpoint(
          'TC-M02-049 — C2 UI: Indicador DOM de biomasa total actualizado',
          `Texto DOM contiene ${esperadoStr}`,
          `Texto DOM obtenido: "${textoDom.trim()}"`,
          domBiomasaOk
        );
      });

    // --- UI-050: cantidad actual reflejada ---
    cy.contains('div', /^(Cantidad actual|Current quantity)$/i)
      .parent()
      .invoke('text')
      .then((textoDom) => {
        const esperadoStr = '90';
        const domCantidadOk = textoDom.includes(esperadoStr);
        expect(domCantidadOk, `DOM debe contener la cantidad esperada (${esperadoStr})`).to.be.true;

        recordCheckpoint(
          'TC-M02-050 — C3 UI: Indicador DOM muestra cantidad actualizada 90',
          `Texto DOM contiene ${esperadoStr}`,
          `Texto DOM obtenido: "${textoDom.trim()}"`,
          domCantidadOk
        );
      });

    // Captura de evidencia visual de la ficha
    cy.screenshot('01_ficha_lote_ui', { overwrite: true });
  });
});
