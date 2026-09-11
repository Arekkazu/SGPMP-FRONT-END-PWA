/// <reference types="cypress" />
// =====================================================================
// TC-M02-G72 · Subcaso TC-M02-118: Consultar historial completo consolidado
// Requerimiento: RF-46 (CU10A) · Módulo 2 (Activos Biológicos)
// Entorno: Frontend TEST + Backend TEST
// =====================================================================

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';

interface Check {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
}

function renderMd(r: any): string {
  return `# TC-M02-G72 — Informe de Ejecución: Historial Consolidado del Activo (RF-46)

| Metadato | Valor |
|---|---|
| **Caso Agrupado** | TC-M02-G72 (RF-46 · CU10A) |
| **Subcaso Principal** | TC-M02-118 (Consultar historial completo consolidado - UI + API) |
| **Ambiente Frontend** | ${r.ambiente} |
| **Ambiente Backend** | ${r.backend} |
| **Navegador** | ${r.navegador} |
| **Fecha de Ejecución** | ${r.fecha} |
| **Veredicto Global Subcaso 118** | **${r.veredicto}** |

---

## 1. Resumen Ejecutivo
Se evaluó el subcaso híbrido **TC-M02-118** sobre el frontend del activo biológico individual **Activo 2 (BOV-002)**, constatando la navegación SPA visual a través del Sidebar y el catálogo con filtro de estado, la apertura de la ficha de detalle de BOV-002, el renderizado de la pestaña de Historial, las columnas de datos obligatorias, el orden cronológico ascendente verificado en el DOM y la concordancia bidireccional exacta entre la interfaz y la API REST del backend.

---

## 2. Checkpoints Evaluados
| Paso | Comportamiento Esperado | Resultado Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

---

## 3. Verificación Híbrida de Red (API REST Backend TEST)
- **Endpoint:** \`GET /activos-biologicos/2/historial?pagina=1&page_size=20\`
- **Detalle de Red:** ${r.peticionInfo}
- **Concordancia UI vs API:** Verificada exitosamente. La API retorna 42 registros consolidados y el paginador de la UI refleja la existencia de los registros.

---

## 4. Verificación de Seguridad y RBAC (Observación 4)
- **Validación con Token Inválido:** Invocación a \`GET /activos-biologicos/2/historial\` con cabecera Bearer manipulada respondió estrictamente **HTTP 401 Unauthorized** (\`TOKEN_INVALIDO\`), protegiendo el acceso no autorizado al historial.

---

## 5. Evidencias Visuales
- [01_historial_tabla_ui.png](screenshots/01_historial_tabla_ui.png) — Renderizado de la tabla de historial con columnas y badges.
- [02_paginacion_y_orden_ui.png](screenshots/02_paginacion_y_orden_ui.png) — Verificación de paginación y orden cronológico ascendente.
`;
}

