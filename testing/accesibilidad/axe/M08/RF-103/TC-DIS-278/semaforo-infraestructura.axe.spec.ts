// | Fecha      | Nombre          | Que se hizo                                                                  |
// |------------|-----------------|------------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-278 RF-103: semáforo de alertas por infraestructura sin depender del color |
/**
 * TC-DIS-278 — Verificar accesibilidad WCAG 2.1 AA del semáforo de alertas por infraestructura del
 * Productor (verde / amarillo / rojo) sin depender solo del color [CRÍTICO]
 * RF-103 · CU-01 Visualizar dashboard operativo en tiempo real · Rol: Productor · Prioridad: Alta
 * Ruta: /dashboard → widget «Semáforo de áreas» (visual `semaforo`)
 *
 * Criterio: 0 violaciones axe A/AA; 1.4.1 (verde, amarillo y rojo se distinguen además por la forma del
 * ícono y una etiqueta; «datos no disponibles» tiene su propio texto e ícono); 1.4.3 (texto del estado
 * ≥ 4.5:1 en tema claro y oscuro); 1.4.11 (íconos ≥ 3:1 con su fondo); 1.1.1 y 4.1.2 (cada indicador
 * tiene nombre accesible con infraestructura, estado y número de alertas); 3.1.5 (lenguaje sencillo).
 *
 * Datos simulados: cuatro infraestructuras, una por estado (sin alertas, solo advertencias, con una
 * crítica y sin fuente de datos), con su número de alertas. No se ejecuta NVDA ni VoiceOver.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_278_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, precondicion } from '../../../_shared/sigabA11y';
import { abrirSesionM08, quitarSimulaciones, temaOscuro, textosCrudos } from '../../_shared/m08';
import { SEMAFORO_ROSAL, irDashboard, simularTablero, type WidgetSimulado } from '../../_shared/dashboard';

const TC_ID = 'TC-DIS-278';
const VIEWPORTS = (process.env.TC_DIS_278_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['semaforo-real', 'semaforo-simulado', 'semaforo-oscuro'];
const NOMBRE = 'Semáforo de áreas';
const WIDGETS: WidgetSimulado[] = [{ id: 9711, clave: 'semaforo_areas', nombre: NOMBRE, visual: 'semaforo', reaccionaAlertas: true }];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

interface Indicador { nombre: string; texto: string; icono: string; color: string; fondo: string; contrasteTexto: number; contrasteIcono: number }

/** Cada infraestructura del semáforo: texto que lee el lector, ícono, colores y contrastes calculados. */
function leerIndicadores(widget: Locator): Promise<Indicador[]> {
  return widget.locator('li').evaluateAll((lis) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    const lum = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
    return lis.map((li) => {
      const badge = li.querySelector('span:last-child') as HTMLElement | null;
      const svg = badge?.querySelector('svg');
      const cs = badge ? getComputedStyle(badge) : null;
      const color = cs?.color ?? '';
      const fondo = cs?.backgroundColor ?? '';
      const trazo = svg ? getComputedStyle(svg).stroke : '';
      return {
        nombre: li.getAttribute('aria-label') ?? '',
        texto: ((li as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim(),
        icono: (svg?.getAttribute('class') ?? '').split(' ').find((c) => c.startsWith('lucide-') && c !== 'lucide-icon') ?? '(sin ícono)',
        color, fondo,
        contrasteTexto: color && fondo ? ratio(color, fondo) : 0,
        contrasteIcono: (trazo && trazo !== 'none' ? trazo : color) && fondo ? ratio(trazo && trazo !== 'none' ? trazo : color, fondo) : 0,
      };
    });
  });
}

test.describe('TC-DIS-278 — Semáforo de alertas por infraestructura', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_278_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await temaOscuro(page, false).catch(() => {}); await quitarSimulaciones(page); } });

  async function semaforoSimulado() {
    await simularTablero(page, WIDGETS, () => ({ datos: SEMAFORO_ROSAL }));
    await irDashboard(page);
    return page.locator('main article', { has: page.getByRole('heading', { name: NOMBRE }) });
  }

  test('a. [1.4.1 / 1.1.1] Semáforo real del Productor', async ({}, testInfo) => {
    await irDashboard(page);
    // El semáforo deja un texto oculto «Estado general: …» cuando tiene infraestructuras.
    const widget = page.locator('main article').filter({ hasText: /Estado general/ }).first();
    const hay = (await widget.count()) > 0;
    precondicion(hay, 'el dashboard del Productor no tiene un semáforo de infraestructuras con datos');
    await escanear(page, TC_ID, __dirname, 'semaforo-real', testInfo, LH);
    if (!hay) return;
    const ind = await leerIndicadores(widget);
    anotar(testInfo, 'Semáforo real', `${await widget.getAttribute('aria-label')}: ${ind.map((i) => `${i.texto} [${i.icono}]`).join(' ¦ ')}`);
    expect.soft(await textosCrudos(widget), 'Regla de textos visibles: el semáforo muestra valores crudos').toEqual([]);
  });

  test('b. [1.4.1 / 1.1.1 / 4.1.2 / 3.1.5] Los cuatro estados con ícono, etiqueta y número de alertas (Datos simulados)', async ({}, testInfo) => {
    const widget = await semaforoSimulado();
    anotar(testInfo, 'Datos simulados', SEMAFORO_ROSAL.areas.map((a) => `${a.nombre}: ${a.estado}, ${a.alertas} alertas (${a.criticas} críticas)`).join(' ¦ '));
    await escanear(page, TC_ID, __dirname, 'semaforo-simulado', testInfo, LH);
    const ind = await leerIndicadores(widget);
    anotar(testInfo, 'Indicadores', ind.map((i) => `«${i.texto}» ícono ${i.icono} · texto ${i.contrasteTexto}:1 · ícono ${i.contrasteIcono}:1`).join(' ¦ '));
    const general = (await widget.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Texto del widget', general);
    expect.soft(ind.length, 'El semáforo no muestra las 4 infraestructuras').toBe(4);
    // 1.4.1: cada estado tiene una forma de ícono distinta y su propia palabra.
    const iconos = new Set(ind.map((i) => i.icono));
    expect.soft(iconos.size, `1.4.1: los estados no tienen íconos de forma distinta (${[...iconos].join(', ')})`).toBe(4);
    const palabras = new Set(ind.map((i) => i.texto.replace(/^.*?\s(\S+)$/, '$1')));
    expect.soft(palabras.size, '1.4.1: los estados no tienen etiquetas de texto distintas').toBe(4);
    // Sin fuente de datos: su propio texto, no uno de los tres colores.
    const sinDatos = ind.find((i) => i.texto.startsWith('Estanque 1'));
    expect.soft(sinDatos?.texto ?? '', '1.4.1: la infraestructura sin datos no dice en texto que no hay datos').toMatch(/sin datos|no disponible/i);
    // 1.1.1 / 4.1.2: nombre, estado y número de alertas de cada infraestructura.
    for (const a of SEMAFORO_ROSAL.areas.filter((x) => x.alertas > 0)) {
      const i = ind.find((x) => x.texto.startsWith(a.nombre));
      desviacion(new RegExp(`\\b${a.alertas}\\b`).test(`${i?.texto ?? ''} ${i?.nombre ?? ''}`), `1.1.1 / 4.1.2: «${a.nombre}» no dice cuántas alertas tiene (${a.alertas}); el lector solo oye «${i?.texto ?? ''}»`);
    }
  });

  test('c. [1.4.3 / 1.4.11] Contraste del texto y de los íconos en tema claro y oscuro (Datos simulados)', async ({}, testInfo) => {
    const widget = await semaforoSimulado();
    const claro = await leerIndicadores(widget);
    await temaOscuro(page, true);
    const oscuro = await leerIndicadores(widget);
    await escanear(page, TC_ID, __dirname, 'semaforo-oscuro', testInfo, LH);
    for (const [tema, ind] of [['claro', claro], ['oscuro', oscuro]] as const) {
      anotar(testInfo, `Contraste tema ${tema}`, ind.map((i) => `${i.texto}: texto ${i.contrasteTexto}:1, ícono ${i.contrasteIcono}:1`).join(' ¦ '));
      expect.soft(ind.filter((i) => i.contrasteTexto < 4.5).map((i) => `${i.texto} ${i.contrasteTexto}:1`), `1.4.3: texto de estado bajo 4.5:1 en tema ${tema}`).toEqual([]);
      expect.soft(ind.filter((i) => i.contrasteIcono < 3).map((i) => `${i.texto} ${i.contrasteIcono}:1`), `1.4.11: ícono bajo 3:1 en tema ${tema}`).toEqual([]);
    }
  });
});
