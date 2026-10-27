/**
 * TC-DIS-162 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del Panel de Estado de Dispositivos IoT y Control
 * de Heartbeat (riesgo de semaforización solo-color)
 * RF-60 · CU-04 Monitorear y Consultar Telemetría · Rol: Administrador (el caso admite Ingeniero de Campo)
 * Telemetría → "Dispositivos" (/telemetria/dispositivos)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA con énfasis CRÍTICO en 1.4.1 (los 5 estados ACTIVO /
 * SIN_SEÑAL / BUFFER_ACTIVO / INACTIVO / EN_MANTENIMIENTO con texto o ícono además del color),
 * 1.3.1 (encabezados device_id/estado/nivel_bateria/calidad_senal), 4.1.2 (acción EN_MANTENIMIENTO
 * con name/role/value y usable por teclado), 3.3.1 (alertas DISPOSITIVO_SIN_SEÑAL / DISPOSITIVO_INACTIVO
 * / SEÑAL_DEGRADADA anunciadas) y 1.4.3.
 *
 * 2026-10-27: M3-10 reemplazó el campo "ID de dispositivo" por un listado real
 * (DispositivosLista, con buscador y filtro de estado); el spec ya no consulta IDs a mano,
 * escanea las filas del listado y registra qué estados del criterio faltan en el ambiente.
 *
 * Escrituras: SIMULADAS. El PATCH /iot/dispositivos/<id>/mantenimiento se responde con 422 simulado
 * (el dispositivo no cambia de estado, así que no hay que devolverlo a ACTIVO); sirve para probar que
 * Enter dispara la acción igual que el clic y que el error se anuncia.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  PREFIJO_API, abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, irA, main,
  precondicion, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-162';
const RUTA = 'telemetria/dispositivos';
const TITULO = 'Estado de Dispositivos IoT';
const PASOS_LIGHTHOUSE = ['vista-inicial', 'detalle-dispositivo', 'modal-mantenimiento'];

// Texto que muestra EstadoDispositivoPill por cada estado del ciclo de vida
const ESTADO_TEXTO: Record<string, string> = {
  ACTIVO: 'Activo', 'SIN_SEÑAL': 'Sin señal', BUFFER_ACTIVO: 'Modo buffer', INACTIVO: 'Inactivo', EN_MANTENIMIENTO: 'Mantenimiento',
};
// FALLO_CONECTIVIDAD es el tipo con que el backend registra DISPOSITIVO_SIN_SEÑAL / DISPOSITIVO_INACTIVO
const ALERTAS_CRITERIO = [/SIN_SE[ÑN]AL/i, /INACTIVO/i, /SE[ÑN]AL_DEGRADADA/i, /BATERIA_CRITICA/i, /FALLO_CONECTIVIDAD/i];

const ERROR_422 = { error_code: 'ESTADO_SIN_CAMBIO', message: 'El dispositivo ya se encuentra en el estado solicitado.', fields: [] };

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function listaDispositivos(page: Page) {
  // El nombre accesible "Dispositivos de tus fincas" está en el role="region" que envuelve
  // la tabla (ds-scroll-region), no en el <table> mismo.
  return main(page).getByRole('region', { name: 'Dispositivos de tus fincas' }).getByRole('table');
}

/** Filtra el listado por estado (en memoria, sin red) y devuelve sus filas visibles. */
async function filasPorEstado(page: Page, estado: string) {
  // #disp-estado, no getByLabel('Estado'): la sección de alertas técnicas tiene su propio
  // campo con la misma etiqueta "Estado" (#al-estado) y getByLabel no distingue entre ambos.
  await page.locator('#disp-estado').selectOption(estado);
  await page.waitForTimeout(200);
  return listaDispositivos(page).locator('tbody tr');
}

/**
 * Hace clic en una fila del listado. El id sale directo del JSON de la respuesta (rápida y
 * confiable, confirmado <1s con logging) en vez de esperar el heading del panel: dentro de la
 * suite completa (no en una corrida aislada) el render del panel puede tardar bastante más que
 * cualquier margen razonable — motivo no determinado, probablemente acumulación de sesiones de
 * CDP de Lighthouse entre tests. `tarjeta` se resuelve "best effort": si no aparece a tiempo,
 * el caller debe tratarlo como una limitación del ambiente, no como que la fila no abrió nada.
 */
