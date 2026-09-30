/**
 * TC-DIS-123 — Consistencia visual de la ficha del lote (métricas congeladas)
 * RF-36 · CU-03 Gestionar Activo Poblacional (Lote) · Rol: Productor
 * Activos biológicos → ficha del lote: pestañas "Ficha integral" y "Datos"
 *
 * Baselines: contenido de la ficha (encabezado, barra de secciones y pestaña) en
 * "Ficha integral" y en "Datos". Se excluyen el sidebar y el app bar (badge de
 * notificaciones dinámico).
 *
 * Métricas congeladas: cantidad_actual, peso_promedio, biomasa_total y densidad
 * cambian con cada evento registrado, y dias_en_sistema cambia cada día. Por eso
 * las dos consultas de la ficha (GET /activos-biologicos/{id} y
 * GET /activos-biologicos/{id}/ficha-integral) se sirven con page.route desde un
 * fixture con la respuesta real del lote #296 capturada el 2026-09-29. El test "0"
 * verifica contra el ambiente real que el lote sigue accesible y que el contrato
 * de ambas respuestas conserva los campos congelados (si cambia, hay que regenerar
 * el fixture y la baseline).
 *
 * Datos: lote #296 (ACTIVO, "Bovino Qa Je", finca del Productor de prueba):
 * cantidad 10/10, peso promedio 25 → 2,5 kg, biomasa 25, densidad 0,01.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_123_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_LOTE = 296;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_123_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_ACTIVO = (url: URL) => url.pathname.endsWith(`/activos-biologicos/${ID_LOTE}`);
const URL_FICHA = (url: URL) => url.pathname.endsWith(`/activos-biologicos/${ID_LOTE}/ficha-integral`);

// Respuestas reales del lote #296 (2026-09-29) con las métricas calculadas congeladas
const ACTIVO = {
  id_activo_biologico: 296, id_especie: 40, tipo: 'POBLACIONAL', identificador: null,
  fecha_inicio_ciclo: '2026-06-01', detalles_procedencia: null, origen_financiero: 'nacimiento',
  costo_adquisicion: null, soporte_documental: null, descripcion: 'QAJE-TRF-LOTE10',
  id_infraestructura: 48, atributos_dinamicos: null, id_estado: 1, nombre_estado: 'ACTIVO',
  id_usuario: 1, fecha_creacion: '2026-06-01T08:00:00Z', fecha_actualizacion: null,
  detalle_individual: null,
  detalle_poblacional: {
    id_detalle: 85, cantidad_inicial: 10, cantidad_actual: 10, peso_promedio_inicial: '25.0000',
    peso_promedio: '2.50', biomasa_total: '25.00', densidad: '0.01000000000000000000',
  },
};

const FICHA_INTEGRAL = {
  id_activo_biologico: 296, identificador: null, tipo: 'POBLACIONAL', especie: 'Bovino Qa Je',
  fecha_registro: '2026-06-01', dias_en_sistema: 120, estado_actual: 'ACTIVO',
  infraestructura_asociada: 'Corral QA JE Origen', fase_productiva_activa: 'Ciclo QA JE Bovino',
  raza: null, sexo: null, fecha_nacimiento: null,
  peso_actual: '2.50', unidad_peso: 'kg', fecha_ultimo_peso: '2026-09-19',
  cantidad_actual: 10, biomasa_total: '25.00', densidad: null,
  eventos_sanitarios: [], eventos_productivos: [],
  eventos_crecimiento: [
    { variable: 'PESO', valor: '2.50', unidad: 'kg', fecha: '2026-09-19T16:44:24.705704+00:00' },
    { variable: 'PESO', valor: '2.50', unidad: 'kg', fecha: '2026-09-19T16:33:52.227313+00:00' },
    { variable: 'PESO', valor: '2.50', unidad: 'kg', fecha: '2026-09-19T16:16:41.793778+00:00' },
  ],
  eventos_reproductivos: [], indicadores: [], advertencias: [],
};

const CAMPOS_CONGELADOS = {
  activo: ['cantidad_actual', 'peso_promedio', 'biomasa_total', 'densidad'],
  ficha: ['dias_en_sistema', 'peso_actual', 'cantidad_actual', 'biomasa_total', 'densidad'],
};

// Fechas de eventos formateadas en hora local: se fija la zona horaria para que la baseline sea estable
test.use({ timezoneId: 'America/Bogota', locale: 'es-CO' });

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** Congela las dos consultas de la ficha; devuelve cuántas veces se sirvió el fixture. */
async function congelarMetricas(page: Page) {
  const servidas = { activo: 0, ficha: 0 };
  const esApi = (r: { resourceType(): string }) => ['xhr', 'fetch'].includes(r.resourceType());
  await page.route(URL_ACTIVO, (r) => {
    if (!esApi(r.request())) return r.continue();
    servidas.activo++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIVO) });
  });
  await page.route(URL_FICHA, (r) => {
    if (!esApi(r.request())) return r.continue();
    servidas.ficha++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FICHA_INTEGRAL) });
  });
  return servidas;
}

