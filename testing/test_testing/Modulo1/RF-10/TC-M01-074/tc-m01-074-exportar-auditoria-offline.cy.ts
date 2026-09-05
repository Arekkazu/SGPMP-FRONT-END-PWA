/// <reference types="cypress" />
// TC-M01-074 · Intentar exportar auditoría sin conexión · CU07 · RF-10 · Negativa/Offline (Frontend)
// Ambiente: front TEST desplegado. Resultados: RESULTADOS/TC-M01-074/
// Ejecutar:  npx cypress run --browser chrome --spec "cypress/e2e/tc-m01-074-exportar-auditoria-offline.cy.ts"
//
// CORREGIDO (respecto a la version anterior):
// 1) Se agrega un intercept que añade Access-Control-Allow-Origin a las respuestas de
//    /assets/** ANTES de cy.visit(). El bundle desplegado pide sus scripts como
//    `crossorigin` sin cabecera CORS; bajo el proxy de Cypress eso deja el
//    <script type="module"> colgado y el evento `load` nunca dispara, provocando el
//    timeout de pageLoadTimeout en loginUI(). Este era el fix pendiente que ya estaba
//    documentado como comentario en cypress.config.ts pero nunca se había implementado
//    en el spec.
// 2) La escritura del resultado (antes en un hook after()/afterEach()) se movió AL
//    FINAL DEL PROPIO it(), como comandos normales de la cola -- no en ningún hook.
//    Se probaron ambas variantes (after() y afterEach()) y las dos revientan igual con
//    "cy.task() must only be invoked from the spec file or support file": no era un
//    problema de cy.writeFile() vs cy.task() (el fix anterior cambió el síntoma, no la
//    causa), sino que Cypress no garantiza que los comandos cy encolados en un hook de
//    la ÚLTIMA (o única) prueba de la spec queden asociados a un test "actualmente
//    corriendo" -- la limitación aplica a after() y afterEach() por igual cuando no
//    queda ninguna prueba más. Encolar cy.writeFile() como parte del propio it() evita
//    el problema de raíz.

const CABECERA_CSV = 'ID,Usuario,Tipo evento,Módulo,Descripción,Resultado,IP,Fecha/Hora,Hash';
const DIR = 'RESULTADOS/TC-M01-074';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

