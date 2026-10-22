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
 * La vista no lista dispositivos: consulta uno por ID. Los IDs a consultar salen de
 * TC_DIS_162_DISPOSITIVOS (por defecto 341..345, datos semilla del 21/10/2026); el spec registra qué estado tiene cada uno y qué
 * estados del criterio faltan en el ambiente.
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
  PREFIJO_API, abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, irA, json, main,
  precondicion, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-162';
const RUTA = 'telemetria/dispositivos';
const TITULO = 'Estado de Dispositivos IoT';
const PASOS_LIGHTHOUSE = ['vista-inicial', 'detalle-dispositivo', 'modal-mantenimiento'];

const IDS = (process.env.TC_DIS_162_DISPOSITIVOS ?? '341,342,343,344,345').split(',').map((v) => Number(v.trim())).filter((n) => n > 0);

// Texto que muestra EstadoDispositivoPill por cada estado del ciclo de vida
const ESTADO_TEXTO: Record<string, string> = {
  ACTIVO: 'Activo', 'SIN_SEÑAL': 'Sin señal', BUFFER_ACTIVO: 'Modo buffer', INACTIVO: 'Inactivo', EN_MANTENIMIENTO: 'Mantenimiento',
};
// FALLO_CONECTIVIDAD es el tipo con que el backend registra DISPOSITIVO_SIN_SEÑAL / DISPOSITIVO_INACTIVO
const ALERTAS_CRITERIO = [/SIN_SE[ÑN]AL/i, /INACTIVO/i, /SE[ÑN]AL_DEGRADADA/i, /BATERIA_CRITICA/i, /FALLO_CONECTIVIDAD/i];

const ERROR_422 = { error_code: 'ESTADO_SIN_CAMBIO', message: 'El dispositivo ya se encuentra en el estado solicitado.', fields: [] };

interface EstadoDispositivo { estado: { id_dispositivo_iot: number; estado_actual: string } }

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Consulta el dispositivo por ID (Enter en el campo) y devuelve su estado, o null si no existe. */
async function consultar(page: Page, id: number) {
  const r = page.waitForResponse(esGet(`/iot/dispositivos/${id}/estado`), { timeout: 60_000 }).catch(() => null);
  const campo = main(page).getByLabel('ID de dispositivo', { exact: true });
  await campo.fill(String(id));
  await campo.press('Enter');
  const res = await r;
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  return { status: res?.status() ?? 0, datos: await json<EstadoDispositivo>(res) };
}

function tarjetaDispositivo(page: Page, id: number) {
  return main(page).getByRole('heading', { name: `Dispositivo #${id}`, exact: true }).locator('xpath=..');
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Estado de dispositivos IoT y heartbeat (RF-60)`, () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  let contexto: BrowserContext;
  let page: Page;
  /** Primer dispositivo encontrado: se reutiliza en el paso de mantenimiento. */
  let idEncontrado: number | null = null;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(420_000);
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Vista inicial - 0 violaciones axe A/AA y listado de dispositivos (1.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await expect(main(page).getByLabel('ID de dispositivo', { exact: true }), '4.1.2: el campo de consulta debe tener label').toBeVisible();
    const tablas = await main(page).getByRole('table').count();
    anotar(testInfo, 'Tablas en la vista', `${tablas} (alertas técnicas); los dispositivos se consultan uno por ID`);
    const listado = await main(page).getByRole('columnheader', { name: /bater[ií]a/i }).count();
    desviacion(listado > 0, 'no hay un listado de dispositivos con encabezados device_id/estado/nivel_bateria/calidad_senal: la vista consulta un dispositivo por ID');
    await escanear(page, TC_ID, __dirname, 'vista-inicial', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. CRÍTICO - cada estado del dispositivo se comunica con texto e ícono, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const vistos: Record<string, number[]> = {};
    const sinTexto: string[] = [];
    const resumen: string[] = [];
    for (const id of IDS) {
      const { status, datos } = await consultar(page, id);
      if (!datos) { resumen.push(`#${id}: HTTP ${status}`); continue; }
      const estado = datos.estado.estado_actual.toUpperCase().replace('SIN_SENAL', 'SIN_SEÑAL');
      (vistos[estado] ??= []).push(id);
      const tarjeta = tarjetaDispositivo(page, id);
      await expect(tarjeta).toBeVisible();
      const texto = (await tarjeta.innerText()).replace(/\s+/g, ' ');
      const esperado = ESTADO_TEXTO[estado];
      if (!esperado || !texto.includes(esperado)) sinTexto.push(`#${id} ${estado} → "${texto}"`);
      resumen.push(`#${id}: ${estado} → "${texto}"`);
      if (idEncontrado === null) {
        idEncontrado = id;
        const panel = await main(page).locator('section').first().innerText();
        desviacion(/bater[ií]a/i.test(panel), 'el panel del dispositivo no muestra nivel_bateria');
        desviacion(/se[ñn]al|rssi/i.test(panel), 'el panel del dispositivo no muestra calidad_senal');
        await escanear(page, TC_ID, __dirname, 'detalle-dispositivo', testInfo, PASOS_LIGHTHOUSE);
      }
    }
    anotar(testInfo, 'Dispositivos consultados', resumen.join(' || '));
    expect(idEncontrado, `Ninguno de los IDs ${IDS.join(',')} existe: ajustar TC_DIS_162_DISPOSITIVOS`).not.toBeNull();
    expect.soft(sinTexto, '1.4.1 CRÍTICO: estados sin etiqueta de texto junto al color').toEqual([]);
    const faltan = Object.keys(ESTADO_TEXTO).filter((e) => !vistos[e]);
    precondicion(faltan.length === 0, `faltan dispositivos en estos estados: ${faltan.join(', ') || 'ninguno'} (IDs consultados: ${IDS.join(',')})`);
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
    await irA(page, RUTA, TITULO);
    // 2026-10-22: no reutilizar sin más el primer dispositivo encontrado (idEncontrado) — ese
    // es el primero que EXISTE, no necesariamente el que está en el estado que este caso
    // necesita. Se busca explícitamente uno en INACTIVO (o ya EN_MANTENIMIENTO) entre los
    // mismos IDS que recorre el test 2; solo si ninguno califica se cae al anterior.
    let id = idEncontrado ?? IDS[0];
    let datos: EstadoDispositivo | null = null;
    for (const candidato of IDS) {
      const r = await consultar(page, candidato);
      if (!r.datos) continue;
      const e = r.datos.estado.estado_actual.toUpperCase();
      if (e === 'INACTIVO' || e === 'EN_MANTENIMIENTO') { id = candidato; datos = r.datos; break; }
    }
    if (!datos) ({ datos } = await consultar(page, id));
    expect(datos, `El dispositivo #${id} debe existir para probar la acción de mantenimiento`).not.toBeNull();
    const estado = datos!.estado.estado_actual.toUpperCase();
    anotar(testInfo, 'Dispositivo', `#${id} en ${estado}`);
    precondicion(estado === 'INACTIVO' || estado === 'EN_MANTENIMIENTO', `el caso pide un dispositivo INACTIVO (único estado desde el que se pasa a EN_MANTENIMIENTO); #${id} está en ${estado}`);

    const accion = main(page).getByRole('button', { name: /Poner en mantenimiento|Reactivar dispositivo/ });
    await expect(accion, '4.1.2: la acción de mantenimiento debe ser un botón con nombre accesible').toBeVisible();
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
