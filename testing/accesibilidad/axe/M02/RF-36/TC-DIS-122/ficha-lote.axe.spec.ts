/**
 * TC-DIS-122 — Accesibilidad WCAG 2.1 AA de la ficha de gestión del lote
 * RF-36 · CU-03 Gestionar Activo Poblacional (Lote) · Rol: Administrador
 * Activos biológicos → ficha del lote: "Ficha integral" y "Datos" (datos estructurales,
 * valores iniciales y métricas calculadas) + "Eventos" (formulario de crecimiento)
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * Datos: lote #353 (activo, especie #4): cantidad 100/100, peso promedio 10 → 12,5,
 * biomasa 1250, densidad 0,2.
 *
 * Errores:
 *   - 404 real (lote inexistente) e identificador inválido en la ruta.
 *   - 409 densidad excedida: SIMULADO. Se dispara registrando un evento (crecimiento),
 *     y los eventos son registros permanentes que además recalculan las métricas del
 *     lote; ni la documentación OpenAPI ni el frontend exponen el error_code real, así
 *     que se inyecta un 409 con el formato estándar del backend (a confirmar con
 *     desarrollo). Ningún test registra eventos en el ambiente.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_122_VIEWPORTS=movil,tablet,escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-122';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_LOTE = Number(process.env.TC_DIS_122_LOTE ?? 353);

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_122_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_CRECIMIENTO = (url: URL) => /\/activos-biologicos\/\d+\/eventos\/crecimiento$/.test(url.pathname);

const VALORES_INICIALES = ['Cantidad inicial', 'Peso promedio inicial'];
const METRICAS_CALCULADAS = ['Cantidad actual', 'Peso promedio', 'Biomasa total', 'Densidad'];

// 409 SIMULADO con el formato estándar del backend (error_code a confirmar con desarrollo)
const ERROR_409_DENSIDAD = {
  error_code: 'DENSIDAD_EXCEDIDA',
  message: 'La densidad resultante del lote supera la capacidad máxima configurada para el área productiva.',
  fields: [],
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

function secciones(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Secciones del activo' });
}

/** Ficha del lote en la pestaña indicada. */
async function abrirLote(page: Page, pestana: 'Ficha integral' | 'Datos' | 'Eventos') {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  await expect(secciones(page)).toBeVisible({ timeout: 20_000 });
  await secciones(page).getByRole('button', { name: pestana, exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
}

/** Abre el formulario "Registrar evento de crecimiento" y lo llena con valores válidos. */
async function abrirFormularioCrecimiento(page: Page) {
  await abrirLote(page, 'Eventos');
  await page.getByRole('button', { name: 'Crecimiento', exact: true }).click();
  const registrar = page.getByRole('button', { name: 'Registrar', exact: true });
  await expect(registrar).toBeVisible();

  const tipo = page.getByRole('combobox', { name: /Tipo de medición/ });
  await expect(tipo.locator('option').nth(1), 'La especie del lote debe tener métricas de producción configuradas').toBeAttached();
  await tipo.selectOption({ index: 1 });
  const unidad = page.getByRole('combobox', { name: /Unidad de medida/ });
  if (await unidad.count()) {
    if ((await unidad.inputValue()) === '') await unidad.selectOption({ index: 1 });
  } else {
    await page.getByRole('textbox', { name: /Unidad de medida/ }).fill('kg');
  }
  const valor = page.getByRole('spinbutton', { name: /^Valor/ });
  await valor.fill('13');
  return { registrar, valor };
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

  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Ficha de gestión del lote (RF-36)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
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
  });

  test('1-2. Ficha integral del lote - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await abrirLote(page, 'Ficha integral');
    await expect(page.getByText(/Biomasa/i).first(), 'La ficha integral debe mostrar las métricas del lote').toBeVisible({ timeout: 20_000 });

    await escanear(page, 'ficha-integral', testInfo);
  });

  test('1-2. Datos del lote (estructurales, iniciales y calculados) - 0 violaciones axe A/AA y 1.3.1', async ({ page }, testInfo) => {
    await abrirLote(page, 'Datos');
    await expect(page.getByRole('heading', { name: /Detalle poblacional/i })).toBeVisible({ timeout: 20_000 });
    for (const etiqueta of [...VALORES_INICIALES, ...METRICAS_CALCULADAS]) {
      await expect(page.getByText(etiqueta, { exact: true }).first(), `Precondición: la ficha debe mostrar "${etiqueta}"`).toBeVisible();
    }

    await escanear(page, 'datos-lote', testInfo);

    // 1.3.1: valores iniciales de referencia y métricas calculadas deben diferenciarse
    // estructuralmente (grupos con encabezado o rótulo propio), no solo por el texto de cada etiqueta
    const grupoCalculadas = await page.getByRole('heading', { name: /calculad|métricas/i }).count()
      + await page.getByRole('group', { name: /calculad|métricas/i }).count()
      + await page.getByRole('region', { name: /calculad|métricas/i }).count();
    const grupoIniciales = await page.getByRole('heading', { name: /inicial|referencia/i }).count()
      + await page.getByRole('group', { name: /inicial|referencia/i }).count();
    testInfo.annotations.push({ type: 'Agrupación', description: `grupos de métricas calculadas: ${grupoCalculadas} · grupos de valores iniciales: ${grupoIniciales}` });
    expect.soft(grupoCalculadas, '1.3.1: las métricas calculadas (cantidad actual, peso promedio, biomasa, densidad) no se distinguen estructuralmente de los valores iniciales; todo está en un único bloque "Detalle poblacional"').toBeGreaterThan(0);
    expect.soft(grupoIniciales, '1.3.1: los valores iniciales de referencia no tienen un grupo propio').toBeGreaterThan(0);

    // 1.3.1: cada etiqueta debe asociarse a su valor (p. ej. <dl>/<dt>/<dd>)
    const listasDescriptivas = await page.locator('dl').count();
    expect.soft(listasDescriptivas, '1.3.1: etiqueta y valor de cada dato son dos <div> sin relación semántica (no hay <dl>/<dt>/<dd>)').toBeGreaterThan(0);
  });

  test('3. Campos calculados no editables ni tabulables como inputs (4.1.2)', async ({ page }, testInfo) => {
    await abrirLote(page, 'Datos');
    await expect(page.getByRole('heading', { name: /Detalle poblacional/i })).toBeVisible({ timeout: 20_000 });

    for (const campo of METRICAS_CALCULADAS) {
      const editable = page.getByRole('textbox', { name: campo, exact: true }).or(page.getByRole('spinbutton', { name: campo, exact: true }));
      await expect(editable, `4.1.2: "${campo}" no debe presentarse como campo editable`).toHaveCount(0);
      const readonly = await page.getByLabel(campo, { exact: true }).evaluateAll((els) =>
        els.filter((e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName) && e.getAttribute('aria-readonly') !== 'true' && !(e as HTMLInputElement).readOnly).length);
      expect(readonly, `4.1.2: "${campo}" es un control de formulario sin aria-readonly/readonly`).toBe(0);
    }

    // Recorrido completo con Tab: ningún foco cae en un valor calculado
    const focos: string[] = [];
    await secciones(page).getByRole('button', { name: 'Datos', exact: true }).focus();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      focos.push(await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        return e ? `${e.tagName}|${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40)}` : 'none';
      }));
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab (25 pasos)', description: focos.join(' → ') });
    const enCalculados = focos.filter((f) => /^(INPUT|TEXTAREA|SELECT)\|/.test(f) || METRICAS_CALCULADAS.some((m) => f.endsWith(`|${m}`)));
    expect(enCalculados, 'Ningún campo calculado debe recibir foco como input de escritura').toEqual([]);
  });

  test('4. Errores: lote inexistente (404 real), identificador inválido y densidad excedida (409 simulado) - anunciados', async ({ page }, testInfo) => {
    await page.goto('/activos-biologicos/999999');
    const alerta404 = page.getByRole('alert').filter({ hasText: 'No se pudo cargar el activo' });
    await expect(alerta404, '3.3.1: el 404 debe anunciarse').toBeVisible({ timeout: 20_000 });
    await expect(alerta404).toContainText('El activo no existe o fue eliminado.');
    await escanear(page, 'error-404', testInfo);

    await page.goto('/activos-biologicos/abc');
    await expect(page.getByRole('alert').filter({ hasText: 'Activo inválido' }), '3.3.1: el identificador inválido debe anunciarse').toBeVisible();

    // 409 densidad excedida (simulado): el formulario no llega al backend
    await page.route(URL_CRECIMIENTO, (r) => r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409_DENSIDAD) }));
    testInfo.annotations.push({ type: 'Datos simulados', description: '409 de densidad excedida inyectado (error_code a confirmar con desarrollo); no se registran eventos.' });
    const { registrar } = await abrirFormularioCrecimiento(page);
    await registrar.click();
    const alerta409 = page.getByRole('alert').filter({ hasText: 'densidad' });
    await expect(alerta409, '3.3.1: el 409 de densidad excedida debe anunciarse').toBeVisible();
    await escanear(page, 'error-409-densidad', testInfo);
  });

  test('5. Teclado - Enter guarda el formulario de eventos igual que el clic', async ({ page }) => {
    // Todas las altas se interceptan (409): el formulario queda abierto y no se registran eventos
    const cuerpos: unknown[] = [];
    await page.route(URL_CRECIMIENTO, (r) => {
      cuerpos.push(r.request().postDataJSON());
      return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409_DENSIDAD) });
    });

    const { registrar, valor } = await abrirFormularioCrecimiento(page);
    await valor.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => cuerpos.length, { message: 'Enter en "Valor" debe enviar el formulario' }).toBe(1);

    await registrar.click();
    await expect.poll(() => cuerpos.length, { message: 'El clic en "Registrar" debe enviar el formulario' }).toBe(2);
    expect(cuerpos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(cuerpos[1]);
  });
});
