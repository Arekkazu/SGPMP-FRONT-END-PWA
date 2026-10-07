/**
 * TC-DIS-129 — Consistencia visual del formulario de Registro de Baja y su paso de confirmación
 * RF-45 · CU-09 Registrar Eventos Productivos y Bajas · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Baja"
 *
 * Baselines (solo la tarjeta del modal, sin el fondo):
 *   - Formulario de baja TOTAL del lote (cantidad afectada vacía).
 *   - Formulario de baja PARCIAL del lote (cantidad afectada = 3).
 *   - Paso de confirmación "Confirma la baja" (resumen dentro del mismo diálogo; existe desde
 *     la corrección del defecto de TC-DIS-128).
 *
 * Datos: lote #296 (POBLACIONAL, ACTIVO, 10 animales) del Productor de prueba.
 *
 * PROTECCIÓN DE DATOS: la baja es IRREVERSIBLE. Todo POST …/eventos/baja se aborta; ningún
 * test pulsa "Confirmar baja".
 *
 * Una baseline solo se guarda si la vista no tiene defectos: el ancho del modal según el
 * breakpoint del DS v2.0 (bottom sheet en xs/sm, máx. 480px en md, máx. 560px en lg), las
 * etiquetas de los campos (`.ds-field__label`: 12px / 600 / --text-secondary) y el tamaño del
 * texto del resumen (escala del DS) se verifican antes de capturar y fallan como DEFECTO.
 * Si el modal supera el alto de la ventana, se amplía el alto conservando el ancho.
 *
 * Fecha: "Fecha de baja" se precarga con el día actual; se fija el reloj del navegador
 * (29-09-2026, America/Bogota) para que la baseline sea estable.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_129_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_LOTE = 296;
const FECHA_FIJA = new Date('2026-09-29T12:00:00-05:00');
const MOTIVO = 'Mortalidad por golpe de calor (QA TC-DIS-129)';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_129_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_BAJA = (url: URL) => /\/activos-biologicos\/\d+\/eventos\/baja$/.test(url.pathname);

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

// DS v2.0: etiqueta de campo (.ds-field__label) y escala tipográfica
const CAMPOS = ['Tipo de baja', 'Fecha de baja', 'Cantidad afectada', 'Motivo de la baja'];
const ESCALA = [11, 12, 14, 15, 16, 20, 28];

test.use({ timezoneId: 'America/Bogota', locale: 'es-CO' });

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Registrar baja' });
}

/** Tarjeta de un diálogo (sin el fondo semitransparente que cubre la página). */
function tarjeta(dlg: Locator): Locator {
  return dlg.locator('> div');
}

async function abrirFormulario(page: Page) {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
  const baja = page.getByRole('button', { name: 'Baja', exact: true });
  await expect(baja).toBeEnabled({ timeout: 20_000 });
  await baja.click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page).getByRole('spinbutton', { name: /Cantidad afectada/ }), 'El lote debe mostrar "Cantidad afectada"').toBeVisible();
}

/** Completa el formulario; cantidad vacía = baja total del lote. */
async function llenar(page: Page, cantidad: string) {
  const d = dialogo(page);
  await d.getByRole('combobox', { name: /Tipo de baja/ }).selectOption('muerte');
  await d.getByRole('spinbutton', { name: /Cantidad afectada/ }).fill(cantidad);
  await d.getByRole('textbox', { name: /Motivo de la baja/ }).fill(MOTIVO);
}

// ── Verificaciones previas a la captura ──────────────────────────────────────

