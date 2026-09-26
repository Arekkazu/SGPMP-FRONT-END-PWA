/// <reference types="cypress" />

const ARCHIVO_REPORTE = 'resultados/resultado_TC-M09-G07_reintento2.json';
const ARCHIVO_INFORME_MD = 'evidencias/TC-M09-G07_resultado_reintento2.md';
const ENDPOINT_ESPECIES = '/configuracion/especies';

type EstadoCheckpoint = 'OK' | 'FALLA';

interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: EstadoCheckpoint;
}

function generarReporteMd(r: {
  caso: string;
  titulo: string;
  cu: string;
  rf: string;
  ambiente: string;
  backend: string;
  navegador: string;
  fecha: string;
  checkpoints: Checkpoint[];
  veredicto: string;
  peticionInfo: string;
  datoNombre: string;
}): string {
  return `# ${r.caso} - Sincronización Offline y Conflicto de Nombres de Especie (${r.rf})

| Metadato | Detalle |
|---|---|
| **Caso de uso / RF** | ${r.cu} · ${r.rf} |
| **Tipo de Prueba** | Funcional E2E (UI, PWA Offline-First y Contratos API) |
| **Ambiente Frontend** | ${r.ambiente} |
| **Backend TEST** | ${r.backend} |
| **Navegador** | ${r.navegador} |
| **Fecha de Ejecución** | ${r.fecha} |
| **Especie de Prueba** | \`${r.datoNombre}\` |
| **Veredicto Final** | **${r.veredicto}** |

## Checkpoints de Aceptación (Escaneables)

| Paso | Comprobación Esperada | Resultado Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Diagnóstico Técnico y Resumen de Hallazgos

- **Trazabilidad de Peticiones y Red**: ${r.peticionInfo}
- **Validación del Fix Issue #115 (PR #119 / RF-15)**:
  1. El botón de registro en el catálogo de especies permite la creación en modo desconectado (\`disabled={!online}\` eliminado).
  2. La operación offline se encola de forma optimista con identificador temporal negativo y etiqueta \`pendienteSync: true\`.
  3. En la tabla de especies se ocultan las acciones de mutación (editar/desactivar) para el registro no sincronizado.
  4. Al restablecer la conectividad, la cola reintenta la sincronización con el backend TEST.
  5. Ante colisión de nombres (HTTP 409 Conflict), el sistema captura la excepción, marca la operación como conflicto y ofrece al usuario la resolución explícita mediante la acción "Descartar".
  6. Al presionar "Descartar", la alerta se retira del DOM y la fila temporal es eliminada de Dexie y de la interfaz.
`;
}

