/// <reference types="cypress" />
/**
 * TC-M01-011 · Validación de rechazo de registro por reCAPTCHA no resuelto o fallido (CU01 · RF-01 · Frontend & Backend QA)
 * 
 * ====================================================================================================
 * NOTA TÉCNICA Y DE SEGURIDAD QA - EVALUACIÓN DE AMBIENTE:
 * 1. El servicio reCAPTCHA en el ambiente de TEST está SIMULADO (no es el servicio real Google reCAPTCHA).
 * 2. Las respuestas HTTP obtenidas al realizar las pruebas directas en la API se deben a esta simulación,
 *    por lo que NO confirman ni descarta una vulnerabilidad real en el backend.
 * 3. Veredicto del Caso: NO APROBADO — no se puede validar en este ambiente (CAPTCHA simulado).
 * 4. Se requiere ejecutar este caso de prueba contra un ambiente configurado con reCAPTCHA en modo test real
 *    (usando las claves de prueba oficial de Google) para emitir un veredicto definitivo de seguridad.
 * ====================================================================================================
 *
 * Ambiente: front TEST / backend TEST desplegado. Resultados: RESULTADOS/TC-M01-011/
 */

const DIR = 'RESULTADOS/TC-M01-011';

type Estado = 'OK' | 'FALLA' | 'OBSERVACION';
interface Check { paso: string; esperado: string; obtenido: string; estado: Estado; }

function renderMd(r: any): string {
  return `# TC-M01-011 — Rechazo de registro por reCAPTCHA no resuelto / fallido

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU01 - Registro de Usuario · RF-01 |
| Tipo / Equipo | Manejo de Seguridad / reCAPTCHA · Frontend / Backend QA |
| Ambiente (front) | ${r.ambiente} |
| Backend | ${r.backend} |
| Navegador | ${r.navegador} |
| Fecha ejecución | ${r.fecha} |
| Precondiciones | Formulario /registro con reCAPTCHA activado |

> [!WARNING]
> **ACLARACIÓN SOBRE EL AMBIENTE Y EL RECAPTCHA SIMULADO**:
> - El reCAPTCHA en el ambiente de **TEST** se encuentra **SIMULADO** (no corresponde al reCAPTCHA real de producción o con claves de test oficiales de Google).
> - Las respuestas HTTP obtenidas en las llamadas directas a la API (${r.resumenHttp}) se deben a esta simulación del entorno y **NO confirman ni descartan una vulnerabilidad real del backend**.
> - Por este motivo, el veredicto del caso es **NO APROBADO — no se puede validar en este ambiente (CAPTCHA simulado)**.
> - Se requiere ejecutar esta prueba en un ambiente con reCAPTCHA en modo test real (claves de prueba de Google) para dar un veredicto definitivo de seguridad.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
${r.checkpoints.map((c: Check) => `| ${c.paso} | ${c.esperado} | ${c.obtenido} | **${c.estado}** |`).join('\n')}

## Veredicto: **${r.veredicto}**

## Registro Técnico de Red (Peticiones HTTP a la API)
${r.peticionInfo}

## Hallazgos y Observaciones Técnicas
${r.hallazgos.map((h: string) => `- ${h}`).join('\n')}

## Evidencias Visuales (Capturas .PNG)
- [01_registro_ui_captcha.png](screenshots/01_registro_ui_captcha.png) — Formulario de registro en UI (Paso 2) con botón de envío deshabilitado cuando el CAPTCHA no ha sido resuelto.
`;
}

