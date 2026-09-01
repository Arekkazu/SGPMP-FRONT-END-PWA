/// <reference types="cypress" />
// TC-M01-011 · Rechazo del formulario de registro cuando falla la validación de CAPTCHA (HTTP 400)
// CU01 · RF-01 · Manejo de errores / Seguridad (Frontend & Backend)
// Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-011/

const DIR = 'RESULTADOS/TC-M01-011';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-011 — Rechazo del formulario de registro por fallo de CAPTCHA

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU01 - Registro de Usuario · RF-01 |
| Tipo / Equipo | Manejo de Errores (Seguridad) · Frontend / QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Vista /registro, Formulario datos personales completos |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: ${r.veredicto}

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema, si este caso de prueba presenta fallas derivadas de la interfaz gráfica o problemas de navegación en el formulario de registro, la responsabilidad directa corresponde al **equipo de Diseño / Frontend** (no constituye un bug del backend).

## Registro Técnico de Red (Espionaje Real)
- **Naturaleza del CAPTCHA**: 100% simulado internamente (checkbox HTML \`#captcha-check\`). Sin dependencias ni claves de Google reCAPTCHA.
- **Detalle de Petición HTTP Real**: ${r.peticionInfo}
- **Hallazgos**:
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_paso1_datos_personales.png](screenshots/01_paso1_datos_personales.png) — Datos personales ingresados en el Paso 1.
- [02_paso2_captcha_sin_marcar.png](screenshots/02_paso2_captcha_sin_marcar.png) — Paso 2 de credenciales con checkbox de CAPTCHA sin marcar.
- [03_error_captcha_rechazado.png](screenshots/03_error_captcha_rechazado.png) — Estado final de la interfaz tras el intento de envío sin CAPTCHA.
`;
}

describe('TC-M01-011 · Rechazo de registro por fallo de CAPTCHA', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OK') =>
    checks.push({ paso, esperado, obtenido, estado });

  let peticionInfo = 'Sin petición disparada al servidor por bloqueo estricto en el cliente.';

  before(() => {
    // Evita congelamientos por CORS en scripts de Vite bajo el proxy de Cypress
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
      caso: 'TC-M01-011',
      titulo: 'Rechazo del formulario de registro cuando falla la validación de CAPTCHA',
      cu: 'CU01 - Registro de usuario',
      rf: 'RF-01',
      tipo: 'Manejo de errores / Seguridad',
      equipo: 'Frontend & QA',
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo,
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-011_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-011_resultado.md`, content: renderMd(r) });
  });

  it('valida que el registro se rechace si no se resuelve o falla la validación de CAPTCHA', () => {
    checks.length = 0;

    // 1) Ir al formulario de registro
    cy.visit('/registro');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/registro');
    cy.contains('h1', 'Crear cuenta nueva').should('be.visible');

    // Llenar Paso 1: Datos Personales
    const numId = `999${Date.now().toString().slice(-7)}`;
    cy.get('select#tipo_identificacion').select('CC');
    cy.get('input[name="numero_identificacion"]').clear().type(numId);
    cy.get('input[name="nombre"]').clear().type('PruebaQA');
    cy.get('input[name="apellidos"]').clear().type('CaptchaTest');
    cy.get('input[name="fecha_nacimiento"]').clear().type('1995-05-15');
    cy.get('select#genero').select('M');
    cy.get('input[name="telefono"]').clear().type('3009998877');

    cy.screenshot('01_paso1_datos_personales', { overwrite: true });
    add('Paso 1: Llenado de datos personales', 'Campos obligatorios válidos', `Ingresados datos para ID ${numId}`, 'OK');

    // Avanzar a Paso 2
    cy.contains('button', 'Continuar →').click();
    cy.contains('p', 'Paso 2 de 2', { timeout: 10000 }).should('be.visible');

    // Llenar Paso 2: Credenciales
    const testEmail = `qa.captcha.${Date.now()}@pecuaria.co`;
    cy.get('input[name="correo_electronico"]').clear().type(testEmail);
    cy.get('input[name="contrasena"]').clear().type('Test1234!');
    cy.get('input[name="confirmar_contrasena"]').clear().type('Test1234!');

    // Capturar estado con CAPTCHA sin marcar
    cy.screenshot('02_paso2_captcha_sin_marcar', { overwrite: true });

    // Verificar que el checkbox de captcha NO está marcado
    cy.get('#captcha-check').should('not.be.checked').then(($chk) => {
      add('Verificar estado del checkbox de CAPTCHA', 'Checkbox no marcado (checked = false)',
        `checked = ${$chk.is(':checked')}`, $chk.is(':checked') ? 'FALLA' : 'OK');
    });

    // Verificar que el botón Registrarse está deshabilitado en UI
    cy.contains('button', 'Registrarse').then(($btn) => {
      const isDisabled = $btn.is(':disabled');
      add('Estado del botón Registrarse sin CAPTCHA marcado', 'Deshabilitado (disabled = true)',
        `disabled = ${isDisabled}`, isDisabled ? 'OK' : 'OBSERVACION');
    });

    // 2) Intentar el envío REAL al backend de TEST (Espionaje sin Mocking)
    cy.intercept('POST', '**/usuarios/').as('registroReq');

    // Evadir la restricción en el DOM habilitando el botón e intentando click
    cy.contains('button', 'Registrarse')
      .invoke('removeAttr', 'disabled')
      .click({ force: true });

    // Esperar un margen para verificar si se emite tráfico de red real
    cy.wait(2000);

    cy.get('@registroReq.all').then((interceptions: any) => {
      if (interceptions.length > 0) {
        const last = interceptions[interceptions.length - 1];
        const status = last.response ? last.response.statusCode : 'SIN_RESPUESTA';
        const bodyMsg = last.response && last.response.body ? JSON.stringify(last.response.body) : 'N/A';

        peticionInfo = `Petición REAL realizada a /usuarios/. HTTP Status: ${status}. Respuesta: ${bodyMsg}`;

        if (status === 400) {
          add('Respuesta del Backend TEST al enviar sin CAPTCHA válido',
            'HTTP Status 400 (Bad Request / CAPTCHA inválido)',
            `HTTP ${status} - Respuesta: ${bodyMsg}`, 'OK');
        } else if (status === 200 || status === 201) {
          add('Respuesta del Backend TEST al enviar sin CAPTCHA válido',
            'HTTP Status 400 (Debe rechazar)',
            `HALLAZGO DE SEGURIDAD: El backend ACEPTÓ el registro sin CAPTCHA (HTTP ${status}). Respuesta: ${bodyMsg}`, 'FALLA');
        } else {
          add('Respuesta del Backend TEST al enviar sin CAPTCHA válido',
            'HTTP Status 400 (Bad Request)',
            `HTTP ${status} - Respuesta: ${bodyMsg}`, 'OBSERVACION');
        }
      } else {
        peticionInfo = 'El frontend bloqueó el envío en la capa de estado de React (captchaChecked = false). No se emitió tráfico de red al backend.';
        add('Comportamiento de envío sin CAPTCHA marcado',
          'Bloqueo de envío antes de emitir tráfico HTTP',
          'El estado del cliente impidió el envío del formulario sin CAPTCHA', 'OK');
      }
    });

    cy.screenshot('03_error_captcha_rechazado', { overwrite: true });
  });
});
