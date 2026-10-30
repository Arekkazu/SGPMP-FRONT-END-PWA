/**
 * TC-DIS-174 — Accesibilidad WCAG 2.1 AA del panel de Distribución y Despliegue OTA
 * RF-70 · CU-06 Distribuir modelo OTA al nodo Edge · Rol: Administrador
 * Predicción → Modelos IA → "Distribución" (/prediccion/distribucion)
 *
 * Criterio (hoja M04): 0 violaciones axe A/AA en 1.3.1 (labels de device_id / id_version_modelo /
 * estado_despliegue / motivo_fallo / rollback_ejecutado / componente asociados), 1.4.1 (EXITOSO /
 * FALLIDO / PENDIENTE / SIN_CAMBIOS también con texto o ícono), 4.1.2 (filtro por estado_despliegue
 * con name/role/value) y 3.3.1 (motivo_fallo anunciado al abrir un despliegue FALLIDO). Nota del caso:
 * un FALLIDO con rollback_ejecutado = true debe comunicar que el dispositivo sigue con la versión
 * anterior; también se verifica un PENDIENTE con motivo FUERA_VENTANA_ACTUALIZACION.
 *
 * Datos: GET /prediccion/despliegues real. Si al ambiente le falta algún estado del criterio, se
 * AGREGAN filas simuladas a esa misma respuesta (route.fetch + fulfill, ids 990001+), copiadas de
 * un despliegue real cuando existe; el filtro por estado se respeta sobre la lista combinada. Cada
 * fila simulada queda anotada. "Nuevo despliegue" no se pulsa y el contexto aborta cualquier POST.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
// | Fecha      | Nombre        | Que se hizo                                                          |
// |------------|---------------|------------------------------------------------------------------------|
// | 2026-10-30 | Laura032005   | M04 RF-70: título renombrado a "Envío de modelos a campo" (ebf9bc4)   |
import { expect, test, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  PREFIJO_API, abrirSesion, anotar, auditarTabla, desviacion, escanear, irA, main, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-174';
const RUTA = 'prediccion/distribucion';
// 2026-10-30 (commit ebf9bc4): la vista se renombró de "Distribución de modelos (OTA)" a
// "Envío de modelos a campo" (prediction.json → distribucionotaview.titulo).
const TITULO = 'Envío de modelos a campo';
const PASOS_LIGHTHOUSE = ['listado', 'detalle-fallido', 'filtrado'];

const ESTADO_TEXTO: Record<string, string> = { EXITOSO: 'Exitoso', FALLIDO: 'Fallido', PENDIENTE: 'Pendiente', SIN_CAMBIOS: 'Sin cambios' };
const ESTADOS_TEXTO = [...Object.values(ESTADO_TEXTO), 'En proceso'];
const URL_DESPLIEGUES = (u: URL) => u.pathname === `${PREFIJO_API}/prediccion/despliegues`;

type Despliegue = Record<string, unknown> & {
  id_despliegue_ota: number;
  id_version_modelo: number;
  estado_despliegue: string;
  motivo_fallo: string | null;
  rollback_ejecutado: boolean;
};

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const BASE_SIMULADA: Despliegue = {
  id_despliegue_ota: 0, id_version_modelo: 2, id_dispositivo_iot: 1, tipo_modelo: 'MODELO_ESPECIES_MEDIANAS',
  paradigma: 'INDIVIDUAL', componente: null, modo_distribucion: 'CANARY', estado_despliegue: 'EXITOSO',
  hash_modelo_sha256: null, resultado_validacion_hash: null, id_version_modelo_anterior: null, rollback_ejecutado: false,
  intentos_descarga: 1, max_reintentos: 3, tamano_modelo_bytes: 5_242_880, tamano_descargado_bytes: null,
  duracion_proceso_ms: null, ventana_inicio: null, ventana_fin: null, nivel_bateria_al_inicio: 80,
  fecha_inicio: '2026-10-15T10:00:00Z', fecha_fin: null, motivo_fallo: null,
};

/**
 * Completa el GET de despliegues con los estados del criterio que el ambiente no tiene.
 * Devuelve los ids simulados por estado (para abrir su detalle).
 */
