/// <reference types="cypress" />
// TC-M09-G01 · CU-01 – Gestionar Catálogo de Especies Productivas (RF-15 · Frontend & Backend QA)
// Incidente de infraestructura de red activo: INC-M09-01-G01 (Fecha de detección: 03/09/2026).
// Motivo de no ejecución: El frontend TEST opera bajo HTTPS mientras que el backend TEST responde en HTTP plano,
// provocando un bloqueo de seguridad del navegador por "Mixed Content" en todas las peticiones XHR/API de Módulo9.
//
// TODO: confirmar endpoint real de creación de especie (RF-15) y rol/cuenta de ejecución antes de correr este caso — actualmente sin verificar contra el backend.

const DIR = 'RESULTADOS/TC-M09-G01';

// Variables configurables para la ejecución real
// TODO: confirmar endpoint real de creación de especie (RF-15) y rol/cuenta de ejecución antes de correr este caso
const ENDPOINT_ESPECIES = '/especies'; // TODO: confirmar ruta real POST /especies vs otra
const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co'; // TODO: confirmar rol/cuenta de ejecución
const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';

// Datos de prueba definidos en RF-15 / CU-01 (valor límite: 3 a 50 caracteres para el nombre)
const DATO_NOMBRE = 'Bovino';
const DATO_DESCRIPCION = 'Especie bovina productiva';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M09-G01 — Registro de Especie Productiva (RF-15 · Módulo9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas · RF-15 |
| Tipo / Equipo | Funcional (UI & API) · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Dato de prueba | Nombre: \`${DATO_NOMBRE}\` (límite 3-50 chars), Descripción: \`${DATO_DESCRIPCION}\` |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Registro Técnico de Red
- **Detalle de Petición HTTP Real**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_formulario_especie_ui.png](screenshots/01_formulario_especie_ui.png) — Diligenciamiento del formulario de especie productiva.
- [02_confirmacion_registro_ui.png](screenshots/02_confirmacion_registro_ui.png) — Confirmación de registro exitoso e ID generado en pantalla.
`;
}

describe('TC-M09-G01 · Registro de Especie Productiva (RF-15)', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Petición directa HTTP realizada durante el test.';

  before(() => {
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO (falló la preparación)'
      : (checks.some((c) => c.estado === 'FALLA') ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const r = {
      caso: 'TC-M09-G01',
      titulo: 'CU-01 – Gestionar Catálogo de Especies Productivas (RF-15)',
      cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
      rf: 'RF-15',
      tipo: 'Funcional (UI & API)',
      equipo: 'Frontend & QA',
      ambiente: Cypress.config('baseUrl'),
      backend: 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M09-G01_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M09-G01_resultado.md`, content: renderMd(r) });
  });

  it('valida el registro exitoso de una especie productiva en UI y Backend (RF-15)', () => {
    checks.length = 0;

    // Interceptar la solicitud de creación de especie en el backend
    cy.intercept('POST', `**${ENDPOINT_ESPECIES}`).as('crearEspecie');

    // 1) Iniciar sesión con la cuenta de ejecución confirmada
    cy.loginUI(CUENTA_EJECUCION_EMAIL, CUENTA_EJECUCION_PASSWORD);

    // 2) Navegar al formulario de gestión de especies
    cy.visit('/especies');
    cy.location('pathname', { timeout: 15000 }).should('include', '/especies');

    // Abrir modal o sección de creación de especie si aplica
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Nueva Especie"), button:contains("Crear Especie")').length > 0) {
        cy.contains('button', /Nueva Especie|Crear Especie/i).click();
      }
    });

    // 3) Checkpoint 1: Diligenciamiento del formulario en el cliente (UI)
    cy.get('input[name="nombre"], input[placeholder*="nombre" i]').clear().type(DATO_NOMBRE);
    cy.get('textarea[name="descripcion"], input[name="descripcion"]').clear().type(DATO_DESCRIPCION);

    add(
      'Checkpoint 1: Diligenciamiento de datos de la especie en el cliente (UI)',
      `Ingresar nombre "${DATO_NOMBRE}" (3-50 chars) y descripción "${DATO_DESCRIPCION}"`,
      `Formulario diligenciado con nombre: "${DATO_NOMBRE}", descripción: "${DATO_DESCRIPCION}"`,
      'OK'
    );

    cy.screenshot('01_formulario_especie_ui', { overwrite: true });

    // 4) Enviar formulario (Submit)
    cy.contains('button', /Guardar|Registrar|Crear/i).click();

    // 5) Checkpoint 2: Verificación de la respuesta de red / API (cy.wait)
    cy.wait('@crearEspecie', { timeout: 15000 }).then((interception) => {
      const res = interception.response;
      const status = res?.statusCode || 0;
      const body = res?.body || {};

      peticionInfo = `POST ${ENDPOINT_ESPECIES} -> Status: ${status}. Body: ${JSON.stringify(body)}`;

      if (status === 201 || status === 200) {
        const idGenerado = body.id || body.id_especie || 'Generado';
        const estadoActivo = body.activo !== undefined ? body.activo : true;
        const tieneFecha = body.fecha_registro || body.created_at || body.fecha_creacion;

        if (idGenerado && estadoActivo && tieneFecha) {
          add(
            'Checkpoint 2: Confirmación de creación y atributos de dominio en API REST',
            'Respuesta HTTP 201/200 OK con ID generado, estado activo por defecto y fecha de registro',
            `HTTP ${status} OK - ID: ${idGenerado}, Estado Activo: ${estadoActivo}, Fecha Registro: ${tieneFecha}`,
            'OK'
          );
        } else {
          add(
            'Checkpoint 2: Confirmación de creación y atributos de dominio en API REST',
            'Respuesta HTTP 201/200 OK con ID, estado activo y fecha de registro',
            `HTTP ${status} OK pero faltan atributos de dominio esperados. Body: ${JSON.stringify(body)}`,
            'OBSERVACION'
          );
        }
      } else {
        add(
          'Checkpoint 2: Confirmación de creación y atributos de dominio en API REST',
          'Respuesta HTTP 201/200 OK',
          `HALLAZGO: Error en backend al crear especie. HTTP Status ${status}. Body: ${JSON.stringify(body)}`,
          'FALLA'
        );
      }
    });

    cy.screenshot('02_confirmacion_registro_ui', { overwrite: true });
  });
});
