// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-293 RF-107: modal de confirmación de las 4 acciones críticas              |
/**
 * TC-DIS-293 — Verificar accesibilidad WCAG 2.1 AA del modal de confirmación de acción crítica (baja de
 * activo, reversión, cierre de período y revocación de credenciales) [CRÍTICO]
 * RF-107 · CU-05 Proveer retroalimentación visual de acciones del sistema · Prioridad: Alta
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.2 (dialog con aria-modal y nombre); 2.4.3 (foco atrapado y
 * devuelto); 2.1.1 (Confirmar y Cancelar por teclado); 1.3.1 (resumen de lo que va a ocurrir y de lo que
 * no se puede deshacer); 3.3.4; 1.4.3. RF-107: el modal no se cierra con Escape ni con clic fuera, solo
 * con Confirmar o Cancelar.
 * Definición del líder (2026-11-18): la acción de integración con SIGCON también es crítica. Hoy la
 * pantalla de Integración no tiene ninguna acción que exporte o envíe a SIGCON (solo la vista previa
 * del documento contable, de lectura), así que no hay modal que revisar: se agrega aquí cuando
 * desarrollo la construya.
 *
 * Datos y protección: ninguna de las 4 acciones se confirma; además el contexto aborta toda escritura.
 *   - Cierre de período: Administrador, período y prevalidación simulados como en M06 TC-DIS-243.
 *   - Revocación: Administrador, clientes de M07 simulados ("QA Cliente Para Revocar 2").
 *   - Baja de activo: Productor, lote TC_DIS_293_ACTIVO_BAJA (por defecto #296, el de M02 TC-DIS-128).
 *   - Reversión: Contador, activo QA-RF82-REVERSION del período 363 (el de M06 TC-DIS-222).
 * Datos_Semilla §10 propone BOV-ESP-001/002 de Finca La Esperanza; se usan los activos que ya
 * funcionan en TEST porque el modal se abre sin confirmar y no los gasta.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_293_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, irAPeriodo, main, precondicion } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionM08, abrirYAuditarDialogo, botonCerrarPeriodo, cerrarConEscape, clicFuera, dialogo, irA, irFinanzas,
  prepararCierre, quitarSimulaciones, reabrir, simularClientes,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-293';
const VIEWPORTS = (process.env.TC_DIS_293_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['modal-cierre', 'modal-baja', 'modal-reversion'];
const ACTIVO_BAJA = Number(process.env.TC_DIS_293_ACTIVO_BAJA ?? 296);

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/**
 * Revisión común de RF-107 sobre un modal crítico: estructura y foco (al abrir), Escape y clic fuera
 * (no deben cerrarlo) y Cancelar con teclado (debe devolver el foco al disparador).
 */
