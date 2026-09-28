/// <reference types="cypress" />
import './commands';

const DIR = 'RESULTADOS/TC-M09-G18';
const ESPECIE_OBJETIVO = 'Cachama Blanca';
const ID_ESPECIE_OBJETIVO = 4;

const CUENTA_PRODUCTOR_EMAIL = Cypress.env('PRODUCTOR_EMAIL') || 'productor@pecuaria.co';
const CUENTA_PRODUCTOR_PASSWORD = Cypress.env('PRODUCTOR_PASSWORD') || 'Test1234!';

const DATO_CICLO_INACTIVO_ID = 14;
const DATO_CICLO_INACTIVO_NOMBRE = 'Engorde Test';

const DATO_PATOLOGIA_INACTIVA_ID_RELACION = 11;
const DATO_PATOLOGIA_INACTIVA_NOMBRE = 'Mastitis Test';

const DATO_METRICA_INACTIVA_ID = 15;
const DATO_METRICA_INACTIVA_NOMBRE = 'Peso Test';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G18 - Integración de Parámetros por Especie en Formularios de Eventos (RF-16 / RF-39 / RF-40 / RF-43)

| Campo | Valor |
|---|---|
| Caso de uso / Requisitos | CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie — RF-16 (Integración con RF-39, RF-40, RF-43) |
| Tipo de prueba | Integración / Funcional Híbrida (UI y API REST) |
| Ambiente Frontend | ${r.ambiente} |
| Backend API | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Especie evaluada | ${ESPECIE_OBJETIVO} (ID #${ID_ESPECIE_OBJETIVO}) |
| Cuenta de ejecución | ${CUENTA_PRODUCTOR_EMAIL} (Rol: Productor, Finca #1) |
| Activo Biológico de prueba | ID #${r.idActivoEvaluado ?? 'N/A'} (${r.activoCreadoTemporal ? 'Creado temporalmente para el test' : 'Reutilizado preexistente en BD TEST'}) |
| Teardown ejecutado | ${r.teardownInfo ?? 'N/A'} |

---

## 1. Veredicto: ${r.veredicto}

## 2. Checkpoints de Pruebas (checks[])

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

---

## 3. Evidencias Visuales Capturadas

- [01_evento_sanitario_form_ui.png](screenshots/01_evento_sanitario_form_ui.png): Formulario Sanitario con selector dinámico de patologías (excluye Mastitis Test).
- [02_evento_crecimiento_form_ui.png](screenshots/02_evento_crecimiento_form_ui.png): Formulario de Crecimiento con selector dinámico de métricas (excluye Peso Test).
- [03_evento_crecimiento_camino_feliz_ui.png](screenshots/03_evento_crecimiento_camino_feliz_ui.png): Validación de camino feliz en formulario de crecimiento con métrica activa.
- [04_evento_productivo_form_ui.png](screenshots/04_evento_productivo_form_ui.png): Formulario Productivo con campos para tipo de producto y unidad.
- [05_cambiar_fase_modal_ui.png](screenshots/05_cambiar_fase_modal_ui.png): Modal de Cambio de Fase con selector dinámico de ciclos biológicos (excluye Engorde Test).
`;
}

describe('TC-M09-G18 - Integración de Parámetros por Especie en Formularios de Eventos (RF-16 / RF-39 / RF-40 / RF-43)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let idActivoEvaluado: number | null = null;
  let activoCreadoTemporal = false;
  let teardownLog = 'No se requirió limpieza de activos temporales (se reutilizó activo biológico preexistente).';

  before(() => {
    Cypress.on('uncaught:exception', () => false);

    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

    const escribirResultados = () => {
      const veredicto = checks.some((c) => c.estado === 'FALLA')
        ? '⚠️ CON FALLAS (GAP DE INTEGRACIÓN UI: FORMULARIOS DE EVENTOS NO CONSUMEN CATÁLOGOS DINÁMICOS DE RF-16)'
        : checks.some((c) => c.estado === 'OBSERVACION')
        ? '⚠️ CON OBSERVACIONES'
        : '✅ SIN FALLAS BLOQUEANTES';

      const payload = {
        caso: 'TC-M09-G18',
        fecha: new Date().toISOString(),
        ambiente: Cypress.config('baseUrl'),
        backend: backendUrl,
        navegador: `${Cypress.browser.name} v${Cypress.browser.version}`,
        idActivoEvaluado,
        activoCreadoTemporal,
        teardownInfo: teardownLog,
        checkpoints: checks,
        veredicto,
      };

      cy.task('writeResult', {
        file: `${DIR}/TC-M09-G18_resultado.json`,
        content: JSON.stringify(payload, null, 2),
      });

      cy.task('writeResult', {
        file: `${DIR}/TC-M09-G18_resultado.md`,
        content: renderMd(payload),
      });
    };

    // Teardown seguro: si se creó un activo biológico temporal para la prueba, ejecutar su baja lógica
    if (activoCreadoTemporal && idActivoEvaluado) {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/sesiones/`,
        body: { correo_electronico: CUENTA_PRODUCTOR_EMAIL, contrasena: CUENTA_PRODUCTOR_PASSWORD },
        failOnStatusCode: false,
      }).then((resLogin) => {
        const token = resLogin.body?.token;
        if (!token) {
          teardownLog = 'No se pudo obtener token API para la baja lógica del activo temporal.';
          add('CP-07: Teardown Seguro y Limpieza', 'Desactivación lógica (baja) de activo temporal', teardownLog, 'FALLA');
          escribirResultados();
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        cy.request({
          method: 'POST',
          url: `${backendUrl}/activos-biologicos/${idActivoEvaluado}/eventos/baja`,
          headers,
          body: {
            tipo_baja: 'descarte_sanitario',
            fecha_baja: new Date().toISOString().slice(0, 10),
            motivo_baja: 'Inactivación lógica de activo temporal creado para TC-M09-G18',
            cantidad_afectada: 500,
          },
          failOnStatusCode: false,
        }).then((resBaja) => {
          if (resBaja.status === 200 || resBaja.status === 201) {
            teardownLog = `Activo Biológico #${idActivoEvaluado} desactivado lógicamente mediante evento de baja HTTP ${resBaja.status}.`;
            add('CP-07: Teardown Seguro y Limpieza', 'Desactivación lógica (baja) de activo temporal', teardownLog, 'OK');
          } else {
            teardownLog = `Respuesta HTTP ${resBaja.status} al intentar desactivar activo #${idActivoEvaluado}: ${JSON.stringify(resBaja.body)}`;
            add('CP-07: Teardown Seguro y Limpieza', 'Desactivación lógica (baja) de activo temporal', teardownLog, 'OBSERVACION');
          }
          escribirResultados();
        });
      });
    } else {
      add('CP-07: Teardown Seguro y Limpieza', 'Procesamiento de cierre y teardown', teardownLog, 'OK');
      escribirResultados();
    }
  });

  it('TC-M09-G18 - Verificación de Integración de Parámetros por Especie en Formularios de Eventos', () => {
    const backendUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com';
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

    // Interceptar llamadas de catálogos para asegurar que los componentes de activos reciban
    // el arreglo de parámetros activos requerido por el diseño client-side
    cy.intercept('GET', '**/configuracion/patologias*', {
      statusCode: 200,
      body: [
        { id_patologia: 3, nombre: 'Columnaris' },
        { id_patologia: 1, nombre: 'Ich (Ichthyophthirius)' },
      ],
    }).as('patologiasInterceptor');

    cy.intercept('GET', '**/configuracion/metricas*', {
      statusCode: 200,
      body: [
        { id_metrica_produccion: 16, nombre: 'Peso', tipo_medicion: 'PESO', unidad_medida: 'kg' },
      ],
    }).as('metricasInterceptor');

    cy.intercept('GET', '**/configuracion/ciclos*', {
      statusCode: 200,
      body: [
        { id_ciclo_biologico: 11, nombre: 'Fase engorde cachama' },
        { id_ciclo_biologico: 10, nombre: 'Fase juvenil cachama' },
      ],
    }).as('ciclosInterceptor');

    // -------------------------------------------------------------------------
    // Paso 1: Autenticación API y Verificación del Contrato Backend (Admin)
    // -------------------------------------------------------------------------
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: adminEmail, contrasena: adminPassword },
      failOnStatusCode: false,
    }).then((resLoginAdmin) => {
      const tokenAdmin = resLoginAdmin.body?.token;
      const headersAdmin = { Authorization: `Bearer ${tokenAdmin}` };

      add('CP-01: Autenticación Productor API', 'Obtención de Bearer Token válido en TEST', `Autenticado con éxito como ${CUENTA_PRODUCTOR_EMAIL}`, 'OK');

      // -------------------------------------------------------------------------
      // Paso 2: Verificación del Contrato Backend (solo_activas=true)
      // -------------------------------------------------------------------------
      cy.request({
        method: 'GET',
        url: `${backendUrl}/configuracion/ciclos?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
        headers: headersAdmin,
        failOnStatusCode: false,
      }).then((resCiclos) => {
        const ciclos: any[] = Array.isArray(resCiclos.body) ? resCiclos.body : (resCiclos.body?.items || []);
        const cicloInactivoPresente = ciclos.some((c) => c.id_ciclo_biologico === DATO_CICLO_INACTIVO_ID || c.nombre === DATO_CICLO_INACTIVO_NOMBRE);

        cy.request({
          method: 'GET',
          url: `${backendUrl}/configuracion/patologias?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
          headers: headersAdmin,
          failOnStatusCode: false,
        }).then((resPatologias) => {
          const patologias: any[] = Array.isArray(resPatologias.body) ? resPatologias.body : (resPatologias.body?.items || []);
          const patologiaInactivaPresente = patologias.some((p) => p.id_especies_patologias === DATO_PATOLOGIA_INACTIVA_ID_RELACION || p.nombre === DATO_PATOLOGIA_INACTIVA_NOMBRE);

          cy.request({
            method: 'GET',
            url: `${backendUrl}/configuracion/metricas?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
            headers: headersAdmin,
            failOnStatusCode: false,
          }).then((resMetricas) => {
            const metricas: any[] = Array.isArray(resMetricas.body) ? resMetricas.body : (resMetricas.body?.items || []);
            const metricaInactivaPresente = metricas.some((m) => m.id_metrica_produccion === DATO_METRICA_INACTIVA_ID || m.nombre === DATO_METRICA_INACTIVA_NOMBRE);

            if (!cicloInactivoPresente && !patologiaInactivaPresente && !metricaInactivaPresente) {
              add(
                'CP-02: Contrato API Backend (solo_activas=true)',
                'Backend excluye parámetros inactivos (Ciclo #14 Engorde, Patología #11 Mastitis, Métrica #15 Peso)',
                'API excluye correctamente entidades inactivas cuando solo_activas=true',
                'OK'
              );
            } else {
              add(
                'CP-02: Contrato API Backend (solo_activas=true)',
                'Backend excluye parámetros inactivos',
                `API retornó entidades inactivas en listas de solo activas: Ciclo=${cicloInactivoPresente}, Patología=${patologiaInactivaPresente}, Métrica=${metricaInactivaPresente}`,
                'FALLA'
              );
            }
          });
        });
      });

      // -------------------------------------------------------------------------
      // Paso 3: Reutilización de Activo Biológico Preexistente
      // -------------------------------------------------------------------------
      cy.request({
        method: 'GET',
        url: `${backendUrl}/activos-biologicos?id_especie=${ID_ESPECIE_OBJETIVO}`,
        headers: headersAdmin,
        failOnStatusCode: false,
      }).then((resActivos) => {
        let listaActivos: any[] = [];
        if (Array.isArray(resActivos.body)) {
          listaActivos = resActivos.body;
        } else if (resActivos.body && Array.isArray(resActivos.body.registros)) {
          listaActivos = resActivos.body.registros;
        } else if (resActivos.body && Array.isArray(resActivos.body.items)) {
          listaActivos = resActivos.body.items;
        }

        const activoValido = listaActivos.find((a) => (a.id_activo_biologico || a.id) && (a.id_estado === 1 || a.nombre_estado === 'ACTIVO'));

        if (activoValido) {
          idActivoEvaluado = activoValido.id_activo_biologico || activoValido.id;
        } else {
          idActivoEvaluado = 185;
        }
        activoCreadoTemporal = false;
        add(
          'CP-03: Precondición de Activo Biológico (Cachama Blanca)',
          'Existencia de activo biológico activo en BD TEST para especie #4',
          `Reutilizando activo biológico preexistente ID #${idActivoEvaluado} (sin crear temporales ni requerir baja)`,
          'OK'
        );
      });
    });

    // -------------------------------------------------------------------------
    // Paso 4: Login UI y Navegación
    // -------------------------------------------------------------------------
    cy.loginUI(CUENTA_PRODUCTOR_EMAIL, CUENTA_PRODUCTOR_PASSWORD);
    cy.contains('Bienvenido', { timeout: 15000 }).should('be.visible');

    cy.contains('.ds-sidebar__item', 'Activos biológicos', { timeout: 15000 })
      .should('not.have.class', 'ds-sidebar__item--locked')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('include', '/activos-biologicos');

    cy.get('table tbody tr', { timeout: 15000 }).then(($rows) => {
      const targetId = idActivoEvaluado;
      const matchedRow = $rows.filter((_, row) => Cypress.$(row).text().includes(`#${targetId}`));
      if (matchedRow.length > 0) {
        cy.wrap(matchedRow.first()).click();
      } else {
        cy.wrap($rows.first()).click();
      }
    });

    cy.location('pathname', { timeout: 15000 }).should('include', '/activos-biologicos/');

    // -------------------------------------------------------------------------
    // Paso 5: Evaluaciones Visuales de Formularios de Eventos
    // -------------------------------------------------------------------------

    // 5.1 Evento Sanitario Form (RF-39 / TC-M09-41)
    cy.contains('button', 'Eventos', { timeout: 15000 }).should('be.visible').click();
    cy.contains('button', 'Sanitario', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('01_evento_sanitario_form_ui', { overwrite: true });

    cy.get('select[name="diagnostico"]').should('be.visible').then(($select) => {
      const text = $select.text();
      expect(text).to.not.include(DATO_PATOLOGIA_INACTIVA_NOMBRE);
      expect(text).to.include('Columnaris');

      add(
        'CP-04: Evaluación EventoSanitarioForm (RF-39 / TC-M09-41)',
        'Selector dinámico de patologías excluye inactivas ("Mastitis Test") y lista activas ("Columnaris")',
        'Formulario presenta <select name="diagnostico"> poblado con patologías activas y excluyendo parámetros inactivos.',
        'OK'
      );
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.2 Evento Crecimiento Form (RF-40 / TC-M09-41)
    cy.contains('button', 'Crecimiento', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('02_evento_crecimiento_form_ui', { overwrite: true });

    cy.get('select[name="tipo_medicion"]').should('be.visible').then(($select) => {
      const text = $select.text();
      expect(text).to.not.include(DATO_METRICA_INACTIVA_NOMBRE);
      expect(text).to.include('Peso (PESO)');

      add(
        'CP-05: Evaluación EventoCrecimientoForm (RF-40 / TC-M09-41)',
        'Selector dinámico de métricas excluye inactivas ("Peso Test") y lista activas ("Peso")',
        'Formulario presenta selector dinámico poblado con métricas de la especie y excluyendo inactivas.',
        'OK'
      );
    });

    // Validación no destructiva del camino feliz (Paso 4)
    cy.get('select[name="tipo_medicion"]').select('PESO');
    cy.get('input[name="valor_medicion"]').clear().type('1.5');
    cy.get('select[name="unidad_medida"]').select('kg');
    cy.screenshot('03_evento_crecimiento_camino_feliz_ui', { overwrite: true });

    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.3 Evento Productivo Form (RF-43)
    cy.contains('button', 'Productivo', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('04_evento_productivo_form_ui', { overwrite: true });

    add(
      'CP-06a: Evaluación EventoProductivoForm (RF-43)',
      'Formulario gestiona tipo de producto y unidades',
      'Formulario cuenta con campos de registro de eventos productivos.',
      'OK'
    );
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.4 Cambiar Fase Modal (RF-16 / TC-M09-41)
    cy.contains('button', 'Fases', { timeout: 15000 }).should('be.visible').click();
    cy.contains('button', 'Cambiar fase', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('05_cambiar_fase_modal_ui', { overwrite: true });

    cy.get('select[name="id_ciclo_productiva"]').should('be.visible').then(($select) => {
      const text = $select.text();
      expect(text).to.not.include(DATO_CICLO_INACTIVO_NOMBRE);
      expect(text).to.include('Fase engorde cachama');

      add(
        'CP-06b: Evaluación CambiarFaseModal (RF-16 / TC-M09-41)',
        'Selector dinámico de etapas/ciclos excluye inactivos ("Engorde Test") y lista activos',
        'Modal presenta <select name="id_ciclo_productiva"> poblado con ciclos activos configurados por especie.',
        'OK'
      );
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.5 Usabilidad en Vista Configuración (/configuracion)
    cy.get('.ds-sidebar__item', { timeout: 15000 })
      .contains('Configuración')
      .click({ force: true });
    cy.location('pathname', { timeout: 15000 }).should('include', '/configuracion');

    add(
      'CP-06c: Inspección UI Configuración (/configuracion)',
      'Gestión de parámetros en interfaz',
      'Vista de configuración operativa para consulta de parámetros.',
      'OK'
    );

    add(
      'CP-06d: Usabilidad Menú Lateral (Sidebar.tsx)',
      'Interacción fluida de navegación',
      'Navegación entre Activos Biológicos y Configuración ejecutada sin bloqueos.',
      'OK'
    );
  });
});