/** DEFECTO si la tarjeta del modal no respeta el breakpoint del DS v2.0. */
async function verificarBreakpoint(page: Page) {
  const nombre = test.info().project.name;
  const viewport = page.viewportSize()!;
  const caja = (await tarjeta(dialogo(page)).boundingBox())!;
  test.info().annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · ${Math.round(caja.width)}×${Math.round(caja.height)} · y ${Math.round(caja.y)}` });
  if (viewport.width < 768) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
    expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${nombre} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
  } else if (viewport.width < 1200) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, md) el modal debe medir máximo 480px`).toBeLessThanOrEqual(480);
  } else {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px (se queda en el máximo de md)`).toBe(560);
  }
}

/** DEFECTO si las etiquetas de los campos no usan el estilo de etiqueta del DS (12px / 600 / --text-secondary). */
async function verificarEtiquetas(page: Page) {
  const resultado = await dialogo(page).evaluate((d, campos) => {
    const ref = document.createElement('span');
    ref.style.color = 'var(--text-secondary)';
    document.body.appendChild(ref);
    const secundario = getComputedStyle(ref).color;
    ref.remove();
    return campos.map((campo) => {
      const label = [...d.querySelectorAll('label')].find((l) => (l.textContent ?? '').replace('*', '').trim() === campo);
      if (!label) return { campo, estilo: 'sin <label>', ok: false };
      const cs = getComputedStyle(label);
      return { campo, estilo: `${cs.fontSize} / ${cs.fontWeight}`, ok: cs.fontSize === '12px' && cs.fontWeight === '600' && cs.color === secundario };
    });
  }, CAMPOS);
  const distintas = resultado.filter((r) => !r.ok);
  expect.soft(
    distintas.map((r) => r.campo),
    `DEFECTO: etiquetas fuera del estilo de etiqueta del DS (.ds-field__label 12px / 600 / --text-secondary): ${distintas.map((r) => `"${r.campo}" ${r.estilo}`).join(' · ')}; en el mismo formulario conviven dos estilos de etiqueta`,
  ).toEqual([]);
}

/** DEFECTO si el texto del resumen de confirmación usa un tamaño fuera de la escala del DS v2.0. */
async function verificarResumen(page: Page) {
  const tamanos = await dialogo(page).locator('dl dt, dl dd').evaluateAll((els) => [...new Set(els.map((e) => parseFloat(getComputedStyle(e).fontSize)))]);
  const fuera = tamanos.filter((t) => !ESCALA.includes(t));
  expect.soft(fuera, `DEFECTO: el resumen "Confirma la baja" usa ${fuera.join(', ')}px, fuera de la escala del DS v2.0 (texto UI = body-md 14px)`).toEqual([]);
}

/** Amplía el alto de la ventana (conservando el ancho) si la tarjeta no cabe completa. */
async function ajustarAlto(page: Page) {
  const viewport = page.viewportSize()!;
  const alto = await tarjeta(dialogo(page)).evaluate((e) => e.scrollHeight);
  const necesario = Math.ceil(alto / 0.9) + 64; // la tarjeta tiene max-height 90vh
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
}

/** Captura la tarjeta del modal. Sin baseline si hay defectos. */
async function capturar(page: Page, nombre: string) {
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  await ajustarAlto(page);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(tarjeta(dialogo(page))).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-129 - Consistencia visual - Registro de baja (RF-45)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_129_VIEWPORTS.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    // Acción irreversible: ninguna baja llega al backend
    await page.route(URL_BAJA, (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await fijarTemaClaro(page);
    await iniciarSesionProductor(page);
    // Después del login: la fecha precargada del formulario queda fija
    await page.clock.setFixedTime(FECHA_FIJA);
  });

  test('1. Formulario de baja total del lote (cantidad vacía)', async ({ page }) => {
    await abrirFormulario(page);
    await llenar(page, '');
    await verificarBreakpoint(page);
    await verificarEtiquetas(page);
    await capturar(page, 'registro-baja-total.png');
  });

  test('1. Formulario de baja parcial del lote (cantidad = 3)', async ({ page }) => {
    await abrirFormulario(page);
    await llenar(page, '3');
    await verificarBreakpoint(page);
    await verificarEtiquetas(page);
    await capturar(page, 'registro-baja-parcial.png');
  });

  test('2. Paso de confirmación "Confirma la baja"', async ({ page }) => {
    let enviadas = 0;
    page.on('request', (r) => { if (r.method() === 'POST' && URL_BAJA(new URL(r.url()))) enviadas++; });
    await abrirFormulario(page);
    await llenar(page, '3');
    await dialogo(page).getByRole('button', { name: 'Registrar baja', exact: true }).click();
    await expect(dialogo(page).getByRole('heading', { name: 'Confirma la baja' }), 'Debe mostrarse el paso de confirmación').toBeVisible();
    await expect(dialogo(page).getByRole('button', { name: 'Confirmar baja', exact: true })).toBeVisible();
    expect(enviadas, 'Mostrar la confirmación no debe enviar la baja').toBe(0);

    await verificarBreakpoint(page);
    await verificarResumen(page);
    await capturar(page, 'registro-baja-confirmacion.png');
  });
});
