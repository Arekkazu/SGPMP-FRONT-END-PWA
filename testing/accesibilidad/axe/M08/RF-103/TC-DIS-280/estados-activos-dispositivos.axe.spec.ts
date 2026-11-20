// | Fecha      | Nombre          | Que se hizo                                                                  |
// |------------|-----------------|------------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-280 RF-103: estados de activos y de dispositivos IoT sin depender del color |
/**
 * TC-DIS-280 — Verificar accesibilidad WCAG 2.1 AA de los estados de activos biológicos y de dispositivos
 * IoT en el dashboard sin depender solo del color [CRÍTICO]
 * RF-103 · CU-01 Visualizar dashboard operativo en tiempo real · Rol: Productor (e Ingeniero de Campo) · Prioridad: Alta
 * Ruta: /dashboard → «Inventario por especie» (visual `barras`) y «Estado de dispositivos IoT» (visual `estados`)
 *
 * Criterio: 0 violaciones axe A/AA; 1.4.1 (Activo, En tratamiento y Baja, y los 5 estados de dispositivo,
 * se distinguen por ícono y etiqueta, no solo por color); 1.4.3 (texto de cada badge ≥ 4.5:1 en tema
 * claro y oscuro); 1.3.1 (listas o tablas con la cantidad o el dispositivo junto a su estado; el tiempo
 * desde la última comunicación en texto, p. ej. «hace 25 minutos»); sin valores de enum crudos.
 *
 * Segunda ejecución con Ingeniero de Campo: no hay esa cuenta en el ambiente (testing/.env.test). El
 * widget de dispositivos se revisa con datos simulados en la sesión del Productor.
 * Datos simulados: inventario de dos especies en los tres estados y 9 dispositivos en los 5 estados,
 * uno sin señal hace 25 minutos. No se ejecuta NVDA ni VoiceOver.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_280_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear } from '../../../_shared/sigabA11y';
import { abrirSesionM08, quitarSimulaciones, temaOscuro, textosCrudos } from '../../_shared/m08';
import { ESTADO_IOT, INVENTARIO, irDashboard, leerWidgets, simularTablero, type WidgetSimulado } from '../../_shared/dashboard';

const TC_ID = 'TC-DIS-280';
const VIEWPORTS = (process.env.TC_DIS_280_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['estados-real', 'estados-simulados', 'estados-oscuro'];
const INV = 'Inventario por especie';
const IOT = 'Estado de dispositivos IoT';
const WIDGETS: WidgetSimulado[] = [
  { id: 9731, clave: 'inventario_especies', nombre: INV, visual: 'barras' },
  { id: 9732, clave: 'estado_iot', nombre: IOT, visual: 'estados' },
];
const ESTADOS_DISPOSITIVO = ['Activo', 'Guardando datos sin señal', 'Sin señal', 'Inactivo', 'En mantenimiento'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Chips de estado de un widget: texto, si llevan ícono, y contraste del texto con su fondo. */
function leerChips(widget: Locator, selector: string) {
  return widget.locator(selector).evaluateAll((els) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    const lum = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
    const fondoReal = (e: Element | null): string => {
      while (e) { const bg = getComputedStyle(e).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg; e = e.parentElement; }
      return 'rgb(255, 255, 255)';
    };
    return els.map((e) => {
      const color = getComputedStyle(e).color;
      return { texto: (e.textContent ?? '').replace(/\s+/g, ' ').trim(), icono: !!e.querySelector('svg'), contraste: ratio(color, fondoReal(e)) };
    });
  });
}