function secciones(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Secciones del activo' });
}

/** Contenedor de la ficha: encabezado + barra de secciones + contenido de la pestaña. */
function contenidoFicha(page: Page): Locator {
  return page.locator('div').filter({ has: secciones(page) }).last();
}

async function abrirLote(page: Page, pestana: 'Ficha integral' | 'Datos') {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  await expect(secciones(page)).toBeVisible({ timeout: 20_000 });
  await secciones(page).getByRole('button', { name: pestana, exact: true }).click();
}

/**
 * Deja la ficha lista para capturar: fuentes cargadas y viewport con la altura
 * suficiente para que la ficha completa quede renderizada (la ficha integral es
 * más alta que el viewport y el contenedor con scroll recorta lo que no se ve).
 * Se conserva el ancho del proyecto.
 */
async function prepararCaptura(page: Page) {
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 14px "Plus Jakarta Sans"'),
      document.fonts.load('700 20px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
  });
  const caja = await contenidoFicha(page).boundingBox();
  const viewport = page.viewportSize();
  if (caja && viewport) {
    const alto = Math.ceil(caja.y + caja.height + 40);
    if (alto > viewport.height) await page.setViewportSize({ width: viewport.width, height: alto });
  }
}

test.describe('TC-DIS-123 - Consistencia visual - Ficha del lote (RF-36)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionProductor(page);
  });

  test('0. Precondición - el lote real sigue accesible y conserva los campos congelados', async ({ page }) => {
    const activo = page.waitForResponse((r) => URL_ACTIVO(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
    const ficha = page.waitForResponse((r) => URL_FICHA(new URL(r.url())));
    await page.goto(`/activos-biologicos/${ID_LOTE}`);
    const [ra, rf] = await Promise.all([activo, ficha]);
    expect(ra.status(), `BLOQUEO: GET /activos-biologicos/${ID_LOTE} no responde 200 para el Productor`).toBe(200);
    expect(rf.status(), `BLOQUEO: GET /activos-biologicos/${ID_LOTE}/ficha-integral no responde 200 para el Productor`).toBe(200);

    const real = { activo: (await ra.json()).detalle_poblacional ?? {}, ficha: await rf.json() };
    for (const campo of CAMPOS_CONGELADOS.activo) {
      expect(real.activo, `detalle_poblacional.${campo} ya no viene en la respuesta: regenerar fixture`).toHaveProperty(campo);
    }
    for (const campo of CAMPOS_CONGELADOS.ficha) {
      expect(real.ficha, `ficha-integral.${campo} ya no viene en la respuesta: regenerar fixture`).toHaveProperty(campo);
    }
  });

  test('1. Pestaña "Ficha integral" con métricas congeladas', async ({ page }) => {
    const servidas = await congelarMetricas(page);
    await abrirLote(page, 'Ficha integral');
    await expect(page.getByText(FICHA_INTEGRAL.especie).first()).toBeVisible();
    await expect(page.getByText(FICHA_INTEGRAL.fase_productiva_activa).first()).toBeVisible();
    expect(servidas.ficha, 'La ficha integral debe servirse desde el fixture congelado').toBeGreaterThan(0);
    await prepararCaptura(page);

    await expect(contenidoFicha(page)).toHaveScreenshot('ficha-lote-integral.png', { animations: 'disabled' });
  });

  test('2. Pestaña "Datos" con métricas congeladas', async ({ page }) => {
    const servidas = await congelarMetricas(page);
    await abrirLote(page, 'Datos');
    await expect(page.getByText('Cantidad actual', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Biomasa total', { exact: true }).first()).toBeVisible();
    expect(servidas.activo, 'Los datos del lote deben servirse desde el fixture congelado').toBeGreaterThan(0);
    await prepararCaptura(page);

    await expect(contenidoFicha(page)).toHaveScreenshot('ficha-lote-datos.png', { animations: 'disabled' });
  });
});
