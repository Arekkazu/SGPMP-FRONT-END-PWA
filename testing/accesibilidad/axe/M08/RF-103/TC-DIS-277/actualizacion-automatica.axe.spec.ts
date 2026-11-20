// | Fecha      | Nombre          | Que se hizo                                                                  |
// |------------|-----------------|------------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-277 RF-103: aria-live de los widgets que se actualizan solos           |
/**
 * TC-DIS-277 — Verificar accesibilidad WCAG 2.1 AA de aria-live en los widgets que se actualizan solos sin
 * saturar el lector de pantalla [CRÍTICO]
 * RF-103 · CU-01 Visualizar dashboard operativo en tiempo real · Rol: Productor (y Veterinario) · Prioridad: Alta
 * Ruta: /dashboard
 *
 * Criterio: 0 violaciones axe A/AA; 4.1.3 (solo se anuncia el widget cuyo dato cambió, con aria-live
 * polite y un texto breve; un ciclo sin cambios no produce ningún anuncio; la alerta crítica nueva se
 * anuncia con role="alert" una sola vez); 2.2.2 (control accesible para pausar la actualización);
 * 2.4.3 (la actualización no mueve el foco); 1.3.1 (regiones vivas por widget, no una sobre todo el
 * dashboard).
 *
 * Qué se mide: un MutationObserver registra cada cambio de texto dentro de una región viva (lo que el
 * lector anunciaría). Los ciclos usan la frecuencia por defecto de 30 s.
 * Datos simulados: layout y datos de tres widgets (semáforo, temperatura e inventario) para controlar
 * ciclos sin cambios, un cambio en un solo widget y la alerta crítica que llega por push.
 * No se ejecuta NVDA ni VoiceOver.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_277_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, describirFoco, escanear } from '../../../_shared/sigabA11y';
import { abrirSesionM08, quitarSimulaciones } from '../../_shared/m08';
import {
  INVENTARIO, SEMAFORO_ROSAL, irDashboard, leerAnuncios, leerWidgets, lecturaTemperatura, marcaAnuncios, observarAnuncios, publicarPush,
  regionesDelDashboard, resumirAnuncios, simularTablero, type WidgetSimulado,
} from '../../_shared/dashboard';

const TC_ID = 'TC-DIS-277';
const VIEWPORTS = (process.env.TC_DIS_277_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['tablero-real', 'cambio-un-widget', 'alerta-critica'];
const FRECUENCIA = 30;

const WIDGETS: WidgetSimulado[] = [
  { id: 9701, clave: 'semaforo_areas', nombre: 'Semáforo de áreas', visual: 'semaforo', reaccionaAlertas: true },
  { id: 9702, clave: 'temp_galpon', nombre: 'Temperatura del galpón', visual: 'lecturas', span: 1 },
  { id: 9703, clave: 'inventario_especies', nombre: 'Inventario por especie', visual: 'barras', span: 1 },
];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-277 — aria-live de los widgets que se actualizan solos', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;
  // Estado del escenario simulado: lo cambia cada paso.
  let temperatura = 28;
  let criticas = 0;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_277_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  async function tableroSimulado() {
    temperatura = 28;
    criticas = 0;
    await simularTablero(page, WIDGETS, (clave) => {
      if (clave === 'semaforo_areas') return { datos: SEMAFORO_ROSAL };
      if (clave === 'temp_galpon') return { datos: lecturaTemperatura(temperatura) };
      if (clave === 'inventario_especies') return { datos: INVENTARIO };
      return { estado: 'SIN_DATOS', datos: {} };
    }, { frecuencia: FRECUENCIA, criticas: () => criticas });
    await irDashboard(page);
  }

  /** Pone el foco en el enlace del primer widget, como quien lee el dashboard con teclado. */
  async function enfocarDentroDeWidget() {
    const enlace = page.locator('main article').first().locator('a, button').first();
    if (await enlace.count()) await enlace.focus();
    else await page.locator('main article').first().focus().catch(() => {});
    return describirFoco(page);
  }

  test('a. [1.3.1 / 2.2.2] Dashboard real del Productor: regiones vivas por widget y control de pausa', async ({}, testInfo) => {
    const respLayout = page.waitForResponse((r) => r.url().includes('/configuracion/personalizacion/dashboard') && !r.url().includes('/widgets'), { timeout: 60_000 }).catch(() => null);
    await irDashboard(page);
    const layout = (await (await respLayout)?.json().catch(() => null)) as { frecuencia_actualizacion?: number } | null;
    await escanear(page, TC_ID, __dirname, 'tablero-real', testInfo, LH);
    const widgets = await leerWidgets(page);
    const regiones = await regionesDelDashboard(page);
    anotar(testInfo, 'Frecuencia configurada', `${layout?.frecuencia_actualizacion ?? '(no se pudo leer)'} s`);
    anotar(testInfo, 'Widgets reales', widgets.map((w) => `${w.nombre} — ${w.estado || w.aviso || '(sin estado)'}`).join(' ¦ ') || '(ninguno)');
    anotar(testInfo, 'Regiones vivas en el dashboard', regiones.map((r) => `${r.widget}: ${r.rol || 'live'}${r.live ? `/${r.live}` : ''}${r.atomic ? ` atomic=${r.atomic}` : ''} "${r.texto}"`).join(' ¦ ') || '(ninguna)');
    expect.soft(widgets.length, 'El Productor no tiene widgets en su dashboard').toBeGreaterThan(0);
    // 1.3.1: ninguna región viva abarca varios widgets (leería todo el dashboard en cada ciclo).
    expect.soft(regiones.filter((r) => r.abarcaWidgets > 1), '1.3.1: hay una región viva que abarca varios widgets').toEqual([]);
    // 2.2.2: control para pausar o detener la actualización automática.
    const pausa = page.getByRole('button', { name: /paus|detener|reanudar|actualizaci[oó]n autom/i }).or(page.getByRole('switch', { name: /actualiz/i }));
    const hayPausa = (await pausa.count()) > 0;
    anotar(testInfo, 'Control de pausa', hayPausa ? (await pausa.first().getAttribute('aria-label')) ?? (await pausa.first().innerText()) : '(no existe)');
    desviacion(hayPausa, '2.2.2: el dashboard se actualiza solo cada 30 s y no hay ningún control para pausar o detener la actualización');
  });

  test('b. [4.1.3 / 2.4.3] Tres ciclos sin cambios en los datos: nada se anuncia y el foco no se mueve (Datos simulados)', async ({}, testInfo) => {
    await tableroSimulado();
    anotar(testInfo, 'Datos simulados', `Tres widgets (semáforo, temperatura, inventario) con los mismos datos en cada ciclo; frecuencia ${FRECUENCIA} s.`);
    await observarAnuncios(page);
    const focoAntes = await enfocarDentroDeWidget();
    const peticiones: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/dashboard/widgets/temp_galpon')) peticiones.push(new Date().toISOString().slice(11, 19)); });
    await page.waitForTimeout(FRECUENCIA * 3 * 1000 + 5_000);
    const anuncios = await leerAnuncios(page);
    const focoDespues = await describirFoco(page);
    anotar(testInfo, 'Ciclos observados (peticiones de temperatura)', peticiones.join(', ') || '(ninguna)');
    anotar(testInfo, 'Anuncios en 3 ciclos sin cambios', resumirAnuncios(anuncios));
    anotar(testInfo, 'Foco', `antes: ${focoAntes} · después: ${focoDespues}`);
    expect.soft(peticiones.length, 'No se observaron 3 ciclos de actualización').toBeGreaterThanOrEqual(3);
    expect.soft(focoDespues, '2.4.3: la actualización movió el foco').toBe(focoAntes);
    expect.soft(anuncios, `4.1.3: un ciclo sin cambios en los datos produce anuncios: ${resumirAnuncios(anuncios)}`).toEqual([]);
  });

  test('c. [4.1.3 / 2.4.3] Cambia solo la temperatura: se anuncia ese widget, una vez y sin mover el foco (Datos simulados)', async ({}, testInfo) => {
    await tableroSimulado();
    await observarAnuncios(page);
    const focoAntes = await enfocarDentroDeWidget();
    temperatura = 31;
    anotar(testInfo, 'Datos simulados', 'La temperatura del Galpón 2 pasa de 28 °C a 31 °C en el siguiente ciclo; los otros dos widgets no cambian.');
    const widget = page.locator('main article', { hasText: 'Temperatura del galpón' });
    await expect(widget).toContainText('31', { timeout: (FRECUENCIA + 10) * 1000 });
    await page.waitForTimeout(3_000);
    const anuncios = await leerAnuncios(page);
    const focoDespues = await describirFoco(page);
    await escanear(page, TC_ID, __dirname, 'cambio-un-widget', testInfo, LH);
    anotar(testInfo, 'Anuncios tras el cambio', resumirAnuncios(anuncios));
    anotar(testInfo, 'Foco', `antes: ${focoAntes} · después: ${focoDespues}`);
    const delCambio = anuncios.filter((a) => /31/.test(a.texto));
    const deOtros = anuncios.filter((a) => !/Temperatura/.test(a.region));
    expect.soft(focoDespues, '2.4.3: la actualización movió el foco').toBe(focoAntes);
    expect.soft(delCambio.length, '4.1.3: el cambio de temperatura (31 °C) no se anuncia: el valor no está en una región viva').toBe(1);
    expect.soft(deOtros, `4.1.3: se anuncian widgets cuyo dato no cambió: ${resumirAnuncios(deOtros)}`).toEqual([]);
    if (delCambio[0]) expect.soft(delCambio[0].politica, '4.1.3: el cambio no se anuncia con aria-live polite').toBe('polite');
  });

  test('d. [4.1.3] Alerta crítica nueva por push: se anuncia de inmediato con role="alert", una sola vez (Datos simulados)', async ({}, testInfo) => {
    await tableroSimulado();
    await observarAnuncios(page);
    criticas = 1;
    anotar(testInfo, 'Datos simulados', 'Llega un push de alerta crítica; el backend pasa a reportar 1 crítica sin atender.');
    const t0 = Date.now();
    await publicarPush(page, { nivel: 'CRITICA', tipo: 'ESTRES_TERMICO' });
    const alerta = page.locator('main [role="alert"]', { hasText: /cr[ií]tica/i });
    await expect(alerta).toBeVisible({ timeout: 10_000 }).catch(() => {});
    const demora = Date.now() - t0;
    // Un segundo push y un ciclo más no deben repetir el anuncio de la misma alerta.
    await publicarPush(page, { nivel: 'CRITICA', tipo: 'ESTRES_TERMICO' });
    await page.waitForTimeout(FRECUENCIA * 1000 + 3_000);
    await escanear(page, TC_ID, __dirname, 'alerta-critica', testInfo, LH);
    const anuncios = await leerAnuncios(page);
    const deAlerta = anuncios.filter((a) => /cr[ií]tica/i.test(a.texto) && a.politica === 'assertive');
    anotar(testInfo, 'Anuncios con la alerta', `${resumirAnuncios(anuncios)} · apareció en ${demora} ms`);
    expect.soft(deAlerta.length, '4.1.3: la alerta crítica nueva no se anuncia con role="alert"').toBeGreaterThan(0);
    expect.soft(deAlerta.length, '4.1.3: la alerta crítica se anuncia más de una vez').toBeLessThanOrEqual(1);
    expect.soft(demora, '4.1.3: la alerta crítica tarda más de 3 s en anunciarse').toBeLessThan(3_000);
  });

  test('e. [1.3.1 / 4.1.3] Segunda ejecución: dashboard real del Veterinario', async ({ browser }, testInfo) => {
    const vet = await abrirSesionM08(browser, testInfo, 'veterinario');
    try {
      await irDashboard(vet.page);
      await escanear(vet.page, TC_ID, __dirname, 'tablero-veterinario', testInfo, LH);
      const widgets = await leerWidgets(vet.page);
      const regiones = await regionesDelDashboard(vet.page);
      anotar(testInfo, 'Widgets del Veterinario', widgets.map((w) => `${w.nombre} — ${w.estado || w.aviso || '(sin estado)'}`).join(' ¦ ') || '(ninguno)');
      anotar(testInfo, 'Regiones vivas', regiones.map((r) => `${r.widget}: ${r.rol || 'live'} "${r.texto}"`).join(' ¦ ') || '(ninguna)');
      expect.soft(regiones.filter((r) => r.abarcaWidgets > 1), '1.3.1: hay una región viva que abarca varios widgets').toEqual([]);
      // Los valores de los widgets (lo que cambia entre ciclos) no están en ninguna región viva.
      const valoresEnRegion = await vet.page.locator('main article').evaluateAll((arts) => arts.filter((a) => {
        const cuerpo = a.querySelector(':scope > div');
        return !!cuerpo && !!cuerpo.closest('[aria-live]:not([aria-live="off"]), [role="status"]') ;
      }).length);
      anotar(testInfo, 'Widgets con sus valores dentro de una región viva', String(valoresEnRegion));
    } finally {
      await vet.contexto.close();
    }
  });
});
