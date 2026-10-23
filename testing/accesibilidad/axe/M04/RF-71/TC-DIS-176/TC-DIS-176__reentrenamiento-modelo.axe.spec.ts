/**
 * TC-DIS-176 — Accesibilidad WCAG 2.1 AA del panel de Reentrenamiento del Modelo de Predicción
 * RF-71 · CU-07 Reentrenar modelo de predicción · Rol: Administrador (el caso admite Veterinario)
 * Predicción → Modelos IA → "Reentrenamiento" (/prediccion/reentrenamiento)
 *
 * Criterio (hoja M04): 0 violaciones axe A/AA en 1.3.1 (labels de tipo_modelo /
 * trigger_reentrenamiento / estado_proceso / fecha_inicio / fecha_fin asociados), 1.4.1 (COMPLETADO /
 * FALLIDO / ABORTADO también con texto o ícono), 3.3.1 (errores del proceso —DATASET_INSUFICIENTE,
 * INCONSISTENCIA_CATALOGO, PARAMETROS_INVALIDOS— anunciados) y 4.1.2 (botón de inicio manual con
 * name/role/value habilitado/deshabilitado). Nota del caso: antes de un disparo MANUAL se debe avisar,
 * de forma accesible, que es un proceso de alto consumo de recursos (prioridad BAJA).
 *
 * La vista usa datos simulados (DatosSimuladosBanner): el disparo lo ejecuta el pipeline del equipo
 * IoT/IA y el formulario de "Nuevo reentrenamiento" es de ejemplo (controles deshabilitados). Los
 * errores E1 no se pueden provocar desde la UI y quedan como "Desviación de la especificación".
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, camposSinNombre, desviacion, escanear, irA, main, precondicion, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-176';
const RUTA = 'prediccion/reentrenamiento';
const TITULO = 'Reentrenamiento de Modelos';
const PASOS_LIGHTHOUSE = ['historial', 'modal-nuevo', 'monitor'];

const ESTADOS_CRITERIO = ['Completado', 'Fallido', 'Abortado'];
const ESTADOS_TEXTO = ['En proceso', 'Completado', 'Fallido', 'Cancelado', 'Abortado'];
const COLUMNAS_CRITERIO = ['Tipo de modelo', 'Activación', 'Estado', 'Fecha inicio', 'Fecha fin'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

function botonNuevo(page: Page) {
  return main(page).getByRole('button', { name: 'Nuevo reentrenamiento', exact: true });
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Reentrenamiento del modelo de predicción (RF-71)`, () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(420_000);
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Historial de ejecuciones - 0 violaciones axe A/AA, encabezados (1.3.1) y estado_proceso con texto (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    if (await main(page).getByRole('note').filter({ hasText: 'Datos simulados' }).isVisible()) {
      anotar(testInfo, 'Datos', 'Vista con datos simulados (DatosSimuladosBanner): el reentrenamiento lo ejecuta el pipeline IoT/IA.');
    }
    const t = tabla(page);
    await expect(t).toBeVisible();
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.thEnThead, '1.3.1: los encabezados deben ser <th> dentro de <thead>').toBe(true);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    for (const col of COLUMNAS_CRITERIO) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }

    const estados = await textosColumna(t, 'Estado');
    anotar(testInfo, 'estado_proceso', [...new Set(estados)].join(', '));
    expect.soft(estados.filter((e) => !ESTADOS_TEXTO.includes(e)), '1.4.1: el estado del proceso debe leerse como texto').toEqual([]);
    precondicion(ESTADOS_CRITERIO.every((e) => estados.includes(e)), `faltan estados en el historial: ${ESTADOS_CRITERIO.filter((e) => !estados.includes(e)).join(', ') || 'ninguno'}`);
    desviacion(!estados.includes('Cancelado') || estados.includes('Abortado'), 'el historial usa "Cancelado" donde el RF-71 define ABORTADO');

    const nombres = await t.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? (e.textContent ?? '').trim()));
    expect.soft(new Set(nombres).size, `4.1.2 / 2.4.6: los ${nombres.length} botones de Acciones se llaman todos "${nombres[0]}" y no dicen qué proceso abren`).toBe(nombres.length);

    await escanear(page, TC_ID, __dirname, 'historial', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Disparo MANUAL - formulario etiquetado (1.3.1), estado deshabilitado (4.1.2), aviso de consumo y error DATASET_INSUFICIENTE (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await botonNuevo(page).focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: 'Nuevo reentrenamiento', exact: true });
    await expect(dialogo, 'Enter sobre "Nuevo reentrenamiento" debe abrir el formulario').toBeVisible();

    expect.soft(await camposSinNombre(dialogo), '1.3.1: controles del formulario sin label').toEqual([]);
    const comenzar = dialogo.getByRole('button', { name: 'Revisar y comenzar', exact: true });
    await expect.soft(comenzar, '4.1.2: el inicio manual no disponible debe exponerse como deshabilitado').toBeDisabled();
    const razon = await comenzar.evaluate((b) => `title="${b.getAttribute('title') ?? ''}" aria-describedby=${b.getAttribute('aria-describedby')}`);
    anotar(testInfo, 'Botón "Revisar y comenzar"', razon);

    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    desviacion(/consumo|recursos|prioridad baja/i.test(texto), 'antes del disparo MANUAL no se avisa que es un proceso de alto consumo de recursos (prioridad BAJA)');
    desviacion(/DATASET_INSUFICIENTE|500 registros|insuficiente/i.test(texto), 'el formulario no puede enviarse, así que el error E1 (DATASET_INSUFICIENTE, <500 registros) no se puede provocar ni auditar');
    await escanear(page, TC_ID, __dirname, 'modal-nuevo', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('3. Botón de inicio manual con un proceso en curso - deshabilitado y perceptible (4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const estados = await textosColumna(tabla(page), 'Estado');
    const enCurso = estados.includes('En proceso');
    precondicion(enCurso, 'no hay ningún proceso de reentrenamiento en curso');
    const boton = botonNuevo(page);
    const atributos = await boton.evaluate((b) => ({ disabled: (b as HTMLButtonElement).disabled, ariaDisabled: b.getAttribute('aria-disabled') }));
    anotar(testInfo, 'Botón "Nuevo reentrenamiento"', `proceso en curso: ${enCurso} · disabled=${atributos.disabled} aria-disabled=${atributos.ariaDisabled}`);
    if (enCurso) {
      expect.soft(atributos.disabled || atributos.ariaDisabled === 'true', '4.1.2: con un proceso en curso el inicio manual sigue habilitado (el sistema no inicia otro proceso para el mismo tipo_modelo)').toBe(true);
    }
  });

  test('4. Monitor de un proceso - barras con nombre y valor (4.1.2) y estado de cada fase con texto (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const ver = tabla(page).getByRole('button', { name: 'Ver', exact: true }).first();
    await ver.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: /^Reentrenamiento #/ });
    await expect(dialogo, 'Enter sobre "Ver" debe abrir el monitor del proceso').toBeVisible();

    const barras = await dialogo.getByRole('progressbar').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label')}=${e.getAttribute('aria-valuenow')}`));
    anotar(testInfo, 'Barras de progreso', barras.join(' | '));
    expect.soft(barras.filter((b) => b.startsWith('null') || b.endsWith('=null')), '4.1.2: barras de progreso sin nombre o sin valor').toEqual([]);

    const fases = await dialogo.getByRole('heading', { name: 'Fases del proceso', exact: true }).locator('xpath=following-sibling::div[1]/div').allInnerTexts();
    anotar(testInfo, 'Fases', fases.join(' | '));
    expect.soft(fases.some((f) => /complet|en curso|pendiente/i.test(f)), '1.4.1: el estado de cada fase (completada / en curso / pendiente) solo se distingue por un ícono decorativo (aria-hidden) y el color').toBe(true);

    await escanear(page, TC_ID, __dirname, 'monitor', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });
});
