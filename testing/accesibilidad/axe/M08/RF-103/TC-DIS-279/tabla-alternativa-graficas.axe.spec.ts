// | Fecha      | Nombre          | Que se hizo                                                                  |
// |------------|-----------------|------------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-279 RF-103: tabla alternativa a las gráficas del dashboard operativo   |
/**
 * TC-DIS-279 — Verificar accesibilidad WCAG 2.1 AA de la tabla alternativa a las gráficas del dashboard
 * operativo [CRÍTICO]
 * RF-103 · CU-01 Visualizar dashboard operativo en tiempo real · Rol: Veterinario (y Contador) · Prioridad: Alta
 * Ruta: /dashboard → «Distribución del riesgo» (visual `barras`) y «Valor del inventario» (visual `cifra`)
 *
 * Criterio: 0 violaciones axe A/AA; 1.1.1 (cada gráfica tiene nombre accesible y una tabla de datos con la
 * misma información, accesible por teclado y lector); 1.3.1 (encabezados de fila y columna; porcentajes y
 * montos como texto); 1.4.11 (las barras se distinguen entre sí con 3:1 o por patrón o etiqueta); 1.4.10
 * (a 320 px la tabla no provoca scroll horizontal de la página).
 *
 * Segunda ejecución con Contador: no hay cuenta Contador en el ambiente (testing/.env.test). El widget de
 * valor del inventario por método se revisa con datos simulados dentro de la sesión del Veterinario.
 * Datos simulados: distribución del riesgo de dos especies y su cambio en el ciclo siguiente.
 * No se ejecuta NVDA ni VoiceOver.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_279_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear } from '../../../_shared/sigabA11y';
import { abrirSesionM08, quitarSimulaciones } from '../../_shared/m08';
import {
  DISTRIBUCION_RIESGO, VALOR_INVENTARIO, irDashboard, leerWidgets, simularTablero, type WidgetSimulado,
} from '../../_shared/dashboard';

const TC_ID = 'TC-DIS-279';
const VIEWPORTS = (process.env.TC_DIS_279_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['graficas-real', 'distribucion-simulada', 'valor-por-metodo'];
const RIESGO = 'Distribución del riesgo';
const VALOR = 'Valor del inventario';
const WIDGETS: WidgetSimulado[] = [
  { id: 9721, clave: 'distribucion_riesgo', nombre: RIESGO, visual: 'barras' },
  { id: 9722, clave: 'valor_inventario', nombre: VALOR, visual: 'cifra', requiereFinca: false },
];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Barras de un widget: nombre accesible de cada una, colores de sus tramos y contraste entre tramos vecinos. */
function leerBarras(widget: Locator) {
  return widget.locator('[role="img"]').evaluateAll((barras) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    const lum = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
    return barras.map((b) => {
      const tramos = [...b.children].map((t) => ({ color: getComputedStyle(t).backgroundColor, texto: (t.textContent ?? '').trim() }));
      return {
        nombre: b.getAttribute('aria-label') ?? '',
        tramos: tramos.map((t) => t.texto),
        contrasteVecinos: tramos.slice(1).map((t, i) => ratio(t.color, tramos[i].color)),
      };
    });
  });
}