async function completarEstados(page: Page, testInfo: TestInfo) {
  const ids: Record<string, number> = {};
  await page.route(URL_DESPLIEGUES, async (r: Route) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const real = await r.fetch();
    if (!real.ok()) {
      anotar(testInfo, 'GET /prediccion/despliegues', `HTTP ${real.status()}: se devuelve tal cual, sin completar estados`);
      return r.fulfill({ response: real });
    }
    const crudo = (await real.json().catch(() => null)) as { total?: number; items?: Despliegue[] } | Despliegue[] | null;
    const lista = Array.isArray(crudo) ? crudo : crudo?.items ?? [];
    const datos = { total: Array.isArray(crudo) ? crudo.length : crudo?.total ?? lista.length, items: lista };
    const base: Despliegue = { ...BASE_SIMULADA, ...(datos.items[0] ?? {}) };
    const anterior = Math.max(1, base.id_version_modelo - 1);
    const requeridos: [string, (d: Despliegue) => boolean, Partial<Despliegue>][] = [
      ['EXITOSO', (d) => d.estado_despliegue === 'EXITOSO', { tamano_descargado_bytes: base.tamano_modelo_bytes as number, fecha_fin: '2026-10-15T10:05:00Z' }],
      ['FALLIDO', (d) => d.estado_despliegue === 'FALLIDO' && !!d.motivo_fallo && d.rollback_ejecutado, { motivo_fallo: 'HASH_INVALIDO', rollback_ejecutado: true, id_version_modelo_anterior: anterior, intentos_descarga: 3 }],
      ['PENDIENTE', (d) => d.estado_despliegue === 'PENDIENTE' && d.motivo_fallo === 'FUERA_VENTANA_ACTUALIZACION', { motivo_fallo: 'FUERA_VENTANA_ACTUALIZACION', intentos_descarga: 0 }],
      ['SIN_CAMBIOS', (d) => d.estado_despliegue === 'SIN_CAMBIOS', { intentos_descarga: 0 }],
    ];
    const extra: Despliegue[] = [];
    requeridos.forEach(([estado, existe, cambios], i) => {
      const realExistente = datos.items.find(existe);
      if (realExistente) { ids[estado] = realExistente.id_despliegue_ota; return; }
      const id = 990001 + i;
      ids[estado] = id;
      extra.push({ ...base, ...cambios, id_despliegue_ota: id, estado_despliegue: estado, rollback_ejecutado: cambios.rollback_ejecutado ?? false, motivo_fallo: cambios.motivo_fallo ?? null });
    });
    const estadoFiltro = new URL(r.request().url()).searchParams.get('estado');
    const items = [...datos.items, ...extra.filter((d) => !estadoFiltro || d.estado_despliegue === estadoFiltro)];
    return r.fulfill({ response: real, json: { total: datos.total + extra.length, items } });
  });
  return {
    ids,
    anotarSimulados: () => anotar(testInfo, 'Datos', `ids por estado: ${Object.entries(ids).map(([e, id]) => `${e}=#${id}${id >= 990001 ? ' (simulado)' : ''}`).join(', ')}`),
  };
}

function tabla(page: Page) {
  return main(page).getByRole('table');
}

