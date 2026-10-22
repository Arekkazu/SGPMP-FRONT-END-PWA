/**
 * TC-DIS-160 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del Historial de Lecturas Ambientales
 * (alternativa en texto a gráficas de tendencia)
 * RF-59 · CU-04 Monitorear y Consultar Telemetría · Rol: Administrador (el caso admite Productor/Vet/Ing.)
 * Telemetría → "Historial" (/telemetria/historial)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA con énfasis CRÍTICO en 1.1.1 (la gráfica de tendencia
 * tiene una alternativa en texto —tabla de datos— equivalente), 1.4.1 (estado_semaforo_historico
 * VERDE/AMARILLO/ROJO también con texto o ícono), 1.3.1 (encabezados de la tabla y de los filtros de
 * fecha/variable/sensor/especie/estado), 4.1.2 (exportación y filtros con name/role/value) y 3.3.1
 * ('sin resultados' y error de rango > 90 días anunciados).
 *
 * Datos reales: GET /iot/monitoreo/historial (solo lectura). La exportación no se dispara (el
 * diálogo se audita sin elegir formato). El rango > 90 días se consulta de verdad: es un GET.
 *
 * Datos semilla (DBA, 21/10/2026): área 347, últimos 7 días, sensores de temperatura y humedad y
 * lecturas BUFFER_LOCAL. La consulta por defecto de la vista (30 días, sin área) supera el límite
 * de 10.000 registros del backend (422 VOLUMEN_EXCESIVO), así que cada test acota primero a
 * TC_DIS_160_AREA (347) y TC_DIS_160_DIAS (7) antes de auditar.
 *
 * La verificación manual de 1.1.1 con lector de pantalla (paso 3) queda fuera del spec; el spec deja
 * la evidencia automatizable: la tabla tiene una fila por cada lectura que dibuja la gráfica.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, estaEnRegionViva, fechaHaceDias,
  irA, json, main, precondicion, regionesVivas, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-160';
const RUTA = 'telemetria/historial';
const TITULO = 'Historial de Lecturas';
const PASOS_LIGHTHOUSE = ['vista', 'exportar', 'error-rango'];

const URL_HISTORIAL = esGet('/iot/monitoreo/historial');
const SEMAFORO_TEXTO = ['Normal', 'Advertencia', 'Fuera de rango', 'Sin señal'];
const FILTROS = [/^Desde/, /^Hasta/, /^Variable$/, /^Categoría$/, /^ID infraestructura$/, /^Especie$/, /^Estado de la lectura$/, /^Origen del dato$/];
const SIN_RESULTADOS = 'Sin lecturas para el rango y filtros seleccionados.';
const AREA = process.env.TC_DIS_160_AREA ?? '347';
const DIAS = Number(process.env.TC_DIS_160_DIAS ?? 7);

interface Lectura { tipo_variable: string; origen_dato: string; estado_semaforo_historico: string | null }

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

async function consultar(page: Page) {
  const r = page.waitForResponse(URL_HISTORIAL, { timeout: 180_000 }).catch(() => null);
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  const res = await r;
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  return res;
}

/**
 * Abre la vista y acota la consulta al área y rango de los datos semilla. Devuelve la respuesta de
 * la carga por defecto (para registrar si falla) y la de la consulta acotada.
 */
