// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-262 RF-93: vista simplificada del estado de resultados (Productor) |
// | 2026-11-13 | SaraSofGonzalez | TC-DIS-262 RF-93: tercera ejecución; aviso de estado no generado con períodos simulados |
/**
 * TC-DIS-262 — Verificar accesibilidad WCAG 2.1 AA de la vista simplificada del Estado de Resultados
 * para el Productor [CRÍTICO]
 * RF-93 · CU-012 · Rol: Productor · Prioridad: Alta
 * Ruta: /finanzas/estado-resultados (cuenta Productor)
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1 y 1.3.1 (gráficas de la vista simplificada con tabla
 * alternativa); 1.4.1 (resultado neto con "Ganancia"/"Pérdida" y signo); 2.4.6 (encabezados y
 * etiquetas en lenguaje no técnico); 4.1.2 (sin controles de generación sin función); 4.1.3 (se
 * anuncia "el Contador aún no ha generado el estado de este período").
 *
 * Ambiente: cuenta Productor real de TEST. La vista real se evalúa tal cual (paso a). Esa cuenta no
 * tiene períodos contables, así que el aviso de estado no generado se evalúa con períodos simulados
 * (paso b, "Datos simulados"); los permisos del Productor no se modifican.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_262_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main } from '../../../_shared/sigabA11y';
import { PERIODOS, abrirSesionRol, elegirPeriodo, irFinanzas, quitarSimulaciones, simularGet, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-262';
const VIEWPORTS = (process.env.TC_DIS_262_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['vista-productor', 'sin-estado-productor'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-262 — Vista simplificada del Estado de Resultados para el Productor', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_262_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [2.4.6 / 4.1.2 / 4.1.3 / 1.1.1] Vista real del Productor: escaneo, controles y mensajes', async ({}, testInfo) => {
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await escanear(page, TC_ID, __dirname, 'vista-productor', testInfo, LH);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Vista del Productor', texto.slice(0, 700));
    const generar = await main(page).getByRole('button', { name: /Generar|Aprobar/ }).count();
    const filtros = await main(page).locator('#er-especie, #er-finca, #er-activo').count();
    expect.soft(generar + filtros, '4.1.2: el Productor ve controles o filtros de generación').toBe(0);

    const sinPeriodos = /no puede consultar los per[ií]odos/i.test(texto);
    desviacion(!sinPeriodos, '1.1.1/1.3.1: el Productor no puede ver ningún estado de resultados: la vista dice "Tu rol no puede consultar los períodos contables" y no ofrece vistas predefinidas, resumen ni gráficas');
    desviacion(!/cierra el per[ií]odo|genera(r)? (su|el) estado/i.test(texto), '2.4.6: la vista del Productor muestra instrucciones del Contador ("Cierra el período para generar su estado"), no lenguaje para el Productor');
    const sinPeriodosPropios = /a[uú]n no hay per[ií]odos|sin per[ií]odos contables/i.test(texto);
    anotar(testInfo, 'Períodos del Productor real', sinPeriodosPropios ? 'Sin períodos contables: el mensaje de estado no generado se evalúa en el paso b (datos simulados)' : 'Con períodos');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  // Tercera ejecución 2026-11-13: el Productor de TEST no tiene períodos, así que el aviso de estado no
  // generado no se puede alcanzar con datos reales. Se simulan sus períodos (uno cerrado sin estado y
  // uno abierto) y una lista vacía de estados; solo cambian lecturas, sus permisos no se tocan.
  test('b. [4.1.3] Período sin estado generado: el aviso se anuncia (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/estados-resultados$/, []);
    anotar(testInfo, 'Datos simulados', 'Períodos de septiembre (cerrado), octubre (en cierre) y noviembre (abierto) sin estados de resultados.');
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    for (const [id, nombre] of [[9101, 'cerrado'], [9103, 'abierto']] as const) {
      await elegirPeriodo(page, id);
      const mensaje = main(page).getByText(/Contador a[uú]n no ha generado/i).first();
      await mensaje.waitFor({ timeout: 10_000 }).catch(() => {});
      const visible = (await mensaje.count()) > 0;
      const anunciado = visible ? await estaEnRegionViva(mensaje) : false;
      anotar(testInfo, `Período ${nombre}`, visible ? `${(await mensaje.innerText()).trim()} · en región viva: ${anunciado}` : '(sin aviso)');
      desviacion(anunciado, `4.1.3: en el período ${nombre} sin estado no se anuncia "el Contador aún no ha generado el estado de este período"`);
    }
    await escanear(page, TC_ID, __dirname, 'sin-estado-productor', testInfo, LH);
  });
});