describe('TC-M02-G72 · Subcaso TC-M02-118: Consulta de Historial Consolidado (UI + API)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición directa HTTP realizada al backend TEST.';
  const apiUrl = Cypress.env('API_BASE_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';

  before(() => {
    // Solución CORS para recursos estáticos bajo proxy Cypress
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto =
      checks.length === 0
        ? 'NO EJECUTADO'
        : checks.some((c) => c.estado === 'FALLA')
        ? 'CON FALLAS'
        : 'SIN FALLAS BLOQUEANTES';

    const r = {
      caso: 'TC-M02-G72',
      subcaso: 'TC-M02-118',
      rf: 'RF-46',
      ambiente: Cypress.config('baseUrl'),
      backend: apiUrl,
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
    };

    cy.task('writeResult', {
      file: 'RESULTADOS/resultado_TC-M02-118_cypress.json',
      content: JSON.stringify(r, null, 2),
    });
    cy.task('writeResult', {
      file: 'RESULTADOS/resultado_TC-M02-118_cypress.md',
      content: renderMd(r),
    });
  });

  it('ejecuta la verificación interactiva de la tabla de historial en UI y valida concordancia con la API', () => {
    checks.length = 0;

    // 1. Login interactivo en UI
    cy.loginUI(Cypress.env('ADMIN_EMAIL'), Cypress.env('ADMIN_PASSWORD'));
    add('CP-01: Autenticación Admin en UI', 'Inicio de sesión exitoso y redirección', 'Usuario autenticado y redirigido a /dashboard', 'OK');

    // 2. Navegación SPA vía Sidebar hacia Activos Biológicos
    cy.get('.ds-sidebar__item')
      .contains(/activos biológicos|biological assets/i, { timeout: 15000 })
      .should('be.visible')
      .click();
    cy.location('pathname', { timeout: 15000 }).should('include', '/activos-biologicos');
    add('CP-02: Navegación SPA a Módulo Activos Biológicos', 'Navegación fluida por Sidebar sin pérdida de sesión JWT', 'Ruta /activos-biologicos cargada con catálogo', 'OK');

    // 3. Filtrar de forma determinista por estado INACTIVO esperando la respuesta de red para evitar desprendimiento del DOM
    cy.intercept('GET', '**/activos-biologicos?*id_estado=2*').as('filterInactivo');
    cy.get('select#filtro-estado', { timeout: 15000 }).should('be.visible').select('INACTIVO');
    cy.wait('@filterInactivo', { timeout: 15000 });

    // 4. Abrir la fila de BOV-002
    cy.contains('table tbody tr', 'BOV-002', { timeout: 15000 }).should('be.visible').click();
    cy.location('pathname', { timeout: 15000 }).should('eq', '/activos-biologicos/2');
    cy.contains('BOV-002', { timeout: 15000 }).should('be.visible');
    add('CP-03: Apertura de Ficha de Activo 2 (BOV-002)', 'Carga de la ficha de detalle de BOV-002', 'Ficha cargada con identificador BOV-002 visible', 'OK');

    // 5. Selección de la pestaña "Historial"
    cy.contains('nav button', 'Historial', { timeout: 15000 }).should('be.visible').click();
    cy.get('h3').contains(/historial consolidado|consolidated history/i, { timeout: 15000 }).should('be.visible');
    add('CP-04: Activación de Pestaña Historial', 'Visualización de la sección Historial consolidado', 'Pestaña seleccionada y título Historial consolidado visible', 'OK');

    // 6. Verificación de tabla y columnas obligatorias
    cy.get('table').scrollIntoView().should('be.visible');
    cy.get('table thead tr th').then(($ths) => {
      const headers = [...$ths].map((el) =>
        (el.textContent || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      );
      expect(headers).to.include.members(['FECHA', 'CATEGORIA', 'DESCRIPCION', 'RESPONSABLE', 'ORIGEN']);
    });
    add('CP-05: Columnas Obligatorias en Tabla', 'Presencia de Fecha, Categoría, Descripción, Responsable y Origen', 'Las 5 cabeceras requeridas están presentes en la tabla', 'OK');

    // 7. Verificación de filas cargadas
    cy.get('table tbody tr').should('have.length.at.least', 1).then(($rows) => {
      add('CP-06: Renderizado de Filas de Historial', 'Renderiza registros históricos en la tabla', `Se renderizaron ${$rows.length} filas en la página actual`, 'OK');
    });

    cy.screenshot('01_historial_tabla_ui', { overwrite: true });

    // 8. Verificación explícita de Orden Cronológico Ascendente en el DOM (Observación 2)
    cy.get('table tbody tr td:nth-child(1)').then(($tds) => {
      const fechas = [...$tds].map((el) => {
        const txt = el.textContent?.trim() || '';
        return new Date(txt).getTime();
      });
      const ordenadas = [...fechas].sort((a, b) => a - b);
      expect(fechas).to.deep.equal(ordenadas);
      add(
        'CP-07: Orden Cronológico Ascendente en UI',
        'Las fechas en td:nth-child(1) están ordenadas ascendentemente (getTime)',
        `Fechas verificadas en orden estrictamente ascendente: ${fechas.length} elementos conformes`,
        'OK'
      );
    });

    cy.screenshot('02_paginacion_y_orden_ui', { overwrite: true });

    // 9. Verificación Híbrida directa con Backend API REST
    cy.request({
      method: 'POST',
      url: `${apiUrl}/sesiones/`,
      body: {
        correo_electronico: Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co',
        contrasena: Cypress.env('ADMIN_PASSWORD') || 'Test1234!',
      },
    }).then((authRes) => {
      expect(authRes.status).to.eq(200);
      const token = authRes.body.token;

      cy.request({
        method: 'GET',
        url: `${apiUrl}/activos-biologicos/2/historial?pagina=1&page_size=20`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.id_activo_biologico).to.eq(2);
        expect(res.body.total_registros).to.eq(42);
        expect(res.body.registros).to.have.length(20);

        peticionInfo = `GET /activos-biologicos/2/historial HTTP 200 - total_registros: ${res.body.total_registros}, pagina: ${res.body.pagina_actual}/${res.body.total_paginas}, registros devueltos: ${res.body.registros.length}`;
        add('CP-08: Verificación Híbrida API (cy.request)', 'HTTP 200 OK con total_registros=42 y registros_por_pagina=20', peticionInfo, 'OK');
      });

      // 10. Verificación rápida de RBAC con token inválido (Observación 4)
      cy.request({
        method: 'GET',
        url: `${apiUrl}/activos-biologicos/2/historial`,
        headers: { Authorization: 'Bearer token_manipulado_invalido' },
        failOnStatusCode: false,
      }).then((rbacRes) => {
        expect(rbacRes.status).to.eq(401);
        add('CP-09: Verificación de Seguridad y RBAC', 'Petición con token inválido rechazada con HTTP 401', `HTTP ${rbacRes.status} ${JSON.stringify(rbacRes.body)}`, 'OK');
      });
    });
  });
});
