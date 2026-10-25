/**
 * TC-DIS-126 — Consistencia visual del formulario de Cambio de Estado
 * RF-44 · CU-04 Cerrar Ciclo Productivo (formulario de cambio de estado) · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Estado" → "Cambiar estado"
 *
 * Baselines: una por estado de origen relevante (ACTIVO, INACTIVO, EN_TRATAMIENTO,
 * AISLADO, CERRADO), porque las opciones del select cambian según la matriz de
 * transiciones. Se captura solo la tarjeta del modal.
 *
 * Datos (activos del Productor de prueba):
 *   - ACTIVO: #296 (real) · INACTIVO: #468 (real) · CERRADO: #288 (real).
 *   - EN_TRATAMIENTO y AISLADO: el Productor no tiene activos en esos estados y
 *     provocarlos exige un cambio de estado real (con historial permanente). Se usa el
 *     #296 con el estado sobrescrito en las respuestas de la ficha (page.route sobre la
 *     respuesta real; solo cambia el estado), marcado como datos simulados.
 * El formulario nunca se envía y todo PATCH de estado se aborta por seguridad.
 *
 * Fecha: el campo "Fecha del cambio" se precarga con el día actual; se fija el reloj
 * del navegador (29-09-2026, America/Bogota) para que la baseline sea estable.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_126_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_126_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const FECHA_FIJA = new Date('2026-09-29T12:00:00-05:00');
const URL_ESTADO = (url: URL) => /\/activos-biologicos\/\d+\/estado$/.test(url.pathname);

type Estado = 'ACTIVO' | 'INACTIVO' | 'EN_TRATAMIENTO' | 'AISLADO' | 'CERRADO';

interface Escenario {
  estado: Estado;
  idActivo: number;
  simulado: boolean;
  /** Opciones esperadas del select (matriz de transiciones sin CERRADO/BAJA, RF-44). */
  opciones: string[];
  etiqueta: string;
}

const ESCENARIOS: Escenario[] = [
  { estado: 'ACTIVO', idActivo: 296, simulado: false, opciones: ['Inactivo', 'En tratamiento', 'Aislado'], etiqueta: 'Activo' },
  { estado: 'INACTIVO', idActivo: 468, simulado: false, opciones: ['Activo', 'En tratamiento'], etiqueta: 'Inactivo' },
  { estado: 'EN_TRATAMIENTO', idActivo: 296, simulado: true, opciones: ['Activo', 'Inactivo', 'Aislado'], etiqueta: 'En tratamiento' },
  { estado: 'AISLADO', idActivo: 296, simulado: true, opciones: ['Activo', 'Inactivo', 'En tratamiento'], etiqueta: 'Aislado' },
  { estado: 'CERRADO', idActivo: 288, simulado: false, opciones: [], etiqueta: 'Cerrado' },
];

test.use({ timezoneId: 'America/Bogota', locale: 'es-CO' });

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** Sobrescribe solo el estado en las respuestas reales de la ficha del activo. */
async function simularEstado(page: Page, idActivo: number, estado: Estado) {
  const esApi = (tipo: string) => ['xhr', 'fetch'].includes(tipo);
  await page.route((url) => url.pathname.endsWith(`/activos-biologicos/${idActivo}/ficha-integral`), async (r) => {
    const real = await r.fetch();
    return r.fulfill({ response: real, json: { ...(await real.json()), estado_actual: estado } });
  });
  await page.route((url) => url.pathname.endsWith(`/activos-biologicos/${idActivo}`), async (r) => {
    if (!esApi(r.request().resourceType()) || r.request().method() !== 'GET') return r.continue();
    const real = await r.fetch();
    return r.fulfill({ response: real, json: { ...(await real.json()), nombre_estado: estado } });
  });
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Cambiar estado del activo' });
}

/** Tarjeta del modal (sin el fondo semitransparente que cubre la página). */
function tarjetaModal(page: Page): Locator {
  return dialogo(page).locator('> div');
}

async function abrirFormulario(page: Page, esc: Escenario) {
  await page.goto(`/activos-biologicos/${esc.idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Estado', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar estado', exact: true }).click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page).getByText(esc.etiqueta, { exact: true }), `El estado actual debe ser ${esc.estado}`).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.describe('TC-DIS-126 - Consistencia visual - Formulario de cambio de estado (RF-44)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    // El formulario nunca se envía; cualquier PATCH de estado se aborta por seguridad
    await page.route(URL_ESTADO, (r) => (r.request().method() === 'PATCH' ? r.abort() : r.continue()));
    await iniciarSesionProductor(page);
    // Después del login: la fecha precargada del formulario queda fija
    await page.clock.setFixedTime(FECHA_FIJA);
  });

  for (const esc of ESCENARIOS) {
    const nombre = esc.estado.toLowerCase().replace('_', '-');

    test(`Estado de origen ${esc.estado}${esc.simulado ? ' (simulado)' : ''} - activo #${esc.idActivo}`, async ({ page }, testInfo) => {
      if (esc.simulado) {
        testInfo.annotations.push({ type: 'Datos simulados', description: `Activo #${esc.idActivo} real con el estado sobrescrito a ${esc.estado} en la ficha; no se cambia ningún estado.` });
        await simularEstado(page, esc.idActivo, esc.estado);
      }
      await abrirFormulario(page, esc);

      if (esc.opciones.length) {
        const opciones = await dialogo(page).getByRole('combobox', { name: /Nuevo estado/ }).locator('option').allInnerTexts();
        expect(opciones.slice(1).map((o) => o.trim()), `El select debe mostrar las transiciones válidas desde ${esc.estado}`).toEqual(esc.opciones);
      } else {
        await expect(dialogo(page).getByRole('combobox')).toHaveCount(0);
        await expect(dialogo(page).getByText('Sin transiciones disponibles', { exact: true })).toBeVisible();
      }

      await expect(tarjetaModal(page)).toHaveScreenshot(`cambio-estado-${nombre}.png`, { animations: 'disabled' });
    });
  }
});