describe('TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15)', () => {
  const checkpoints: Checkpoint[] = [];
  const registrarCheckpoint = (
    paso: string,
    esperado: string,
    obtenido: string,
    estado: EstadoCheckpoint
  ) => {
    checkpoints.push({ paso, esperado, obtenido, estado });
  };

  const letrasAleatorias = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const DATO_NOMBRE = `Gallina QA ${letrasAleatorias}`;
  const DATO_DESCRIPCION =
    'Especie de prueba creada por QA para validar el flujo de sincronización offline.';

  let peticionInfo = 'Ejecución de suite E2E completada.';
  let idEspecieBase: number | null = null;
  let authToken = '';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    // Teardown vía API REST si se llegó a crear una especie base en el backend
    if (idEspecieBase && authToken) {
      cy.request({
        method: 'PATCH',
        url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}/${idEspecieBase}/desactivar`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resTeardown) => {
        cy.log(`Teardown: Especie #${idEspecieBase} desactivada en backend (HTTP ${resTeardown.status})`);
      });
    }

    const hayFallas = checkpoints.some((c) => c.estado === 'FALLA');
    const veredicto =
      checkpoints.length === 0
        ? 'RECHAZADO'
        : hayFallas
        ? 'RECHAZADO'
        : 'APROBADO';

    const resultadoComputable = {
      tc: 'TC-M09-G07',
      rf: 'RF-15',
      issue: '#115',
      fecha: new Date().toISOString().slice(0, 10),
      entorno: 'TEST',
      caso: 'TC-M09-G07',
      titulo: 'CU-01 - Sincronización offline y conflicto de nombres de especie (RF-15)',
      cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
      tipo: 'Funcional (UI, PWA y API)',
      equipo: 'Frontend y QA',
      ambiente: Cypress.config('baseUrl') || 'TEST',
      backend: Cypress.env('API_BASE_URL') || 'TEST',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      peticionInfo,
      checkpoints,
      veredicto,
      hallazgos: checkpoints.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', {
      file: ARCHIVO_REPORTE,
      content: JSON.stringify(resultadoComputable, null, 2),
    });

    // El .md narrativo se consolida manualmente al cierre de la reevaluación (R15.1). No se autogenera.
  });

  it('valida la creación offline de especies, la detección de conflicto 409 al reconectar y el descarte de la operación diferida', () => {
    checkpoints.length = 0;

    const email = Cypress.env('ADMIN_EMAIL');
    const password = Cypress.env('TEST_ADMIN_PASSWORD');

    if (!email || !password) {
      throw new Error(
        'Credenciales de prueba ausentes en el entorno de ejecución (ADMIN_EMAIL / TEST_ADMIN_PASSWORD).'
      );
    }

    // Interceptar login para capturar token JWT en memoria
    cy.intercept('POST', '**/sesiones/').as('loginRequest');

    // 1. Autenticación con credenciales inyectadas de TEST
    cy.loginUI(email, password);

    cy.wait('@loginRequest').then((interception) => {
      const body = interception.response?.body;
      if (body && body.token) {
        authToken = body.token;
      }
    });

    // 2. Navegación SPA mediante Sidebar para conservar el JWT singleton en memoria (sin reload)
    cy.contains('.ds-sidebar__item', /configuración|configuration/i, { timeout: 20000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains('h2', /catálogo de especies|species catalog/i, { timeout: 20000 }).should('be.visible');

    // CP-1: Evaluación de contrato en backend (POST /configuracion/especies)
    cy.then(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_BASE_URL')}${ENDPOINT_ESPECIES}`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          nombre: DATO_NOMBRE,
          descripcion: DATO_DESCRIPCION,
        },
        failOnStatusCode: false,
      }).then((resBase) => {
        const status = resBase.status;
        const body = resBase.body || {};
        peticionInfo = `POST inicial "${DATO_NOMBRE}" -> HTTP ${status}`;

        const esExito = status === 201 || status === 200;
        if (esExito) {
          idEspecieBase = body.id || body.id_especie || null;
        }

        registrarCheckpoint(
          'CP-1: Precondición de conflicto (Especie base online en servidor)',
          'HTTP 201/200 OK con ID asignado para reservar el nombre colisionante',
          esExito
            ? `HTTP ${status} OK - ID base #${idEspecieBase}`
            : `Respuesta del backend TEST: HTTP ${status} (${body.error_code || body.codigo || 'ERROR_INTERNO'})`,
          esExito ? 'OK' : 'FALLA'
        );
      });
    });

    // 3. Simulación de desconexión de red (Modo Offline PWA)
    cy.setOnline(false);

    // CP-2: Verificación de habilitación de escritura offline (Fix Issue #115)
    cy.contains(/sin conexión|offline/i, { timeout: 8000 }).should('be.visible');
    cy.contains(/se guardarán localmente|saved locally/i, { timeout: 8000 }).should('be.visible');

    cy.contains('button', /nueva especie|new species/i, { timeout: 8000 }).then(($btn) => {
      const estaHabilitado = !$btn.is(':disabled') && $btn.prop('disabled') !== true;
      registrarCheckpoint(
        'CP-2: Habilitación de botón Nueva especie en modo offline (RF-15)',
        'El botón "Nueva especie" debe permanecer habilitado sin conexión para permitir creación diferida en Dexie',
        estaHabilitado
          ? 'Botón habilitado correctamente en modo offline (disabled={!online} removido).'
          : 'INCUMPLIMIENTO: El botón "Nueva especie" permanece deshabilitado en offline.',
        estaHabilitado ? 'OK' : 'FALLA'
      );
    });

    cy.screenshot('01_ui_offline_habilitado', { overwrite: true });

    // CP-3: Creación optimista en formulario modal con ID temporal y badge pendienteSync
    cy.contains('button', /nueva especie|new species/i).click();

    cy.get('input[name="nombre"]', { timeout: 8000 })
      .should('be.visible')
      .clear()
      .type(DATO_NOMBRE);

    cy.get('#especie-desc').clear().type(DATO_DESCRIPCION);

    cy.contains('button[type="submit"]', /registrar especie|register species|guardar|save/i).click();

    // La fila optimista se agrega al final del catálogo. Se filtra por nombre para verificar su existencia sin depender de la paginación activa.
    // El hecho de que un usuario no la vea directamente al crearla (queda en la última página) es un hallazgo UX aparte, documentado en el .md.
    cy.get('input[placeholder*="nombre" i], input[placeholder*="name" i]', { timeout: 8000 })
      .should('be.visible')
      .clear()
      .type(DATO_NOMBRE);

    // Validar que se añade a la tabla con badge 'Pendiente de sincronización'
    cy.contains('tr', DATO_NOMBRE, { timeout: 10000 }).within(() => {
      cy.contains(/pendiente de sincronización|pending sync/i).should('be.visible');
      // En fila pendienteSync los botones de acción deben estar ocultos
      cy.get('button[aria-label*="Editar"], button[aria-label*="Edit"]').should('not.exist');
      cy.get('button[aria-label*="Desactivar"], button[aria-label*="Deactivate"]').should('not.exist');
    });

    cy.contains('tr', DATO_NOMBRE).then(($row) => {
      const tieneBadge =
        $row.text().toLowerCase().includes('pendiente') ||
        $row.text().toLowerCase().includes('pending');
      registrarCheckpoint(
        'CP-3: Registro local optimista y badge de sincronización pendiente',
        'La especie debe agregarse localmente con estado pendiente de sincronización y botones de acción ocultos',
        tieneBadge
          ? `Especie "${DATO_NOMBRE}" renderizada con badge y acciones deshabilitadas.`
          : 'No se detectó el badge de sincronización diferida en la fila local.',
        tieneBadge ? 'OK' : 'FALLA'
      );
    });

    cy.screenshot('02_registro_optimista_pendiente', { overwrite: true });

    // 4. Reconexión de red y procesamiento de sincronización diferida contra backend TEST real
    cy.setOnline(true);

    // CP-4: Captura del rechazo HTTP 409 y despliegue de alerta de conflicto en UI
    cy.contains(/conflicto de sincronización|sync conflict/i, { timeout: 20000 }).should('be.visible');

    cy.contains('button', /descartar|discard/i, { timeout: 8000 }).then(($btnDescartar) => {
      const visible = $btnDescartar.is(':visible');
      registrarCheckpoint(
        'CP-4: Detección de conflicto 409 y despliegue de alerta con opción Descartar',
        'Al reconectar y recibir 409 Conflict, la UI debe desplegar alerta de conflicto con botón Descartar',
        visible
          ? 'Alerta de conflicto renderizada con botón "Descartar" activo tras rechazo 409.'
          : 'No se desplegó la alerta de conflicto de sincronización al reconectar.',
        visible ? 'OK' : 'FALLA'
      );
    });

    cy.screenshot('03_alerta_conflicto_sincronizacion', { overwrite: true });

    // CP-5: Resolución del conflicto - Descarte de la operación diferida
    cy.contains('button', /descartar|discard/i).click({ force: true });

    // Validar que el botón de descarte y el bloque de conflicto se desmontan del DOM (timeout 15s para Dexie + React re-render)
    cy.contains('button', /descartar|discard/i, { timeout: 15000 }).should('not.exist');

    // Validar que la fila temporal fue retirada de la tabla
    cy.get('body').then(($body) => {
      const filasConNombre = $body.find('tbody tr').toArray().filter((row) => {
        return row.textContent?.includes(DATO_NOMBRE);
      });

      const filaPendienteRestante = filasConNombre.some(
        (row) =>
          row.textContent?.toLowerCase().includes('pendiente') ||
          row.textContent?.toLowerCase().includes('pending')
      );

      const descarteExitoso = !filaPendienteRestante;

      registrarCheckpoint(
        'CP-5: Resolución manual de conflicto y limpieza de operación en cola',
        'Al presionar Descartar, la alerta se remueve y el registro temporal con pendienteSync desaparece',
        descarteExitoso
          ? 'Operación en conflicto descartada exitosamente: alerta cerrada y fila temporal retirada de Dexie/UI.'
          : 'Falla: La fila temporal en conflicto persiste en la vista tras descartar.',
        descarteExitoso ? 'OK' : 'FALLA'
      );
    });

    cy.screenshot('04_conflicto_resuelto_descartado', { overwrite: true });
  });
});
