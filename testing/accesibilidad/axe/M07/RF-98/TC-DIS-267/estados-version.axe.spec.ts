// | Fecha      | Nombre      | Que se hizo                                                          |
// |------------|-------------|----------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-267 RF-98: estados de versión del contrato con texto e ícono  |
// | 2026-11-22 | SaraSofGonzalez | TC-DIS-267 RF-98: el recorrido de foco no cuenta <body> cuando el Tab sale de la página |
/**
 * TC-DIS-267 — Verificar accesibilidad WCAG 2.1 AA de los estados de versión del contrato de integración
 * (Pendiente / Activa / Deprecada / Inactiva) con texto y no solo color
 * RF-98 · CU-04 Gestionar versiones del contrato de integración · Rol: Administrador · Prioridad: Media
 * Ruta: /integracion/contrato
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (los 4 estados con ícono y etiqueta; la deprecada dice en
 * texto su fecha de inactivación y los días que le quedan); 1.4.3 (contraste de cada badge en tema claro
 * y oscuro); 1.3.1 (tabla con encabezados: versión, tipo de cambio, estado, vigencia, inactivación);
 * 2.4.6 (la versión del contrato y la del estándar AAEF con rótulos distintos); 2.1.1 y 2.4.7 (listado
 * y detalle por teclado con foco visible); sin enums crudos.
 *
 * Datos: escenario A de Datos_Semilla_M07_M08.md §3.2 (1.0 Retirada, 2.0 En retiro, 3.0 Activa,
 * 3.1 Pendiente con vigencia futura). El paso a usa los datos reales; b y c los simulan con la misma
 * forma para que el resultado no dependa del estado del ambiente ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_267_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion, recorrerConTab } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, accesoDenegado, badges, focoVisible, irIntegracion, quitarSimulaciones, simularContrato, temaOscuro, textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-267';
const VIEWPORTS = (process.env.TC_DIS_267_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['versiones-real', 'versiones-claro', 'versiones-oscuro'];
const ESTADOS = ['Pendiente', 'Activa', 'En retiro', 'Retirada'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-267 — Estados de versión del contrato', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_267_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (!page) return; await quitarSimulaciones(page); await temaOscuro(page, false); });

  const tablaVersiones = () => main(page).getByRole('region', { name: /Versiones del contrato/i }).locator('table');

  test('a. Versiones reales; precondición: los 4 estados sembrados (escenario A)', async ({}, testInfo) => {
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const denegado = await accesoDenegado(page).isVisible();
    precondicion(!denegado, 'el Administrador de TEST no tiene permiso de lectura sobre contratos_aaef');
    await escanear(page, TC_ID, __dirname, 'versiones-real', testInfo, LH);
    if (denegado) return;
    const b = await badges(tablaVersiones());
    anotar(testInfo, 'Estados reales', b.map((x) => x.texto).join(', ') || '(sin versiones)');
    for (const e of ESTADOS) precondicion(b.some((x) => x.texto === e), `no hay ninguna versión en estado "${e}" (Datos_Semilla_M07_M08.md §3.2)`);
  });

  test('b. [1.4.1 / 1.3.1 / 2.4.6] Estados con ícono y texto, fechas y rótulos (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    anotar(testInfo, 'Datos simulados', 'Escenario A: 1.0 Retirada, 2.0 En retiro hasta 2027-01-15, 3.0 Activa, 3.1/4.0/5.0 Pendientes.');
    await irIntegracion(page, 'contrato', /Contrato contable/);
    await escanear(page, TC_ID, __dirname, 'versiones-claro', testInfo, LH);
    const tabla = tablaVersiones();
    const t = await auditarTabla(tabla);
    const b = await badges(tabla);
    anotar(testInfo, 'Tabla de versiones', `Encabezados: ${t.encabezados.join(' | ')} · estados: ${b.map((x) => `${x.texto}${x.icono ? ' (ícono)' : ''}`).join(', ')}`);
    for (const e of ESTADOS) expect.soft(b.some((x) => x.texto === e), `1.4.1: el estado "${e}" no aparece en texto`).toBe(true);
    desviacion(b.length > 0 && b.every((x) => x.icono), '1.4.1: los badges de estado de versión no llevan ícono (solo texto y color)');
    expect.soft(t.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    desviacion(t.encabezados.some((e) => /tipo de cambio/i.test(e)), '1.3.1: el tipo de cambio no tiene columna propia (va como texto secundario dentro de "Versión")');
    desviacion(t.encabezados.some((e) => /inactivaci|retiro/i.test(e)), '1.3.1: la fecha de inactivación no tiene columna propia (solo aparece en "Fechas" para la versión en retiro)');

    const retiro = tabla.locator('tbody tr').filter({ hasText: /^\s*2\.0/ }).first();
    const textoRetiro = (await retiro.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Versión en retiro', textoRetiro);
    expect.soft(/Se retira el/i.test(textoRetiro), '1.4.1: la versión en retiro no dice en texto su fecha de inactivación').toBe(true);
    desviacion(/\d+\s+d[ií]as/i.test(textoRetiro), '1.4.1: la versión en retiro no dice cuántos días le quedan del período de gracia');

    const texto = await main(page).innerText();
    desviacion(/est[aá]ndar/i.test(texto), '2.4.6: no hay un rótulo para la versión del estándar AAEF distinto del de la versión del contrato (RFC-017 D-17.11)');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('c. [1.4.3] Tema oscuro (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    await irIntegracion(page, 'contrato', /Contrato contable/);
    await temaOscuro(page, true);
    await escanear(page, TC_ID, __dirname, 'versiones-oscuro', testInfo, LH);
  });

  test('d. [2.1.1 / 2.4.7] Recorrido por teclado y detalle de una versión (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    await irIntegracion(page, 'contrato', /Contrato contable/);
    await main(page).getByRole('heading', { level: 1 }).click();
    const recorrido = await recorrerConTab(page, 14);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    const sinFoco: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      // Al final de la página el Tab pasa a la interfaz del navegador y el foco queda en <body>: no es un control.
      if (await page.evaluate(() => document.activeElement === document.body)) continue;
      if (!(await focoVisible(page))) sinFoco.push(String(i));
    }
    expect.soft(sinFoco, '2.4.7: controles sin indicador de foco visible').toEqual([]);
    const detalle = await tablaVersiones().locator('tbody tr').first().locator('a, button[aria-expanded], [role="button"]').count()
      + await tablaVersiones().locator('tbody tr[tabindex]').count();
    desviacion(detalle > 0, '2.1.1: ninguna versión se puede abrir en detalle (con teclado ni con mouse); el caso pide abrir el detalle de una versión');
  });
});