async function abrirAcotado(page: Page) {
  const inicial = await irA(page, RUTA, TITULO, URL_HISTORIAL);
  await main(page).getByLabel(/^Desde/).fill(fechaHaceDias(DIAS));
  await main(page).getByLabel(/^ID infraestructura$/).fill(AREA);
  const acotada = await consultar(page);
  return { inicial, acotada };
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Historial de lecturas ambientales (RF-59)`, () => {
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

  test('1. CRÍTICO - gráfica con alternativa en tabla equivalente (1.1.1), semáforo con texto (1.4.1) y filtros etiquetados (1.3.1)', async ({}, testInfo) => {
    const { inicial, acotada } = await abrirAcotado(page);
    anotar(testInfo, 'Carga por defecto (30 días, sin área)', `HTTP ${inicial?.status() ?? 'sin respuesta'}${inicial && !inicial.ok() ? ` · ${(await inicial.text().catch(() => '')).slice(0, 200)}` : ''}`);
    desviacion(!!inicial?.ok(), 'al abrir, la consulta por defecto (últimos 30 días) supera el límite del backend y la vista arranca vacía con un error');
    const datos = await json<{ total: number; items: Lectura[] }>(acotada);
    expect(datos, `GET /iot/monitoreo/historial acotado (área ${AREA}, ${DIAS} días) debe responder 200`).not.toBeNull();
    const items = datos?.items ?? [];
    const variables = [...new Set(items.map((i) => i.tipo_variable))];
    anotar(testInfo, `Datos (área ${AREA}, ${DIAS} días)`, `${items.length} lectura(s) en la página · total ${datos?.total} · variables: ${variables.join(', ')}`);
    precondicion(items.length > 0, `el área ${AREA} no tiene lecturas en los últimos ${DIAS} días`);
    precondicion(variables.length >= 2, 'el historial debe tener al menos 2 tipos de variable');

    // Filtros con label asociado (1.3.1)
    const sinLabel: string[] = [];
    for (const re of FILTROS) {
      if ((await main(page).getByLabel(re).count()) === 0) sinLabel.push(re.source);
    }
    expect.soft(sinLabel, '1.3.1: filtros sin label asociado').toEqual([]);
    for (const re of [/^Desde/, /^Hasta/]) {
      await expect.soft(main(page).getByLabel(re), `1.3.1: "${re.source}" es obligatorio y debe exponer aria-required`).toHaveAttribute('aria-required', 'true');
    }
    desviacion((await main(page).getByLabel(/sensor/i).count()) > 0, 'no hay filtro por sensor (el criterio pide fecha/variable/sensor/especie/estado)');

    if (items.length > 0) {
      // 1.1.1: la gráfica existe y la tabla tiene una fila por cada lectura que la gráfica dibuja
      const titulo = main(page).getByRole('heading', { name: 'Evolución de lecturas', exact: true });
      await expect(titulo, 'con lecturas, la vista debe mostrar la gráfica de evolución').toBeVisible();
      const grafica = main(page).locator('div').filter({ has: titulo }).last();
      // evaluateAll no espera: un locator.evaluate sin elemento se queda esperando hasta el timeout del test
      const svg = await grafica.locator('svg').evaluateAll((els) => els.map((s) => ({
        role: s.getAttribute('role'), label: s.getAttribute('aria-label'), oculto: s.getAttribute('aria-hidden'), descrita: s.getAttribute('aria-describedby'),
      })));
      anotar(testInfo, 'Gráfica (SVG)', JSON.stringify(svg));

      const t = tabla(page);
      await expect(t, '1.1.1 CRÍTICO: la gráfica necesita una alternativa en tabla de datos').toBeVisible();
      const a = await auditarTabla(t);
      anotar(testInfo, 'Tabla alternativa', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s) vs ${items.length} lectura(s) de la gráfica`);
      expect.soft(a.filas, '1.1.1 CRÍTICO: la tabla debe contener las mismas lecturas que la gráfica').toBe(items.length);
      expect.soft(a.thEnThead, '1.3.1: los encabezados de la tabla deben ser <th> en <thead>').toBe(true);
      expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);

      const semaforo = await textosColumna(t, 'Semáforo');
      anotar(testInfo, 'Semáforo histórico', [...new Set(semaforo)].join(', '));
      expect.soft(semaforo.filter((s) => !SEMAFORO_TEXTO.includes(s)), '1.4.1: el semáforo histórico debe leerse como texto (Normal/Advertencia/Fuera de rango)').toEqual([]);
      precondicion(items.some((i) => i.estado_semaforo_historico), 'ninguna lectura trae estado_semaforo_historico (¿umbrales de M09 sin configurar?)');
    }

    await escanear(page, TC_ID, __dirname, 'vista', testInfo, PASOS_LIGHTHOUSE);

    // BUFFER_LOCAL: se busca con el filtro de origen (puede no caer en la primera página)
    await main(page).getByLabel(/^Origen del dato$/).selectOption('BUFFER_LOCAL');
    const buffer = await json<{ total: number }>(await consultar(page));
    anotar(testInfo, 'Lecturas BUFFER_LOCAL', String(buffer?.total ?? 'sin respuesta'));
    precondicion((buffer?.total ?? 0) > 0, `el área ${AREA} debe incluir lecturas sincronizadas desde buffer local (BUFFER_LOCAL)`);
  });

  test('2. Filtro por variable y rango de fechas - 0 violaciones axe A/AA sobre el resultado', async ({}, testInfo) => {
    const { acotada } = await abrirAcotado(page);
    const variable = (await json<{ items: Lectura[] }>(acotada))?.items[0]?.tipo_variable;
    precondicion(!!variable, 'sin lecturas no hay variable con la cual filtrar');
    if (!variable) return;
    await main(page).getByLabel(/^Variable$/).fill(variable);
    const res = await consultar(page);
    const datos = await json<{ items: Lectura[] }>(res);
    anotar(testInfo, 'Filtro', `variable=${variable}, área ${AREA}, últimos ${DIAS} días → ${datos?.items.length ?? 'sin respuesta'} lectura(s)`);
    await escanear(page, TC_ID, __dirname, 'filtro', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Sin resultados - el mensaje se anuncia sin mover el foco (3.3.1 / 4.1.3)', async ({}, testInfo) => {
    await abrirAcotado(page);
    await main(page).getByLabel(/^Variable$/).fill('QA_SIN_RESULTADOS');
    await consultar(page);
    const mensaje = main(page).getByText(SIN_RESULTADOS, { exact: true });
    await expect(mensaje, 'un filtro sin resultados debe mostrar el estado vacío').toBeVisible();
    anotar(testInfo, 'Regiones vivas', (await regionesVivas(page)).join(' ; ') || 'ninguna');
    expect.soft(await estaEnRegionViva(mensaje), '3.3.1/4.1.3: el mensaje "sin resultados" no está en una región aria-live/status: el lector no lo anuncia').toBe(true);
    await escanear(page, TC_ID, __dirname, 'sin-resultados', testInfo, PASOS_LIGHTHOUSE);
  });

  test('4. Diálogo de exportación PDF/Excel - name/role/value (4.1.2) y foco al abrir (2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_HISTORIAL);
    const exportar = main(page).getByRole('button', { name: 'Exportar', exact: true });
    desviacion(await exportar.isVisible(), 'el botón "Exportar" no aparece (¿la cuenta no tiene permiso E sobre el recurso 34?)');
    if (!(await exportar.isVisible())) return;

    await exportar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: 'Exportar historial de lecturas' });
    await expect(dialogo, 'Enter sobre "Exportar" debe abrir el diálogo').toBeVisible();
    const foco = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    anotar(testInfo, 'Foco al abrir', foco ? 'dentro del diálogo' : 'fuera del diálogo');
    expect.soft(foco, '2.4.3: al abrir el diálogo el foco debe entrar en él').toBe(true);
    await expect.soft(dialogo.getByRole('button', { name: 'PDF', exact: true }), '4.1.2: botón PDF con nombre accesible').toBeVisible();
    await expect.soft(dialogo.getByRole('button', { name: 'Excel', exact: true }), '4.1.2: botón Excel con nombre accesible').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'exportar', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
    await expect.soft(dialogo, 'Escape debe cerrar el diálogo').toBeHidden();
  });

  test('5. Rango de fechas > 90 días - el error se muestra y se anuncia (3.3.1)', async ({}, testInfo) => {
    // En TEST una consulta larga puede tardar minutos: el GET tiene su propio límite y el test más margen
    testInfo.setTimeout(540_000);
    await irA(page, RUTA, TITULO, URL_HISTORIAL);
    // Con el área acotada, el error esperado es el de rango y no el de volumen (VOLUMEN_EXCESIVO)
    await main(page).getByLabel(/^ID infraestructura$/).fill(AREA);
    await main(page).getByLabel(/^Desde/).fill(fechaHaceDias(120));
    const res = await consultar(page);
    anotar(testInfo, 'Respuesta', `GET historial con 120 días → HTTP ${res?.status() ?? 'sin respuesta en 3 min'}`);
    expect.soft(res, '3.3.1: el backend no rechaza el rango de 120 días: la consulta no responde en 3 minutos en vez de devolver un error de rango').not.toBeNull();
    const alerta = main(page).getByRole('alert');
    expect.soft(await alerta.count(), '3.3.1: un rango de 120 días sin filtros adicionales debe mostrar un error anunciado (role="alert")').toBeGreaterThan(0);
    if (await alerta.count()) anotar(testInfo, 'Error', (await alerta.first().innerText()).replace(/\s+/g, ' '));
    await escanear(page, TC_ID, __dirname, 'error-rango', testInfo, PASOS_LIGHTHOUSE);
  });
});