describe('TC-M01-074 · Exportar auditoría sin conexión', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });
  let eventosCargados = 0;

  before(() => {
    // Fix 1: evita que el <script type="module" crossorigin> del bundle se cuelgue
    // bajo el proxy de Cypress por falta de cabecera CORS -> evita el timeout de
    // pageLoadTimeout al visitar /login.
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');

    cy.loginUI();
    // OJO: no usar cy.visit('/auditoria') aquí -> una recarga completa de página
    // dispara un POST /sesiones/refresh que responde 401 en este ambiente y te
    // expulsa de vuelta a /login. Hay que navegar por SPA.
    // OJO 2: el ítem del sidebar es un <button class="ds-sidebar__item" title="Auditoría">
    // (app hecha en Ionic, no hay <a href>). Confirmado manualmente que un clic real
    // sí navega bien a /auditoria -> apuntamos directo a ese botón por atributo,
    // evitando cy.contains sobre el wrapper que no disparaba la navegación.
    cy.get('button.ds-sidebar__item[title="Auditoría"]', { timeout: 20000 })
      .should('be.visible')
      .click();
    cy.location('pathname', { timeout: 30000 }).should('eq', '/auditoria');
    cy.contains('p', /evento.*encontrado/i, { timeout: 15000 })
      .invoke('text').then((t) => { eventosCargados = parseInt(t, 10) || 0; });
    cy.contains('button', 'Exportar CSV', { timeout: 15000 }).should('not.be.disabled');
  });

  const escribirResultado = () => {
    // Encolado como parte del it() -- no de un hook -- para que cy.writeFile()
    // siempre corra dentro de un test "activo" (ver nota de cabecera).
    cy.setNetwork(false);

    cy.then(() => {
      const veredicto = checks.length === 0
        ? 'NO EJECUTADO (falló la preparación / login)'
        : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

      const r = {
        caso: 'TC-M01-074', titulo: 'Intentar exportar auditoría sin conexión',
        cu: 'CU07 - Consultar Historial y Auditoría', rf: 'RF-10',
        tipo: 'Negativa / Offline', equipo: 'Frontend',
        ambiente: Cypress.config('baseUrl'),
        backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
        navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
        fecha: new Date().toISOString(),
        precondiciones: { cuenta: 'admin@pecuaria.co', vista: '/auditoria', eventosCargados },
        checkpoints: checks,
        veredicto,
        // Generado a partir de los checkpoints reales de esta ejecución (no texto
        // precargado): cada hallazgo es literalmente "paso -> lo que se obtuvo".
        hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      };

      cy.writeFile(`${DIR}/TC-M01-074_resultado.json`, JSON.stringify(r, null, 2));
      cy.writeFile(`${DIR}/TC-M01-074_resultado.md`, renderMd(r));
    });
  };

  it('registra el comportamiento del botón "Exportar CSV" estando offline', () => {
    let blob: Blob | null = null;
    // Si Cypress reintenta este test (retries), no acumular checkpoints del intento
    // anterior encima de los nuevos.
    checks.length = 0;

    // 1) Simular sin conexión (a nivel de app -- ver nota en commands.ts)
    cy.setNetwork(true);
    cy.window().its('navigator.onLine').then((online) => {
      add('Activar modo offline', 'navigator.onLine = false',
        `navigator.onLine = ${online}`, online === false ? 'OK' : 'OBSERVACION');
    });
    // Evidencia del estado real de la página apenas se activa offline, sin importar
    // en qué paso falle después.
    cy.screenshot('00_justo_al_activar_offline', { overwrite: true });

    // OJO: en vez de cy.contains('button', 'Exportar CSV').as(...) (que TRUENA todo
    // el test si no encuentra el botón, dejando el reporte vacío), enumeramos los
    // botones presentes SIN que falle, registramos el hallazgo, y solo continuamos
    // con clic/descarga/recarga si el botón sigue existiendo. Esto evita perder toda
    // la evidencia por un timing raro y documenta honestamente lo que se encontró.
    cy.wait(500); // pequeño margen para que se asiente cualquier re-render tras ir offline
    cy.get('body').then(($body) => {
      const botones = Cypress.$($body).find('button').toArray()
        .map((b) => b.textContent?.trim()).filter(Boolean);
      const encontrado = botones.some((t) => /exportar csv/i.test(t || ''));
      add('¿Existe el botón "Exportar CSV" al quedar offline?',
        'Debe seguir presente en el DOM',
        encontrado ? 'Presente' : `NO encontrado. Botones visibles: ${botones.join(' | ') || '(ninguno)'}`,
        encontrado ? 'OK' : 'FALLA');
    });
    cy.get('body').then(($body) => {
      const avisa = /sin conexi/i.test($body.text());
      add('¿La vista avisa que no hay conexión?', 'Debería mostrar aviso de offline',
        avisa ? 'Muestra aviso' : 'No muestra ningún aviso', avisa ? 'OK' : 'OBSERVACION');
    });

    cy.get('body').then(($body) => {
      const hayBoton = Cypress.$($body).find('button').toArray()
        .some((b) => /exportar csv/i.test(b.textContent || ''));
      if (!hayBoton) {
        add('Resto del flujo (clic/descarga/recarga)', 'N/A',
          'Omitido: el botón "Exportar CSV" no estaba presente para continuar', 'OBSERVACION');
        cy.screenshot('01_offline_boton_no_encontrado', { overwrite: true });
        return;
      }

      cy.contains('button', 'Exportar CSV').as('exportar');
      cy.get('@exportar').then(($b) =>
        add('Estado del botón "Exportar CSV" al quedar offline', 'Habilitado (hay eventos en memoria)',
          $b.is(':disabled') ? 'Deshabilitado' : 'Habilitado', $b.is(':disabled') ? 'OBSERVACION' : 'OK'));

      // 2) Interceptar la descarga del lado del cliente
      cy.window().then((win) => {
        cy.stub(win.URL, 'createObjectURL').callsFake((b: Blob) => { blob = b; return 'blob:stub'; }).as('createObjectURL');
        cy.stub(win.HTMLAnchorElement.prototype, 'click').as('descarga');
      });

      // 3) Intentar exportar
      // scrollIntoView() + click() normal seguía fallando ("hidden from view"): la
      // barra de acciones desborda el viewport de 1280px y el botón queda cubierto
      ///fuera de alcance de un clic real de Cypress incluso tras hacer scroll -- esto
      // en sí es una observación válida (posible problema de layout responsive en esta
      // vista), pero no es el objeto de este caso. Se deja registrado como checkpoint
      // aparte y se fuerza el clic para poder seguir observando el comportamiento de
      // exportación offline, que es lo que este TC pide documentar.
      cy.get('@exportar').then(($b) => {
        const rect = ($b[0] as HTMLElement).getBoundingClientRect();
        const fueraDeViewport = rect.right > Cypress.config('viewportWidth') || rect.left < 0;
        add('¿El botón "Exportar CSV" es alcanzable con un clic real (sin forzar)?',
          'Dentro del viewport, sin overlap',
          fueraDeViewport
            ? `Se sale del viewport (right=${Math.round(rect.right)}, viewportWidth=${Cypress.config('viewportWidth')})`
            : 'Dentro del viewport pero cubierto por otro elemento',
          'FALLA');
      });
      cy.get('@exportar').click({ force: true });

      // 4) Registrar qué pasó
      cy.get('@createObjectURL').then((s: any) =>
        add('Clic en "Exportar CSV" offline → generación del archivo', 'Se genera un Blob CSV en el cliente',
          s.calledOnce ? 'URL.createObjectURL llamado 1 vez' : 'NO se generó archivo', s.calledOnce ? 'OK' : 'FALLA'));
      cy.get('@descarga').then((s: any) =>
        add('Disparo de la descarga', 'a.click() ejecutado',
          s.calledOnce ? 'Descarga disparada' : 'Descarga NO disparada', s.calledOnce ? 'OK' : 'FALLA'));
      cy.then(() => (blob ? blob.text() : Promise.resolve(''))).then((txt) => {
        const linea = txt.split('\n')[0];
        const filas = Math.max(txt.split('\n').length - 1, 0);
        add('Contenido del CSV exportado offline', `Encabezado "${CABECERA_CSV}" + filas visibles`,
          `Encabezado: "${linea}" · ${filas} filas`, linea === CABECERA_CSV ? 'OK' : 'FALLA');
      });
      cy.get('[role="alert"]').then(($a) =>
        add('Alertas de error tras exportar offline', 'Ninguna',
          $a.length ? `${$a.length}: ${$a.text()}` : 'Ninguna', $a.length ? 'OBSERVACION' : 'OK'));
      cy.screenshot('01_offline_export', { overwrite: true });

      // 5) Forzar recarga de datos estando offline (botón ↻), si existe
      cy.get('body').then(($b2) => {
        const hayRecargar = Cypress.$($b2).find('button[aria-label="Recargar"]').length > 0;
        if (!hayRecargar) {
          add('Recargar datos estando offline (botón ↻)', 'Botón de recargar presente',
            'No se encontró un botón con aria-label="Recargar"', 'OBSERVACION');
          return;
        }
        cy.get('button[aria-label="Recargar"]').scrollIntoView().click({ force: true });
        cy.get('body', { timeout: 10000 }).then(($body3) => {
          const err = /Error al cargar auditoría/i.test($body3.text());
          add('Recargar datos estando offline (botón ↻)', 'Alerta de error de red visible',
            err ? 'Muestra "Error al cargar auditoría"' : 'No muestra alerta', err ? 'OK' : 'FALLA');
        });
        cy.get('body').then(($body4) => {
          const botonesFinal = Cypress.$($body4).find('button').toArray()
            .filter((b) => /exportar csv/i.test(b.textContent || ''));
          if (botonesFinal.length > 0) {
            const $b = botonesFinal[0] as HTMLButtonElement;
            add('Estado de "Exportar CSV" tras recargar fallido offline',
              'Sigue habilitado (eventos previos en memoria)',
              $b.disabled ? 'Deshabilitado' : 'Habilitado', $b.disabled ? 'OBSERVACION' : 'OK');
          } else {
            add('Estado de "Exportar CSV" tras recargar fallido offline',
              'Sigue habilitado (eventos previos en memoria)',
              'El botón ya no está presente tras recargar', 'FALLA');
          }
        });
        cy.screenshot('02_offline_recargar_error', { overwrite: true });
      });
    });

    // Encolado al final, fuera de cualquier hook: corre pase lo que pase en las
    // ramas de arriba (ambas terminan sin lanzar excepción, solo con distintos
    // checkpoints acumulados).
    escribirResultado();
  });
});

function renderMd(r: any): string {
  const rows = r.checkpoints.map((c: any) =>
    `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n');
  return `# ${r.caso} — ${r.titulo}

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | ${r.cu} · ${r.rf} |
| Tipo / Equipo | ${r.tipo} · ${r.equipo} |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Sesión ${r.precondiciones.cuenta}, vista ${r.precondiciones.vista}, ${r.precondiciones.eventosCargados} eventos cargados |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${rows}

## Veredicto: ${r.veredicto}

## Comportamiento registrado / hallazgos
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencia
- \`screenshots/01_offline_export.png\`
- \`screenshots/02_offline_recargar_error.png\`
- \`videos/tc-m01-074-exportar-auditoria-offline.cy.ts.mp4\`
`;
}
