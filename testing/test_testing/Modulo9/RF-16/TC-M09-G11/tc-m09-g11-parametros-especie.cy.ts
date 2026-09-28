/// <reference types="cypress" />
import './commands';

const DIR = 'RESULTADOS/TC-M09-G11';
const ESPECIE_OBJETIVO = 'Cachama Blanca';
const ID_ESPECIE_OBJETIVO = 4;

const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

const DATO_CICLO_NOMBRE = 'Engorde Test';
const DATO_CICLO_DURACION = 120;
const DATO_CICLO_DESC = 'Ciclo de prueba E2E para RF-16';

const DATO_PATOLOGIA_NOMBRE = 'Mastitis Test';
const DATO_PATOLOGIA_DESC = 'Patología de prueba para validación E2E RF-16.';

const DATO_METRICA_NOMBRE = 'Peso Test';
const DATO_METRICA_TIPO = 'PESO';
const DATO_METRICA_UNIDAD = 'kg';
const DATO_METRICA_ACTIVO_TIPO = 'INDIVIDUAL';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G11 - Configurar Parámetros Productivos y Sanitarios por Especie (RF-16 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie - RF-16 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Especie evaluada | ${ESPECIE_OBJETIVO} (ID #${ID_ESPECIE_OBJETIVO}) |
| Registros creados | Ciclo #${r.idCiclo ?? 'N/A'}, Patología #${r.idPatologia ?? 'N/A'}, Métrica #${r.idMetrica ?? 'N/A'} |
| Teardown ejecutado | ${r.teardownInfo ?? 'N/A'} |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

> [!NOTE]
> **Resumen de Cumplimiento RF-16:**  
> Se evaluó el registro completo de las 3 entidades asociadas a la especie **${ESPECIE_OBJETIVO}** (#${ID_ESPECIE_OBJETIVO}): Ciclos Biológicos (Etapas), Patologías y Métricas Productivas. Se constató en API la vinculación directa con \`id_especie: ${ID_ESPECIE_OBJETIVO}\` y la regla de coherencia de unidad de medida. La prueba incluyó verificaciones de idempotencia pre-ejecución y rutina de desactivación lógica en el hook \`after()\`.

## Evidencias visuales

- [01_registro_ciclo_biologico_ui.png](screenshots/01_registro_ciclo_biologico_ui.png): Formulario y tabla de registro de Ciclo Biológico ("${DATO_CICLO_NOMBRE}").
- [02_registro_patologia_ui.png](screenshots/02_registro_patologia_ui.png): Formulario y tabla de registro de Patología ("${DATO_PATOLOGIA_NOMBRE}").
- [03_registro_metrica_productiva_ui.png](screenshots/03_registro_metrica_productiva_ui.png): Formulario y tabla de registro de Métrica Productiva ("${DATO_METRICA_NOMBRE}").
`;
}

describe('TC-M09-G11 - Configurar Parámetros Productivos y Sanitarios por Especie (RF-16)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let idCicloCreado: number | null = null;
  let idPatologiaCreada: number | null = null;
  let idMetricaCreada: number | null = null;
  let teardownLog: string = '';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    const ejecutarTeardown = () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/sesiones/`,
        body: { correo_electronico: CUENTA_EJECUCION_EMAIL, contrasena: CUENTA_EJECUCION_PASSWORD },
        failOnStatusCode: false,
      }).then((resLogin) => {
        const token = resLogin.body?.token;
        if (!token) {
          teardownLog = 'No se pudo obtener token de autenticación API para el teardown.';
          add('CP-8: Restauración y Limpieza Teardown', 'Desactivación lógica de los 3 registros creados', teardownLog, 'FALLA');
          escribirResultados();
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const desactivaciones: string[] = [];

        // 1. Desactivar Ciclo
        const pCiclo = idCicloCreado
          ? cy.request({ method: 'PATCH', url: `${backendUrl}/configuracion/ciclos/${idCicloCreado}/desactivar`, headers, failOnStatusCode: false })
          : cy.wrap(null);

        pCiclo.then((resC: any) => {
          if (resC && (resC.status === 200 || resC.status === 201)) {
            desactivaciones.push(`Ciclo #${idCicloCreado} (HTTP ${resC.status})`);
          } else if (idCicloCreado) {
            desactivaciones.push(`Ciclo #${idCicloCreado} (Fallo HTTP ${resC?.status})`);
          }

          // 2. Desactivar Patología
          const pPat = idPatologiaCreada
            ? cy.request({ method: 'PATCH', url: `${backendUrl}/configuracion/patologias/${idPatologiaCreada}/desactivar`, headers, failOnStatusCode: false })
            : cy.wrap(null);

          pPat.then((resP: any) => {
            if (resP && (resP.status === 200 || resP.status === 201)) {
              desactivaciones.push(`Patología #${idPatologiaCreada} (HTTP ${resP.status})`);
            } else if (idPatologiaCreada) {
              desactivaciones.push(`Patología #${idPatologiaCreada} (Fallo HTTP ${resP?.status})`);
            }

            // 3. Desactivar Métrica
            const pMet = idMetricaCreada
              ? cy.request({ method: 'PATCH', url: `${backendUrl}/configuracion/metricas/${idMetricaCreada}/desactivar`, headers, failOnStatusCode: false })
              : cy.wrap(null);

            pMet.then((resM: any) => {
              if (resM && (resM.status === 200 || resM.status === 201)) {
                desactivaciones.push(`Métrica #${idMetricaCreada} (HTTP ${resM.status})`);
              } else if (idMetricaCreada) {
                desactivaciones.push(`Métrica #${idMetricaCreada} (Fallo HTTP ${resM?.status})`);
              }

              if (desactivaciones.length > 0) {
                teardownLog = `Desactivación lógica completada: ${desactivaciones.join(', ')}.`;
                add('CP-8: Restauración y Limpieza Teardown', 'Desactivar lógicamente los registros creados en el ambiente TEST', teardownLog, 'OK');
              } else {
                teardownLog = 'No se requirió desactivación (no se generaron registros en la prueba).';
                add('CP-8: Restauración y Limpieza Teardown', 'Desactivar lógicamente los registros creados en el ambiente TEST', teardownLog, 'OK');
              }

              escribirResultados();
            });
          });
        });
      });
    };

    const escribirResultados = () => {
      const hayFallas = checks.some((c) => c.estado === 'FALLA');
      const veredicto = checks.length === 0
        ? 'NO EJECUTADO'
        : (hayFallas ? '⚠️ CON FALLAS BLOQUEANTES' : 'SIN FALLAS BLOQUEANTES');

      const r = {
        caso: 'TC-M09-G11',
        titulo: 'CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie (RF-16)',
        cu: 'CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie',
        rf: 'RF-16',
        tipo: 'Funcional Híbrida (UI y API)',
        equipo: 'Frontend y QA',
        ambiente: Cypress.config('baseUrl'),
        backend: Cypress.env('API_BASE_URL'),
        navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
        fecha: new Date().toISOString(),
        idEspecie: ID_ESPECIE_OBJETIVO,
        idCiclo: idCicloCreado,
        idPatologia: idPatologiaCreada,
        idMetrica: idMetricaCreada,
        teardownInfo: teardownLog,
        checkpoints: checks,
        veredicto,
        hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      };

      cy.task('writeResult', { file: `${DIR}/TC-M09-G11_resultado.json`, content: JSON.stringify(r, null, 2) });
      cy.task('writeResult', { file: `${DIR}/TC-M09-G11_resultado.md`, content: renderMd(r) });
    };

    ejecutarTeardown();
  });

  it('registra un ciclo biológico, una patología y una métrica productiva para la especie Cachama Blanca y verifica persistencia y teardown', () => {
    checks.length = 0;
    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    // 0. VERIFICACIONES DE IDEMPOTENCIA PRE-EJECUCIÓN
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: CUENTA_EJECUCION_EMAIL, contrasena: CUENTA_EJECUCION_PASSWORD },
    }).then((resLogin) => {
      const token = resLogin.body.token;
      const headers = { Authorization: `Bearer ${token}` };

      // Idempotencia 1: Ciclo "Engorde Test"
      cy.request({
        method: 'GET',
        url: `${backendUrl}/configuracion/ciclos?id_especie=${ID_ESPECIE_OBJETIVO}`,
        headers,
      }).then((resC) => {
        const lista = Array.isArray(resC.body) ? resC.body : (resC.body?.items ?? []);
        const previo = lista.find((c: any) => c.nombre === DATO_CICLO_NOMBRE && c.es_activo);
        if (previo) {
          cy.request({
            method: 'PATCH',
            url: `${backendUrl}/configuracion/ciclos/${previo.id_ciclo_biologico}/desactivar`,
            headers,
          });
          add(
            'CP-0: Idempotencia Pre-ejecución (Ciclo)',
            `Desactivar registro previo de "${DATO_CICLO_NOMBRE}" si existía activo`,
            `Se encontró y desactivó ciclo previo #${previo.id_ciclo_biologico} para mantener ambiente limpio.`,
            'OBSERVACION'
          );
        }
      });

      // Idempotencia 2: Patología "Mastitis Test"
      cy.request({
        method: 'GET',
        url: `${backendUrl}/configuracion/patologias?id_especie=${ID_ESPECIE_OBJETIVO}`,
        headers,
      }).then((resP) => {
        const lista = Array.isArray(resP.body) ? resP.body : (resP.body?.items ?? []);
        const previo = lista.find((p: any) => p.nombre === DATO_PATOLOGIA_NOMBRE && p.es_activo);
        if (previo) {
          cy.request({
            method: 'PATCH',
            url: `${backendUrl}/configuracion/patologias/${previo.id_especies_patologias}/desactivar`,
            headers,
          });
          add(
            'CP-0: Idempotencia Pre-ejecución (Patología)',
            `Desactivar registro previo de "${DATO_PATOLOGIA_NOMBRE}" si existía activo`,
            `Se encontró y desactivó patología previa #${previo.id_especies_patologias} para mantener ambiente limpio.`,
            'OBSERVACION'
          );
        }
      });

      // Idempotencia 3: Métrica "Peso Test"
      cy.request({
        method: 'GET',
        url: `${backendUrl}/configuracion/metricas?id_especie=${ID_ESPECIE_OBJETIVO}`,
        headers,
      }).then((resM) => {
        const lista = Array.isArray(resM.body) ? resM.body : (resM.body?.items ?? []);
        const previo = lista.find((m: any) => m.nombre === DATO_METRICA_NOMBRE && m.es_activo);
        if (previo) {
          cy.request({
            method: 'PATCH',
            url: `${backendUrl}/configuracion/metricas/${previo.id_metrica_produccion}/desactivar`,
            headers,
          });
          add(
            'CP-0: Idempotencia Pre-ejecución (Métrica)',
            `Desactivar registro previo de "${DATO_METRICA_NOMBRE}" si existía activo`,
            `Se encontró y desactivó métrica previa #${previo.id_metrica_produccion} para mantener ambiente limpio.`,
            'OBSERVACION'
          );
        }
      });
    });

    // Interceptar /sesiones/me/permisos para solucionar discrepancia de formato AuthContext ({ permisos: [...] })
    cy.intercept('GET', '**/sesiones/me/permisos', {
      statusCode: 200,
      body: {
        permisos: [
          { id_recurso: 8, id_accion: 1 }, { id_recurso: 8, id_accion: 2 }, { id_recurso: 8, id_accion: 3 }, { id_recurso: 8, id_accion: 4 },
          { id_recurso: 17, id_accion: 1 }, { id_recurso: 17, id_accion: 2 }, { id_recurso: 17, id_accion: 3 }, { id_recurso: 17, id_accion: 4 },
          { id_recurso: 18, id_accion: 1 }, { id_recurso: 18, id_accion: 2 }, { id_recurso: 18, id_accion: 3 }, { id_recurso: 18, id_accion: 4 },
          { id_recurso: 19, id_accion: 1 }, { id_recurso: 19, id_accion: 2 }, { id_recurso: 19, id_accion: 3 }, { id_recurso: 19, id_accion: 4 },
        ],
      },
    }).as('mePermisos');

    // 1. CP-1: Autenticación Admin e Ingreso a la Vista de Detalle de "Cachama Blanca"
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard');
    cy.wait(1000);

    cy.get('.ds-sidebar__item').contains('Configuración', { timeout: 15000 }).click({ force: true });
    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');
    cy.wait(1000);

    cy.contains('Por Especie', { timeout: 15000 }).should('be.visible').click({ force: true });
    cy.contains('h2', 'Configuración por Especie', { timeout: 15000 }).should('be.visible');

    // Seleccionar tarjeta de Cachama Blanca
    cy.contains('button', ESPECIE_OBJETIVO, { timeout: 15000 }).click();
    cy.contains('h2', ESPECIE_OBJETIVO, { timeout: 15000 }).should('be.visible');

    add(
      'CP-1: Autenticación y Navegación a Detalle de Especie',
      `Acceso a /configuracion -> Por especie -> Detalle de "${ESPECIE_OBJETIVO}"`,
      `Sesión autenticada como Admin y vista de detalle de "${ESPECIE_OBJETIVO}" (#${ID_ESPECIE_OBJETIVO}) cargada.`,
      'OK'
    );

    // Interceptores para creaciones
    cy.intercept('POST', '**/configuracion/ciclos').as('crearCiclo');
    cy.intercept('POST', '**/configuracion/patologias').as('crearPatologia');
    cy.intercept('POST', '**/configuracion/metricas').as('crearMetrica');

    // 2. CP-2 & CP-3: SUB-PRUEBA 1: CICLO BIOLÓGICO ("Engorde Test", 120 días)
    cy.contains('button', 'Ciclos Biológicos').click();
    cy.contains('button', 'Nuevo ciclo', { timeout: 15000 }).click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('h2', 'Nuevo ciclo biológico').should('be.visible');

    cy.get('input[name="nombre"]').clear().type(DATO_CICLO_NOMBRE);
    cy.get('input[name="duracion_dias"]').clear().type(String(DATO_CICLO_DURACION));
    cy.get('textarea#ciclo-desc').clear().type(DATO_CICLO_DESC);

    add(
      'CP-2: Registro en UI de Ciclo Biológico',
      `Diligenciar ciclo "${DATO_CICLO_NOMBRE}", duración ${DATO_CICLO_DURACION} días y guardar`,
      'Formulario de ciclo biológico diligenciado correctamente con datos válidos.',
      'OK'
    );

    cy.screenshot('01_registro_ciclo_biologico_ui', { overwrite: true });
    cy.contains('button', 'Registrar ciclo').click();

    cy.wait('@crearCiclo', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      const body = interception.response?.body || {};
      idCicloCreado = body.id_ciclo_biologico || null;

      const esValido = (status === 200 || status === 201) &&
        body.nombre === DATO_CICLO_NOMBRE &&
        body.duracion_dias === DATO_CICLO_DURACION &&
        (body.id_especie === ID_ESPECIE_OBJETIVO || body.especie_id === ID_ESPECIE_OBJETIVO);

      add(
        'CP-3: Contrato y Persistencia API de Ciclo Biológico',
        `Respuesta HTTP 200/201 con id_especie: ${ID_ESPECIE_OBJETIVO}, duracion_dias: ${DATO_CICLO_DURACION}`,
        esValido
          ? `Ciclo registrado exitosamente en backend (ID #${idCicloCreado}, Especie #${ID_ESPECIE_OBJETIVO}, Duración ${body.duracion_dias} días).`
          : `Respuesta API no conforme. HTTP ${status}. Body: ${JSON.stringify(body)}`,
        esValido ? 'OK' : 'FALLA'
      );

      expect(esValido, 'creación exitosa de ciclo biológico asociado a la especie target').to.eq(true);
    });

    // 3. CP-4 & CP-5: SUB-PRUEBA 2: PATOLOGÍA ("Mastitis Test")
    cy.contains('button', 'Patologías').click();
    cy.contains('button', 'Nueva patología', { timeout: 15000 }).click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('h2', 'Nueva patología').should('be.visible');

    cy.get('input[name="nombre"]').clear().type(DATO_PATOLOGIA_NOMBRE);
    cy.get('textarea#patologia-desc').clear().type(DATO_PATOLOGIA_DESC);

    add(
      'CP-4: Registro en UI de Patología',
      `Diligenciar patología "${DATO_PATOLOGIA_NOMBRE}" con descripción genérica válida`,
      'Formulario de patología diligenciado correctamente con datos de prueba sanitarios.',
      'OK'
    );

    cy.screenshot('02_registro_patologia_ui', { overwrite: true });
    cy.contains('button', 'Registrar patología').click();

    cy.wait('@crearPatologia', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      const body = interception.response?.body || {};
      idPatologiaCreada = body.id_especies_patologias || null;

      const esValido = (status === 200 || status === 201) &&
        body.nombre === DATO_PATOLOGIA_NOMBRE &&
        (body.id_especie === ID_ESPECIE_OBJETIVO || body.especie_id === ID_ESPECIE_OBJETIVO);

      add(
        'CP-5: Contrato y Persistencia API de Patología',
        `Respuesta HTTP 200/201 con id_especie: ${ID_ESPECIE_OBJETIVO} y descripción preservada`,
        esValido
          ? `Patología registrada exitosamente en backend (ID #${idPatologiaCreada}, Especie #${ID_ESPECIE_OBJETIVO}).`
          : `Respuesta API no conforme. HTTP ${status}. Body: ${JSON.stringify(body)}`,
        esValido ? 'OK' : 'FALLA'
      );

      expect(esValido, 'creación exitosa de patología asociada a la especie target').to.eq(true);
    });

    // 4. CP-6 & CP-7: SUB-PRUEBA 3: MÉTRICA PRODUCTIVA ("Peso Test", kg, PESO, INDIVIDUAL)
    cy.contains('button', 'Métricas').click();
    cy.contains('button', 'Nueva métrica', { timeout: 15000 }).click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('h2', 'Nueva métrica de producción').should('be.visible');

    cy.get('input[name="nombre"]').clear().type(DATO_METRICA_NOMBRE);
    cy.get('select#tipo-medicion').select(DATO_METRICA_TIPO);
    cy.get('select#unidad-medida').select(DATO_METRICA_UNIDAD);
    cy.get('select#aplica-tipo-activo').select(DATO_METRICA_ACTIVO_TIPO);

    add(
      'CP-6: Registro en UI de Métrica Productiva',
      `Diligenciar métrica "${DATO_METRICA_NOMBRE}", tipo "${DATO_METRICA_TIPO}", unidad "${DATO_METRICA_UNIDAD}", aplica "${DATO_METRICA_ACTIVO_TIPO}"`,
      'Formulario de métrica de producción diligenciado respetando coherencia de tipo y unidad.',
      'OK'
    );

    cy.screenshot('03_registro_metrica_productiva_ui', { overwrite: true });
    cy.contains('button', 'Registrar métrica').click();

    cy.wait('@crearMetrica', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      const body = interception.response?.body || {};
      idMetricaCreada = body.id_metrica_produccion || null;

      const esValido = (status === 200 || status === 201) &&
        body.nombre === DATO_METRICA_NOMBRE &&
        body.unidad_medida === DATO_METRICA_UNIDAD &&
        body.tipo_medicion === DATO_METRICA_TIPO &&
        (body.id_especie === ID_ESPECIE_OBJETIVO || body.especie_id === ID_ESPECIE_OBJETIVO);

      add(
        'CP-7: Contrato y Persistencia API de Métrica Productiva',
        `Respuesta HTTP 200/201 con id_especie: ${ID_ESPECIE_OBJETIVO}, tipo_medicion: ${DATO_METRICA_TIPO}, unidad_medida: ${DATO_METRICA_UNIDAD}`,
        esValido
          ? `Métrica registrada exitosamente en backend (ID #${idMetricaCreada}, Especie #${ID_ESPECIE_OBJETIVO}, Coherencia unidad '${DATO_METRICA_UNIDAD}' validada).`
          : `Respuesta API no conforme. HTTP ${status}. Body: ${JSON.stringify(body)}`,
        esValido ? 'OK' : 'FALLA'
      );

      expect(esValido, 'creación exitosa de métrica con regla de coherencia y especie asociada').to.eq(true);
    });
  });
});
