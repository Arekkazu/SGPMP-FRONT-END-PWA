// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-262 RF-93: vista simplificada del estado de resultados (Productor) |
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
 * Ambiente: cuenta Productor real de TEST. La vista real se evalúa tal cual (paso a). No se puede
 * simular un estado aprobado para el Productor sin alterar sus permisos (la vista depende del permiso
 * de períodos contables), así que el caso se limita a lo que el Productor ve hoy.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_262_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main } from '../../../_shared/sigabA11y';
import { abrirSesionRol, irFinanzas, quitarSimulaciones, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-262';
const VIEWPORTS = (process.env.TC_DIS_262_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['vista-productor'];

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
    const mensaje = main(page).getByText(/Contador aún no ha generado|no ha generado el estado/i);
    const anunciado = (await mensaje.count()) ? await estaEnRegionViva(mensaje.first()) : false;
    desviacion(anunciado, '4.1.3: no se anuncia "el Contador aún no ha generado el estado de este período"');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });
});
