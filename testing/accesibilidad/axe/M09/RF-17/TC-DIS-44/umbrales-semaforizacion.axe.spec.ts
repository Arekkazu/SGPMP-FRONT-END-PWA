/**
 * TC-DIS-44 — Accesibilidad WCAG 2.1 AA de la Semaforización de Umbrales Ambientales
 * RF-17 · CU-03 Configurar Umbrales y Alertas Ambientales · Rol: Administrador
 * PRIORITARIO: riesgo de comunicar el nivel de alerta solo por color (WCAG 1.4.1).
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados. Lighthouse no puede auditar en modo navegación porque el JWT
 * vive en memoria y una recarga pierde la sesión.
 *
 * Datos: especie "Tilapia Roja" (#1), umbral "Temperatura del agua" (#1),
 * rango 0–32 con niveles contiguos crítico 0–20 / precaución 20–25 / normal 25–32.
 * El paso 3 guarda el umbral sin cambios (guardado válido e idempotente).
 * Se requiere un umbral que ya tenga fecha_actualizacion: los que nunca se han
 * editado responden 412 al guardar (hallazgo reportado en el PR del caso).
 *
 * Paso 5: la validación del cliente bloquea el solapamiento antes de enviar la
 * petición, así que el 400 real del backend no se alcanza desde la UI. Se prueban
 * ambos: (a) el error del cliente y (b) la respuesta 400 real del backend
 * (capturada del ambiente TEST) inyectada con page.route en un envío válido.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_44_VIEWPORTS=movil,tablet,escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-44';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ESPECIE = process.env.TC_DIS_44_ESPECIE ?? 'Tilapia Roja';
const VARIABLE = process.env.TC_DIS_44_VARIABLE ?? 'Temperatura del agua';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_44_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Respuestas 400 reales del backend TEST (PATCH /configuracion/umbrales/39, 2026-09-28)
const ERROR_400_SOLAPAMIENTO = {
  error_code: 'SOLAPAMIENTO_NIVELES',
  message:
    "Los niveles de alerta deben ser contiguos sin huecos ni solapamientos. El nivel 'normal' termina en 22 pero el siguiente comienza en 20.",
  fields: [],
};
const ERROR_400_RANGO_INVERTIDO = {
  error_code: 'VAL_ENTRADA',
  message: 'Errores de validacion en la solicitud',
  fields: [{ field: 'valor_max', message: 'valor_max debe ser estrictamente mayor que valor_min.' }],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esPeticion(metodo: string, ruta: RegExp) {
  return (res: { url(): string; request(): { method(): string } }) =>
    res.request().method() === metodo && ruta.test(new URL(res.url()).pathname);
}

/** /configuracion → Por Especie → especie → Umbrales Ambientales, con la tabla cargada. */
async function abrirUmbrales(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Por Especie', exact: true }).click();
  // Tarjeta cuyo nombre es exactamente ESPECIE (no "Tilapia Roja")
  await page.getByRole('button').filter({ has: page.getByText(ESPECIE, { exact: true }) }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: ESPECIE, exact: true })).toBeVisible();

  const umbrales = page.waitForResponse(esPeticion('GET', /\/configuracion\/umbrales$/), { timeout: 20_000 });
  await page.getByRole('button', { name: 'Umbrales Ambientales', exact: true }).click();
  await umbrales;
  await expect(page.getByRole('heading', { name: 'Umbrales Ambientales' })).toBeVisible();
  await expect(filaUmbral(page), `Precondición: "${ESPECIE}" debe tener un umbral de "${VARIABLE}"`).toBeVisible();
}

function filaUmbral(page: Page) {
  return page.locator('table tbody tr').filter({ hasText: VARIABLE }).first();
}