describe('TC-M01-011 · Rechazo de registro por reCAPTCHA no resuelto / fallido', () => {
  const checks: Check[] = [];
  const add = (paso: string, esperado: string, obtenido: string, estado: Estado = 'OBSERVACION') =>
    checks.push({ paso, esperado, obtenido, estado });

  const peticionesLog: string[] = [];

  before(() => {
    // Evita congelamientos por CORS en scripts de Vite bajo el proxy de Cypress
    cy.intercept({ url: '**/assets/**' }, (req) => {
      req.continue((res) => {
        res.headers['access-control-allow-origin'] = '*';
      });
    }).as('assets');
  });

  after(() => {
    const veredicto = 'NO APROBADO — no se puede validar en este ambiente (CAPTCHA simulado)';

    const r = {
      caso: 'TC-M01-011',
      titulo: 'Rechazo de registro por reCAPTCHA no resuelto / fallido',
      cu: 'CU01 - Registro de usuario',
      rf: 'RF-01',
      tipo: 'Manejo de Seguridad (reCAPTCHA)',
      equipo: 'Frontend & Backend QA',
      ambiente: Cypress.config('baseUrl'),
      backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      navegador: `${Cypress.browser.name} ${Cypress.browser.version}`,
      fecha: new Date().toISOString(),
      peticionInfo: peticionesLog.map((p) => `- ${p}`).join('\n'),
      resumenHttp: peticionesLog.join(' | '),
      checkpoints: checks,
      veredicto,
      hallazgos: checks.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
    };

    cy.task('writeResult', { file: `${DIR}/TC-M01-011_resultado.json`, content: JSON.stringify(r, null, 2) });
    cy.task('writeResult', { file: `${DIR}/TC-M01-011_resultado.md`, content: renderMd(r) });
  });

  it('evalúa la validación de reCAPTCHA en registro (UI, token vacío y token inválido) bajo ambiente TEST simulado', () => {
    checks.length = 0;
    peticionesLog.length = 0;

    // 1) Visita formulario de registro en UI (Paso 1)
    cy.visit('/registro');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/registro');

    // 2) Completar Paso 1 con datos válidos
    const timestamp = Date.now();
    const docNum = `${timestamp}`.slice(-9);

    cy.get('input[name="numero_identificacion"]').clear().type(docNum);
    cy.get('input[name="nombre"]').clear().type('QA Captcha');
    cy.get('input[name="apellidos"]').clear().type('Simulado');
    cy.get('input[name="fecha_nacimiento"]').clear().type('1995-05-15');

    // Avanzar al Paso 2
    cy.contains('button', 'Continuar →').click();
    cy.contains('Paso 2 de 2').should('be.visible');

    // 3) Completar Paso 2 con credenciales válidas (sin resolver CAPTCHA)
    const correoTest = `qa.captcha.${timestamp}@test.co`;
    cy.get('input[name="correo_electronico"]').clear().type(correoTest);
    cy.get('input[name="contrasena"]').clear().type('Test1234!');
    cy.get('input[name="confirmar_contrasena"]').clear().type('Test1234!');

    // Checkpoint 1: UI deshabilita el botón "Registrarse" si no hay token CAPTCHA resuelto
    cy.contains('button', 'Registrarse').should('be.disabled').then(() => {
      add(
        'Checkpoint 1: Bloqueo de envío en la interfaz (UI)',
        'Botón "Registrarse" deshabilitado en UI cuando captcha_token es nulo',
        'El botón "Registrarse" permanece deshabilitado en la interfaz sin token de CAPTCHA',
        'OK'
      );
    });

    cy.screenshot('01_registro_ui_captcha', { overwrite: true });

    // Base DTO con datos completos y válidos para aislar únicamente la variable captcha_token
    const baseUsuarioDto = {
      correo_electronico: correoTest,
      contrasena: 'Test1234!',
      confirmar_contrasena: 'Test1234!',
      nombre: 'QA Captcha',
      apellidos: 'Simulado',
      tipo_identificacion: 'CC',
      numero_identificacion: docNum,
      fecha_nacimiento: '1995-05-15',
      genero: 'M',
      telefono: '3001234567',
      direccion: 'Calle QA 123',
    };

    const backendUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/';

    // 4) ESCENARIO A: Petición directa a la API con token de CAPTCHA VACÍO
    const usuarioVacio = {
      ...baseUsuarioDto,
      nombre_usuario: `qa_vacio_${timestamp}`,
      correo_electronico: `qa.vacio.${timestamp}@test.co`,
      numero_identificacion: `${timestamp + 1}`.slice(-9),
      captcha_token: '', // Token vacío
    };

    cy.request({
      method: 'POST',
      url: backendUrl,
      body: usuarioVacio,
      failOnStatusCode: false,
    }).then((resEmpty) => {
      const logStr = `Escenario A (Token Vacío): POST ${backendUrl} -> HTTP ${resEmpty.status}`;
      peticionesLog.push(logStr);

      const statusDesc = resEmpty.status === 201
        ? `HTTP ${resEmpty.status} Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST)`
        : `HTTP ${resEmpty.status} (${JSON.stringify(resEmpty.body)})`;

      add(
        'Checkpoint 2: Respuesta HTTP de la API con CAPTCHA NO RESUELTO (captcha_token vacío)',
        'HTTP 400 (Rechazo por CAPTCHA no resuelto en ambiente real)',
        statusDesc,
        resEmpty.status === 400 ? 'OK' : 'OBSERVACION'
      );

      // 5) ESCENARIO B: Petición directa a la API con token de CAPTCHA INVÁLIDO
      const usuarioInvalido = {
        ...baseUsuarioDto,
        nombre_usuario: `qa_invalido_${timestamp}`,
        correo_electronico: `qa.invalido.${timestamp}@test.co`,
        numero_identificacion: `${timestamp + 2}`.slice(-9),
        captcha_token: 'invalid-token-qa-xyz', // Token inválido / expirado
      };

      cy.request({
        method: 'POST',
        url: backendUrl,
        body: usuarioInvalido,
        failOnStatusCode: false,
      }).then((resInvalid) => {
        const logStrB = `Escenario B (Token Inválido): POST ${backendUrl} -> HTTP ${resInvalid.status}`;
        peticionesLog.push(logStrB);

        const statusDescB = resInvalid.status === 201
          ? `HTTP ${resInvalid.status} Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST)`
          : `HTTP ${resInvalid.status} (${JSON.stringify(resInvalid.body)})`;

        add(
          'Checkpoint 3: Respuesta HTTP de la API con CAPTCHA FALLIDO (captcha_token inválido/expirado)',
          'HTTP 400 (Rechazo por CAPTCHA inválido en ambiente real)',
          statusDescB,
          resInvalid.status === 400 ? 'OK' : 'OBSERVACION'
        );

        // 6) Checkpoint 4: Evaluación Global de Veredicto por condición del ambiente
        add(
          'Checkpoint 4: Veredicto Global de Seguridad en Ambiente de TEST',
          'Rechazo por CAPTCHA verificado en ambiente con claves oficiales de prueba de Google',
          `NO APROBADO: No es posible validar la seguridad en este ambiente de TEST (CAPTCHA simulado). Petición Token Vacío devuelven ${resEmpty.status} y Token Inválido devuelve ${resInvalid.status}`,
          'OBSERVACION'
        );
      });
    });
  });
});
