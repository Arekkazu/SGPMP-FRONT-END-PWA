// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-242 RF-87: diálogo de confirmación del cierre del período   |
/**
 * TC-DIS-242 — Verificar accesibilidad WCAG 2.1 AA del diálogo de confirmación de la acción
 * irreversible de cierre del período contable [CRÍTICO]
 * RF-87 · CU-06 - Ejecutar cierre del período contable · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/cierre → "Cerrar período" → ModalShell "¿Cerrar el período?"
 *
 * Criterio: 0 violaciones axe A/AA; 4.1.2 (role dialog/alertdialog + aria-modal, nombre por
 * aria-labelledby y descripción de la irreversibilidad por aria-describedby); 2.1.2 y 2.4.3 (foco
 * atrapado, foco inicial en la acción no destructiva, Escape cancela y el foco vuelve al
 * disparador); 3.3.4 (confirmación explícita con un botón que nombra la acción y el período);
 * 2.4.7 (foco visible en todos los controles del diálogo).
 *
 * Ambiente: TEST no tiene cuenta de Contador. Se usa Admin; el permiso visual de ejecutar el
 * cierre (cierre_periodo · E) y la prevalidación lista para cerrar se simulan ("Datos simulados").
 * El POST /cierre nunca llega al backend: si el diálogo lo dispara, la prueba lo registra.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_242_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, precondicion } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionRol, abrirYAuditarDialogo, cerrarConEscape, concederPermisos, irFinanzas, prevalidacionLimpia, quitarSimulaciones,
  simularEscritura, simularGet,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-242';
const VIEWPORTS = (process.env.TC_DIS_242_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['cierre-real', 'dialogo-confirmacion'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-242 — Diálogo de confirmación del cierre del período', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_242_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Pantalla real de Cierre del período; precondición: rol con permiso para iniciar el cierre', async ({}, testInfo) => {
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await escanear(page, TC_ID, __dirname, 'cierre-real', testInfo, LH);
    const boton = page.getByRole('button', { name: 'Cerrar período', exact: true });
    const disponible = await boton.isVisible();
    anotar(testInfo, 'Estado real', `Período elegido: ${await page.locator('#fin-periodo option:checked').innerText()}. Botón "Cerrar período" ${disponible ? 'visible' : 'no visible'} para Admin.`);
    precondicion(disponible, 'el ambiente TEST no tiene cuenta de Contador y Admin no puede iniciar el cierre; el diálogo se evalúa con permiso simulado (paso b).');
  });

  test('b. [4.1.2 / 2.1.2 / 2.4.3 / 2.4.7 / 3.3.4] Diálogo abierto con teclado; escaneo y verificación manual (Datos simulados)', async ({}, testInfo) => {
    await concederPermisos(page, [['cierre_periodo', 5]]);
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacionLimpia);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
    await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
    const cierres = await simularEscritura(page, /\/cierre$/, 500, { error_code: 'NO_ENVIAR', message: 'La prueba no envía el cierre' });
    anotar(testInfo, 'Datos simulados', 'Permiso cierre_periodo·E, períodos (noviembre 2026 ABIERTO) y prevalidación sin bloqueos; POST /cierre interceptado.');

    await irFinanzas(page, 'cierre', /Cierre del período/);
    const disparador = page.getByRole('button', { name: 'Cerrar período', exact: true });
    await expect(disparador, 'El botón "Cerrar período" no aparece con el permiso simulado').toBeVisible();

    const d = await abrirYAuditarDialogo(page, disparador);
    expect(d.abierto, 'El diálogo de confirmación no se abrió con Enter').toBe(true);
    await escanear(page, TC_ID, __dirname, 'dialogo-confirmacion', testInfo, LH);
    anotar(testInfo, 'Diálogo', `role=${d.rol} · aria-modal=${d.ariaModal} · nombre="${d.nombre}" · aria-labelledby=${d.labelledby ?? '—'} · aria-describedby=${d.describedby ?? '—'}`);
    anotar(testInfo, 'Texto del diálogo', d.texto);
    anotar(testInfo, 'Foco', `Inicial: ${d.focoInicial} · Recorrido Tab: ${d.recorrido.join(' → ')}`);

    expect.soft(['dialog', 'alertdialog'], '4.1.2: el diálogo no expone role dialog/alertdialog').toContain(d.rol);
    expect.soft(d.ariaModal, '4.1.2: falta aria-modal="true"').toBe('true');
    desviacion(!!d.labelledby, `4.1.2: el nombre del diálogo no se da por aria-labelledby (usa aria-label="${d.nombre}")`);
    desviacion(!!d.describedby && d.descripcion.length > 0, '4.1.2: el diálogo no tiene aria-describedby que apunte a la descripción de la irreversibilidad');
    desviacion(/no se puede deshacer|irreversible|inmutable/i.test(d.texto), '4.1.2/3.3.4: el texto no dice que el cierre es irreversible');
    desviacion(/ajuste|siguiente/i.test(d.texto), 'el texto no explica que las correcciones posteriores se registran como ajuste en el período siguiente');
    desviacion(/cancelar/i.test(d.focoInicial), `2.4.3: el foco inicial no queda en la acción segura "Cancelar" (queda en ${d.focoInicial})`);
    expect.soft(d.focoSaleDelDialogo, `2.1.2: el foco sale del diálogo con Tab/Shift+Tab: ${d.recorrido.join(' → ')}`).toBe(false);
    expect.soft(d.controlesSinFocoVisible, '2.4.7: controles del diálogo sin indicador de foco visible').toEqual([]);
    const confirmar = d.botones.find((b) => /cerrar per[ií]odo/i.test(b)) ?? '';
    desviacion(/\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i.test(confirmar),
      `3.3.4: el botón de confirmación ("${confirmar}") no nombra el período que se cierra`);

    const esc = await cerrarConEscape(page, disparador);
    expect.soft(esc.cerrado, '2.1.2: Escape no cierra el diálogo').toBe(true);
    expect.soft(cierres.length, 'Escape inició el cierre (llegó un POST /cierre)').toBe(0);
    expect.soft(esc.focoEnDisparador, `2.4.3: al cerrar, el foco no vuelve a "Cerrar período" (queda en ${esc.foco})`).toBe(true);

    // Cancelar con el botón también devuelve el foco.
    const d2 = await abrirYAuditarDialogo(page, disparador);
    if (d2.abierto) {
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.waitForTimeout(300);
      const vuelve = await disparador.evaluate((e) => document.activeElement === e);
      expect.soft(vuelve, '2.4.3: tras "Cancelar" el foco no vuelve al disparador').toBe(true);
    }
    expect.soft(cierres.length, 'Cancelar inició el cierre').toBe(0);
  });
});