/** Abre con teclado el detalle del despliegue #id. */
async function abrirDetalle(page: Page, id: number) {
  const fila = tabla(page).locator('tbody tr').filter({ hasText: `#${id}` }).first();
  // 2026-10-27: si la fila no existe, un .focus() sobre un locator sin match reintenta hasta el
  // timeout del test — en Chromium eso terminaba reportándose como "contexto cerrado" en vez de
  // un error claro. Se verifica explícito y acotado antes de interactuar.
  await expect(fila, `Precondición: no hay fila para el despliegue #${id} en el listado`).toBeVisible({ timeout: 15_000 });
  const ver = fila.getByRole('button', { name: 'Ver despliegue' });
  await ver.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: `Despliegue #${id}`, exact: true });
  await expect(dialogo, '2.1.1: Enter sobre "Ver despliegue" debe abrir el detalle').toBeVisible();
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Distribución y despliegue OTA (RF-70)`, () => {
  test.describe.configure({ mode: 'default' });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test.afterEach(async () => {
    await page.unroute(URL_DESPLIEGUES);
  });

  test('1. Listado - 0 violaciones axe A/AA, estado_despliegue con texto e ícono (1.4.1) y acciones con nombre único (4.1.2)', async ({}, testInfo) => {
    const sim = await completarEstados(page, testInfo);
    await irA(page, RUTA, TITULO);
    await expect(tabla(page)).toBeVisible();
    sim.anotarSimulados();

    const t = tabla(page);
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.celdasVacias, '1.3.1: celdas sin texto').toEqual([]);
    for (const col of ['Dispositivo', 'Versión', 'Estado']) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }

    const estados = await textosColumna(t, 'Estado');
    expect.soft(estados.filter((e) => !ESTADOS_TEXTO.includes(e)), '1.4.1: el estado del despliegue debe leerse como texto').toEqual([]);
    expect.soft(Object.values(ESTADO_TEXTO).filter((e) => !estados.includes(e)), '1.4.1: los 4 estados del criterio deben verse en el listado').toEqual([]);
    const sinIcono = await t.locator('tbody tr').evaluateAll((filas) => filas.filter((f) => !f.querySelector('td:nth-child(6) svg')).length);
    expect.soft(sinIcono, '1.4.1: el estado debe acompañarse de un ícono distintivo').toBe(0);

    const nombres = await t.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    expect.soft(new Set(nombres).size, `4.1.2 / 2.4.6: los ${nombres.length} botones de la columna Acciones se llaman todos "${nombres[0]}" y no dicen qué despliegue abren`).toBe(nombres.length);
    await expect.soft(main(page).getByRole('combobox', { name: 'Estado', exact: true }), '4.1.2: el filtro por estado_despliegue debe ser un combobox con nombre').toBeVisible();

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Despliegue FALLIDO con rollback - motivo_fallo anunciado (3.3.1) y versión anterior comunicada', async ({}, testInfo) => {
    const sim = await completarEstados(page, testInfo);
    await irA(page, RUTA, TITULO);
    await expect(tabla(page)).toBeVisible();
    sim.anotarSimulados();

    const dialogo = await abrirDetalle(page, sim.ids.FALLIDO);
    const motivo = dialogo.getByRole('alert').filter({ hasText: 'Motivo del fallo' });
    await expect.soft(motivo, '3.3.1: el motivo_fallo debe anunciarse (role="alert") al abrir el detalle').toBeVisible();
    await expect.soft(dialogo.getByText('Rollback ejecutado', { exact: true }), '1.4.1: rollback_ejecutado debe comunicarse con texto').toBeVisible();
    await expect.soft(dialogo.getByRole('progressbar', { name: 'Progreso de descarga' }), '4.1.2: la barra de progreso debe tener nombre y valor').toBeVisible();
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Detalle FALLIDO', texto.slice(0, 400));
    desviacion(/sigue (operando|con)|contin[uú]a con|mantiene la versi[oó]n|opera con la versi[oó]n/i.test(texto), 'con rollback_ejecutado = true el detalle no dice que el dispositivo sigue operando con la versión anterior (solo muestra "Versión anterior: vN")');
    await escanear(page, TC_ID, __dirname, 'detalle-fallido', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('3. Despliegue PENDIENTE por FUERA_VENTANA_ACTUALIZACION - el motivo es perceptible (3.3.1)', async ({}, testInfo) => {
    const sim = await completarEstados(page, testInfo);
    await irA(page, RUTA, TITULO);
    await expect(tabla(page)).toBeVisible();
    sim.anotarSimulados();

    const dialogo = await abrirDetalle(page, sim.ids.PENDIENTE);
    await expect.soft(dialogo, '1.4.1: el detalle debe nombrar el estado como texto').toContainText('Pendiente');
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    desviacion(/FUERA_VENTANA|fuera de (la )?ventana/i.test(texto), 'el detalle de un PENDIENTE no muestra su motivo (FUERA_VENTANA_ACTUALIZACION): solo se muestra motivo_fallo en FALLIDO');
    await escanear(page, TC_ID, __dirname, 'detalle-pendiente', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('4. Filtro por estado_despliegue - name/role/value (4.1.2) y 0 violaciones en el listado filtrado', async ({}, testInfo) => {
    const sim = await completarEstados(page, testInfo);
    await irA(page, RUTA, TITULO);
    await expect(tabla(page)).toBeVisible();
    sim.anotarSimulados();

    const filtro = main(page).getByRole('combobox', { name: 'Estado', exact: true });
    await filtro.selectOption('FALLIDO');
    await expect.soft(filtro, '4.1.2: el combobox debe exponer el valor elegido').toHaveValue('FALLIDO');
    const r = page.waitForResponse((res) => URL_DESPLIEGUES(new URL(res.url())), { timeout: 60_000 }).catch(() => null);
    await main(page).getByRole('button', { name: 'Aplicar', exact: true }).click();
    await r;
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    const estados = await textosColumna(tabla(page), 'Estado');
    anotar(testInfo, 'Filtro', `estado = FALLIDO → ${estados.length} fila(s)`);
    expect.soft(estados.filter((e) => e !== 'Fallido'), 'el filtro debe dejar solo despliegues FALLIDO').toEqual([]);
    await escanear(page, TC_ID, __dirname, 'filtrado', testInfo, PASOS_LIGHTHOUSE);
  });
});
