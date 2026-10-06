/**
 * TC-DIS-44 — Accesibilidad WCAG 2.1 AA de la Semaforización de Umbrales Ambientales
 * RF-17 · CU-03 Configurar Umbrales y Alertas Ambientales · Rol: Administrador
 * PRIORITARIO: riesgo de comunicar el nivel de alerta solo por color (WCAG 1.4.1).
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Lighthouse no puede auditar en modo navegación porque el JWT
 * vive en memoria y una recarga pierde la sesión.
 *
 * Datos: especie "Tilapia Roja" (#1), umbral "Temperatura del agua".
 *
 * PROTECCIÓN DE DATOS: un umbral guardado se propaga a los nodos Edge, así que todo
 * POST/PATCH a /configuracion/umbrales se intercepta y por defecto se aborta. El paso 3
 * (guardado válido) responde con 200 SIMULADO: el umbral real del GET con los valores
 * enviados por el formulario.
 *
 * Paso 5: la validación del cliente bloquea el solapamiento antes de enviar la
 * petición, así que el 400 real del backend no se alcanza desde la UI. Se prueban
 * ambos: (a) el error del cliente y (b) la respuesta 400 real del backend
 * (capturada del ambiente TEST) inyectada con page.route en un envío válido.
 *
 * Toda observación es un defecto: la barra de semaforización sin alternativa textual
 * (1.4.1) falla el caso en vez de quedar documentada.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_44_VIEWPORTS=escritorio
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

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_44_VIEWPORTS ?? 'movil,tablet,escritorio')
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

const URL_UMBRALES = (url: URL) => /\/configuracion\/umbrales(\/\d+(\/\w+)?)?$/.test(url.pathname);

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección de escrituras ─────────────────────────────────────────────────

type Umbral = Record<string, unknown> & { id_umbral_ambiental: number };

/** Aborta todo POST/PATCH a umbrales; `simularGuardado` responde 200 con el umbral real + lo enviado. */
async function protegerUmbrales(page: Page) {
  let umbrales: Umbral[] = [];
  let simular = false;
  const intentos: unknown[] = [];
  page.on('response', async (r) => {
    const req = r.request();
    if (req.method() === 'GET' && new URL(r.url()).pathname.endsWith('/configuracion/umbrales') && r.ok()) {
      umbrales = (await r.json().catch(() => ({ items: [] }))).items ?? [];
    }
  });
  await page.route(URL_UMBRALES, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    intentos.push(req.postDataJSON());
    const id = Number(new URL(req.url()).pathname.split('/').pop());
    const actual = umbrales.find((u) => u.id_umbral_ambiental === id);
    if (simular && req.method() === 'PATCH' && actual) {
      const cuerpo = { ...actual, ...req.postDataJSON(), fecha_actualizacion: new Date().toISOString() };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
    }
    return route.abort();
  });
  return { simularGuardado: () => { simular = true; }, intentos };
}

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
  await expect(dialogo.getByText('🟢 NORMAL', { exact: true })).toBeVisible();
  return dialogo;
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
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
  // Una auditoría fallida es un defecto aunque Lighthouse le asigne peso 0 en el puntaje
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Umbrales Ambientales y Semaforización (RF-17)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir escanear los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_44_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
  });

  test('1-2. Formulario de umbral - 0 violaciones axe A/AA (4.1.2 en campos min/max)', async ({ page }, testInfo) => {
    await protegerUmbrales(page);
    await abrirUmbrales(page);
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
    const { simularGuardado, intentos } = await protegerUmbrales(page);
    simularGuardado();
    testInfo.annotations.push({ type: 'Datos simulados', description: 'PATCH del umbral respondido con 200: el umbral real del GET con los valores enviados. No se guarda ni se propaga a Edge.' });
    await abrirUmbrales(page);
    const dialogo = await abrirFormularioEdicion(page);

    const guardado = page.waitForResponse(esPeticion('PATCH', /\/configuracion\/umbrales\/\d+$/));
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await guardado).status(), 'El guardado del umbral válido debe responder 200').toBe(200);
    expect(intentos, 'Guardar debe enviar un único PATCH').toHaveLength(1);
    await expect(dialogo).toBeHidden();
    await expect(filaUmbral(page)).toBeVisible();

    await escanear(page, 'semaforizacion', testInfo);
  });

  test('4. Criterio 1.4.1 (uso del color) - niveles distinguibles sin color', async ({ page }, testInfo) => {
    await protegerUmbrales(page);
    await abrirUmbrales(page);
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

    // La barra de la columna "Semaforización" debe tener alternativa textual (no solo segmentos de color)
    const barra = celdas.nth(3);
    // Los extremos del rango ("0", "32") son texto, pero no dicen qué nivel es cada segmento:
    // la alternativa debe nombrar los niveles
    const alternativaBarra = await barra.evaluate((td) => {
      const etiquetas = [...td.querySelectorAll('[aria-label],[title]')].map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`);
      return /normal|precauci[oó]n|cr[ií]tico/i.test(`${td.textContent ?? ''} ${etiquetas.join(' ')}`);
    });

    // Formulario: cada nivel lleva etiqueta de texto y descripción, no solo color
    const dialogo = await abrirFormularioEdicion(page);
    for (const texto of ['NORMAL', 'PRECAUCIÓN', 'CRÍTICO']) {
      await expect(dialogo.getByText(new RegExp(`^\\S+ ${texto}$`)), `1.4.1: falta la etiqueta "${texto}" en el formulario`).toBeVisible();
    }
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();

    // Evidencia: captura normal y en escala de grises (simula acromatopsia), en el
    // reporte HTML y en ./resultados para adjuntar en Taiga
    const evidencia = async (nombre: string, imagen: Buffer) => {
      fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
      fs.writeFileSync(path.join(__dirname, 'resultados', `${TC_ID}-${nombre.replace('.png', `-${testInfo.project.name}.png`)}`), imagen);
      await testInfo.attach(nombre, { body: imagen, contentType: 'image/png' });
    };
    const tabla = page.locator('table');
    await evidencia('1.4.1-semaforizacion-color.png', await tabla.screenshot());
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await evidencia('1.4.1-semaforizacion-grises.png', await tabla.screenshot());
    await abrirFormularioEdicion(page);
    await evidencia('1.4.1-formulario-grises.png', await page.getByRole('dialog').screenshot());

    expect.soft(alternativaBarra, 'DEFECTO 1.4.1: la barra de la columna "Semaforización" comunica los niveles solo con segmentos de color: ni texto, ni aria-label, ni title nombran normal / precaución / crítico (solo muestra los extremos del rango)').toBe(true);
  });

  test('5a. Error de solapamiento (validación del cliente) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await protegerUmbrales(page);
    await abrirUmbrales(page);
    const dialogo = await abrirFormularioEdicion(page);

    let peticionesGuardado = 0;
    page.on('request', (r) => { if (r.method() === 'PATCH' && r.url().includes('/configuracion/umbrales/')) peticionesGuardado++; });

    // Bajar 1 unidad el límite inferior de precaución lo hace invadir el nivel contiguo → solapamiento
    const precaucionInferior = dialogo.getByRole('spinbutton', { name: 'Límite inferior PRECAUCIÓN', exact: true });
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
    await protegerUmbrales(page);
    await page.route(/\/configuracion\/umbrales\/\d+$/, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_SOLAPAMIENTO) })
        : route.fallback());
    testInfo.annotations.push({ type: 'Respuesta inyectada', description: 'Cuerpo 400 real del backend TEST (2026-09-28) inyectado en el PATCH; no se guarda nada.' });
    await abrirUmbrales(page);

    const dialogo = await abrirFormularioEdicion(page);
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();

    const alerta = dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('solapamientos');
    await expect(dialogo, 'El modal debe seguir abierto para corregir el error').toBeVisible();

    await escanear(page, 'error-400-solapamiento', testInfo);
  });

  test('5c. Respuesta HTTP 400 del backend (rango inconsistente, VAL_ENTRADA) - campo identificado', async ({ page }, testInfo) => {
    await protegerUmbrales(page);
    await page.route(/\/configuracion\/umbrales\/\d+$/, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_RANGO_INVERTIDO) })
        : route.fallback());
    testInfo.annotations.push({ type: 'Respuesta inyectada', description: 'Cuerpo 400 real del backend TEST (2026-09-28) inyectado en el PATCH; no se guarda nada.' });
    await abrirUmbrales(page);

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
