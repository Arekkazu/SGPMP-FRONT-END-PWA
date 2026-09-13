/// <reference types="cypress" />

// TC-M09-G110 v2.0 - Retest de TC-M09-210 (creacion exitosa de una plantilla,
// camino feliz). La ejecucion original encontro un defecto que bloqueaba la
// creacion desde la interfaz para cualquier especie: capturarConfiguracionEspecie()
// (especiesConfigApi.ts) llama .map() directamente sobre el resultado de
// ciclosApi/patologiasApi/metricasApi/umbralesApi.listar(), pero esos 4 endpoints
// (GET /configuracion/ciclos|patologias|metricas|umbrales) responden {total, items},
// no un arreglo -- a diferencia de especiesApi/plantillasApi, que si desenvuelven
// ese formato. Revision de codigo en este retest confirma que especiesConfigApi.ts
// y PlantillaModal.tsx siguen sin cambios: los 4 metodos listar() no aplican el
// mismo patron defensivo que ya usa useEspecies.ts (`Array.isArray(raw) ? raw :
// raw?.items ?? []`). Este script verifica en vivo si el defecto sigue presente.
//
// La unica asercion que importa expresa el comportamiento REQUERIDO por la ficha:
// al elegir una especie activa, el formulario debe mostrar sus parametros
// configurables. Si el defecto persiste, esa asercion falla (rojo) y lo documenta;
// si fue corregido, el flujo continua hasta confirmar la creacion completa (verde).

const DIR = 'RESULTADOS/TC-M09-G110-v2.0';

const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

