/**
 * TC-DIS-135 — Consistencia visual del formulario de Transferencia Interna
 * RF-48 · CU-10 Gestionar Transferencias y Consultar Historial · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Infraestructura" → "Transferir"
 *
 * Baselines (solo la tarjeta del modal, sin el fondo):
 *   - Formulario recién abierto (sin destino elegido).
 *   - Lista de destinos ya filtrada por compatibilidad, con el destino compatible elegido.
 *   - Error por capacidad excedida (422 SIMULADO).
 *
 * Datos: lote #296 (ACTIVO, 10 animales) en "Corral QA JE Origen" (#48). La finca tiene
 * otras infraestructuras: "Corral QA JE Capacidad" (#47, cap. 50) y el estanque
 * "Estanque QA JE Piscicola" (#52); para este lote el backend solo ofrece
 * "Corral QA JE Destino OK" (#51, cap. 200). El test "0" lo verifica contra el
 * ambiente real. Para las baselines, GET …/transferencias/disponibles se sirve con la
 * respuesta real capturada el 2026-09-29 (así no dependen de cambios de ocupación).
 *
 * El select nativo no se puede capturar desplegado: el filtrado se valida por DOM
 * (opciones = destinos compatibles) y se captura con el destino elegido.
 *
 * PROTECCIÓN DE DATOS: todo POST …/transferencias se aborta o se responde con el 422
 * simulado; ningún activo se transfiere.
 *
 * Fecha: "Fecha de transferencia" se precarga con el día actual; se fija el reloj del
 * navegador (29-09-2026, America/Bogota) para que la baseline sea estable.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida) y cualquiera puede cambiarla;
 * GET /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_135_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_ACTIVO = 296;
const ID_DESTINO_COMPATIBLE = 51;
const IDS_NO_COMPATIBLES = [47, 52];
const FECHA_FIJA = new Date('2026-09-29T12:00:00-05:00');

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_135_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_TRANSFERENCIA = (url: URL) => /\/activos-biologicos\/\d+\/transferencias$/.test(url.pathname);
const URL_DISPONIBLES = (url: URL) => url.pathname.endsWith(`/activos-biologicos/${ID_ACTIVO}/transferencias/disponibles`);

// Respuesta real de GET /activos-biologicos/296/transferencias/disponibles (2026-09-29)
const DISPONIBLES = [
  { id_infraestructura: 51, nombre: 'Corral QA JE Destino OK', tipo: 'Corral', capacidad_maxima: 200, id_especie: 40 },
];

// 422 SIMULADO con el formato estándar del backend (error_code a confirmar con desarrollo)
const ERROR_CAPACIDAD = {
  error_code: 'CAPACIDAD_EXCEDIDA',
  message: 'La infraestructura destino no tiene capacidad suficiente: capacidad_max 200, ocupacion_actual 195, cantidad a transferir 10.',
  fields: [{ field: 'infraestructura_destino_id', message: 'Capacidad excedida: capacidad_max 200, ocupacion_actual 195.' }],
};

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

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
  return page.getByRole('dialog', { name: 'Transferencia interna' });
}

function tarjeta(page: Page): Locator {
  return dialogo(page).locator('> div');
}

function selectDestino(page: Page): Locator {
  return dialogo(page).getByRole('combobox', { name: /Infraestructura destino/ });
}

/** Ficha del activo → "Infraestructura" → "Transferir"; devuelve la respuesta de disponibles. */
async function abrirFormulario(page: Page) {
  await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Infraestructura', exact: true }).click();
  await expect(page.getByText('Corral QA JE Origen').first(), 'Precondición: el activo debe tener asociación activa (origen)').toBeVisible({ timeout: 20_000 });
  const disponibles = page.waitForResponse((r) => URL_DISPONIBLES(new URL(r.url())));
  await page.getByRole('button', { name: /Transferir/ }).first().click();
  await expect(dialogo(page)).toBeVisible();
  const r = await disponibles;
  await expect(selectDestino(page)).toBeEnabled();
  return r;
}

async function capturar(page: Page, nombre: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(tarjeta(page)).toHaveScreenshot(nombre, { animations: 'disabled' });
}

test.describe('TC-DIS-135 - Consistencia visual - Transferencia interna (RF-48)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_135_VIEWPORTS.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    // Ninguna transferencia llega al backend
    await page.route(URL_TRANSFERENCIA, (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await fijarTemaClaro(page);
    await iniciarSesionProductor(page);
  });

  test('0. Precondición - el backend filtra los destinos por compatibilidad', async ({ page }, testInfo) => {
    const r = await abrirFormulario(page);
    expect(r.status()).toBe(200);
    const ids = (await r.json()).map((d: { id_infraestructura: number }) => d.id_infraestructura);
    testInfo.annotations.push({ type: 'Destinos reales', description: ids.join(', ') });
    expect(ids, `El destino compatible #${ID_DESTINO_COMPATIBLE} debe ofrecerse`).toContain(ID_DESTINO_COMPATIBLE);
    for (const id of IDS_NO_COMPATIBLES) expect(ids, `La infraestructura no compatible #${id} no debe ofrecerse`).not.toContain(id);
  });

  test.describe('con destinos fijados', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Destinos disponibles servidos con la respuesta real del 2026-09-29; fecha fijada en 29-09-2026.' });
      await page.route(URL_DISPONIBLES, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DISPONIBLES) }));
      // Después del login: la fecha precargada del formulario queda fija
      await page.clock.setFixedTime(FECHA_FIJA);
    });

    test('1. Formulario recién abierto', async ({ page }) => {
      await abrirFormulario(page);
      await expect(selectDestino(page)).toHaveValue('');
      await capturar(page, 'transferencia-formulario.png');
    });

    test('2. Destinos filtrados por compatibilidad (destino compatible elegido)', async ({ page }) => {
      await abrirFormulario(page);
      const opciones = await selectDestino(page).locator('option').evaluateAll((os) =>
        os.map((o) => Number((o as HTMLOptionElement).value)).filter(Boolean));
      expect(opciones, 'El select solo debe ofrecer los destinos compatibles').toEqual(DISPONIBLES.map((d) => d.id_infraestructura));

      await selectDestino(page).selectOption(String(ID_DESTINO_COMPATIBLE));
      await dialogo(page).getByRole('textbox', { name: /Motivo de la transferencia/ }).fill('Rotación de corrales por mantenimiento (QA TC-DIS-135)');
      await capturar(page, 'transferencia-destinos-filtrados.png');
    });

    test('3. Error por capacidad excedida (simulado)', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos simulados', description: '422 de capacidad excedida inyectado (error_code a confirmar con desarrollo).' });
      await page.route(URL_TRANSFERENCIA, (r) =>
        r.request().method() === 'POST'
          ? r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify(ERROR_CAPACIDAD) })
          : r.continue());
      await abrirFormulario(page);
      await selectDestino(page).selectOption(String(ID_DESTINO_COMPATIBLE));
      await dialogo(page).getByRole('textbox', { name: /Motivo de la transferencia/ }).fill('Rotación de corrales por mantenimiento (QA TC-DIS-135)');
      await dialogo(page).getByRole('button', { name: 'Transferir', exact: true }).click();
      await expect(dialogo(page).getByRole('alert').filter({ hasText: 'No se pudo transferir' })).toContainText('capacidad_max 200');
      await capturar(page, 'transferencia-error-capacidad.png');
    });
  });
});
