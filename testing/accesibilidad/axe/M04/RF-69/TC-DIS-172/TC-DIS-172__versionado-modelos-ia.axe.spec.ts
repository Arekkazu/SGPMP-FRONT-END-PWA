/**
 * TC-DIS-172 — Accesibilidad WCAG 2.1 AA de la vista de Versionado de Modelos de IA
 * RF-69 · CU-05 Validar y versionar modelos de IA · Rol: Administrador (el caso admite Veterinario)
 * Predicción → Modelos IA → "Modelos IA" (/prediccion/modelos)
 *
 * Criterio (hoja M04): 0 violaciones axe A/AA en 1.3.1 (labels de las métricas de validación según
 * el paradigma y estado ⚠ asociados), 4.1.2 (botón "Activar" deshabilitado comunicado —aria-disabled—
 * con name/role/value en cada estado), 3.3.1 (error al activar sin notas_validacion y HTTP 409
 * "Solo pueden activarse versiones en estado APROBADO" anunciados) y 1.4.1 (APROBADO / ACTIVO /
 * DEPRECADO / RECHAZADO también con texto). EN_VALIDACION es automático y no se evalúa.
 * Nota del caso: notas_validacion es obligatoria antes de activar (CA-13) y debe comunicarlo de forma
 * accesible, con el mismo patrón que el formulario de vinculaciones de M03 (RF-61).
 *
 * Escrituras: SIMULADAS. PATCH /notas y POST /activar nunca llegan al backend (el contexto los aborta;
 * el 409 se responde con page.route). Para tener una versión APROBADO "con notas" y otra "sin notas"
 * sin depender del ambiente, el GET de detalle real se intercepta y se le cambia solo
 * notas_validacion (route.fetch + fulfill); el resto del modelo es el real.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  PREFIJO_API, abrirSesion, anotar, auditarTabla, camposSinNombre, desviacion, escanear, esGet,
  hayTrampaDeFoco, irA, json, main, precondicion, recorrerConTab, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-172';
const RUTA = 'prediccion/modelos';
const TITULO = 'Gestión de Modelos de IA';
const PASOS_LIGHTHOUSE = ['listado', 'detalle-aprobado', 'error-409'];

const URL_LISTADO = esGet('/prediccion/modelos');
const ESTADOS_CRITERIO: Record<string, string> = { APROBADO: 'Aprobado', ACTIVO: 'Activo', DEPRECADO: 'Deprecado', RECHAZADO: 'Rechazado' };
const ESTADOS_TEXTO = ['En validación', ...Object.values(ESTADOS_CRITERIO)];
const ERROR_409 = { error_code: 'VERSION_NO_ACTIVABLE', message: 'Solo pueden activarse versiones en estado APROBADO', fields: [] };

interface Version { id_version_modelo: number; nombre_version: string; estado_version: string; notas_validacion: string | null }

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

async function abrirVista(page: Page) {
  const r = await irA(page, RUTA, TITULO, URL_LISTADO);
  return (await json<{ items: Version[] }>(r))?.items ?? [];
}

/** El GET de detalle real, con notas_validacion reemplazado (simulado). */
async function simularNotas(page: Page, id: number, notas: string | null) {
  const url = (u: URL) => u.pathname === `${PREFIJO_API}/prediccion/modelos/${id}`;
  await page.route(url, async (r: Route) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const real = await r.fetch();
    const cuerpo = { ...(await real.json()), notas_validacion: notas };
    return r.fulfill({ response: real, json: cuerpo });
  });
  return url;
}