const NOMBRE_BASE = 'Config Bovino G110 v2';
const NOMBRE_PLANTILLA = `${NOMBRE_BASE} ${Date.now()}`;

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G110 v2.0 - Retest: creacion exitosa de una plantilla (camino feliz) (RF-31 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-31 |
| Agrupa | TC-M09-210 |
| Tipo / Equipo | Retest funcional (UI) - Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecucion | ${r.fecha} |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Evidencias visuales

- [01_formulario_completo.png](screenshots/01_formulario_completo.png): formulario con nombre y especie activa seleccionados (si la lectura de configuracion tuvo exito).
- [02_error_configuracion.png](screenshots/02_error_configuracion.png): mensaje de error mostrado si la lectura de configuracion fallo (defecto persistente).
- [03_plantilla_creada_en_listado.png](screenshots/03_plantilla_creada_en_listado.png): la plantilla recien creada visible en el listado (solo si el flujo se completo).
`;
}

describe('TC-M09-G110 v2.0 - Retest: creacion exitosa de una plantilla con nombre, especie activa y snapshot JSON valido (RF-31)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (fallo la preparacion)'
      : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('API_BASE_URL'),
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      checkpoints: checks,
      veredicto,
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G110-v2.0_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G110-v2.0_resultado.md`, content: renderMd(r) });
  });

  function clickConfiguracionConReintento(intentosRestantes = 4) {
    cy.contains('.ds-sidebar__item', 'Configuración', { timeout: 15000 })
      .click({ force: true });

    cy.location('pathname', { timeout: 8000 }).then(($path) => {
      if ($path !== '/configuracion' && intentosRestantes > 0) {
        cy.wait(1000);
        clickConfiguracionConReintento(intentosRestantes - 1);
      }
    });
  }

  function irAPlantillas() {
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);
    cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');
    clickConfiguracionConReintento();
    cy.location('pathname', { timeout: 30000 }).should('eq', '/configuracion');
    cy.contains('button', 'Plantillas', { timeout: 15000 }).click({ force: true });
  }

  it('TC-M09-210 v2.0 - crea una plantilla con nombre, especie activa y snapshot JSON valido', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G110 v2.0.');
    }

    cy.intercept('GET', /\/configuracion\/especies(\?[^/]*)?$/).as('listarEspecies');
    cy.intercept('POST', /\/configuracion\/plantillas(\?[^/]*)?$/).as('crearPlantilla');

    irAPlantillas();

    cy.contains('button', 'Nueva plantilla', { timeout: 15000 }).click({ force: true });

    cy.get('[role="dialog"]', { timeout: 15000 })
      .should('exist')
      .and('have.attr', 'aria-modal', 'true');

    cy.wait('@listarEspecies', { timeout: 15000 });

    cy.get('#tpl-nombre').clear().type(NOMBRE_PLANTILLA);

    // Se elige la primera especie activa del catalogo. La ejecucion original ya
    // probo con 2 especies distintas y demostro que el problema es sistemico
    // (afecta a cualquier especie, no a datos faltantes de una en particular),
    // asi que este retest no necesita repetir esa exploracion: basta una.
    cy.get('#tpl-especie option').then(($opts) => {
      const opciones = [...$opts]
        .filter((o) => (o as HTMLOptionElement).value !== '')
        .map((o) => ({ valor: (o as HTMLOptionElement).value, nombre: (o.textContent || '').trim() }));
      expect(opciones.length, 'debe haber al menos una especie activa en el selector').to.be.greaterThan(0);

      const especie = opciones[0];
      cy.get('#tpl-especie').select(especie.valor, { force: true });

      // Espera a que la lectura de configuracion termine, en cualquiera de sus
      // dos desenlaces posibles (4 tarjetas de categoria, o alerta de error).
      cy.get('body', { timeout: 20000 }).should(($body) => {
        const listo = $body.find('[role="checkbox"]').length === 4;
        const conError = $body.find('p[role="alert"]').toArray()
          .some((p) => /no se pudo leer la configuraci/i.test(p.textContent || ''));
        expect(listo || conError, 'la lectura de la configuracion de la especie debe terminar en exito o en un mensaje de error').to.be.true;
      });

      cy.get('body').then(($body) => {
        const configOk = $body.find('[role="checkbox"]').length === 4;
        const alertaError = $body.find('p[role="alert"]').toArray()
          .find((p) => /no se pudo leer la configuraci/i.test(p.textContent || ''));
        const mensajeError = alertaError ? (alertaError.textContent || '').trim() : '';

        if (!configOk) {
          cy.screenshot('02_error_configuracion', { overwrite: true });
        }

        // ── Asercion clave del retest: expresa el comportamiento REQUERIDO ──
        // por la ficha (TC-M09-210). Si el defecto de especiesConfigApi.ts
        // sigue sin corregirse, esta linea falla (rojo) y documenta el error
        // real recibido. Si fue corregido, pasa (verde) y el test continua.
        add(
          'TC-M09-210 v2.0: leer la configuracion real de la especie para construir el snapshot de la plantilla',
          `Al elegir la especie activa "${especie.nombre}", el formulario debe mostrar sus parametros configurables (ciclos, patologias, metricas, umbrales)`,
          configOk
            ? `Se cargaron correctamente los parametros de la especie "${especie.nombre}"`
            : `Seguimos recibiendo el mismo error: "${mensajeError}". El boton "Crear plantilla" permanece deshabilitado. Revision de codigo confirma que especiesConfigApi.ts (ciclosApi/patologiasApi/metricasApi/umbralesApi.listar) sigue sin desenvolver la respuesta {total, items} de esos 4 endpoints antes de que capturarConfiguracionEspecie() les aplique .map() -- el mismo defecto reportado originalmente, sin cambios.`,
          configOk ? 'OK' : 'FALLA',
        );
        expect(configOk, 'la configuracion de la especie debe leerse correctamente para poder crear la plantilla').to.be.true;

        cy.screenshot('01_formulario_completo', { overwrite: true });

        cy.contains('button', 'Crear plantilla', { timeout: 10000 })
          .should('not.be.disabled')
          .click({ force: true });

        cy.wait('@crearPlantilla', { timeout: 15000 }).then((interception) => {
          const status = interception.response?.statusCode || 0;
          const body = interception.response?.body || {};

          add(
            'TC-M09-210 v2.0: registrar la plantilla (nombre + especie activa + snapshot valido)',
            `La API debe responder 200 o 201 al registrar la plantilla "${NOMBRE_PLANTILLA}" con la especie "${especie.nombre}"`,
            `HTTP ${status}, cuerpo: ${JSON.stringify(body).slice(0, 300)}`,
            (status === 200 || status === 201) ? 'OK' : 'FALLA',
          );
          expect([200, 201], 'POST /configuracion/plantillas responde 200 o 201').to.include(status);

          add(
            'TC-M09-210 v2.0: la plantilla creada queda en version=1',
            'La plantilla recien registrada debe iniciar en version=1',
            `version=${body.version}`,
            body.version === 1 ? 'OK' : 'FALLA',
          );
          expect(body.version, 'la plantilla nueva inicia en version 1').to.eq(1);

          cy.get('[role="dialog"]').should('not.exist').then(() => {
            add(
              'TC-M09-210 v2.0: el formulario se cierra tras un registro exitoso',
              'El dialogo de creacion debe cerrarse automaticamente al completar el registro',
              'El dialogo ya no esta presente en la pantalla',
            );
          });

          cy.contains('div[style*="border-radius: var(--r-xl)"]', NOMBRE_PLANTILLA, { timeout: 15000 })
            .should('exist')
            .within(() => {
              cy.contains(NOMBRE_PLANTILLA);
              cy.contains('v1');
            })
            .then(() => {
              cy.screenshot('03_plantilla_creada_en_listado', { overwrite: true });
              add(
                'TC-M09-210 v2.0: la plantilla queda disponible en el listado',
                `La tarjeta de "${NOMBRE_PLANTILLA}" debe aparecer en el listado de plantillas, mostrando la version v1`,
                'La tarjeta aparece en el listado mostrando el nombre y la version v1',
              );
            });
        });
      });
    });
  });
});

// Convierte este archivo en un modulo aislado (en vez de un script global):
// sin esto, TypeScript trata los identificadores de nivel superior (DIR,
// NOMBRE_BASE, Estado, Check, renderMd, etc.) como globales, y como el spec
// original (tc-m09-g110-crear-plantilla-camino-feliz.cy.ts) declara los
// mismos nombres en la misma carpeta, el editor marca "no se puede volver a
// declarar" en ambos archivos. No afecta la ejecucion con `cypress run`
// (cada spec se compila por separado), pero si molesta al editor.
export {};