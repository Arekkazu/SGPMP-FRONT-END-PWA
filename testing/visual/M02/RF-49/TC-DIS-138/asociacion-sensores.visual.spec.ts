/**
 * TC-DIS-138 — Consistencia visual del formulario de Asociación de Sensores IoT
 * RF-49 · CU-11 Asociar Sensores IoT al Activo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Sensores" → "Asociar sensor"
 *
 * Baselines (tarjeta del modal o tarjeta de la sección, sin el fondo):
 *   - Formulario con asociación DIRECTA (activo individual #297).
 *   - Formulario con asociación POBLACIONAL (lote #296).
 *   - Advertencia por dispositivo desconectado tras asociar (201 con warning, SIMULADO).
 *   - AMBIENTAL: BLOQUEO. El formulario del activo no ofrece ese tipo a propósito
 *     (types.ts: "AMBIENTAL no se soporta desde este DTO (issue #351 backend)": se ancla a
 *     la infraestructura y el backend la rechaza con 400). El test verifica la opción y
 *     falla mientras no exista; entonces genera su baseline.
 *
 * PROTECCIÓN DE DATOS: todo POST /activos-biologicos/{id}/sensores se aborta o se responde
 * con el 201 simulado; no se crea ninguna asociación.
 *
 * Móvil: el modal tiene scroll interno (max-height 90vh); antes de capturar se amplía el
 * alto de la ventana, conservando el ancho, para que el formulario completo quede visible.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_138_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ORIGEN = 'Corral QA JE Origen'; // infraestructura #48 de ambos activos
const ESCENARIOS = [
  { tipo: 'DIRECTA', idActivo: 297, tipoActivo: 'INDIVIDUAL', descripcion: 'activo individual #297' },
  { tipo: 'POBLACIONAL', idActivo: 296, tipoActivo: 'LOTE', descripcion: 'lote #296' },
] as const;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_138_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_SENSORES = (url: URL) => /\/activos-biologicos\/\d+\/sensores$/.test(url.pathname);

// 201 SIMULADO con advertencia de dispositivo desconectado
const EXITO_CON_ADVERTENCIA = {
  id_asociacion: 999001, id_activo_biologico: 296, sensor_id: 12, dispositivo_iot_id: 5,
  id_infraestructura: 48, tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL',
  estado_asociacion: 'ACTIVA', fecha_inicio: '2026-09-30T00:00:00Z', fecha_fin: null,
  advertencia: 'El dispositivo IoT #5 está desconectado (última transmisión hace más de 24 h). La asociación se registró, pero no recibirá lecturas hasta que el dispositivo se reconecte.',
};

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Asociar sensor IoT' });
}

/** Tarjeta de la sección "Sensores IoT" con el mensaje de resultado. */
function tarjetaSeccion(page: Page): Locator {
  return page.locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Sensores IoT' }) })
    .filter({ has: page.getByRole('alert') })
    .last();
}

/**
 * El modal tiene max-height 90vh con scroll interno: en móvil el formulario no cabe y la
 * captura cortaría los últimos campos y los botones. Se amplía el alto de la ventana
 * (conservando el ancho del proyecto) hasta que el modal completo quepa sin scroll.
 */
async function ajustarAltoParaModal(page: Page) {
  const alto = await dialogo(page).locator('> div').evaluate((e) => e.scrollHeight);
  const viewport = page.viewportSize();
  if (!viewport) return;
  const necesario = Math.ceil(alto / 0.9) + 40;
  if (necesario > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: necesario });
    await expect.poll(() => dialogo(page).locator('> div').evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
  }
}

async function abrirFormulario(page: Page, idActivo: number) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  // Esperar la ficha: la infraestructura del activo se precarga en el formulario al abrirlo
  await expect(page.getByText(ORIGEN).first()).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Sensores', exact: true }).click();
  await page.getByRole('button', { name: 'Asociar sensor', exact: true }).first().click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page).getByLabel(/ID infraestructura/i)).toHaveValue('48');
}

async function capturar(page: Page, objetivo: Locator, nombre: string) {
  // Sin foco ni hover: el cursor queda donde se hizo el último clic
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(objetivo).toHaveScreenshot(nombre, { animations: 'disabled' });
}

test.describe('TC-DIS-138 - Consistencia visual - Asociación de sensores IoT (RF-49)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_138_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    // Ninguna asociación llega al backend
    await page.route(URL_SENSORES, (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  for (const esc of ESCENARIOS) {
    test(`1. Formulario con asociación ${esc.tipo} (${esc.descripcion})`, async ({ page }) => {
      await abrirFormulario(page, esc.idActivo);
      await expect(dialogo(page).getByLabel(/Tipo de activo/)).toHaveValue(esc.tipoActivo);
      await expect(dialogo(page).getByLabel(/Tipo de asociación/)).toHaveValue(esc.tipo);
      await ajustarAltoParaModal(page);
      await capturar(page, dialogo(page).locator('> div'), `asociacion-${esc.tipo.toLowerCase()}.png`);
    });
  }

  test('1. Formulario con asociación AMBIENTAL', async ({ page }, testInfo) => {
    await abrirFormulario(page, 296);
    const opciones = await dialogo(page).getByLabel(/Tipo de asociación/).locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    testInfo.annotations.push({ type: 'Tipos de asociación ofrecidos', description: opciones.join(', ') });
    expect(
      opciones,
      'BLOQUEO: el formulario del activo no ofrece AMBIENTAL (excluido a propósito, types.ts: "issue #351 backend"; se ancla a la infraestructura y el backend la rechaza con 400). No hay formulario AMBIENTAL que capturar.',
    ).toContain('AMBIENTAL');
    await dialogo(page).getByLabel(/Tipo de asociación/).selectOption('AMBIENTAL');
    await ajustarAltoParaModal(page);
    await capturar(page, dialogo(page).locator('> div'), 'asociacion-ambiental.png');
  });

  test('2. Advertencia por dispositivo desconectado (201 con warning, simulado)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '201 con advertencia de dispositivo desconectado inyectado; no se crea ninguna asociación.' });
    await page.route(URL_SENSORES, (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(EXITO_CON_ADVERTENCIA) })
        : r.continue());
    await abrirFormulario(page, 296);
    await dialogo(page).getByLabel(/ID dispositivo IoT/i).fill('5');
    await dialogo(page).getByLabel(/ID sensor/i).fill('12');
    await dialogo(page).getByRole('button', { name: 'Asociar sensor', exact: true }).click();
    await expect(dialogo(page)).toBeHidden();
    await expect(page.getByRole('alert').filter({ hasText: 'desconectado' })).toBeVisible();
    await capturar(page, tarjetaSeccion(page), 'asociacion-advertencia-desconectado.png');
  });
});