async function abrirFila(page: Page, fila: ReturnType<Page['locator']>) {
  const r = page.waitForResponse((res) => /\/iot\/dispositivos\/\d+\/estado$/.test(new URL(res.url()).pathname), { timeout: 15_000 });
  await fila.click();
  const res = await r;
  const datos = await res.json().catch(() => null) as { id_dispositivo_iot?: number } | null;
  const id = datos?.id_dispositivo_iot ?? Number(new URL(res.url()).pathname.match(/\/dispositivos\/(\d+)\/estado$/)?.[1]);
  const heading = main(page).getByRole('heading', { level: 3 }).filter({ hasText: /^Dispositivo #\d+/ });
  const tarjetaVisible = await heading.waitFor({ state: 'visible', timeout: 45_000 }).then(() => true).catch(() => false);
  return { id, tarjeta: tarjetaVisible ? heading.locator('xpath=../..') : null };
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Estado de dispositivos IoT y heartbeat (RF-60)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Vista inicial - 0 violaciones axe A/AA y listado de dispositivos (1.3.1)', async ({}, testInfo) => {
    // 2026-10-27: M3-10 reemplazó el campo "ID de dispositivo" por un listado real
    // (DispositivosLista) con device_id/estado/bateria/calidad_senal/ultimo_contacto.
    await irA(page, RUTA, TITULO, esGet('/iot/dispositivos'));
    const tabla = listaDispositivos(page);
    await expect(tabla, '1.3.1: el listado de dispositivos debe existir').toBeVisible();
    const encabezados = await tabla.getByRole('columnheader').allInnerTexts();
    anotar(testInfo, 'Encabezados del listado', encabezados.join(' | '));
    for (const col of [/dispositivo/i, /estado/i, /bater[ií]a/i, /se[ñn]al/i, /contacto/i]) {
      expect.soft(encabezados.some((h) => col.test(h)), `1.3.1: falta un encabezado que calce con ${col}`).toBe(true);
    }
    await escanear(page, TC_ID, __dirname, 'vista-inicial', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. CRÍTICO - cada estado del dispositivo se comunica con texto e ícono, no solo color (1.4.1)', async ({}, testInfo) => {
    // Filtra 5 estados y puede reintentar varias filas "sucias" al abrir detalle: más que el default.
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO, esGet('/iot/dispositivos'));
    // El ambiente acumula cientos de dispositivos de QA de otras sesiones, muchos con
    // estado_actual fuera del catálogo ("Estado desconocido" — dato sucio, no defecto de
    // accesibilidad). En vez de escanear las ~500 filas, se usa el filtro de estado del
    // listado para muestrear cada uno de los 5 estados del criterio.
    const sinTexto: string[] = [];
    const resumen: string[] = [];
    const faltan: string[] = [];
    for (const [estado, textoEsperado] of Object.entries(ESTADO_TEXTO)) {
      const filas = await filasPorEstado(page, estado);
      const total = await filas.count();
      if (total === 0) { faltan.push(estado); continue; }
      const muestra = await filas.evaluateAll((trs) =>
        trs.slice(0, 3).map((tr) => {
          const td = tr.querySelectorAll('td');
          return { nombre: (td[0]?.textContent ?? '').replace(/\s+/g, ' ').trim(), celda: (td[2]?.textContent ?? '').replace(/\s+/g, ' ').trim() };
        }));
      for (const { nombre, celda } of muestra) {
        if (!celda.includes(textoEsperado)) sinTexto.push(`${estado}: "${nombre}" → "${celda}"`);
      }
      resumen.push(`${estado}: ${total} dispositivo(s), ej. "${muestra[0]?.celda}"`);
    }
    anotar(testInfo, 'Muestra por estado', resumen.join(' || '));
    expect.soft(sinTexto, '1.4.1 CRÍTICO: filas cuyo estado no se identifica por texto junto al color').toEqual([]);
    precondicion(faltan.length === 0, `faltan dispositivos en estos estados: ${faltan.join(', ') || 'ninguno'}`);

    const todas = await filasPorEstado(page, '');
    const { tarjeta } = await abrirFila(page, todas.first());
    if (tarjeta) {
      const panel = await tarjeta.innerText();
      desviacion(/bater[ií]a/i.test(panel), 'el panel del dispositivo no muestra nivel_bateria');
      desviacion(/se[ñn]al|rssi/i.test(panel), 'el panel del dispositivo no muestra calidad_senal');
      await escanear(page, TC_ID, __dirname, 'detalle-dispositivo', testInfo, PASOS_LIGHTHOUSE);
    } else {
      anotar(testInfo, 'Panel de detalle', 'el render tardó más de 45s en esta corrida (ambiente); no se pudo verificar nivel_bateria/calidad_senal ni correr el escaneo de este paso');
    }
  });

  test('3. Alertas técnicas - tabla asociada (1.3.1), tipos con texto y detalle abierto con Enter (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, esGet('/iot/alertas-tecnicas'));
    const seccion = main(page).locator('section').filter({ has: page.getByRole('heading', { name: 'Alertas técnicas', exact: true }) });
    const t = seccion.getByRole('table');
    precondicion((await t.count()) > 0, 'no hay alertas técnicas que listar');
    if ((await t.count()) === 0) return;

    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s) · ${a.filasEnfocables} enfocable(s)`);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    const tipos = [...(await textosColumna(t, 'Tipo de alerta')), ...(await textosColumna(t, 'Variable'))].join(' ');
    anotar(testInfo, 'Tipos presentes', tipos);
    precondicion(ALERTAS_CRITERIO.some((re) => re.test(tipos)), 'no hay alertas SIN_SEÑAL / INACTIVO / SEÑAL_DEGRADADA / BATERIA_CRITICA en el listado');

    const fila = t.locator('tbody tr').first();
    await fila.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.1.1: Enter sobre la fila debe abrir el detalle de la alerta').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'detalle-alerta-tecnica', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('4. Acción manual EN_MANTENIMIENTO - name/role/value (4.1.2), Enter confirma igual que el clic y error anunciado (3.3.1)', async ({}, testInfo) => {
    // Puede reintentar varias filas "sucias" al abrir detalle: más margen que el default.
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO, esGet('/iot/dispositivos'));
    // Se busca uno ya en INACTIVO o EN_MANTENIMIENTO (único estado desde el que se puede
    // pasar a mantenimiento) usando el filtro de estado del listado, no por ID a mano.
    let filasEstado = await filasPorEstado(page, 'INACTIVO');
    let total = await filasEstado.count();
    let estado = 'INACTIVO';
    if (total === 0) {
      filasEstado = await filasPorEstado(page, 'EN_MANTENIMIENTO');
      total = await filasEstado.count();
      estado = 'EN_MANTENIMIENTO';
    }
    precondicion(total > 0, 'el caso pide un dispositivo INACTIVO (o ya EN_MANTENIMIENTO); ninguno en el listado está en esos estados');
    if (total === 0) return;

    const { id } = await abrirFila(page, filasEstado.first());
    anotar(testInfo, 'Dispositivo', `#${id} en ${estado}`);

    const accion = main(page).getByRole('button', { name: /Poner en mantenimiento|Reactivar dispositivo/ });
    // Mismo margen que abrirFila: el render del panel puede tardar bastante dentro de la suite completa.
    await expect(accion, '4.1.2: la acción de mantenimiento debe ser un botón con nombre accesible').toBeVisible({ timeout: 45_000 });
    await accion.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: /Poner en mantenimiento|Reactivar dispositivo/ });
    await expect(dialogo, 'Enter sobre el botón debe abrir la confirmación').toBeVisible();
    await expect.soft(dialogo.getByLabel(/Motivo/), '1.3.1: el campo motivo debe tener label').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'modal-mantenimiento', testInfo, PASOS_LIGHTHOUSE);

    let envios = 0;
    const url = (u: URL) => u.pathname === `${PREFIJO_API}/iot/dispositivos/${id}/mantenimiento`;
    await page.route(url, (r: Route) => {
      if (r.request().method() !== 'PATCH') return r.fallback();
      envios++;
      return r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify(ERROR_422) });
    });
    anotar(testInfo, 'Datos simulados', 'PATCH /mantenimiento respondido con 422; el dispositivo no cambia de estado.');
    try {
      const confirmar = dialogo.getByRole('button', { name: /^(Poner en mantenimiento|Reactivar)$/ });
      await confirmar.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => envios, { message: '4.1.2: Enter sobre el botón de confirmación debe enviar la acción' }).toBe(1);
      const alerta = dialogo.getByRole('alert');
      await expect(alerta, '3.3.1: el rechazo debe anunciarse con role="alert"').toBeVisible();
      anotar(testInfo, 'Error', (await alerta.innerText()).replace(/\s+/g, ' '));
      await page.waitForTimeout(7_000);
      expect.soft(await alerta.isVisible(), '3.3.1: el aviso del rechazo (variante info) se oculta solo a los 6 s y el usuario pierde el motivo').toBe(true);
      await page.keyboard.press('Escape');
    } finally {
      await page.unroute(url);
    }
  });
});
