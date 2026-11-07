// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-252 RF-COT: estados de la cotización, modificación y anulación |
/**
 * TC-DIS-252 — Verificar accesibilidad WCAG 2.1 AA de los estados de la cotización (Cotizada /
 * Vencida / Anulada y estado al cierre) y de los flujos de modificación y anulación
 * RF-COT · CU-COT · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/cotizaciones
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (estados con ícono y etiqueta); 1.3.1 (tabla con
 * encabezados; "estado al cierre" y "estado actual" etiquetados por separado); 4.1.2, 2.1.2 y 2.4.3
 * (diálogo de anulación irrevocable: atrapa el foco, inicia en la acción segura y lo devuelve);
 * 3.3.1 (motivo obligatorio debajo del campo con role="alert"); 3.3.4 (confirmación explícita);
 * sin enums crudos ni null.
 *
 * Ambiente: TEST tiene cotizaciones reales COTIZADO y VENCIDA (paso a). ANULADA y la cotización de un
 * período CERRADO cuyo estado al cierre difiere del actual se simulan (b, c). Modificar y anular se
 * responden en la prueba; nada llega al backend ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_252_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, abrirSesionRol, abrirYAuditarDialogo, badges, cerrarConEscape, concederPermisos, irFinanzas, quitarSimulaciones, simularEscritura, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-252';
const VIEWPORTS = (process.env.TC_DIS_252_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['listado-real', 'listado-estados', 'dialogo-anulacion'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const cot = (id: number, estado: string, extra: Record<string, unknown> = {}) => ({
  id_cotizacion: id, fecha_emision: '2026-11-03', activos_cotizados: [7001], valor_razonable_referencia: '4500000.00', valor_cotizacion_propuesto: '4800000.00',
  condiciones: 'Pago contra entrega.', estado, fecha_vencimiento: '2026-12-03', motivo_anulacion: null, version: 1, estado_periodo: 'ABIERTO', ...extra,
});
const COTIZACIONES = [
  cot(1, 'COTIZADO'),
  cot(2, 'VENCIDA', { activos_cotizados: [7002], fecha_emision: '2026-09-02', fecha_vencimiento: '2026-10-02' }),
  cot(3, 'ANULADA', { activos_cotizados: [7003], motivo_anulacion: 'El comprador desistió de la compra del lote.' }),
  cot(4, 'VENCIDA', { activos_cotizados: [7002], fecha_emision: '2026-09-10', fecha_vencimiento: '2026-10-10', estado_periodo: 'CERRADO', estado_al_cierre: 'COTIZADO' }),
];

async function simular(page: Page) {
  await simularGet(page, /^\/finanzas\/cotizaciones$/, COTIZACIONES);
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
}

test.describe('TC-DIS-252 — Estados de la cotización, modificación y anulación', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_252_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.4.1 / 1.3.1] Listado real de cotizaciones', async ({}, testInfo) => {
    await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
    await escanear(page, TC_ID, __dirname, 'listado-real', testInfo, LH);
    const tabla = main(page).locator('table');
    const t = await auditarTabla(tabla);
    const b = await badges(tabla);
    anotar(testInfo, 'Tabla real', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas · estados: ${b.map((x) => x.texto).join(', ')}`);
    expect.soft(t.filasDesalineadas, '1.3.1: filas desalineadas con los encabezados').toEqual([]);
    desviacion(b.every((x) => x.icono), '1.4.1: los badges de estado (Cotizada/Vencida) no llevan ícono, solo texto y color');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [1.4.1 / 1.3.1] Los tres estados y la cotización de un período cerrado (Datos simulados)', async ({}, testInfo) => {
    await simular(page);
    anotar(testInfo, 'Datos simulados', 'Cotizaciones COTIZADO, VENCIDA, ANULADA y una VENCIDA de período CERRADO con estado al cierre COTIZADO.');
    await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
    await escanear(page, TC_ID, __dirname, 'listado-estados', testInfo, LH);
    const tabla = main(page).locator('table');
    const t = await auditarTabla(tabla);
    const b = await badges(tabla);
    anotar(testInfo, 'Estados', b.map((x) => x.texto).join(' ¦ '));
    for (const e of ['Cotizada', 'Vencida', 'Anulada']) expect.soft(b.some((x) => x.texto === e), `1.4.1: el estado "${e}" no aparece en texto`).toBe(true);
    desviacion(t.encabezados.some((e) => /al cierre/i.test(e)) || (await main(page).getByText(/estado al cierre/i).count()) > 0,
      '1.3.1: no se distinguen "estado al cierre" y "estado actual" en la cotización del período cerrado');
    const filaCerrada = tabla.locator('tbody tr').nth(3);
    const acciones = await filaCerrada.getByRole('button').count();
    const textoFila = (await filaCerrada.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Cotización del período cerrado', `${textoFila} · botones: ${acciones}`);
    expect.soft(acciones, 'En la cotización del período cerrado se ofrecen modificar o anular').toBe(0);
    desviacion(/per[ií]odo cerrado|no se puede (modificar|anular)/i.test(textoFila), '4.1.2: la cotización del período cerrado no dice en texto por qué no se puede modificar ni anular');
  });

  test('c. [4.1.2 / 2.1.2 / 2.4.3 / 3.3.1 / 3.3.4] Modificar y anular con teclado (Datos simulados)', async ({}, testInfo) => {
    await concederPermisos(page, [['cotizaciones', 3], ['cotizaciones', 4]]);
    await simular(page);
    const anulaciones = await simularEscritura(page, /\/cotizaciones\/\d+\/anulacion$/, 200, { ok: true });
    await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
    const fila = main(page).locator('table tbody tr').first();

    // Modificar: campos no modificables como solo lectura con su motivo.
    const modificar = fila.getByRole('button', { name: /Modificar/i });
    const dm = await abrirYAuditarDialogo(page, modificar);
    anotar(testInfo, 'Diálogo de modificación', dm.texto.slice(0, 400));
    desviacion(/fecha de emisi[oó]n/i.test(dm.texto) && /per[ií]odo/i.test(dm.texto) && /BOV-101/.test(dm.texto),
      '4.1.2: al modificar no se muestran como solo lectura los activos, la fecha de emisión y el período, ni el motivo de que no se puedan cambiar');
    await cerrarConEscape(page, modificar);

    // Anular: diálogo irrevocable.
    const anular = fila.getByRole('button', { name: /Anular/i });
    const d = await abrirYAuditarDialogo(page, anular);
    await escanear(page, TC_ID, __dirname, 'dialogo-anulacion', testInfo, LH);
    anotar(testInfo, 'Diálogo de anulación', `role=${d.rol} · aria-modal=${d.ariaModal} · nombre="${d.nombre}" · describedby=${d.describedby ?? '—'} · texto: ${d.texto.slice(0, 300)}`);
    anotar(testInfo, 'Foco', `Inicial: ${d.focoInicial} · ${d.recorrido.join(' → ')}`);
    desviacion(/irrevocable|no se puede deshacer|definitiv/i.test(d.texto), '4.1.2: el diálogo de anulación no comunica que la anulación es irrevocable');
    desviacion(/cancelar/i.test(d.focoInicial), `2.4.3: el foco inicial no queda en la acción segura (queda en ${d.focoInicial})`);
    expect.soft(d.focoSaleDelDialogo, '2.1.2: el foco sale del diálogo').toBe(false);
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('button', { name: /^Anular/ }).click();
    const error = dialogo.locator('.ds-field__error[role="alert"]');
    await expect.soft(error, '3.3.1: confirmar sin motivo no muestra el error debajo del campo con role="alert"').toBeVisible();
    expect.soft(anulaciones.length, '3.3.4: la anulación se envió sin motivo').toBe(0);
    await dialogo.getByRole('textbox').fill('El comprador retiró la oferta por cambio de condiciones del mercado.');
    await dialogo.getByRole('button', { name: /^Anular/ }).click();
    await page.waitForTimeout(800);
    expect.soft(anulaciones.length, '3.3.4: con motivo válido la anulación no se envía (Datos simulados)').toBe(1);
    const vuelve = await anular.evaluate((e) => document.activeElement === e).catch(() => false);
    anotar(testInfo, 'Foco tras anular', vuelve ? 'en el disparador' : 'fuera del disparador (la fila se recarga)');
  });
});