async function abrirFormularioEdicion(page: Page) {
  await filaUmbral(page).getByRole('button', { name: `Editar umbral ${VARIABLE}` }).click();
  const dialogo = page.getByRole('dialog', { name: `Editar umbral — ${VARIABLE}` });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByText('NORMAL')).toBeVisible();
  return dialogo;
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, paso: string, testInfo: TestInfo) {
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);

  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });

  // soft: el resto de verificaciones del test se ejecuta aunque axe encuentre violaciones
  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Umbrales Ambientales y Semaforización (RF-17)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir escanear los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
    await abrirUmbrales(page);
  });

  test('1-2. Formulario de umbral - 0 violaciones axe A/AA (4.1.2 en campos min/max)', async ({ page }, testInfo) => {
    const dialogo = await abrirFormularioEdicion(page);

    await escanear(page, 'formulario', testInfo);

    // 4.1.2: cada campo numérico (rango general + límites de los 3 niveles) debe tener nombre accesible
    const campos = dialogo.getByRole('spinbutton');
    await expect(campos).toHaveCount(8);
    const nombres = ['Valor mínimo', 'Valor máximo', 'Normal inferior', 'Normal superior',
      'Precaución inferior', 'Precaución superior', 'Crítico inferior', 'Crítico superior'];
    for (let i = 0; i < 8; i++) {
      await expect.soft(campos.nth(i), `4.1.2: el campo "${nombres[i]}" no tiene nombre accesible`).toHaveAccessibleName(/\S/);
    }
  });

  test('3. Guardar umbral válido y vista de Semaforización - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const dialogo = await abrirFormularioEdicion(page);

    const guardado = page.waitForResponse(esPeticion('PATCH', /\/configuracion\/umbrales\/\d+$/));
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    const respuesta = await guardado;

    if (respuesta.status() === 500) {
      // Ambiente TEST: el backend persiste el umbral pero responde 500 porque la
      // propagación a los nodos Edge aún no existe (contrato IoT pendiente).
      const cuerpo = await respuesta.json();
      expect(cuerpo.error_code, 'Solo se tolera el 500 de sincronización Edge').toBe('FALLO_SINCRONIZACION_EDGE');
      testInfo.annotations.push({
        type: 'Observación ambiente',
        description: `Guardado persistido en BD pero respuesta 500 FALLO_SINCRONIZACION_EDGE: "${cuerpo.message}"`,
      });
      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await page.getByRole('button', { name: 'Recargar umbrales' }).click();
    } else {
      expect(respuesta.status(), 'El guardado del umbral válido debe responder 200').toBe(200);
    }
    await expect(dialogo).toBeHidden();
    await expect(filaUmbral(page)).toBeVisible();

    await escanear(page, 'semaforizacion', testInfo);
  });

  test('4. Criterio 1.4.1 (uso del color) - evidencia para la verificación manual', async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'Verificación manual 1.4.1',
      description:
        'Confirmar con las capturas adjuntas (color y escala de grises) que normal / precaución / crítico se distinguen por texto o ícono además del color.',
    });

    // Vista de semaforización: encabezados de nivel con texto y rangos en texto por nivel
    const encabezados = page.locator('table thead th');
    for (const nivel of ['Normal', 'Precaución', 'Crítico']) {
      await expect(encabezados.filter({ hasText: nivel }), `1.4.1: falta el encabezado de texto "${nivel}"`).toHaveCount(1);
    }
    const celdas = filaUmbral(page).locator('td');
    for (const [i, nivel] of [[4, 'normal'], [5, 'precaución'], [6, 'crítico']] as const) {
      await expect(celdas.nth(i), `1.4.1: el rango del nivel ${nivel} debe mostrarse como texto`).toHaveText(/\d+(\.\d+)?\s*–\s*\d+(\.\d+)?/);
    }

    // La barra de la columna "Semaforización" usa solo segmentos de color: se documenta, no bloquea,
    // porque la misma información está en texto en las columnas Normal / Precaución / Crítico
    const barra = celdas.nth(3);
    const alternativaBarra = await barra.evaluate((td) =>
      Boolean(td.querySelector('[aria-label],[role="img"],[title]')));
    testInfo.annotations.push({
      type: 'Observación 1.4.1',
      description: alternativaBarra
        ? 'La barra de semaforización tiene alternativa textual.'
        : 'La barra de la columna "Semaforización" comunica los niveles solo con segmentos de color y sin alternativa textual; la información equivalente sí está en texto en las columnas Normal / Precaución / Crítico.',
    });

    // Formulario: cada nivel lleva etiqueta de texto y descripción, no solo color
    const dialogo = await abrirFormularioEdicion(page);
    for (const texto of ['NORMAL', 'PRECAUCIÓN', 'CRÍTICO']) {
      await expect(dialogo.getByText(new RegExp(`${texto}$`)), `1.4.1: falta la etiqueta "${texto}" en el formulario`).toBeVisible();
    }
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();

    // Evidencia: captura normal y en escala de grises (simula acromatopsia), en el
    // reporte HTML y en ./resultados para adjuntar en Taiga
    const evidencia = async (nombre: string, imagen: Buffer) => {
      fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
      fs.writeFileSync(path.join(__dirname, 'resultados', `${TC_ID}-${nombre}`), imagen);
      await testInfo.attach(nombre, { body: imagen, contentType: 'image/png' });
    };
    const tabla = page.locator('table');
    await evidencia('1.4.1-semaforizacion-color.png', await tabla.screenshot());
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await evidencia('1.4.1-semaforizacion-grises.png', await tabla.screenshot());
    await abrirFormularioEdicion(page);
    await evidencia('1.4.1-formulario-grises.png', await page.getByRole('dialog').screenshot());
  });

  test('5a. Error de solapamiento (validación del cliente) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const dialogo = await abrirFormularioEdicion(page);

    let peticionesGuardado = 0;
    page.on('request', (r) => { if (r.method() === 'PATCH' && r.url().includes('/configuracion/umbrales/')) peticionesGuardado++; });

    // Bajar 1 unidad el límite inferior de precaución lo hace invadir el nivel contiguo
    // → solapamiento. Los campos de nivel no tienen nombre accesible (ver test 1), por
    // eso se ubican por posición: [min, max, normal inf/sup, precaución inf/sup, crítico inf/sup].
    const precaucionInferior = dialogo.getByRole('spinbutton').nth(4);
    const valorActual = Number(await precaucionInferior.inputValue());
    await precaucionInferior.fill(String(valorActual - 1));
    await precaucionInferior.blur();
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();

    // 3.3.1: el error se identifica y se anuncia (role="alert" → aria-live assertive)
    const alerta = dialogo.getByRole('alert').filter({ hasText: 'solapamientos' });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('Error de validación');
    expect(peticionesGuardado, 'La validación del cliente debe bloquear el envío').toBe(0);

    await escanear(page, 'error-solapamiento-cliente', testInfo);
  });

  test('5b. Respuesta HTTP 400 del backend (SOLAPAMIENTO_NIVELES) - anunciada y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await page.route(/\/configuracion\/umbrales\/\d+$/, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_SOLAPAMIENTO) })
        : route.fallback());

    const dialogo = await abrirFormularioEdicion(page);
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();

    const alerta = dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('solapamientos');
    await expect(dialogo, 'El modal debe seguir abierto para corregir el error').toBeVisible();

    await escanear(page, 'error-400-solapamiento', testInfo);
  });

  test('5c. Respuesta HTTP 400 del backend (rango inconsistente, VAL_ENTRADA) - campo identificado', async ({ page }, testInfo) => {
    await page.route(/\/configuracion\/umbrales\/\d+$/, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_RANGO_INVERTIDO) })
        : route.fallback());

    const dialogo = await abrirFormularioEdicion(page);
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' })).toBeVisible();

    // 3.3.1: el 400 trae el campo afectado (valor_max); debe identificarse al usuario
    await expect
      .soft(
        dialogo.getByText('valor_max debe ser estrictamente mayor que valor_min.'),
        '3.3.1: el mensaje del campo "valor_max" que devuelve el backend no se muestra al usuario',
      )
      .toBeVisible();

    await escanear(page, 'error-400-rango-inconsistente', testInfo);
  });
});