async function revisarModalCritico(page: Page, testInfo: TestInfo, accion: string, disparador: Locator, paso: string | null, resumen: RegExp) {
  const d = await abrirYAuditarDialogo(page, disparador);
  expect(d.abierto, `${accion}: no abre un diálogo de confirmación`).toBe(true);
  if (!d.abierto) return;
  if (paso) await escanear(page, TC_ID, __dirname, paso, testInfo, LH);
  anotar(testInfo, `${accion}: diálogo`, `rol=${d.rol} · aria-modal=${d.ariaModal} · nombre="${d.nombre}" · descripción="${d.descripcion}" · foco inicial: ${d.focoInicial} · botones: ${d.botones.join(' | ')}`);
  expect.soft(d.rol === 'dialog' || d.rol === 'alertdialog', `4.1.2: ${accion} no usa role="dialog"`).toBe(true);
  expect.soft(d.ariaModal, `4.1.2: ${accion} no lleva aria-modal="true"`).toBe('true');
  expect.soft(d.nombre, `4.1.2: ${accion} no tiene nombre accesible`).not.toBe('');
  expect.soft(d.focoSaleDelDialogo, `2.4.3: en ${accion} Tab saca el foco del diálogo`).toBe(false);
  expect.soft(d.controlesSinFocoVisible, `2.4.7: controles sin foco visible en ${accion}`).toEqual([]);
  desviacion(resumen.test(`${d.descripcion} ${d.texto}`), `1.3.1 / 3.3.4: ${accion} no resume lo que va a ocurrir y qué no se puede deshacer`);
  desviacion(/cancelar|volver/i.test(d.focoInicial), `2.4.3: en ${accion} el foco inicial no queda en la acción segura (queda en ${d.focoInicial})`);

  const esc = await cerrarConEscape(page, disparador);
  desviacion(!esc.cerrado, `RF-107: ${accion} se cierra con Escape`);
  await reabrir(page, disparador);
  const sigue = await clicFuera(page);
  desviacion(sigue, `RF-107: ${accion} se cierra con un clic fuera del modal`);
  await reabrir(page, disparador);
  const cancelar = dialogo(page).getByRole('button', { name: /^(Cancelar|Volver)$/ }).first();
  await cancelar.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  // El formulario de baja vuelve del resumen al formulario con "Volver": se cancela otra vez.
  if (await dialogo(page).isVisible()) await dialogo(page).getByRole('button', { name: 'Cancelar', exact: true }).click().catch(() => {});
  const focoEnDisparador = await disparador.evaluate((e) => document.activeElement === e).catch(() => false);
  anotar(testInfo, `${accion}: Escape / clic fuera / Cancelar`, `Escape cierra: ${esc.cerrado} · clic fuera cierra: ${!sigue} · foco tras Cancelar en el disparador: ${focoEnDisparador}`);
  expect.soft(focoEnDisparador, `2.4.3: al cancelar ${accion} el foco no vuelve al botón que lo abrió`).toBe(true);
}

