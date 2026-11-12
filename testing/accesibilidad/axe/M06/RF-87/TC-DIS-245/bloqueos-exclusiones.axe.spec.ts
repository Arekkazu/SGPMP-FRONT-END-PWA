// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-245 RF-87: bloqueos y listas de exclusión del cierre        |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-245 RF-87: reejecución con el bloqueo real del período #241; una decisión por activo |
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
 * Ambiente (reejecución 2026-11-11): el bloqueo FA-1 es REAL, del período #241 de Finca El Rosal
 * (línea de depreciación de BOV-116-TIL sin cuenta). FA-2 (activos sin precio) y la decisión de
 * exclusión siguen simulados en la prevalidación, con permiso cierre_periodo·E visual ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_245_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main, precondicion } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionRol, concederPermisos, elegirPeriodo, irFinanzas, quitarSimulaciones, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-245';
const VIEWPORTS = (process.env.TC_DIS_245_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['bloqueo-cuentas', 'exclusiones'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const PERIODO_REAL = 241;

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

  test('a. [1.3.1 / 4.1.3] Bloqueo real por un hecho sin cuenta contable (noviembre 2026, Finca El Rosal)', async ({}, testInfo) => {
    // Reejecución 2026-11-11: el período real #241 (NIT 901458732) tiene el bloqueo de la línea de depreciación
    // de BOV-116-TIL sin cuenta. Solo se concede el permiso visual de cierre; la prevalidación es la real.
    await concederPermisos(page, [['cierre_periodo', 5]]);
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await elegirPeriodo(page, PERIODO_REAL);
    await page.getByText(/no tienen cuentas en la matriz/i).first().waitFor({ timeout: 30_000 }).catch(() => {});
    const real = await page.locator('section[aria-labelledby="cierre-pre"]').innerText().catch(() => '');
    precondicion(/sin cuenta|no tienen cuentas|matriz contable/i.test(real), 'el período #241 ya no tiene el bloqueo real por la línea sin cuenta contable');
    anotar(testInfo, 'Datos reales', 'Período #241 (noviembre 2026, NIT 901458732): bloqueo por la línea «Depreciación (modelo de costo)» de Bovino sin cuenta.');
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

    // Decisión solo con teclado: cada activo sin precio tiene su propio grupo (excluir / estimar);
    // se elige "excluir" en cada uno, se autorizan las líneas y se llega al botón de cierre.
    const grupos = [...new Set(await radios.evaluateAll((rs) => rs.map((r) => (r as HTMLInputElement).name)))];
    for (const nombre of grupos) {
      await seccion.locator(`input[type="radio"][name="${nombre}"]`).first().focus();
      await page.keyboard.press('Space');
    }
    await casilla.first().focus();
    await page.keyboard.press('Space');
    const boton = page.getByRole('button', { name: 'Cerrar período', exact: true });
    expect.soft(await boton.isEnabled(), '2.1.1: tras decidir con teclado, "Cerrar período" no se habilita').toBe(true);
    const aviso = seccion.getByText(/\d+ activos? se excluir/i).first();
    const anunciado = (await aviso.count()) ? await estaEnRegionViva(aviso) : false;
    anotar(testInfo, 'Resumen de la decisión', (await aviso.count()) ? (await aviso.innerText()).trim() : '(no hay)');
    desviacion(anunciado, '4.1.3: el número de activos que se excluirán no se anuncia en una región viva');
  });
});
