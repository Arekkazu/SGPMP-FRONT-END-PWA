// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-293 RF-107: modal de confirmación de las 4 acciones críticas              |
// | 2026-11-22 | Laura032005 | TC-DIS-293 RF-107: la pantalla de clientes externos se llama «Sistemas externos» (1.5.0-rc.1) |
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
 *   - Revocación: Administrador, clientes de M07 simulados ("QA Cliente Para Revocar 1").
 *   - Baja de activo: Productor, BOV-ESP-001 «Desechable Baja» de Finca La Esperanza (Datos_Semilla §10);
 *     se busca por su identificador. TC_DIS_293_ACTIVO_BAJA fija otro identificador si hace falta.
 *   - Reversión: Contador, activo QA-RF82-REVERSION del período 363 (el de M06 TC-DIS-222).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_293_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, irAPeriodo, main, precondicion } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionM08, abrirYAuditarDialogo, botonCerrarPeriodo, cerrarConEscape, clicFuera, dialogo, irA, irFinanzas,
  buscarIdActivo, prepararCierre, quitarSimulaciones, reabrir, simularClientes,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-293';
const VIEWPORTS = (process.env.TC_DIS_293_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['modal-cierre', 'modal-baja', 'modal-reversion'];
const ACTIVO_BAJA = process.env.TC_DIS_293_ACTIVO_BAJA ?? 'BOV-ESP-001';

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
      await irA(s.page, 'integracion/clientes', /Sistemas externos|Acceso de AgroFusion/);
      await revisarModalCritico(s.page, testInfo, 'la revocación', main(s.page).getByRole('button', { name: 'Revocar QA Cliente Para Revocar 1' }), null, /definitiva|no se puede deshacer/i);
    } finally {
      await quitarSimulaciones(s.page);
      await s.contexto.close();
    }
  });

  test(`c. Baja de activo (Productor, ${ACTIVO_BAJA} real, sin confirmar)`, async ({ browser }, testInfo) => {
    const s = await abrirSesionM08(browser, testInfo, 'productor');
    try {
      const page = s.page;
      const id = await buscarIdActivo(page, ACTIVO_BAJA);
      anotar(testInfo, 'Activo de la baja', `${ACTIVO_BAJA} → ${id ?? 'no encontrado'}`);
      precondicion(id !== null, `el Productor de TEST no ve el activo ${ACTIVO_BAJA} (Datos_Semilla §10)`);
      if (id === null) return;
      await page.goto(`activos-biologicos/${id}`);
      const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
      const hay = await secciones.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
      precondicion(hay, `no se abre la ficha de ${ACTIVO_BAJA}`);
      if (!hay) return;
      await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
      const baja = page.getByRole('button', { name: 'Baja', exact: true });
      const habilitado = await baja.isEnabled({ timeout: 20_000 }).catch(() => false);
      precondicion(habilitado, `${ACTIVO_BAJA} no permite registrar la baja (¿ya está en BAJA?)`);
      if (!habilitado) return;
      // El modal crítico es el resumen "Confirma la baja", al que se llega con el formulario completo.
      const d = dialogo(page);
      const resumen = d.getByRole('heading', { name: 'Confirma la baja' });
      const llegarAlResumen = async () => {
        await baja.click();
        await d.getByRole('combobox', { name: /Tipo de baja/ }).selectOption('muerte');
        await d.getByLabel(/Fecha de baja/).fill(new Date().toISOString().slice(0, 10));
        const cantidad = d.getByRole('spinbutton', { name: /Cantidad afectada/ });
        if (await cantidad.count()) await cantidad.fill('1');
        await d.getByRole('textbox', { name: /Motivo de la baja/ }).fill('QA TC-DIS-293 (no se confirma)');
        await d.getByRole('button', { name: 'Registrar baja', exact: true }).click();
        await expect(resumen).toBeVisible();
      };
      await llegarAlResumen();
      await escanear(page, TC_ID, __dirname, 'modal-baja', testInfo, LH);
      const texto = (await d.innerText()).replace(/\s+/g, ' ');
      anotar(testInfo, 'Resumen de la baja', texto.slice(0, 300));
      desviacion(/irreversible|definitiva|no se puede deshacer/i.test(texto), '1.3.1 / 3.3.4: el resumen de la baja no dice que es definitiva');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const trasEscape = await resumen.isVisible();
      desviacion(trasEscape, 'RF-107: la confirmación de la baja se cierra con Escape (useModalA11y lee "bloqueante" solo al abrir el modal, cuando todavía es el formulario)');
      if (!trasEscape) await llegarAlResumen();
      const sigue = await clicFuera(page) && await resumen.isVisible();
      desviacion(sigue, 'RF-107: la confirmación de la baja se cierra con un clic fuera del modal');
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
