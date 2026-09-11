/// <reference types="cypress" />
/**
 * TC-M01-087 · Verificar que la pantalla de perfil sea de solo lectura (CU07 · RF-13 · Frontend & Backend QA)
 * 
 * Requisito: RF-13 (Consultar Historial y Auditoría) / CU07
 * Objetivo: Verificar que la pantalla/modal de detalle del usuario Diana Paola Rincón NO contenga campos editables (0 esperados).
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-087/
 */

const DIR = 'RESULTADOS/TC-M01-087';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-087 — Verificar que el perfil de usuario sea de solo lectura

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Funcional / Seguridad · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Autenticado como Productor (${r.testUser}) |

## Nota de Precondición de Datos
> [!NOTE]
> ${r.precondicionNota}

## Hallazgo de Consulta de Detalle
> [!NOTE]
> ${r.notaHallazgoError}

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /dashboard -> Sidebar -> /usuarios -> Modal Detalle de Usuario ("Diana Paola Rincón").
- **Detalle de Ejecución**: ${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_perfil_detalle_modal.png](screenshots/01_perfil_detalle_modal.png) — Vista del modal de detalle del perfil de usuario consultado.
`;
}

describe('TC-M01-087 · Verificar que el perfil sea de solo lectura', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Consulta de perfil de usuario en módulo /usuarios.';
  let precondicionCreado = false;

  before(() => {
    // Evita congelamientos por CORS en scripts de Vite bajo el proxy de Cypress
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const hasFalla = checks.some((c) => c.estado === 'FALLA');
    const veredicto = checks.length === 0
      ? 'NO EJECUTADO'
      : (hasFalla ? 'CON FALLAS' : 'SIN FALLAS BLOQUEANTES');

    const precondicionNota = precondicionCreado
      ? 'El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura.'
      : 'El usuario Diana Paola Rincón fue localizado en la lista de usuarios del ambiente de TEST.';

    const r = {
      caso: 'TC-M01-087',
      titulo: 'Verificar que el perfil de usuario sea de solo lectura',
      cu: 'CU07 - Consultar Historial y Auditoría',
      rf: 'RF-13',
      tipo: 'Funcional / Seguridad (Solo Lectura)',
      equipo: 'Frontend & QA',
      testUser: 'pruebaas0608@gmail.com',
      ambiente: Cypress.config('baseUrl'),
      backend: Cypress.env('BACKEND_URL') || 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      precondicionNota,
      notaHallazgoError: hasFalla
        ? 'Se detectaron fallas durante la carga de detalle o en la verificación de campos de solo lectura.'
        : 'Carga de detalle exitosa (HTTP 200) y verificación satisfactoria de 0 campos editables para el rol Productor.',
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: [
        precondicionNota,
        ...checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
      ],
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-087_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-087_resultado.md`, content: renderMd(r) });
  });

  it('valida que la pantalla de perfil del usuario Diana Paola Rincón sea de solo lectura (0 campos editables)', () => {
    checks.length = 0;
    precondicionCreado = false;

    // 1) Login con rol Productor (sin permisos de edición de usuarios)
    cy.loginUI('pruebaas0608@gmail.com', 'Test1234!');

    // 2) Esperar a que se desbloquee el menú por permisos RBAC y navegar a /usuarios en la SPA
    cy.contains('button.ds-sidebar__item', 'Gestión de usuarios', { timeout: 15000 })
      .should('not.have.class', 'ds-sidebar__item--locked')
      .click();

    cy.location('pathname', { timeout: 15000 }).should('eq', '/usuarios');
    cy.contains('h1', 'Usuarios', { timeout: 15000 }).should('be.visible');

    add(
      'Checkpoint 1: Autenticación y Navegación al Módulo de Usuarios',
      'Inicio de sesión exitoso como Productor y navegación a /usuarios mediante la barra lateral SPA',
      'Navegación completada exitosamente a la vista /usuarios',
      'OK'
    );

    // 3) Búsqueda inicial del usuario Diana Paola Rincón
    const nombreBusqueda = 'Diana Paola';
    cy.get('input[placeholder="Buscar por nombre"]').clear().type(nombreBusqueda);
    cy.contains('button', 'Buscar').click();

    cy.get('body').then(($body) => {
      const existeFila = $body.find('tr:contains("Diana Paola")').length > 0;

      if (!existeFila) {
        // Precondición: Crear usuario si no existe
        const timestamp = Date.now();
        const docNum = `${timestamp}`.slice(-9);
        const usuarioNuevo = {
          correo_electronico: `diana.rincon.${timestamp}@test.co`,
          contrasena: 'Test1234!',
          confirmar_contrasena: 'Test1234!',
          nombre: 'Diana Paola',
          apellidos: 'Rincón',
          tipo_identificacion: 'CC',
          numero_identificacion: docNum,
          fecha_nacimiento: '1992-08-20',
          genero: 'F',
          telefono: '3109876543',
          direccion: 'Calle QA 100',
          captcha_token: 'token-simulado-test'
        };

        const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/';

        cy.request({
          method: 'POST',
          url: backendUrl,
          body: usuarioNuevo,
          failOnStatusCode: false
        }).then((resReg) => {
          precondicionCreado = true;
          peticionInfo = `El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura (POST ${backendUrl} -> HTTP ${resReg.status}).`;

          // REPETIR BÚSQUEDA DESPUÉS DE CREACIÓN (Ajuste 2 exigido por el usuario)
          cy.get('input[placeholder="Buscar por nombre"]').clear().type(nombreBusqueda);
          cy.contains('button', 'Buscar').click();
        });
      } else {
        peticionInfo = 'El usuario Diana Paola Rincón ya existía en la lista del ambiente TEST.';
      }
    });

    // Interceptar la solicitud de detalle antes de abrir el modal
    cy.intercept('GET', '**/usuarios/*/detalle').as('getDetalle');

    // 4) Abrir modal de detalle
    cy.contains('tr', 'Diana Paola', { timeout: 15000 })
      .find('button[aria-label*="Ver detalle"]')
      .click();

    // 5) Checkpoint 2: Carga de Información de Detalle del Perfil (dinámico según respuesta HTTP)
    cy.wait('@getDetalle', { timeout: 15000 }).then((interception) => {
      const status = interception.response?.statusCode ?? 0;
      const okStatus = status === 200;

      add(
        'Checkpoint 2: Carga de Información de Detalle del Perfil',
        'Carga exitosa de los datos del usuario en la pantalla de detalle (HTTP 200 OK)',
        okStatus
          ? `Carga exitosa: El backend respondió HTTP ${status} OK con los datos del usuario`
          : `Error HTTP ${status} al realizar la solicitud ${interception.request.url}`,
        okStatus ? 'OK' : 'FALLA'
      );
    });

    cy.get('div[role="dialog"]', { timeout: 12000 }).should('be.visible');

    // 6) Checkpoint 3: Verificación de Entradas de Formulario Editables en el DOM
    cy.get('div[role="dialog"]').then(($dialog) => {
      const editables = $dialog.find('input:not([type="hidden"]), select, textarea');
      const count = editables.length;
      const esSoloLectura = count === 0;

      add(
        'Checkpoint 3: Verificación de Entradas de Formulario Editables',
        '0 campos de entrada editables en la pantalla (inputs, selects, textareas)',
        esSoloLectura
          ? `Verificado: 0 campos editables encontrados en el modal de detalle (${count} inputs/selects/textareas detectados)`
          : `FALLA: Se detectaron ${count} campos editables en la pantalla de detalle`,
        esSoloLectura ? 'OK' : 'FALLA'
      );
    });

    cy.get('[role="dialog"] input:not([type="hidden"]), [role="dialog"] select, [role="dialog"] textarea')
      .should('have.length', 0);

    cy.screenshot('01_perfil_detalle_modal', { overwrite: true });

    // 7) Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13)
    cy.then(() => {
      const hasFalla = checks.some((c) => c.estado === 'FALLA');
      add(
        'Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13)',
        'Pantalla 100% solo lectura (0 elementos editables en total)',
        !hasFalla
          ? 'APROBADO: El modal de detalle del usuario es 100% de solo lectura (0 campos editables)'
          : 'FALLA: El perfil no cumple con la restricción de solo lectura o falló la carga de datos',
        !hasFalla ? 'OK' : 'FALLA'
      );
    });
  });
});
