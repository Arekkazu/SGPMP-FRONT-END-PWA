// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-245 RF-87: bloqueos y listas de exclusión del cierre        |
/**
 * TC-DIS-245 — Verificar accesibilidad WCAG 2.1 AA de los bloqueos y listas de exclusión del cierre
 * (hechos sin cuenta contable, activos sin precio y activos con trazabilidad incompleta)
 * RF-87 · CU-06 - Ejecutar cierre del período contable · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/cierre → "Precondiciones para cerrar"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (faltantes de cuenta y activos excluidos como tablas o
 * listas con encabezados: hecho o activo, especie, motivo y, para trazabilidad, eslabón incompleto);
 * 1.4.1 (motivo en texto); 4.1.2 y 3.3.2 (opciones Sí / No y casillas de método de costo con nombre
 * que identifica al activo); 4.1.3 (bloqueo, número de activos excluidos y cancelación con rollback
 * anunciados); 2.1.1 (decisión completa con teclado); sin enums crudos ni null.
 *
 * Ambiente: el período real de TEST tiene las 7 precondiciones completas. Los bloqueos (FA-1 hechos
 * sin cuenta), FA-2 (activos sin precio) y FA-3 (trazabilidad incompleta) se simulan en la respuesta
 * de la prevalidación, con permiso cierre_periodo·E simulado ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_245_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionRol, concederPermisos, irFinanzas, quitarSimulaciones, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-245';
const VIEWPORTS = (process.env.TC_DIS_245_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['bloqueo-cuentas', 'exclusiones'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const BLOQUEO = {
  bloqueos: [{ codigo: 'LINEAS_PENDIENTE_CUENTA', mensaje: '3 líneas de asiento no tienen cuenta débito o crédito: Variación por precio de mercado (Bovino), Consumo de insumos (Tilapia).' }],
  activos_sin_precio: [], lineas_sin_trazabilidad: [], puede_cerrar: false, requiere_autorizacion: false,
};
const EXCLUSIONES = {
  bloqueos: [],
  activos_sin_precio: [
    { id_activo_biologico: 7001, identificador: 'BOV-101', especie: 'Bovino' },
    { id_activo_biologico: 7003, identificador: 'LOTE-TIL-07', especie: 'Tilapia' },
  ],
  lineas_sin_trazabilidad: [
    { id_linea: 501, tipo_hecho: 'VARIACION_VR_TB', faltantes: ['lecturas_nic41'] },
    { id_linea: 502, tipo_hecho: 'CONSUMO_INSUMO', faltantes: ['evento_m02'] },
  ],
  puede_cerrar: true, requiere_autorizacion: true,
};

async function preparar(page: Page, prevalidacion: unknown) {
  await concederPermisos(page, [['cierre_periodo', 5]]);
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacion);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
  await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
}

test.describe('TC-DIS-245 — Bloqueos y listas de exclusión del cierre', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_245_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 4.1.3] Bloqueo por hechos sin cuenta contable y lista de faltantes (Datos simulados)', async ({}, testInfo) => {
    await preparar(page, BLOQUEO);
    anotar(testInfo, 'Datos simulados', 'Prevalidación con bloqueo LINEAS_PENDIENTE_CUENTA (3 líneas sin cuenta) y puede_cerrar=false.');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await escanear(page, TC_ID, __dirname, 'bloqueo-cuentas', testInfo, LH);
    const lista = page.locator('section[aria-labelledby="cierre-pre"]');
    const bloqueo = page.locator('[role="alert"]').filter({ hasText: /no se puede cerrar/i });
    await expect.soft(bloqueo, '4.1.3: el bloqueo del cierre no se anuncia con role="alert"').toBeVisible();
    const tabla = await lista.locator('table').count();
    const texto = (await lista.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Precondiciones', texto.slice(0, 600));
    desviacion(tabla > 0, '1.3.1: los hechos sin cuenta contable no se listan en una tabla con encabezados (hecho, especie, motivo); solo aparecen en una frase dentro de la tarjeta de precondición');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos en pantalla → ${crudos.join(' ¦ ')}`);
  });

  test('b. [1.3.1 / 4.1.2 / 3.3.2 / 2.1.1] Activos sin precio (FA-2) y trazabilidad incompleta (FA-3): listas y decisión con teclado (Datos simulados)', async ({}, testInfo) => {
    await preparar(page, EXCLUSIONES);
    anotar(testInfo, 'Datos simulados', 'Prevalidación con 2 activos sin precio (BOV-101 Bovino, LOTE-TIL-07 Tilapia) y 2 líneas sin trazabilidad (lecturas NIC 41, evento biológico).');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await escanear(page, TC_ID, __dirname, 'exclusiones', testInfo, LH);
    const seccion = page.locator('section[aria-labelledby="cierre-pre"]');
    const texto = (await seccion.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Precondiciones y decisión', texto.slice(0, 900));

    desviacion((await seccion.locator('table, ul li ul, ol').count()) > 0 && /BOV-101/.test(texto) && /LOTE-TIL-07/.test(texto),
      '1.3.1: los activos sin precio no se listan uno por uno en una tabla o lista con activo, especie y motivo');
    desviacion(/lectura|eslab[oó]n|nivel/i.test(texto) && (await seccion.locator('table').count()) > 0,
      '1.3.1: las líneas con trazabilidad incompleta no identifican en una tabla el eslabón incompleto de cada una');

    const radios = seccion.getByRole('radio');
    const nombresRadio = await radios.evaluateAll((rs) => rs.map((r) => (r as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''));
    const casilla = seccion.getByRole('checkbox');
    const nombresCasilla = await casilla.evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''));
    anotar(testInfo, 'Opciones', `Radios: ${nombresRadio.join(' ¦ ')} · Casillas: ${nombresCasilla.join(' ¦ ')}`);
    desviacion(nombresRadio.some((n) => /BOV-101|LOTE-TIL-07/.test(n)) || nombresCasilla.some((n) => /BOV-101|LOTE-TIL-07/.test(n)),
      '4.1.2/3.3.2: la autorización del método de costo es una sola opción global; ninguna casilla identifica al activo');
    desviacion(nombresRadio.some((n) => /^no\b|cancelar/i.test(n)) || await page.getByRole('button', { name: /^No$|Cancelar cierre/ }).isVisible(),
      'FA-2/FA-3: no hay opción "No" para cancelar el cierre con rollback desde la advertencia');

    // Decisión solo con teclado: elegir excluir, autorizar líneas y llegar al botón de cierre.
    await radios.first().focus();
    await page.keyboard.press('Space');
    await casilla.first().focus();
    await page.keyboard.press('Space');
    const boton = page.getByRole('button', { name: 'Cerrar período', exact: true });
    expect.soft(await boton.isEnabled(), '2.1.1: tras decidir con teclado, "Cerrar período" no se habilita').toBe(true);
    const aviso = page.getByText(/requiere.*autoriz|autoriza/i).first();
    const anunciado = (await aviso.count()) ? await estaEnRegionViva(aviso) : false;
    desviacion(anunciado && /\d+ activos?/.test(texto), '4.1.3: el número de activos que se excluirán no se anuncia en una región viva');
  });
});
