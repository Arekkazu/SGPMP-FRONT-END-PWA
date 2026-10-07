/// <reference types="cypress" />

/**
 * TC-M09-G01-v2.0
 * RF-15 v1.1 | CU-01 Gestionar Catálogo de Especies Productivas
 * Sub-caso único: G01-v2.0-1 "Registrar una especie con nombre, descripción y grupo_manejo válidos"
 */

interface Checkpoint {
  paso: string;
  esperado: string;
  obtenido: string;
  estado: 'OK' | 'FALLA';
}

const DATO_NOMBRE = 'Gallina QA';
const DATO_DESCRIPCION = 'Especie avícola de postura (QA v2.0)';
const DATO_GRUPO_MANEJO = 'AVES';
const GRUPOS_ADMISIBLES = ['AVES', 'PORCINOS', 'ACUICULTURA', 'ESPECIES_MEDIANAS', 'ESPECIES_GRANDES'];

// Acumulador persistente de checkpoints: no se reinicia
const checks: Checkpoint[] = [];
let capturedToken = '';
let createdEspecieId: number | null = null;
let preflightAborted = false;
let testStarted = false;

function addCheck(paso: string, esperado: string, obtenido: string, estado: 'OK' | 'FALLA') {
  checks.push({ paso, esperado, obtenido, estado });
}

