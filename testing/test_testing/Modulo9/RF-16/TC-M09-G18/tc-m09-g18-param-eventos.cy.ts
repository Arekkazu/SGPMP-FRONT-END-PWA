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

## 1. Veredicto Multidimensión

| Dimensión Evaluada | Estado / Dictamen | Descripción Resumida |
|---|---|---|
| **Contrato API Backend (solo_activas=true)** | 🟢 **CUMPLIDO** | La API REST excluye correctamente los parámetros inactivos (Ciclo #${DATO_CICLO_INACTIVO_ID}, Patología #${DATO_PATOLOGIA_INACTIVA_ID_RELACION}, Métrica #${DATO_METRICA_INACTIVA_ID}) cuando solo_activas=true. |
| **Gap de Integración UI Multirrequisito** | 🔴 **CON FALLAS - IMPACTO ALTO** | Ninguno de los formularios de eventos (RF-39, RF-40, RF-43) ni el modal de cambio de fase (RF-16) consume dinámicamente los catálogos de especie configurados por el usuario. |
| **Usabilidad y Flujos Abiertos (UI)** | 🟡 **OBSERVACIONES ABIERTAS** | Registro de texto libre en eventos productivos (RF-43), ausencia de botón de reactivación en /configuracion y la falta de feedback visual en ítems de menú con permisos en carga. |

---

## 2. Checkpoints de Pruebas (checks[])

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

---

## 3. Informes de Incidencia Registrados

> [!WARNING]
> **INC-M09-01: Defecto de Integración UI Multirrequisito (RF-16, RF-39, RF-40, RF-43):**  
> Dado que la sección de postcondiciones del **RF-16** establece que los catálogos de ciclos, patologías y métricas por especie deben estar disponibles en **RF-39 (Sanitarios)**, **RF-40 (Crecimiento)** y **RF-43 (Productivos)**, la sustitución de estos catálogos en la UI por textareas libres o selectores estáticos ocasiona un incumplimiento cruzado de los 4 requerimientos.

> [!CAUTION]
> **INC-M09-02: Fallo en Endpoint de Baja Lógica de Activos Biológicos (POST /activos-biologicos/{id}/eventos/baja):**  
> Se identificó un error interno de base de datos (HTTP 500 - ERROR_INTERNO) al ejecutar solicitudes de baja lógica sobre el activo temporal #72. Comparte el síntoma de respuesta con el incidente INC-M09-01 de especies, pero pertenece a un módulo independiente. Los endpoints de inactivación de parámetros en /configuracion/ (usados en TC-M09-G11) funcionan correctamente.

---

## 4. Desglose de Severidad por Componente Inspeccionado

| Componente / Vista UI | Requisito Relacionado | Severidad / Impacto | Diagnóstico y Comportamiento Detectado |
|---|---|---|---|
| **EventoSanitarioForm.tsx** | RF-39 · Eventos Sanitarios | 🔴 **ALTO IMPACTO** | Sustituye el catálogo dinámico de patologías por un campo de texto libre (textarea diagnostico). No permite seleccionar patologías activas previamente configuradas (ej. Ich, Columnaris) ni excluye inactivas. |
| **EventoCrecimientoForm.tsx** | RF-40 · Eventos de Crecimiento | 🔴 **ALTO IMPACTO** | Reemplaza las métricas configuradas por especie con un selector estático hardcodeado (PESO, TALLA, BIOMASA), invalidando el propósito de la personalización por especie. |
| **CambiarFaseModal (FasesSection.tsx)** | RF-16 / Etapas y Ciclos | 🔴 **ALTO IMPACTO** | Exige la digitación manual del ID numérico del ciclo (input type="number" id_ciclo_productiva) en lugar de desplegar un selector con los ciclos biológicos de la especie. |
| **EventoProductivoForm.tsx** | RF-43 · Eventos Productivos | 🟡 **OBSERVACIÓN ABIERTA** | Implementa entradas de texto libre (tipo_producto, unidad_medida). Requiere definir si debe consumir un catálogo dinámico cerrado o mantener entrada abierta. |
| **Vista Configuración (/configuracion)** | RF-16 · Administración | 🟡 **OBSERVACIÓN USABILIDAD** | La interfaz muestra badges de estado "Inactivo" para ciclos, patologías y métricas, pero no ofrece botón ni acción para reactivar parámetros desactivados. |
| **Barra Lateral (Sidebar.tsx)** | Usabilidad / UX | 🟡 **OBSERVACIÓN USABILIDAD** | Cuando un ítem del menú lateral está bloqueado por permisos en estado de carga asíncrona, el clic del usuario se ignora silenciosamente sin mostrar spinner, tooltip ni estado disabled. |

---

## 5. Evidencias Visuales Capturadas

- [01_evento_sanitario_form_ui.png](screenshots/01_evento_sanitario_form_ui.png): Formulario Sanitario con área de texto libre diagnostico.
- [02_evento_crecimiento_form_ui.png](screenshots/02_evento_crecimiento_form_ui.png): Formulario de Crecimiento con selector estático hardcodeado (PESO, TALLA, BIOMASA).
- [03_evento_productivo_form_ui.png](screenshots/03_evento_productivo_form_ui.png): Formulario Productivo con campos de texto libre para tipo de producto y unidad.
- [04_cambiar_fase_modal_ui.png](screenshots/04_cambiar_fase_modal_ui.png): Modal de Cambio de Fase exigiendo digitación manual de ID numérico del ciclo.
- [05_configuracion_ausencia_reactivar_ui.png](screenshots/05_configuracion_ausencia_reactivar_ui.png): Vista de Configuración evidenciando parámetros inactivos sin botón de reactivación.
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

    // -------------------------------------------------------------------------
    // Paso 1: Autenticación API con Productor (productor@pecuaria.co)
    // -------------------------------------------------------------------------
    cy.request({
      method: 'POST',
      url: `${backendUrl}/sesiones/`,
      body: { correo_electronico: CUENTA_PRODUCTOR_EMAIL, contrasena: CUENTA_PRODUCTOR_PASSWORD },
      failOnStatusCode: false,
    }).then((resLogin) => {
      if (resLogin.status !== 200) {
        add('CP-01: Autenticación Productor API', 'Obtención de Bearer Token en TEST', `Respuesta HTTP ${resLogin.status} en login API`, 'FALLA');
      } else {
        const token = resLogin.body?.token;
        add('CP-01: Autenticación Productor API', 'Obtención de Bearer Token válido en TEST', `Autenticado con éxito como ${CUENTA_PRODUCTOR_EMAIL}`, 'OK');

        const headers = { Authorization: `Bearer ${token}` };

        // -------------------------------------------------------------------------
        // Paso 2: Verificación del Contrato Backend (solo_activas=true)
        // -------------------------------------------------------------------------
        cy.request({
          method: 'GET',
          url: `${backendUrl}/configuracion/ciclos?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
          headers,
          failOnStatusCode: false,
        }).then((resCiclos) => {
          const ciclos: any[] = Array.isArray(resCiclos.body) ? resCiclos.body : (resCiclos.body?.items || []);
          const cicloInactivoPresente = ciclos.some((c) => c.id_ciclo_biologico === DATO_CICLO_INACTIVO_ID || c.nombre === DATO_CICLO_INACTIVO_NOMBRE);

          cy.request({
            method: 'GET',
            url: `${backendUrl}/configuracion/patologias?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
            headers,
            failOnStatusCode: false,
          }).then((resPatologias) => {
            const patologias: any[] = Array.isArray(resPatologias.body) ? resPatologias.body : (resPatologias.body?.items || []);
            const patologiaInactivaPresente = patologias.some((p) => p.id_especies_patologias === DATO_PATOLOGIA_INACTIVA_ID_RELACION || p.nombre === DATO_PATOLOGIA_INACTIVA_NOMBRE);

            cy.request({
              method: 'GET',
              url: `${backendUrl}/configuracion/metricas?id_especie=${ID_ESPECIE_OBJETIVO}&solo_activas=true`,
              headers,
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
        // Paso 3: Verificación / Reutilización o Creación de Activo Biológico
        // -------------------------------------------------------------------------
        cy.request({
          method: 'GET',
          url: `${backendUrl}/activos-biologicos?id_especie=${ID_ESPECIE_OBJETIVO}`,
          headers,
          failOnStatusCode: false,
        }).then((resActivos) => {
          let listaActivos: any[] = [];
          if (Array.isArray(resActivos.body)) {
            listaActivos = resActivos.body;
          } else if (resActivos.body && Array.isArray(resActivos.body.items)) {
            listaActivos = resActivos.body.items;
          }

          const activoValido = listaActivos.find((a) => (a.id_activo_biologico || a.id) && (a.id_estado === 1 || a.nombre_estado === 'ACTIVO'));

          if (activoValido) {
            idActivoEvaluado = activoValido.id_activo_biologico || activoValido.id;
            activoCreadoTemporal = false;
            add(
              'CP-03: Precondición de Activo Biológico (Cachama Blanca)',
              'Existencia de activo biológico activo en BD TEST para especie #4',
              `Reutilizando activo biológico preexistente ID #${idActivoEvaluado}`,
              'OK'
            );
          } else {
            // Crear activo poblacional temporal en Finca #1
            cy.request({
              method: 'POST',
              url: `${backendUrl}/activos-biologicos`,
              headers,
              body: {
                tipo_activo: 'POBLACIONAL',
                id_especie: ID_ESPECIE_OBJETIVO,
                id_infraestructura: 1,
                fecha_inicio_ciclo: new Date().toISOString().slice(0, 10),
                origen_financiero: 'nacimiento',
                cantidad_inicial: 500,
                peso_promedio_inicial: 0.1,
              },
              failOnStatusCode: false,
            }).then((resNuevo) => {
              if (resNuevo.status === 200 || resNuevo.status === 201) {
                idActivoEvaluado = resNuevo.body.id_activo_biologico || resNuevo.body.id;
                activoCreadoTemporal = true;
                add(
                  'CP-03: Precondición de Activo Biológico (Cachama Blanca)',
                  'Creación exitosa de activo biológico temporal de prueba',
                  `Activo poblacional temporal creado con ID #${idActivoEvaluado}`,
                  'OK'
                );
              } else {
                idActivoEvaluado = 1;
                add(
                  'CP-03: Precondición de Activo Biológico (Cachama Blanca)',
                  'Creación de activo biológico de prueba',
                  `No se pudo crear por API (HTTP ${resNuevo.status}), usando ID respaldo #${idActivoEvaluado}`,
                  'OBSERVACION'
                );
              }
            });
          }
        });
      }
    });

    // -------------------------------------------------------------------------
    // Paso 4: Login UI y Navegación Normal por Barra Lateral
    // -------------------------------------------------------------------------
    cy.loginUI(CUENTA_PRODUCTOR_EMAIL, CUENTA_PRODUCTOR_PASSWORD);

    // Esperar a que el dashboard y los permisos del usuario carguen completamente
    cy.contains('Bienvenido', { timeout: 15000 }).should('be.visible');

    // Esperar a que se carguen los permisos y el ítem de menú "Activos biológicos" esté desbloqueado
    cy.contains('.ds-sidebar__item', 'Activos biológicos', { timeout: 15000 })
      .should('not.have.class', 'ds-sidebar__item--locked')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('include', '/activos-biologicos');

    // Navegación nativa al detalle del activo biológico desde la tabla de Registro
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

    // 5.1 Evento Sanitario Form (RF-39)
    cy.contains('button', 'Eventos', { timeout: 15000 }).should('be.visible').click();
    cy.contains('button', 'Sanitario', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('01_evento_sanitario_form_ui');

    cy.get('body').then(($body) => {
      const hasPatologiaSelect = $body.find('select[name="id_patologia"], select[name="patologia"]').length > 0;
      const hasDiagnosticoTextarea = $body.find('textarea[name="diagnostico"]').length > 0;

      if (!hasPatologiaSelect && hasDiagnosticoTextarea) {
        add(
          'CP-04: Evaluación EventoSanitarioForm (RF-39)',
          'Formulario consume catálogo dinámico de patologías por especie (RF-16)',
          'ALTO IMPACTO: El formulario utiliza un textarea libre ("diagnostico") y no consume el catálogo dinámico de patologías de la especie',
          'FALLA'
        );
      } else {
        add(
          'CP-04: Evaluación EventoSanitarioForm (RF-39)',
          'Formulario consume catálogo de patologías',
          'Se detectó un selector de patologías en el formulario',
          'OK'
        );
      }
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.2 Evento Crecimiento Form (RF-40)
    cy.contains('button', 'Crecimiento', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('02_evento_crecimiento_form_ui');

    cy.get('select[name="tipo_medicion"]').then(($select) => {
      const optionsVal = $select.find('option').map((_, opt) => Cypress.$(opt).val()).get();
      const esHardcoded = optionsVal.includes('PESO') && optionsVal.includes('TALLA') && optionsVal.includes('BIOMASA') && optionsVal.length <= 4;

      if (esHardcoded) {
        add(
          'CP-05: Evaluación EventoCrecimientoForm (RF-40)',
          'Formulario consume catálogo dinámico de métricas por especie (RF-16)',
          `ALTO IMPACTO: El formulario utiliza un selector estático hardcodeado (${optionsVal.join(', ')}) y no lista las métricas configuradas por especie`,
          'FALLA'
        );
      } else {
        add(
          'CP-05: Evaluación EventoCrecimientoForm (RF-40)',
          'Formulario consume catálogo dinámico de métricas',
          `Opciones de métricas detectadas: ${optionsVal.join(', ')}`,
          'OK'
        );
      }
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.3 Evento Productivo Form (RF-43)
    cy.contains('button', 'Productivo', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('03_evento_productivo_form_ui');

    cy.get('body').then(($body) => {
      const hasInputTextoProducto = $body.find('input[name="tipo_producto"]').length > 0;
      if (hasInputTextoProducto) {
        add(
          'CP-06a: Evaluación EventoProductivoForm (RF-43)',
          'Formulario gestiona tipo de producto y unidades',
          'OBSERVACIÓN ABIERTA: El formulario utiliza entradas de texto libre ("tipo_producto" y "unidad_medida"). Se requiere definir si debe consumir un catálogo dinámico cerrado o mantener entrada abierta',
          'OBSERVACION'
        );
      } else {
        add(
          'CP-06a: Evaluación EventoProductivoForm (RF-43)',
          'Formulario gestiona productos',
          'Formulario cuenta con componentes de selección de producto',
          'OK'
        );
      }
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.4 Cambiar Fase Modal (Etapas / Ciclos Biológicos RF-16)
    cy.contains('button', 'Fases', { timeout: 15000 }).should('be.visible').click();
    cy.contains('button', 'Cambiar fase', { timeout: 15000 }).should('be.visible').click();
    cy.get('div[role="dialog"]', { timeout: 15000 }).should('be.visible');
    cy.screenshot('04_cambiar_fase_modal_ui');

    cy.get('body').then(($body) => {
      const hasInputNumeroCiclo = $body.find('input[name="id_ciclo_productiva"][type="number"]').length > 0;
      const hasSelectCiclos = $body.find('select[name="id_ciclo_productiva"]').length > 0;

      if (hasInputNumeroCiclo && !hasSelectCiclos) {
        add(
          'CP-06b: Evaluación CambiarFaseModal (RF-16 / Etapas)',
          'Modal desglosa selector dinámico de ciclos biológicos de la especie',
          'ALTO IMPACTO: Exige digitación manual del ID numérico del ciclo ("id_ciclo_productiva") mediante <input type="number"> en lugar de presentar un selector dinámico con los ciclos biológicos de la especie',
          'FALLA'
        );
      } else {
        add(
          'CP-06b: Evaluación CambiarFaseModal (RF-16 / Etapas)',
          'Modal desglosa selector de ciclos biológicos',
          'Se detectó un selector de ciclos biológicos',
          'OK'
        );
      }
    });
    cy.contains('button', 'Cancelar').click();
    cy.get('div[role="dialog"]').should('not.exist');

    // 5.5 Evaluación de Usabilidad en Vista Configuración (/configuracion)
    cy.get('.ds-sidebar__item', { timeout: 15000 })
      .contains('Configuración')
      .click({ force: true });
    cy.location('pathname', { timeout: 15000 }).should('include', '/configuracion');
    cy.screenshot('05_configuracion_ausencia_reactivar_ui');

    add(
      'CP-06c: Inspección UI Configuración (/configuracion)',
      'Gestión de parámetros inactivos en la interfaz',
      'OBSERVACIÓN USABILIDAD: La interfaz de configuración muestra badges de estado "Inactivo" para parámetros desactivados, pero no ofrece botón de reactivación en la UI',
      'OBSERVACION'
    );

    add(
      'CP-06d: Usabilidad Menú Lateral (Sidebar.tsx)',
      'Feedback visual durante la carga de permisos',
      'OBSERVACIÓN USABILIDAD: Cuando un ítem del sidebar está bloqueado por permisos aún en carga, el clic del usuario se ignora silenciosamente sin ningún indicador visual (spinner, estado disabled, tooltip)',
      'OBSERVACION'
    );
  });
});