test.describe('TC-DIS-280 — Estados de activos y de dispositivos IoT', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_280_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await temaOscuro(page, false).catch(() => {}); await quitarSimulaciones(page); } });

  async function tableroSimulado() {
    await simularTablero(page, WIDGETS, (clave) => {
      if (clave === 'inventario_especies') return { datos: INVENTARIO };
      if (clave === 'estado_iot') return { datos: ESTADO_IOT };
      return { estado: 'SIN_DATOS', datos: {} };
    });
    await irDashboard(page);
    return {
      inv: page.locator('main article', { has: page.getByRole('heading', { name: INV }) }),
      iot: page.locator('main article', { has: page.getByRole('heading', { name: IOT }) }),
    };
  }

  test('a. [1.4.1] Widgets reales de estados del Productor', async ({}, testInfo) => {
    await irDashboard(page);
    await escanear(page, TC_ID, __dirname, 'estados-real', testInfo, LH);
    const widgets = await leerWidgets(page);
    anotar(testInfo, 'Widgets reales', widgets.map((w) => `${w.nombre}: ${w.texto.slice(0, 160)}`).join(' ¦ ') || '(ninguno)');
    expect.soft(await textosCrudos(page.locator('main')), 'Regla de textos visibles: el dashboard muestra valores crudos').toEqual([]);
  });

  test('b. [1.4.1 / 1.3.1] Activos en los tres estados: ícono, etiqueta y cantidad junto a su estado (Datos simulados)', async ({}, testInfo) => {
    const { inv } = await tableroSimulado();
    anotar(testInfo, 'Datos simulados', INVENTARIO.especies.map((e) => `${e.especie}: ${e.activos} activos, ${e.en_tratamiento} en tratamiento, ${e.bajas} bajas`).join(' ¦ '));
    await escanear(page, TC_ID, __dirname, 'estados-simulados', testInfo, LH);
    const leyenda = await leerChips(inv, 'ul > li');
    const barras = await inv.locator('[role="img"]').evaluateAll((b) => b.map((x) => ({ nombre: x.getAttribute('aria-label') ?? '', visible: (x.textContent ?? '').trim() })));
    anotar(testInfo, 'Leyenda', leyenda.map((c) => `${c.texto}${c.icono ? ' (con ícono)' : ''}`).join(' ¦ '));
    anotar(testInfo, 'Barras', barras.map((b) => `lector: «${b.nombre}» · en pantalla: «${b.visible}»`).join(' ¦ '));
    for (const estado of ['Activos', 'En tratamiento', 'Bajas']) {
      const c = leyenda.find((x) => x.texto === estado);
      expect.soft(!!c, `1.4.1: el estado «${estado}» no tiene etiqueta de texto`).toBe(true);
      desviacion(!!c?.icono, `1.4.1: el estado «${estado}» no tiene ícono; en la leyenda solo hay un cuadro de color`);
    }
    // En pantalla los tramos solo muestran el número: su estado se reconoce por color frente a la leyenda.
    desviacion(barras.every((b) => /activos|tratamiento|baja/i.test(b.visible)), '1.4.1 / 1.3.1: en las barras cada cantidad aparece sin su estado (solo un número sobre un color); el estado solo se oye con lector de pantalla');
  });

  test('c. [1.4.1 / 1.3.1] Dispositivos en los 5 estados y uno sin señal hace 25 minutos (Datos simulados)', async ({}, testInfo) => {
    anotar(testInfo, 'Segunda ejecución', 'No hay cuenta Ingeniero de Campo en el ambiente: el widget de dispositivos se revisa con datos simulados en la sesión del Productor.');
    const { iot } = await tableroSimulado();
    anotar(testInfo, 'Datos simulados', `Conteo ${JSON.stringify(ESTADO_IOT.conteo)}; IOT-M08-03 sin señal hace 25 minutos; IOT-M08-05 nunca ha reportado.`);
    const chips = await leerChips(iot, 'ul:first-of-type > li');
    const texto = (await iot.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Estados de dispositivo', chips.map((c) => `${c.texto}${c.icono ? ' (con ícono)' : ''} ${c.contraste}:1`).join(' ¦ '));
    anotar(testInfo, 'Texto del widget', texto);
    for (const estado of ESTADOS_DISPOSITIVO) {
      const c = chips.find((x) => x.texto.startsWith(`${estado}:`));
      expect.soft(!!c, `1.4.1: el estado de dispositivo «${estado}» no aparece con su texto`).toBe(true);
      desviacion(!!c?.icono, `1.4.1: el estado de dispositivo «${estado}» no tiene ícono (solo texto y color)`);
    }
    // Cuatro de los cinco estados comparten el mismo color: sin ícono, solo el texto los distingue.
    expect.soft(texto, '1.3.1: el dispositivo sin señal no dice en texto hace cuánto se comunicó').toMatch(/IOT-M08-03.*hace 25 min/i);
    expect.soft(await textosCrudos(iot), 'Regla de textos visibles: estados crudos en el widget de dispositivos').toEqual([]);
  });

  test('d. [1.4.3] Contraste de cada estado en tema claro y oscuro (Datos simulados)', async ({}, testInfo) => {
    const { inv, iot } = await tableroSimulado();
    const medir = async () => [
      ...(await leerChips(iot, 'ul:first-of-type > li')),
      ...(await leerChips(inv, '[role="img"] > span')).map((c) => ({ ...c, texto: `tramo ${c.texto}` })),
    ];
    const claro = await medir();
    await temaOscuro(page, true);
    const oscuro = await medir();
    await escanear(page, TC_ID, __dirname, 'estados-oscuro', testInfo, LH);
    for (const [tema, l] of [['claro', claro], ['oscuro', oscuro]] as const) {
      anotar(testInfo, `Contraste tema ${tema}`, l.map((c) => `${c.texto}: ${c.contraste}:1`).join(' ¦ '));
      expect.soft(l.filter((c) => c.contraste < 4.5).map((c) => `${c.texto} ${c.contraste}:1`), `1.4.3: estados bajo 4.5:1 en tema ${tema}`).toEqual([]);
    }
  });
});