test.describe('TC-DIS-293 — Modal de confirmación de acción crítica', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_293_VIEWPORTS.`);
  });

  test('a. Cierre de período (Administrador, Datos simulados)', async ({ browser }, testInfo) => {
    const s = await abrirSesionM08(browser, testInfo, 'admin');
    try {
      await prepararCierre(s.page, PERIODOS);
      anotar(testInfo, 'Datos simulados', 'Permiso cierre_periodo·E; noviembre 2026 ABIERTO con prevalidación lista. No se confirma.');
      await irFinanzas(s.page, 'cierre', /Cierre del período/);
      await revisarModalCritico(s.page, testInfo, 'el cierre de período', botonCerrarPeriodo(s.page), 'modal-cierre', /irreversible|no se puede (deshacer|revertir)|noviembre/i);
    } finally {
      await quitarSimulaciones(s.page);
      await s.contexto.close();
    }
  });

  test('b. Revocación de credenciales (Administrador, Datos simulados)', async ({ browser }, testInfo) => {
    const s = await abrirSesionM08(browser, testInfo, 'admin');
    try {
      await simularClientes(s.page);
      anotar(testInfo, 'Datos simulados', 'Clientes QA de M07 (Datos_Semilla §4). No se confirma.');
      await irA(s.page, 'integracion/clientes', /Acceso de AgroFusion/);
      await revisarModalCritico(s.page, testInfo, 'la revocación', main(s.page).getByRole('button', { name: 'Revocar QA Cliente Para Revocar 2' }), null, /definitiva|no se puede deshacer/i);
    } finally {
      await quitarSimulaciones(s.page);
      await s.contexto.close();
    }
  });

  test(`c. Baja de activo (Productor, lote #${ACTIVO_BAJA} real, sin confirmar)`, async ({ browser }, testInfo) => {
    const s = await abrirSesionM08(browser, testInfo, 'productor');
    try {
      const page = s.page;
      await page.goto(`activos-biologicos/${ACTIVO_BAJA}`);
      const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
      const hay = await secciones.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
      precondicion(hay, `el Productor de TEST no ve el activo #${ACTIVO_BAJA} (ajuste TC_DIS_293_ACTIVO_BAJA)`);
      if (!hay) return;
      await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
      const baja = page.getByRole('button', { name: 'Baja', exact: true });
      const habilitado = await baja.isEnabled({ timeout: 20_000 }).catch(() => false);
      precondicion(habilitado, `el activo #${ACTIVO_BAJA} no permite registrar la baja (¿ya está en BAJA?)`);
      if (!habilitado) return;
      // El modal crítico es el resumen "Confirma la baja", al que se llega con el formulario completo.
      await baja.click();
      const d = dialogo(page);
      await d.getByRole('combobox', { name: /Tipo de baja/ }).selectOption('muerte');
      await d.getByLabel(/Fecha de baja/).fill(new Date().toISOString().slice(0, 10));
      const cantidad = d.getByRole('spinbutton', { name: /Cantidad afectada/ });
      if (await cantidad.count()) await cantidad.fill('1');
      await d.getByRole('textbox', { name: /Motivo de la baja/ }).fill('QA TC-DIS-293 (no se confirma)');
      const registrar = d.getByRole('button', { name: 'Registrar baja', exact: true });
      // El resumen vive en el mismo diálogo, después de "Registrar baja".
      await registrar.click();
      await expect(d.getByRole('heading', { name: 'Confirma la baja' })).toBeVisible();
      await escanear(page, TC_ID, __dirname, 'modal-baja', testInfo, LH);
      const texto = (await d.innerText()).replace(/\s+/g, ' ');
      anotar(testInfo, 'Resumen de la baja', texto.slice(0, 300));
      desviacion(/irreversible/i.test(texto), '1.3.1 / 3.3.4: el resumen de la baja no dice que es irreversible');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      desviacion(await d.isVisible(), 'RF-107: el modal de baja se cierra con Escape');
      if (!(await d.isVisible())) { await baja.click(); await registrar.click().catch(() => {}); }
      const sigue = await clicFuera(page);
      desviacion(sigue, 'RF-107: el modal de baja se cierra con un clic fuera del modal');
    } finally {
      await s.contexto.close();
    }
  });

  test('d. Reversión del reconocimiento inicial (Contador, QA-RF82-REVERSION real, sin confirmar)', async ({ browser }, testInfo) => {
    const s = await abrirSesionM08(browser, testInfo, 'contador');
    try {
      const page = s.page;
      await irFinanzas(page, 'reconocimiento', /Reconocimiento inicial/);
      await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
      const buscar = main(page).getByRole('searchbox');
      if (await buscar.count()) await buscar.fill('QA-RF82-REVERSION');
      const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
      const hay = await verDetalle.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
      precondicion(hay, 'QA-RF82-REVERSION no aparece en el período 363 (dato de M06 TC-DIS-222)');
      if (!hay) return;
      await verDetalle.click();
      const revertir = dialogo(page).getByRole('button', { name: 'Revertir reconocimiento', exact: true });
      const puede = await revertir.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
      precondicion(puede, 'el Contador de TEST no ve "Revertir reconocimiento" (permiso o activo ya revertido)');
      if (!puede) return;
      await revertir.click();
      const d = dialogo(page);
      await d.waitFor({ state: 'visible' });
      await escanear(page, TC_ID, __dirname, 'modal-reversion', testInfo, LH);
      const texto = (await d.innerText()).replace(/\s+/g, ' ');
      anotar(testInfo, 'Diálogo de reversión', texto.slice(0, 300));
      desviacion(/asiento espejo|no se puede deshacer|irreversible/i.test(texto), '1.3.1 / 3.3.4: el diálogo de reversión no resume lo que va a ocurrir');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const trasEsc = await page.getByRole('dialog').filter({ hasText: /Revertir el reconocimiento/ }).isVisible();
      desviacion(trasEsc, 'RF-107: el diálogo de reversión se cierra con Escape');
      if (trasEsc) {
        const sigue = await clicFuera(page);
        desviacion(sigue, 'RF-107: el diálogo de reversión se cierra con un clic fuera del modal');
      }
    } finally {
      await s.contexto.close();
    }
  });
});
