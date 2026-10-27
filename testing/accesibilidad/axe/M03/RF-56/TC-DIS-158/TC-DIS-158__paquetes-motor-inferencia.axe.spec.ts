/**
 * TC-DIS-158 — Accesibilidad WCAG 2.1 AA de la vista técnica de Paquetes de Envío al Motor de Inferencia
 * RF-56 · CU-02 Procesar Telemetría en el Edge · Rol: Administrador (el caso admite Ingeniero de Campo)
 * Telemetría → Flujo IoT → "Pipeline" (/telemetria/pipeline)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados
 * id_paquete/estado_envio/reintentos asociados), 1.4.1 (PENDIENTE/ENVIADO/FALLIDO también con texto),
 * 4.1.2 (name/role/value en filtros y detalle del paquete), 3.3.1 (motivo de rechazo del motor y flag
 * contexto_incompleto anunciados) y 1.4.3 (contraste ≥4.5:1).
 *
 * 2026-10-27: PROTO-V2 (21/10) agregó filtros (estado/contexto) y detalle de paquete por clic;
 * la vista sigue sobre datos simulados (DatosSimuladosBanner), no el backend real.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 * Sin escrituras: la vista es de solo lectura.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, hayTrampaDeFoco, irA, main,
  precondicion, recorrerConTab, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-158';
const RUTA = 'telemetria/pipeline';
const TITULO = 'Pipeline de Inferencia';
const PASOS_LIGHTHOUSE = ['listado', 'detalle-fallido', 'detalle-contexto-incompleto'];

// 2026-10-27: la celda muestra el estado capitalizado ("Pendiente"/"Enviado"), y "Fallido"
// trae además el motivo de rechazo concatenado en la misma celda ("Fallido <motivo>").
const ESTADOS_ENVIO = ['Pendiente', 'Enviado', 'Fallido'];
const esEstadoConocido = (celda: string) => ESTADOS_ENVIO.some((e) => celda === e || celda.startsWith(`${e} `));
const COLUMNAS_CRITERIO = ['Paquete', 'Estado', 'Reintentos'];
const MAX_REINTENTOS = 5; // política de reintentos de RF-56

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

/** Abre el detalle de la fila con Enter si la fila es enfocable; si no, registra la desviación. */
async function abrirDetalle(page: Page, filtro: string) {
  const fila = tabla(page).locator('tbody tr').filter({ hasText: filtro }).first();
  if ((await fila.count()) === 0) return { fila, dialogo: null };
  const enfocable = (await fila.getAttribute('tabindex')) !== null;
  desviacion(enfocable, `las filas de paquetes no son enfocables ni abren un detalle con Enter (fila "${filtro}")`);
  if (!enfocable) return { fila, dialogo: null };
  await fila.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog');
  await expect(dialogo, 'Enter sobre la fila debe abrir el detalle del paquete').toBeVisible();
  return { fila, dialogo };
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Paquetes de envío al motor de inferencia (RF-56)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Listado de paquetes - 0 violaciones axe A/AA, encabezados asociados (1.3.1) y estado_envio con texto (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    if (await main(page).getByRole('note').filter({ hasText: 'Datos simulados' }).isVisible()) {
      anotar(testInfo, 'Datos', 'Vista con datos simulados (DatosSimuladosBanner): sin endpoints AIOT todavía.');
    }

    const t = tabla(page);
    await expect(t).toBeVisible();
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.thEnThead, '1.3.1: los encabezados deben ser <th> dentro de <thead>').toBe(true);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.celdasVacias, '1.3.1: celdas sin texto (el lector anuncia la celda vacía)').toEqual([]);
    for (const col of COLUMNAS_CRITERIO) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }

    const estados = await textosColumna(t, 'Estado');
    anotar(testInfo, 'estado_envio', [...new Set(estados)].join(', '));
    expect.soft(estados.filter((e) => !esEstadoConocido(e)), '1.4.1: el estado_envio debe leerse como texto, no solo por color').toEqual([]);
    precondicion(ESTADOS_ENVIO.every((e) => estados.some((celda) => esEstadoConocido(celda) && celda.startsWith(e))), `faltan estados de envío en el listado: ${ESTADOS_ENVIO.filter((e) => !estados.some((celda) => celda.startsWith(e))).join(', ') || 'ninguno'}`);

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Paquete FALLIDO - reintentos y motivo de rechazo perceptibles (3.3.1), detalle con 0 violaciones', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const t = tabla(page);
    const estados = await textosColumna(t, 'Estado');
    const reintentos = await textosColumna(t, 'Reintentos');
    const i = estados.findIndex((e) => e.startsWith('Fallido'));
    precondicion(i >= 0, 'no hay ningún paquete FALLIDO en el listado');
    if (i < 0) return;
    anotar(testInfo, 'FALLIDO', `reintentos: ${reintentos[i]} (política: ${MAX_REINTENTOS})`);
    // La celda muestra "N/${MAX_REINTENTOS}" (p.ej. "5/5"), no el número solo.
    precondicion(reintentos[i] === `${MAX_REINTENTOS}/${MAX_REINTENTOS}`, `el paquete FALLIDO debe tener los ${MAX_REINTENTOS} reintentos agotados; tiene ${reintentos[i]}`);

    const { fila, dialogo } = await abrirDetalle(page, 'FALLIDO');
    // La redacción real no usa literalmente "motivo"/"rechaz": explica la causa en lenguaje
    // llano ("ya no acepta", "incompatible"). Se acepta esa redacción como equivalente.
    const EXPLICA_CAUSA = /motivo|rechaz|no acepta|incompatib|inválid[oa]|excede|super[óa]/i;
    desviacion(EXPLICA_CAUSA.test(await fila.innerText()) || !!dialogo, 'el motivo de rechazo del motor de inferencia no se muestra en ninguna parte (ni en la fila ni en un detalle)');
    if (!dialogo) return;
    await expect.soft(dialogo, '3.3.1: el detalle debe explicar la causa del rechazo').toContainText(EXPLICA_CAUSA);
    await escanear(page, TC_ID, __dirname, 'detalle-fallido', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('3. Paquete con contexto_incompleto - el flag se comunica como texto (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const fila = tabla(page).locator('tbody tr').filter({ hasText: /incompleto/i }).first();
    precondicion((await fila.count()) > 0, 'no hay ningún paquete con contexto_incompleto = true en el listado');
    if ((await fila.count()) === 0) return;
    anotar(testInfo, 'contexto_incompleto', (await fila.innerText()).replace(/\s+/g, ' '));

    const { dialogo } = await abrirDetalle(page, 'incompleto');
    if (!dialogo) return;
    await expect.soft(dialogo, '3.3.1: el detalle debe indicar que el contexto está incompleto').toContainText(/incompleto/i);
    await escanear(page, TC_ID, __dirname, 'detalle-contexto-incompleto', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('4. Teclado - Tab recorre filtros y filas en orden lógico, sin trampas (2.1.1 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filtros = await main(page).getByRole('combobox').count() + await main(page).getByRole('textbox').count();
    desviacion(filtros > 0, 'la vista no tiene filtros (el paso 5 pide recorrer filtros y filas)');
    // El H1 no es un elemento enfocable: empezar el Tab ahí deja el recorrido en el sidebar
    // (12+ enlaces de navegación) sin llegar nunca a la tabla. Se enfoca el primer filtro real.
    await main(page).getByRole('combobox').first().focus();
    const recorrido = await recorrerConTab(page, 15);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    desviacion(recorrido.some((f) => f.startsWith('tr')), 'Tab no alcanza ninguna fila de la tabla: los paquetes no son operables con teclado');
  });
});