describe('TC-M09-G01-v2.0 · CU-01 Registrar especie con grupo_manejo obligatorio (RF-15 v1.1)', () => {
  before(() => {
    const adminEmail = Cypress.env('ADMIN_EMAIL');
    const adminPassword = Cypress.env('TEST_ADMIN_PASSWORD');
    if (!adminEmail || !adminPassword) {
      preflightAborted = true;
      throw new Error('Faltan ADMIN_EMAIL o TEST_ADMIN_PASSWORD en el entorno.');
    }

    // Interceptor para capturar el token exclusivamente del body de @postLogin
    cy.intercept('POST', '**/sesiones/**').as('postLogin');

    // 1. Login vía UI
    cy.loginUI();

    // Capturar token del body de la respuesta
    cy.wait('@postLogin', { timeout: 30000 }).then((interception) => {
      const statusLogin = interception.response?.statusCode || 0;
      const resBody = interception.response?.body || {};
      const tokenFromBody =
        resBody.token ||
        resBody.access_token ||
        (resBody.data && (resBody.data.token || resBody.data.access_token));

      if (tokenFromBody && typeof tokenFromBody === 'string') {
        capturedToken = tokenFromBody;
      }

      if (!capturedToken) {
        preflightAborted = true;
        throw new Error('[LOGIN ERROR] No se encontro access token en la respuesta de @postLogin.');
      }

      // Reintento con should hasta 15s para asegurar que capturedToken exista antes de evaluar CP-01
      cy.wrap(null, { timeout: 15000 }).should(() => {
        expect(capturedToken, 'access token capturado').to.be.a('string').and.not.be.empty;
      });

      cy.location('pathname', { timeout: 30000 }).then((pathname) => {
        const noEsLogin = pathname !== '/login';
        const tieneToken = Boolean(capturedToken);
        const loginOk = noEsLogin && tieneToken && (statusLogin === 200 || statusLogin === 201);

        // CP-01
        addCheck(
          'CP-01',
          'La ruta final no es /login, HTTP 200 y se capturó access token en memoria',
          loginOk
            ? `Login HTTP ${statusLogin}, ruta destino: ${pathname}, token Bearer capturado`
            : `Fallo en login: HTTP ${statusLogin}, ruta: ${pathname}, token: ${tieneToken ? 'presente' : 'ausente'}`,
          loginOk ? 'OK' : 'FALLA',
        );
      });
    });

    // 2. Navegación SPA a Configuración por menú lateral esperando a que carguen los permisos (sin locked)
    cy.get('a[href="/configuracion"]:not(.ds-sidebar__item--locked)', { timeout: 30000 })
      .should('be.visible')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('eq', '/configuracion');

    // Preflight por API envuelto en cy.then(): GET /configuracion/especies?solo_activas=false
    const apiUrl = Cypress.env('API_BASE_URL') || 'https://api.inmero.co/back-sigab-test';
    cy.then(() => {
      return cy.request({
        method: 'GET',
        url: `${apiUrl}/configuracion/especies?solo_activas=false`,
        headers: {
          Authorization: `Bearer ${capturedToken}`,
        },
        failOnStatusCode: false,
      });
    }).then((resp) => {
      if (resp.status !== 200) {
        preflightAborted = true;
        throw new Error(`[PREFLIGHT ABORT] Error al consultar especies via API: HTTP ${resp.status}`);
      }

      const bodyResp = resp.body || {};
      let listaEspecies: any[] = [];
      if (Array.isArray(bodyResp)) {
        listaEspecies = bodyResp;
      } else if (Array.isArray(bodyResp.items)) {
        listaEspecies = bodyResp.items;
      } else if (Array.isArray(bodyResp.data)) {
        listaEspecies = bodyResp.data;
      } else if (Array.isArray(bodyResp.especies)) {
        listaEspecies = bodyResp.especies;
      }

      // Si la respuesta trae un total mayor que los items recibidos, registrar limitación
      const totalEsperado = bodyResp.total || bodyResp.count;
      if (typeof totalEsperado === 'number' && totalEsperado > listaEspecies.length) {
        cy.task('writeResult', {
          file: 'evidencias/preflight.txt',
          content: `Limitacion detectada: total=${totalEsperado} especies pero la API devolvio ${listaEspecies.length} en la primera pagina.\n`,
        });
      }

      // Comprobar existencia exacta case-insensitive de "Gallina QA" o "Gallina QA API"
      const existeGallinaQA = listaEspecies.some((esp: any) => {
        const nom = (esp.nombre || '').trim();
        return nom.toLowerCase() === DATO_NOMBRE.toLowerCase();
      });

      const existeGallinaQAAPI = listaEspecies.some((esp: any) => {
        const nom = (esp.nombre || '').trim();
        return nom.toLowerCase() === 'gallina qa api';
      });

      if (existeGallinaQA) {
        preflightAborted = true;
        throw new Error(`[PREFLIGHT ABORT] La especie "${DATO_NOMBRE}" ya existe en el catalogo TEST (activa o inactiva). Abortando sin generar reportes para evitar colision 409.`);
      }

      if (existeGallinaQAAPI) {
        preflightAborted = true;
        throw new Error(`[PREFLIGHT ABORT] La especie "Gallina QA API" ya existe en el catalogo TEST (activa o inactiva). Abortando sin generar reportes para evitar colision 409.`);
      }
    });
  });

  after(() => {
    // Solo escribir cypress_checkpoints.json si el it() llegó a iniciar y el preflight no abortó
    if (!testStarted || preflightAborted) {
      return;
    }

    // Teardown: Desactivación lógica de la especie si fue creada (sin escribir tokens en archivos)
    cy.then(() => {
      if (createdEspecieId && capturedToken) {
        const apiUrl = Cypress.env('API_BASE_URL') || 'https://api.inmero.co/back-sigab-test';
        return cy.request({
          method: 'PATCH',
          url: `${apiUrl}/configuracion/especies/${createdEspecieId}/desactivar`,
          headers: {
            Authorization: `Bearer ${capturedToken}`,
          },
          failOnStatusCode: false,
        }).then((resp) => {
          const teardownData = {
            id_residual: createdEspecieId,
            status: resp.status,
            fecha: new Date().toISOString(),
            mensaje: resp.status === 200 ? 'Especie desactivada logicamente' : 'Fallo en desactivacion',
          };
          // Solo IDs y estados; nunca tokens ni contraseñas
          cy.task('writeResult', {
            file: 'evidencias/teardown_cypress.json',
            content: JSON.stringify(teardownData, null, 2),
          });
        });
      }
    });

    // Guardar los checkpoints acumulados exclusivamente en evidencias/cypress_checkpoints.json
    cy.task('writeResult', {
      file: 'evidencias/cypress_checkpoints.json',
      content: JSON.stringify(checks, null, 2),
    });
  });

  it('G01-v2.0-1: Registrar una especie con nombre, descripción y grupo_manejo válidos', () => {
    testStarted = true;

    // Interceptar POST de creación con contador para proteger CP-04 si el formulario no envía la petición
    let postIntercepted: any = null;
    cy.intercept('POST', '**/configuracion/especies**', (req) => {
      req.continue((res) => {
        postIntercepted = res;
      });
    }).as('postEspecie');

    // Apertura del modal de nueva especie
    cy.contains('button', /nueva especie|new species|crear especie|add species/i, { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.get('[role="dialog"]', { timeout: 15000 }).should('be.visible');
    addCheck('CP-02', 'Navegación a Configuración > Especies y apertura del formulario de nueva especie', 'Acceso a /configuracion y modal de nueva especie visible', 'OK');

    // CP-03: Evaluar si el formulario expone el control grupo_manejo con los 5 valores admisibles
    cy.get('[role="dialog"]').then(($dialog) => {
      const $select = $dialog.find('select[name="grupo_manejo"], select#especie-grupo-manejo, [name="grupo_manejo"]');
      let tieneControl = false;
      let valoresEncontrados: string[] = [];

      if ($select.length > 0) {
        const options = $select.find('option').toArray().map((o) => (o as HTMLOptionElement).value || o.textContent?.trim() || '');
        valoresEncontrados = options.filter(Boolean);
        tieneControl = GRUPOS_ADMISIBLES.every((g) => valoresEncontrados.includes(g));
      }

      if (tieneControl) {
        addCheck(
          'CP-03',
          'El formulario expone un control grupo_manejo con los 5 valores admisibles (AVES, PORCINOS, ACUICULTURA, ESPECIES_MEDIANAS, ESPECIES_GRANDES)',
          `Control grupo_manejo presente con valores: ${valoresEncontrados.join(', ')}`,
          'OK',
        );
        cy.get('select[name="grupo_manejo"], select#especie-grupo-manejo, [name="grupo_manejo"]').select(DATO_GRUPO_MANEJO);
      } else {
        // Regla estricta: FALLA con el texto normativo exacto
        addCheck(
          'CP-03',
          'El formulario expone un control grupo_manejo con los 5 valores admisibles (AVES, PORCINOS, ACUICULTURA, ESPECIES_MEDIANAS, ESPECIES_GRANDES)',
          'control grupo_manejo ausente en el formulario',
          'FALLA',
        );
      }
    });

    // Diligenciar nombre y descripción disponibles
    cy.get('input[name="nombre"]').clear().type(DATO_NOMBRE);
    cy.get('textarea#especie-desc, textarea[name="descripcion"]').clear().type(DATO_DESCRIPCION);

    // Enviar el formulario sin alterar el request
    cy.contains('button[type="submit"], button', /registrar especie|register species|guardar|save/i)
      .should('be.visible')
      .click();

    // Espera controlada con cy.wait y fallback si la validación del formulario bloqueó la llamada
    cy.wait(1000);
    cy.then(() => {
      if (!postIntercepted) {
        // El formulario no disparó el POST (rechazo o bloqueo en cliente)
        const motivoCascada = 'El formulario no envió la petición POST (bloqueo o validación en cliente)';
        addCheck('CP-04', 'Envío con los datos del caso: respuesta exitosa (registrar el código real)', motivoCascada, 'FALLA');
        addCheck('CP-05', 'Id generado (entero > 0)', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        addCheck('CP-06', 'activo = true', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        addCheck('CP-07', 'grupo_manejo = "AVES" en la respuesta', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        addCheck('CP-08', 'nombre (sin distinguir mayúsculas) y descripcion coinciden con lo enviado', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        addCheck('CP-09', 'Fechas de creación y actualización presentes y en formato ISO válido', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        addCheck('CP-10', 'La especie aparece en el catálogo de la UI (búsqueda por nombre) como activa', `dependiente de CP-04: ${motivoCascada}`, 'FALLA');
        return;
      }

      const status = postIntercepted.statusCode || 0;
      const rawBody = postIntercepted.body || {};
      const esExitoso = status === 201 || status === 200;

      // CP-04
      addCheck(
        'CP-04',
        'Envío con los datos del caso: respuesta exitosa (registrar el código real)',
        `HTTP ${status} devuelto por el backend`,
        esExitoso ? 'OK' : 'FALLA',
      );

      if (!esExitoso) {
        const errorMsg = rawBody?.message || rawBody?.error || JSON.stringify(rawBody);
        const motivoCascada = `dependiente de CP-04: HTTP ${status} - ${errorMsg}`;

        // Cascada estricta a fallas dependientes
        addCheck('CP-05', 'Id generado (entero > 0)', motivoCascada, 'FALLA');
        addCheck('CP-06', 'activo = true', motivoCascada, 'FALLA');
        addCheck('CP-07', 'grupo_manejo = "AVES" en la respuesta', motivoCascada, 'FALLA');
        addCheck('CP-08', 'nombre (sin distinguir mayúsculas) y descripcion coinciden con lo enviado', motivoCascada, 'FALLA');
        addCheck('CP-09', 'Fechas de creación y actualización presentes y en formato ISO válido', motivoCascada, 'FALLA');
        addCheck('CP-10', 'La especie aparece en el catálogo de la UI (búsqueda por nombre) como activa', motivoCascada, 'FALLA');
        return;
      }

      // Desenvolvimiento dinámico del objeto devuelto (directo vs wrapped en data/item/especie)
      let body = rawBody;
      let formaEnvoltura = 'directo';
      if (rawBody.data && typeof rawBody.data === 'object' && !Array.isArray(rawBody.data)) {
        body = rawBody.data;
        formaEnvoltura = 'envuelto en data';
      } else if (rawBody.item && typeof rawBody.item === 'object') {
        body = rawBody.item;
        formaEnvoltura = 'envuelto en item';
      } else if (rawBody.especie && typeof rawBody.especie === 'object') {
        body = rawBody.especie;
        formaEnvoltura = 'envuelto en especie';
      }

      // CP-05: ID generado y detección de envoltura
      const idVal = body.id_especie ?? body.id;
      const idCampo = body.id_especie !== undefined ? 'id_especie' : (body.id !== undefined ? 'id' : 'no_detectado');
      if (typeof idVal === 'number' && idVal > 0) {
        createdEspecieId = idVal;
        addCheck('CP-05', 'Id generado (entero > 0)', `${idCampo}: ${idVal} (${formaEnvoltura})`, 'OK');
      } else {
        addCheck('CP-05', 'Id generado (entero > 0)', `ID inválido: ${JSON.stringify(idVal)} (${formaEnvoltura})`, 'FALLA');
      }

      // CP-06: activo = true
      const activoVal = body.activo ?? body.es_activo;
      const activoCampo = body.activo !== undefined ? 'activo' : (body.es_activo !== undefined ? 'es_activo' : 'no_detectado');
      if (activoVal === true) {
        addCheck('CP-06', 'activo = true', `${activoCampo}: true`, 'OK');
      } else {
        addCheck('CP-06', 'activo = true', `${activoCampo}: ${activoVal}`, 'FALLA');
      }

      // CP-07: grupo_manejo = "AVES"
      const grupoVal = body.grupo_manejo;
      if (grupoVal === DATO_GRUPO_MANEJO) {
        addCheck('CP-07', 'grupo_manejo = "AVES" en la respuesta', `grupo_manejo: "${grupoVal}"`, 'OK');
      } else {
        addCheck('CP-07', 'grupo_manejo = "AVES" en la respuesta', `grupo_manejo obtenido: "${grupoVal ?? 'null/undefined'}"`, 'FALLA');
      }

      // CP-08: Nombre (case-insensitive) y Descripción
      const nombreVal = body.nombre || '';
      const descVal = body.descripcion || '';
      const matchNombre = typeof nombreVal === 'string' && nombreVal.toLowerCase() === DATO_NOMBRE.toLowerCase();
      const matchDesc = descVal === DATO_DESCRIPCION;
      if (matchNombre && matchDesc) {
        addCheck('CP-08', 'nombre (sin distinguir mayúsculas) y descripcion coinciden con lo enviado', `nombre literal: "${nombreVal}", descripcion: "${descVal}"`, 'OK');
      } else {
        addCheck('CP-08', 'nombre (sin distinguir mayúsculas) y descripcion coinciden con lo enviado', `Discrepancia: nombre="${nombreVal}", descripcion="${descVal}"`, 'FALLA');
      }

      // CP-09: AMBAS fechas presentes y formato ISO 8601 estricto (Date.parse + regex)
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:?\d{2}|Z)?$/;
      const fCreacion = body.fecha_creacion_especie ?? body.fecha_creacion;
      const fActualizacion = body.fecha_actualizacion_especie ?? body.fecha_actualizacion;

      const fCreacionOk = typeof fCreacion === 'string' && isoRegex.test(fCreacion) && !isNaN(Date.parse(fCreacion));
      const fActualizacionOk = typeof fActualizacion === 'string' && isoRegex.test(fActualizacion) && !isNaN(Date.parse(fActualizacion));

      if (fCreacionOk && fActualizacionOk) {
        addCheck(
          'CP-09',
          'Fechas de creación y actualización presentes y en formato ISO válido',
          `creacion: "${fCreacion}", actualizacion: "${fActualizacion}"`,
          'OK',
        );
      } else {
        const faltantes = [];
        if (!fCreacionOk) faltantes.push(`creación inválida o ausente ("${fCreacion}")`);
        if (!fActualizacionOk) faltantes.push(`actualización inválida o ausente ("${fActualizacion}")`);
        addCheck(
          'CP-09',
          'Fechas de creación y actualización presentes y en formato ISO válido',
          `Faltan fechas válidas: ${faltantes.join('; ')}`,
          'FALLA',
        );
      }

      // CP-10: Coincidencia exacta con /^\s*gallina qa\s*$/i (no coincide con Gallina QA API)
      // Buscador si la tabla no muestra la fila de inmediato
      Cypress.once('fail', (err) => {
        addCheck(
          'CP-10',
          'La especie aparece en el catálogo de la UI (búsqueda por nombre) como activa',
          `fila no encontrada: ${err.message}`,
          'FALLA',
        );
        return false;
      });

      // Si existe un input de búsqueda de especies en la vista, escribir el nombre
      cy.get('body').then(($b) => {
        const $searchInput = $b.find('input[placeholder*="Buscar"], input[type="search"], input[aria-label*="Buscar"]');
        if ($searchInput.length > 0) {
          cy.wrap($searchInput.first()).clear().type(`${DATO_NOMBRE}{enter}`);
        }
      });

      cy.contains('tbody td', /^\s*gallina qa\s*$/i, { timeout: 15000 })
        .closest('tr')
        .then(($tr) => {
          const textoFila = $tr.text().replace(/\s+/g, ' ').trim();
          cy.wrap($tr)
            .invoke('text')
            .then((txt) => {
              // Validar activo estricto con frontera de palabra \b (NO coincide con inactivo)
              const estaActivo = /\b(activo|active)\b/i.test(txt) && !/\b(inactivo|inactive)\b/i.test(txt);
              addCheck(
                'CP-10',
                'La especie aparece en el catálogo de la UI (búsqueda por nombre) como activa',
                estaActivo
                  ? `Fila exacta encontrada: "${textoFila}"`
                  : `Fila encontrada pero sin estado Activo: "${textoFila}"`,
                estaActivo ? 'OK' : 'FALLA',
              );
            });
        });
    });
  });
});