/** Abre con teclado el detalle de la versión (botón "Ver <nombre>") y devuelve el diálogo. */
async function abrirDetalle(page: Page, v: Version) {
  const ver = tabla(page).getByRole('button', { name: `Ver ${v.nombre_version}`, exact: true });
  await ver.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: v.nombre_version, exact: true });
  await expect(dialogo, '2.1.1: Enter sobre "Ver" debe abrir el detalle de la versión').toBeVisible();
  await expect(dialogo.getByText('Cargando…')).toBeHidden({ timeout: 30_000 });
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Versionado de modelos de IA (RF-69)`, () => {
  test.describe.configure({ mode: 'default' });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Listado - 0 violaciones axe A/AA, estado con texto (1.4.1) y acciones con nombre único (4.1.2)', async ({}, testInfo) => {
    const items = await abrirVista(page);
    const estados = [...new Set(items.map((i) => i.estado_version))];
    anotar(testInfo, 'Datos', `${items.length} versión(es) · estados: ${estados.join(', ')}`);
    precondicion(Object.keys(ESTADOS_CRITERIO).every((e) => estados.includes(e)), `faltan versiones en estos estados: ${Object.keys(ESTADOS_CRITERIO).filter((e) => !estados.includes(e)).join(', ') || 'ninguno'}`);

    const t = tabla(page);
    precondicion((await t.count()) > 0, 'no hay versiones de modelo');
    if ((await t.count()) === 0) return;
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    const textos = await textosColumna(t, 'Estado');
    expect.soft(textos.filter((e) => !ESTADOS_TEXTO.includes(e)), '1.4.1: el estado de la versión debe leerse como texto, no solo por el color del badge').toEqual([]);

    const nombres = await t.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? (e.textContent ?? '').trim()));
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    expect.soft(repetidos, '4.1.2 / 2.4.6: botones de acción con el mismo nombre accesible en filas distintas').toEqual([]);

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Versión APROBADO sin notas_validacion - activación bloqueada y obligatoriedad comunicada (4.1.2 / 3.3.1)', async ({}, testInfo) => {
    const items = await abrirVista(page);
    const aprobado = items.find((i) => i.estado_version === 'APROBADO' && !i.notas_validacion?.trim()) ?? items.find((i) => i.estado_version === 'APROBADO');
    precondicion(!!aprobado, 'no hay ninguna versión APROBADO');
    if (!aprobado) return;
    const url = await simularNotas(page, aprobado.id_version_modelo, null);
    anotar(testInfo, 'Versión', `#${aprobado.id_version_modelo} ${aprobado.nombre_version} · notas_validacion = null (simulado sobre el GET real)`);
    try {
      const dialogo = await abrirDetalle(page, aprobado);
      await expect.soft(dialogo.getByRole('heading', { name: 'Métricas de validación', exact: true }), '1.3.1: las métricas deben tener encabezado').toBeVisible();
      const activar = dialogo.getByRole('button', { name: 'Activar en producción', exact: true });
      await expect(activar, 'una versión APROBADO debe ofrecer la acción de activar').toBeVisible();
      const deshabilitado = await activar.evaluate((b) => (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true');
      const atributos = await activar.evaluate((b) => `disabled=${(b as HTMLButtonElement).disabled} aria-disabled=${b.getAttribute('aria-disabled')} aria-describedby=${b.getAttribute('aria-describedby')}`);
      anotar(testInfo, 'Botón Activar', atributos);
      expect.soft(deshabilitado, '4.1.2: sin notas, "Activar en producción" debe exponerse como deshabilitado').toBe(true);

      const aviso = dialogo.getByRole('alert').filter({ hasText: 'Notas requeridas' });
      await expect.soft(aviso, '3.3.1: el motivo del bloqueo (notas requeridas) debe anunciarse').toBeVisible();
      const notas = dialogo.locator('textarea');
      const obligatoria = (await notas.evaluateAll((els) => els.map((e) => e.getAttribute('aria-required') === 'true' || !!e.getAttribute('aria-describedby'))))[0] ?? false;
      expect.soft(obligatoria, '3.3.1: notas_validacion no comunica su obligatoriedad (sin aria-required ni aria-describedby, a diferencia de RF-61)').toBe(true);
      expect.soft(await camposSinNombre(dialogo), '1.3.1: el campo de notas de validación no tiene label (solo encabezado y placeholder)').toEqual([]);
      await escanear(page, TC_ID, __dirname, 'detalle-aprobado', testInfo, PASOS_LIGHTHOUSE);

      await page.waitForTimeout(7_000);
      expect.soft(await aviso.isVisible(), '3.3.1: el aviso "Notas requeridas" (variante info) desaparece solo a los 6 s y el bloqueo queda sin explicación').toBe(true);
      await page.keyboard.press('Escape');
    } finally {
      await page.unroute(url);
    }
  });

  test('3. Activar una versión APROBADO con notas - HTTP 409 simulado anunciado (3.3.1)', async ({}, testInfo) => {
    const items = await abrirVista(page);
    const aprobado = items.find((i) => i.estado_version === 'APROBADO');
    precondicion(!!aprobado, 'no hay ninguna versión APROBADO');
    if (!aprobado) return;
    const urlDetalle = await simularNotas(page, aprobado.id_version_modelo, 'QA: validación clínica (simulada por la prueba de accesibilidad).');
    let envios = 0;
    const urlActivar = (u: URL) => u.pathname === `${PREFIJO_API}/prediccion/modelos/${aprobado.id_version_modelo}/activar`;
    await page.route(urlActivar, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409) });
    });
    anotar(testInfo, 'Datos simulados', 'GET de detalle con notas simuladas; POST /activar respondido con 409. Nada se activa.');
    try {
      const dialogo = await abrirDetalle(page, aprobado);
      const activar = dialogo.getByRole('button', { name: 'Activar en producción', exact: true });
      await expect(activar, 'con notas registradas la activación debe habilitarse').toBeEnabled();
      await activar.click();
      const confirmar = page.getByRole('dialog', { name: 'Confirmar activación en producción', exact: true });
      await expect(confirmar).toBeVisible();
      await confirmar.getByRole('button', { name: 'Activar', exact: true }).click();
      await expect.poll(() => envios, { message: 'La activación debe llegar al POST simulado' }).toBe(1);
      const alerta = page.getByRole('alert').filter({ hasText: ERROR_409.message });
      await expect(alerta.first(), '3.3.1: el 409 debe anunciarse con role="alert"').toBeVisible();
      anotar(testInfo, 'Error 409', `${await alerta.count()} anuncio(s): ${(await alerta.first().innerText()).replace(/\s+/g, ' ')}`);
      await escanear(page, TC_ID, __dirname, 'error-409', testInfo, PASOS_LIGHTHOUSE);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
    } finally {
      await page.unroute(urlDetalle);
      await page.unroute(urlActivar);
    }
  });

  test('4. Versión RECHAZADO - la activación se percibe como no disponible (4.1.2)', async ({}, testInfo) => {
    const items = await abrirVista(page);
    const rechazado = items.find((i) => i.estado_version === 'RECHAZADO');
    precondicion(!!rechazado, 'no hay ninguna versión RECHAZADO');
    if (!rechazado) return;
    const dialogo = await abrirDetalle(page, rechazado);
    await expect.soft(dialogo, '1.4.1: el detalle debe nombrar el estado como texto').toContainText('Rechazado');
    const activar = dialogo.getByRole('button', { name: /Activar/ });
    const n = await activar.count();
    const deshabilitado = n > 0 && (await activar.first().evaluate((b) => (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true'));
    anotar(testInfo, 'Botón Activar en RECHAZADO', n === 0 ? 'no se muestra' : `deshabilitado=${deshabilitado}`);
    desviacion(n > 0 && deshabilitado, 'en una versión RECHAZADO el botón de activación no se muestra: el caso pide verlo deshabilitado de forma perceptible');
    await escanear(page, TC_ID, __dirname, 'detalle-rechazado', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('5. Teclado - notas_validacion y botones del detalle operables con Tab/Enter (2.1.1)', async ({}, testInfo) => {
    const items = await abrirVista(page);
    const aprobado = items.find((i) => i.estado_version === 'APROBADO') ?? items[0];
    precondicion(!!aprobado, 'no hay versiones de modelo');
    if (!aprobado) return;
    const dialogo = await abrirDetalle(page, aprobado);
    const recorrido = await recorrerConTab(page, 12);
    anotar(testInfo, 'Recorrido con Tab dentro del detalle', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    expect.soft(recorrido.some((f) => f.startsWith('textarea')), '2.1.1: Tab debe llegar al campo de notas de validación').toBe(true);
    expect.soft(recorrido.every((f) => f.endsWith('(diálogo)')), '2.4.3: el foco sale del diálogo modal').toBe(true);

    const notas = dialogo.locator('textarea');
    precondicion((await notas.count()) > 0, 'el campo de notas no aparece (la cuenta no tiene permiso U sobre el recurso 43)');
    if ((await notas.count()) === 0) return;
    await notas.focus();
    await page.keyboard.type(' QA');
    await expect.soft(dialogo.getByRole('button', { name: 'Guardar notas', exact: true }), '2.1.1: al escribir con teclado "Guardar notas" debe habilitarse').toBeEnabled();
    await page.keyboard.press('Escape');
  });
});
