// | Fecha      | Nombre          | Que se hizo                                                                  |
// |------------|-----------------|------------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-281 RF-103: estructura, estado de widgets, sin conexión y selector de finca (accesos recorridos con Tab) |
/**
 * TC-DIS-281 — Verificar accesibilidad WCAG 2.1 AA de la estructura del dashboard, el estado de cada
 * widget, el modo sin conexión y el selector de finca
 * RF-103 · CU-01 Visualizar dashboard operativo en tiempo real · Rol: Productor con dos fincas · Prioridad: Media
 * Ruta: /dashboard
 *
 * Criterio: 0 violaciones axe A/AA; 1.3.1 y 2.4.6 (cada widget es una región con encabezado descriptivo y
 * su estado —correcto, error, sin datos— en texto); 2.4.1 (forma de saltar al contenido o entre widgets);
 * 2.1.1 y 2.4.7 (accesos rápidos y selector de finca por teclado con foco visible); 4.1.3 (cambio de finca,
 * paso a sin conexión y sincronización se anuncian); 1.4.1 (el estado de sincronización tiene texto);
 * 1.4.10 (a 360 px los widgets se apilan sin scroll horizontal); sin valores de enum crudos.
 *
 * Datos reales: el Productor tiene varias fincas asignadas. Datos simulados: un widget cuyo módulo fuente
 * no responde (la petición se corta) junto a uno con datos y otro sin datos. Sin conexión se simula con
 * el modo offline del navegador. No se ejecuta NVDA ni VoiceOver.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_281_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, describirFoco, escanear, precondicion } from '../../../_shared/sigabA11y';
import { abrirSesionM08, focoVisible, quitarSimulaciones, textosCrudos } from '../../_shared/m08';
import {
  INVENTARIO, SEMAFORO_ROSAL, irDashboard, leerAnuncios, leerWidgets, observarAnuncios, resumirAnuncios, simularTablero, type WidgetSimulado,
} from '../../_shared/dashboard';

const TC_ID = 'TC-DIS-281';
const VIEWPORTS = (process.env.TC_DIS_281_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['dashboard-real', 'estados-widget', 'sin-conexion'];
const WIDGETS: WidgetSimulado[] = [
  { id: 9741, clave: 'semaforo_areas', nombre: 'Semáforo de áreas', visual: 'semaforo' },
  { id: 9742, clave: 'inventario_especies', nombre: 'Inventario por especie', visual: 'barras', span: 1 },
  { id: 9743, clave: 'alertas_crit', nombre: 'Alertas críticas', visual: 'lista', span: 1 },
];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-281 — Estructura, estado de widgets, sin conexión y selector de finca', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_281_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (contexto) await contexto.setOffline(false); if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 2.4.6 / 2.4.1 / 1.4.10] Dashboard real: regiones con encabezado, salto al contenido y reflujo a 360 px', async ({}, testInfo) => {
    await irDashboard(page);
    await escanear(page, TC_ID, __dirname, 'dashboard-real', testInfo, LH);
    const widgets = await leerWidgets(page);
    anotar(testInfo, 'Widgets', widgets.map((w) => `${w.nombre} (h: ${w.encabezado}) — ${w.estado || w.aviso || '(sin estado)'}`).join(' ¦ ') || '(ninguno)');
    expect.soft(widgets.length, 'El Productor no tiene widgets en su dashboard').toBeGreaterThan(0);
    expect.soft(widgets.filter((w) => !w.nombre || !w.encabezado).map((w) => w.nombre || w.texto.slice(0, 40)), '1.3.1 / 2.4.6: widgets sin nombre de región o sin encabezado').toEqual([]);
    expect.soft(widgets.filter((w) => !w.estado && !w.aviso).map((w) => w.nombre), '1.3.1: widgets sin su estado en texto').toEqual([]);
    expect.soft(await textosCrudos(page.locator('main')), 'Regla de textos visibles: el dashboard muestra valores crudos').toEqual([]);
    // 2.4.1: enlace para saltar al contenido.
    const saltar = page.getByRole('link', { name: /Saltar al contenido/ });
    expect.soft(await saltar.count(), '2.4.1: no hay enlace para saltar al contenido principal').toBeGreaterThan(0);
    // 1.4.10: a 360 px los widgets se apilan sin scroll horizontal.
    const original = page.viewportSize();
    await page.setViewportSize({ width: 360, height: original?.height ?? 800 });
    await page.waitForTimeout(600);
    const ancho = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth,
      columnas: getComputedStyle(document.querySelector('.dashboard-grid') ?? document.body).gridTemplateColumns }));
    if (original) await page.setViewportSize(original);
    anotar(testInfo, 'Reflujo a 360 px', `documento ${ancho.doc} px en ventana de ${ancho.vista} px · columnas de la rejilla: ${ancho.columnas}`);
    expect.soft(ancho.doc, '1.4.10: a 360 px el dashboard provoca scroll horizontal').toBeLessThanOrEqual(ancho.vista);
  });

  test('b. [2.1.1 / 2.4.7 / 2.4.4] Accesos rápidos de los widgets por teclado', async ({}, testInfo) => {
    await irDashboard(page);
    const accesos = page.locator('main article footer a, main article footer button');
    const n = await accesos.count();
    precondicion(n > 0, 'ningún widget del Productor tiene acceso rápido a su módulo');
    const recorrido: string[] = [];
    const sinFoco: string[] = [];
    // Recorrido con Tab desde el inicio de la página: el foco por teclado es el que activa :focus-visible
    // (un .focus() por programa tras un clic no lo muestra y daría un falso «sin foco visible»).
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let vistos = 0;
    for (let i = 0; i < 120 && vistos < n; i++) {
      await page.keyboard.press('Tab');
      const enAcceso = await page.evaluate(() => !!document.activeElement?.closest('main article footer'));
      if (!enAcceso) continue;
      vistos++;
      const foco = await describirFoco(page);
      const widget = await page.evaluate(() => document.activeElement?.closest('article')?.getAttribute('aria-label') ?? '');
      recorrido.push(`${widget} → ${foco}`);
      if (!(await focoVisible(page))) sinFoco.push(`${widget} → ${foco}`);
    }
    expect.soft(vistos, '2.1.1: no todos los accesos rápidos se alcanzan con Tab').toBe(n);
    anotar(testInfo, 'Accesos rápidos', recorrido.join(' ¦ '));
    expect.soft(sinFoco, '2.4.7: accesos rápidos sin foco visible').toEqual([]);
    // Todos se llaman igual («Ver más»): su destino solo se deduce de la región que los contiene.
    const nombres = await accesos.evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim()));
    const repetidos = nombres.filter((x, i) => nombres.indexOf(x) !== i);
    anotar(testInfo, 'Nombres accesibles', `${[...new Set(nombres)].join(' ¦ ')}${repetidos.length ? ` · ${repetidos.length + 1} enlaces con el mismo nombre` : ''}`);
    desviacion(repetidos.length === 0, `4.1.2 / 2.4.4: ${nombres.length} accesos rápidos se llaman «${repetidos[0] ?? ''}» sin nombrar el módulo al que llevan; en la lista de enlaces del lector no se distinguen`);
  });

  test('c. [1.3.1 / 4.1.3] Estado de cada widget en texto: con datos, sin datos y módulo que no responde (Datos simulados)', async ({}, testInfo) => {
    await simularTablero(page, WIDGETS, (clave) => {
      if (clave === 'semaforo_areas') return { datos: SEMAFORO_ROSAL };
      if (clave === 'inventario_especies') return null; // el módulo fuente no responde
      return { estado: 'SIN_DATOS', mensaje: 'Sin alertas críticas en esta finca.', datos: {} };
    });
    anotar(testInfo, 'Datos simulados', 'Semáforo con datos; «Inventario por especie» no responde (la petición se corta); «Alertas críticas» sin datos.');
    await irDashboard(page);
    await escanear(page, TC_ID, __dirname, 'estados-widget', testInfo, LH);
    const widgets = await leerWidgets(page);
    anotar(testInfo, 'Estado por widget', widgets.map((w) => `${w.nombre}: pie «${w.estado}» · aviso «${w.aviso}»`).join(' ¦ '));
    const caido = widgets.find((w) => w.nombre === 'Inventario por especie');
    expect.soft(`${caido?.estado} ${caido?.aviso}`, '1.3.1: el widget cuyo módulo no responde no dice «Datos no disponibles» en texto').toMatch(/Datos no disponibles/);
    expect.soft((await page.locator('main article', { hasText: 'Inventario por especie' }).getByRole('button', { name: 'Reintentar' }).count())
      + (await page.locator('main article', { hasText: 'Inventario por especie' }).getByText('Reintentar').count()), 'El widget caído no ofrece reintentar').toBeGreaterThan(0);
    const sinDatos = widgets.find((w) => w.nombre === 'Alertas críticas');
    expect.soft(sinDatos?.aviso ?? '', '1.3.1: el widget sin datos no lo dice en texto').toMatch(/Sin alertas/);
  });

  test('d. [2.1.1 / 2.4.7 / 4.1.3] Cambio de finca por teclado y su anuncio', async ({}, testInfo) => {
    await irDashboard(page);
    const selector = page.locator('#dashboard-finca');
    const hay = (await selector.count()) > 0;
    precondicion(hay, 'el Productor no tiene dos o más fincas: el dashboard no muestra selector de finca');
    if (!hay) return;
    const opciones = await selector.locator('option').allInnerTexts();
    const antes = await selector.inputValue();
    await observarAnuncios(page);
    await selector.focus();
    const visible = await focoVisible(page);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    let despues = await selector.inputValue();
    if (despues === antes) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(500); despues = await selector.inputValue(); }
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    const anuncios = await leerAnuncios(page);
    const nombre = await selector.locator('option:checked').innerText();
    anotar(testInfo, 'Selector de finca', `${await page.locator('label[for="dashboard-finca"]').innerText().catch(() => '(sin rótulo)')} · opciones: ${opciones.join(', ')} · foco visible: ${visible}`);
    anotar(testInfo, 'Cambio', `de ${antes} a ${despues} («${nombre}») · anuncios: ${resumirAnuncios(anuncios)}`);
    expect.soft(despues, '2.1.1: el selector no cambia de finca con las flechas del teclado').not.toBe(antes);
    expect.soft(visible, '2.4.7: el selector de finca no muestra foco visible').toBe(true);
    const deFinca = anuncios.filter((a) => a.texto.includes(nombre.trim()));
    desviacion(deFinca.length > 0, `4.1.3: el cambio a «${nombre.trim()}» no se anuncia; solo se oyen los pies de los widgets (${anuncios.length} anuncios: ${resumirAnuncios(anuncios).slice(0, 200)})`);
    await escanear(page, TC_ID, __dirname, 'cambio-finca', testInfo, LH);
  });

  test('e. [4.1.3 / 1.4.1] Sin conexión: anuncio, «Última actualización» por widget, «Disponible con conexión» y sincronización', async ({}, testInfo) => {
    await irDashboard(page);
    await observarAnuncios(page);
    await contexto!.setOffline(true);
    await page.waitForTimeout(1_500);
    const alPerder = await leerAnuncios(page);
    const sync = page.getByRole('button', { name: /Estado de sincronización/ });
    const syncOffline = await sync.getAttribute('aria-label').catch(() => '');
    const syncTexto = await sync.innerText().catch(() => '');
    const conConexion = await page.locator('main article footer', { hasText: 'Disponible con conexión' }).count();
    const totalWidgets = await page.locator('main article').count();
    await escanear(page, TC_ID, __dirname, 'sin-conexion', testInfo, LH);
    // Un ciclo sin red (frecuencia ≥ 15 s): cada widget debe quedar con su «Última actualización».
    await page.waitForTimeout(32_000);
    const tras = await leerWidgets(page);
    const marca = (await leerAnuncios(page)).length;
    await contexto!.setOffline(false);
    await page.waitForTimeout(6_000);
    const alVolver = await leerAnuncios(page, marca);
    const syncOnline = await sync.getAttribute('aria-label').catch(() => '');
    anotar(testInfo, 'Al perder la conexión', `anuncios: ${resumirAnuncios(alPerder)} · indicador: «${syncTexto}» (${syncOffline}) · «Disponible con conexión» en ${conConexion} de ${totalWidgets} widgets`);
    anotar(testInfo, 'Tras un ciclo sin conexión', tras.map((w) => `${w.nombre}: «${w.estado}» · accesos: ${w.enlaces.join('/') || '(ninguno)'}${/Disponible con conexi/.test(w.texto) ? ' · Disponible con conexión' : ''}`).join(' ¦ '));
    anotar(testInfo, 'Al recuperar la conexión', `anuncios: ${resumirAnuncios(alVolver)} · indicador: ${syncOnline}`);
    expect.soft(alPerder.some((a) => /sin conexi/i.test(a.texto)), '4.1.3: el paso a sin conexión no se anuncia').toBe(true);
    expect.soft(syncTexto, '1.4.1: el indicador de sincronización no dice «Sin conexión» en texto').toMatch(/Sin conexi/);
    expect.soft(tras.filter((w) => !/Última actualización/.test(w.estado)).map((w) => `${w.nombre}: «${w.estado}»`), 'Sin conexión, hay widgets sin la hora de «Última actualización»').toEqual([]);
    desviacion(tras.every((w) => w.enlaces.length > 0 || /Disponible con conexi/.test(w.texto)) || tras.length === 0,
      'Tras el primer ciclo sin red, los widgets pierden el acceso rápido y tampoco dicen «Disponible con conexión»');
    desviacion(alVolver.some((a) => /sincroniz|conexi[oó]n (restablecida|recuperada)|en l[ií]nea/i.test(a.texto)), `4.1.3: al recuperar la conexión no se anuncia la sincronización (${resumirAnuncios(alVolver).slice(0, 200)})`);
  });
});
