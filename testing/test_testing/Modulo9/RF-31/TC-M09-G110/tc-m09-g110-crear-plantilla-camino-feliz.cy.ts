/// <reference types="cypress" />

const DIR = 'RESULTADOS/TC-M09-G110';

const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

// Base del nombre de prueba tomado de la ficha ("Config Bovino"). Se le agrega
// un sufijo unico porque el entorno de TEST es compartido y persistente (las
// plantillas no se borran) y el backend rechaza con 409 un nombre repetido
// (ver plantillasApi.ts), por lo que reejecutar esta prueba con el mismo
// nombre literal fallaria a partir de la segunda corrida.
const NOMBRE_BASE = 'Config Bovino';
const NOMBRE_PLANTILLA = `${NOMBRE_BASE} ${Date.now()}`;

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G110 - Creacion exitosa de una plantilla (camino feliz) (RF-31 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-31 |
| Agrupa | TC-M09-210 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
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

- [01_formulario_completo.png](screenshots/01_formulario_completo.png): formulario de creacion con nombre y especie activa seleccionados, antes de enviar.
- [02_plantilla_creada_en_listado.png](screenshots/02_plantilla_creada_en_listado.png): la plantilla recien creada visible en el listado.
`;
}

describe('TC-M09-G110 - Creacion exitosa de una plantilla con nombre, especie activa y snapshot JSON valido (RF-31)', () => {
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

    cy.task('writeResult', { file: `${DIR}/TC-M09-G110_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G110_resultado.md`, content: renderMd(r) });
  });

  // El clic en el sidebar a veces ocurre mientras el dashboard todavia esta
  // terminando de montar, y no llega a navegar. Se reintenta unas cuantas
  // veces en vez de depender de que el timing salga bien a la primera.
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

    // Navegar mediante SPA (Sidebar) para preservar el token JWT en memoria.
    // No se usa .should('be.visible') antes del click: esta app (Ionic/PWA) usa
    // contenedores con position:fixed que hacen que Cypress considere el
    // elemento "no visible" aunque si se vea en pantalla. click({force:true})
    // evita depender de ese chequeo.
    clickConfiguracionConReintento();
    cy.location('pathname', { timeout: 30000 }).should('eq', '/configuracion');
    cy.contains('button', 'Plantillas', { timeout: 15000 }).click({ force: true });
  }

  // Selecciona una especie candidata y espera a que la lectura de su
  // configuracion real termine, en cualquiera de sus dos desenlaces posibles:
  //   - EXITO: se pintan las 4 tarjetas de categoria (role="checkbox").
  //   - ERROR: aparece la alerta "No se pudo leer la configuración de la
  //     especie..." (configErr en PlantillaModal.tsx).
  // No se espera solo la desaparicion de "Leyendo la configuración..." como
  // unica senal: justo despues de seleccionar la especie hay una ventana muy
  // corta en la que ese texto todavia no se ha renderizado, y comprobar
  // "not.exist" en ese instante puede dar un falso positivo.
  function leerConfiguracionDeEspecie(
    valor: string,
    callback: (resultado: { ok: boolean; mensajeError: string }) => void,
  ) {
    cy.get('#tpl-especie').select(valor, { force: true });
    cy.get('body', { timeout: 20000 }).should(($body) => {
      const listo = $body.find('[role="checkbox"]').length === 4;
      const conError = $body.find('p[role="alert"]').toArray()
        .some((p) => /no se pudo leer la configuraci/i.test(p.textContent || ''));
      expect(listo || conError, 'la lectura de la configuracion de la especie debe terminar en exito o en un mensaje de error').to.be.true;
    });
    cy.get('body').then(($body) => {
      const ok = $body.find('[role="checkbox"]').length === 4;
      const alertaError = $body.find('p[role="alert"]').toArray()
        .find((p) => /no se pudo leer la configuraci/i.test(p.textContent || ''));
      callback({ ok, mensajeError: alertaError ? (alertaError.textContent || '').trim() : '' });
    });
  }

  it('TC-M09-210 - crea una plantilla con nombre, especie activa y snapshot JSON valido', () => {
    if (!CUENTA_EJECUCION_EMAIL || !CUENTA_EJECUCION_PASSWORD) {
      throw new Error('Faltan CYPRESS_ADMIN_EMAIL o CYPRESS_ADMIN_PASSWORD para ejecutar TC-M09-G110.');
    }

    cy.intercept('GET', /\/configuracion\/especies(\?[^/]*)?$/).as('listarEspecies');
    cy.intercept('POST', /\/configuracion\/plantillas(\?[^/]*)?$/).as('crearPlantilla');

    irAPlantillas();

    cy.contains('button', 'Nueva plantilla', { timeout: 15000 }).click({ force: true });

    cy.get('[role="dialog"]', { timeout: 15000 })
      .should('exist')
      .and('have.attr', 'aria-modal', 'true')
      .within(() => {
        cy.get('#plantilla-modal-title').contains('Nueva Plantilla de Configuración');
      })
      .then(() => {
        add(
          'TC-M09-210: abrir el formulario de creacion de plantilla',
          'Debe abrirse el dialogo de creacion (PlantillaModal)',
          'Se abrio el dialogo de creacion de plantilla',
        );
      });

    cy.wait('@listarEspecies', { timeout: 15000 });

    // Se escribe el nombre de la plantilla (dato de la ficha: "Config Bovino",
    // con sufijo unico para poder reejecutar esta prueba en el entorno
    // compartido de TEST sin chocar con el nombre de una corrida anterior).
    cy.get('#tpl-nombre').clear().type(NOMBRE_PLANTILLA);

    // Especies candidatas: se prueba primero una llamada "Bovino" si existe
    // en el catalogo de este entorno (dato literal de la ficha); si no existe
    // (el catalogo de TEST es de especies acuicolas y afines: camaron,
    // tilapia, trucha, cachama, etc.), se prueban otras especies activas del
    // catalogo. Se intenta con hasta 2 especies distintas: si la primera
    // muestra el error de lectura de configuracion, se prueba una segunda
    // para distinguir un problema puntual de esa especie de un problema
    // sistemico que afecte a cualquier especie que se elija.
    cy.get('#tpl-especie option').then(($opts) => {
      const opciones = [...$opts]
        .filter((o) => (o as HTMLOptionElement).value !== '')
        .map((o) => ({ valor: (o as HTMLOptionElement).value, nombre: (o.textContent || '').trim() }));
      expect(opciones.length, 'debe haber al menos una especie activa en el selector').to.be.greaterThan(0);

      const bovino = opciones.find((o) => /bovino/i.test(o.nombre));
      const candidatas = (bovino ? [bovino, ...opciones.filter((o) => o !== bovino)] : opciones).slice(0, 2);

      const continuarConCreacion = (nombreEspecieElegida: string) => {
        cy.screenshot('01_formulario_completo', { overwrite: true });

        cy.contains('button', 'Crear plantilla', { timeout: 10000 })
          .should('not.be.disabled')
          .click({ force: true });

        cy.wait('@crearPlantilla', { timeout: 15000 }).then((interception) => {
          const status = interception.response?.statusCode || 0;
          const body = interception.response?.body || {};

          add(
            'TC-M09-210: registrar la plantilla (nombre + especie activa + snapshot valido)',
            `La API debe responder 200 o 201 al registrar la plantilla "${NOMBRE_PLANTILLA}" con la especie "${nombreEspecieElegida}"`,
            `HTTP ${status}, cuerpo: ${JSON.stringify(body).slice(0, 300)}`,
            (status === 200 || status === 201) ? 'OK' : 'FALLA',
          );
          expect([200, 201], 'POST /configuracion/plantillas responde 200 o 201').to.include(status);

          add(
            'TC-M09-210: la plantilla creada queda en version=1',
            'La plantilla recien registrada debe iniciar en version=1',
            `version=${body.version}`,
            body.version === 1 ? 'OK' : 'FALLA',
          );
          expect(body.version, 'la plantilla nueva inicia en version 1').to.eq(1);

          cy.get('[role="dialog"]').should('not.exist').then(() => {
            add(
              'TC-M09-210: el formulario se cierra tras un registro exitoso',
              'El dialogo de creacion debe cerrarse automaticamente al completar el registro',
              'El dialogo ya no esta presente en la pantalla',
            );
          });

          // La plantilla debe quedar disponible en el listado (nota de la ficha).
          cy.contains('div[style*="border-radius: var(--r-xl)"]', NOMBRE_PLANTILLA, { timeout: 15000 })
            .should('exist')
            .within(() => {
              cy.contains(NOMBRE_PLANTILLA);
              cy.contains('v1');
            })
            .then(() => {
              cy.screenshot('02_plantilla_creada_en_listado', { overwrite: true });
              add(
                'TC-M09-210: la plantilla queda disponible en el listado',
                `La tarjeta de "${NOMBRE_PLANTILLA}" debe aparecer en el listado de plantillas, mostrando la version v1`,
                'La tarjeta aparece en el listado mostrando el nombre y la version v1',
              );
            });
        });
      };

      const probarCandidata = (idx: number, erroresPrevios: string[]) => {
        if (idx >= candidatas.length) {
          // Se probaron todas las especies candidatas y en ninguna cargo la
          // configuracion: es un problema sistemico del formulario de
          // creacion, no de una especie particular sin datos.
          add(
            'TC-M09-210: leer la configuracion real de la especie para construir el snapshot de la plantilla',
            'Al elegir cualquier especie activa, el formulario debe mostrar sus parametros configurables (ciclos, patologias, metricas, umbrales) para poder crear la plantilla',
            `Con ${candidatas.length} especie(s) distinta(s) probada(s) (${candidatas.map((c) => c.nombre).join(', ')}), en todas aparecio el mismo error: "${erroresPrevios[erroresPrevios.length - 1]}". El boton "Crear plantilla" queda deshabilitado de forma permanente. Revisando el codigo fuente: capturarConfiguracionEspecie() (especiesConfigApi.ts) llama .map() directamente sobre el resultado de ciclosApi/patologiasApi/metricasApi/umbralesApi.listar(), pero esos 4 endpoints (GET /configuracion/ciclos|patologias|metricas|umbrales) responden {total, items}, no un arreglo -- a diferencia de otros puntos de la app (especiesApi, plantillasApi) que si desenvuelven ese formato antes de usarlo. Eso hace que la lectura falle siempre, para cualquier especie, bloqueando por completo la creacion de plantillas desde la UI.`,
            'FALLA',
          );
          return;
        }
        const candidata = candidatas[idx];
        leerConfiguracionDeEspecie(candidata.valor, ({ ok, mensajeError }) => {
          if (ok) {
            add(
              'TC-M09-210: leer la configuracion real de la especie para construir el snapshot de la plantilla',
              'Al elegir una especie activa, el formulario debe mostrar sus parametros configurables',
              `Se cargaron correctamente los parametros de la especie "${candidata.nombre}"`
                + (erroresPrevios.length > 0 ? ` (la especie "${candidatas[idx - 1]?.nombre}" probada antes si habia fallado con: "${erroresPrevios[erroresPrevios.length - 1]}")` : ''),
            );
            continuarConCreacion(candidata.nombre);
          } else {
            cy.log(`Especie "${candidata.nombre}": fallo la lectura de configuracion ("${mensajeError}"). Se prueba otra especie para confirmar si es sistemico.`);
            probarCandidata(idx + 1, [...erroresPrevios, mensajeError]);
          }
        });
      };

      probarCandidata(0, []);
    });
  });
});