test.describe('TC-DIS-279 — Tabla alternativa a las gráficas del dashboard', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;
  let ciclo = 0;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_279_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  async function tableroSimulado() {
    ciclo = 0;
    await simularTablero(page, WIDGETS, (clave) => {
      if (clave === 'distribucion_riesgo') {
        if (ciclo === 0) return { datos: DISTRIBUCION_RIESGO };
        return { datos: { especies: [{ ...DISTRIBUCION_RIESGO.especies[0], moderado: 4, alto: 4 }, DISTRIBUCION_RIESGO.especies[1]] } };
      }
      if (clave === 'valor_inventario') return { datos: VALOR_INVENTARIO };
      return { estado: 'SIN_DATOS', datos: {} };
    }, { frecuencia: 15 });
    await irDashboard(page);
    return page.locator('main article', { has: page.getByRole('heading', { name: RIESGO }) });
  }

  test('a. [1.1.1] Gráficas reales del dashboard del Veterinario', async ({}, testInfo) => {
    await irDashboard(page);
    await escanear(page, TC_ID, __dirname, 'graficas-real', testInfo, LH);
    const widgets = await leerWidgets(page);
    const graficas = await page.locator('main article').evaluateAll((arts) => arts.map((a) => ({
      widget: a.getAttribute('aria-label') ?? '',
      imagenes: [...a.querySelectorAll('[role="img"], svg:not([aria-hidden="true"]), canvas')].map((g) => g.getAttribute('aria-label') ?? '(sin nombre)'),
      tablas: a.querySelectorAll('table').length,
    })).filter((g) => g.imagenes.length > 0));
    anotar(testInfo, 'Widgets del Veterinario', widgets.map((w) => w.nombre).join(' ¦ ') || '(ninguno)');
    anotar(testInfo, 'Gráficas reales', graficas.map((g) => `${g.widget}: ${g.imagenes.join(' / ')} · tablas: ${g.tablas}`).join(' ¦ ') || '(ninguna gráfica con datos)');
    for (const g of graficas) desviacion(g.tablas > 0, `1.1.1: la gráfica «${g.widget}» no tiene tabla alternativa`);
  });

  test('b. [1.1.1 / 1.3.1 / 1.4.11] Distribución del riesgo de dos especies: tabla con encabezados (Datos simulados)', async ({}, testInfo) => {
    const widget = await tableroSimulado();
    anotar(testInfo, 'Datos simulados', DISTRIBUCION_RIESGO.especies.map((e) => `${e.especie}: normal ${e.normal}, moderado ${e.moderado}, alto ${e.alto}`).join(' ¦ '));
    await escanear(page, TC_ID, __dirname, 'distribucion-simulada', testInfo, LH);
    const barras = await leerBarras(widget);
    anotar(testInfo, 'Barras', barras.map((b) => `«${b.nombre}» tramos ${b.tramos.join('/')} · contraste entre vecinos ${b.contrasteVecinos.join(', ')}`).join(' ¦ '));
    expect.soft(barras.every((b) => b.nombre.length > 0), '1.1.1: hay barras sin nombre accesible').toBe(true);
    const tabla = widget.locator('table');
    const hayTabla = (await tabla.count()) > 0;
    desviacion(hayTabla, '1.1.1 / 1.3.1: la gráfica de distribución no tiene tabla alternativa con encabezados de fila y columna; solo un role="img" por especie');
    if (hayTabla) {
      const t = await auditarTabla(tabla.first());
      anotar(testInfo, 'Tabla alternativa', `Encabezados: ${t.encabezados.join(' | ')} · filas: ${t.filas}`);
      expect.soft(t.filas, 'La tabla no tiene una fila por especie').toBe(2);
    }
    // El caso pide especie, enfermedad y probabilidad; el widget agrupa por nivel de riesgo.
    const texto = (await widget.innerText()).replace(/\s+/g, ' ');
    desviacion(/%|probabilidad/i.test(texto) && /patolog|enfermedad|mastitis/i.test(texto), '1.3.1: el widget no muestra la enfermedad ni la probabilidad: solo cuántos animales hay en cada nivel de riesgo');
    // 1.4.11: los tramos solo dicen su número; su categoría se reconoce por color frente a la leyenda.
    const bajos = barras.flatMap((b) => b.contrasteVecinos.filter((c) => c < 3));
    desviacion(bajos.length === 0, `1.4.11: tramos vecinos con contraste menor a 3:1 entre sí (${bajos.join(', ')}) y sin patrón ni rótulo de categoría`);
  });

  test('c. [1.1.1] La alternativa se actualiza junto con la gráfica en el ciclo siguiente (Datos simulados)', async ({}, testInfo) => {
    const widget = await tableroSimulado();
    const antes = (await leerBarras(widget)).map((b) => b.nombre);
    ciclo = 1;
    anotar(testInfo, 'Datos simulados', 'En el ciclo siguiente (15 s) Bovino pasa a moderado 4 y alto 4.');
    await expect(widget.locator('[role="img"]').first()).toHaveAttribute('aria-label', /Alto: 4/, { timeout: 25_000 }).catch(() => {});
    const despues = (await leerBarras(widget)).map((b) => b.nombre);
    anotar(testInfo, 'Nombre de las barras', `antes: ${antes.join(' / ')} · después: ${despues.join(' / ')}`);
    expect.soft(despues[0] ?? '', '1.1.1: el texto alternativo no se actualizó con la gráfica').toMatch(/Alto: 4/);
  });

  test('d. [1.3.1 / 1.4.10] Valor del inventario por método y reflujo a 320 px (Datos simulados, sin cuenta Contador)', async ({}, testInfo) => {
    anotar(testInfo, 'Segunda ejecución', 'No hay cuenta Contador en el ambiente: el widget de valor por método se revisa con datos simulados en la sesión del Veterinario.');
    await tableroSimulado();
    const valor = page.locator('main article', { has: page.getByRole('heading', { name: VALOR }) });
    await escanear(page, TC_ID, __dirname, 'valor-por-metodo', testInfo, LH);
    const pares = await valor.locator('dl').evaluate((dl) => [...dl.querySelectorAll('dt')].map((dt) => `${dt.textContent?.trim()}: ${dt.nextElementSibling?.textContent?.trim()}`)).catch(() => [] as string[]);
    anotar(testInfo, 'Valor por método', `${(await valor.innerText()).replace(/\s+/g, ' ')} · pares: ${pares.join(' ¦ ')}`);
    expect.soft(pares.length, '1.3.1: los dos métodos de valoración no están asociados a su monto').toBe(2);
    const graficaValor = await valor.locator('[role="img"], svg:not([aria-hidden="true"])').count();
    anotar(testInfo, 'Gráfica del valor por método', graficaValor ? `${graficaValor} gráfica(s)` : 'el widget muestra cifras en texto, sin gráfica');
    // 1.4.10: a 320 px de ancho la página no se desplaza en horizontal.
    const original = page.viewportSize();
    await page.setViewportSize({ width: 320, height: original?.height ?? 800 });
    await page.waitForTimeout(600);
    const ancho = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    if (original) await page.setViewportSize(original);
    anotar(testInfo, 'Reflujo a 320 px', `ancho del documento ${ancho.doc} px en una ventana de ${ancho.vista} px`);
    expect.soft(ancho.doc, '1.4.10: a 320 px el dashboard provoca scroll horizontal').toBeLessThanOrEqual(ancho.vista);
  });
});
