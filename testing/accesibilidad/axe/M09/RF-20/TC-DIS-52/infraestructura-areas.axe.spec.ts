/**
 * TC-DIS-52 — Accesibilidad WCAG 2.1 AA del listado y formulario de Infraestructura Productiva (Áreas)
 * RF-20 v1.1 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 * Configuración → Fincas → sección "Infraestructura Productiva" → finca → áreas
 *
 * Cambio del RF (2026-10-05, RFC-009): el formulario agrega las listas de especie y modelo
 * de IA; se anuncian tres errores 422 nuevos (incoherencia de modelo, especie inactiva y
 * cambio de especie con activos alojados); y un área inactiva se puede reactivar.
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Datos: finca "Finca Acuícola El Remanso" (#1) con sus áreas reales. En TEST ninguna
 * especie tiene familia de modelo de IA, así que GET /configuracion/especies se sirve con
 * la respuesta real y "Tilapia Roja" con tipo_modelo MODELO_ACUICULTURA (SIMULADO). Si la
 * finca no tiene un área inactiva para reactivar, la última área del listado real se sirve
 * como inactiva (SIMULADO).
 *
 * PROTECCIÓN DE DATOS: un área registrada, editada o reactivada es un registro real, así
 * que todo POST/PATCH a /configuracion/infraestructuras se intercepta y por defecto se aborta:
 *   - Real: el POST del nombre duplicado, solo si el área ya existe en el listado real de la
 *     finca (si no, el caso falla por precondición y no se envía nada).
 *   - SIMULADOS con el formato estándar del backend: los tres 422 nuevos (error_code a
 *     confirmar con desarrollo, salvo ESPECIE_INACTIVA que ya existe en el backend) y el
 *     200 de la reactivación.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_52_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-52';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const FINCA = process.env.TC_DIS_52_FINCA ?? 'Finca Acuícola El Remanso';
const AREA_EXISTENTE = process.env.TC_DIS_52_AREA_EXISTENTE ?? 'Estanque-01';

// Especie con familia de modelo (SIMULADO: en TEST ninguna especie tiene tipo_modelo)
const ESPECIE_CON_FAMILIA = 'Tilapia Roja';
const FAMILIA = 'MODELO_ACUICULTURA';
const FAMILIA_TEXTO = 'Acuicultura';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_52_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_ESPECIES = /\/configuracion\/especies$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const URL_AREAS = (url: URL) => /\/configuracion\/infraestructuras(\/\d+(\/\w+)?)?$/.test(url.pathname);

// 422 SIMULADOS con el formato estándar del backend (error_code a confirmar, salvo ESPECIE_INACTIVA)
const ERROR_422_MODELO = {
  error_code: 'MODELO_INCOHERENTE_CON_ESPECIE',
  message: `El modelo de IA "MODELO_AVES" no corresponde a la familia de la especie "${ESPECIE_CON_FAMILIA}" (${FAMILIA}).`,
  fields: [{ field: 'tipo_modelo_asignado', message: 'El modelo de IA debe coincidir con la familia de modelo de la especie.' }],
};
const ERROR_422_ESPECIE_INACTIVA = {
  error_code: 'ESPECIE_INACTIVA',
  message: `La especie "${ESPECIE_CON_FAMILIA}" está inactiva; no se le pueden asignar áreas.`,
  fields: [{ field: 'especie_id', message: 'La especie seleccionada está inactiva.' }],
};
const ERROR_422_ACTIVOS_ALOJADOS = {
  error_code: 'CAMBIO_ESPECIE_CON_ACTIVOS_ALOJADOS',
  message: 'No se puede cambiar la especie del área: tiene activos biológicos alojados de la especie actual.',
  fields: [{ field: 'especie_id', message: 'El área tiene activos biológicos alojados; trasládalos antes de cambiar la especie.' }],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Datos y protección de escrituras ─────────────────────────────────────────

type Area = { id_infraestructura: number; nombre_infraestructura: string; es_activo: boolean } & Record<string, unknown>;
type Modo = { tipo: 'abortar' } | { tipo: 'real' } | { tipo: 'simular'; status: number; cuerpo: unknown };

/**
 * Intercepta escrituras a áreas (abortar por defecto), sirve especies con la familia
 * simulada y, si hace falta, el listado de áreas con un área inactiva simulada.
 */
async function prepararDatos(page: Page, { areaInactiva = false } = {}) {
  let modo: Modo = { tipo: 'abortar' };
  const intentos: { metodo: string; url: string; cuerpo: unknown }[] = [];
  const estado = { areas: [] as Area[], inactivaSimulada: null as Area | null };

  await page.route(URL_AREAS, async (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return route.fallback();
    if (req.method() === 'GET') {
      if (!RUTA_AREAS.test(new URL(req.url()).pathname)) return route.fallback();
      const res = await route.fetch();
      const cuerpo = await res.json();
      const items: Area[] = Array.isArray(cuerpo) ? cuerpo : cuerpo.items ?? [];
      estado.areas = items;
      if (areaInactiva && items.length && !items.some((a) => !a.es_activo)) {
        estado.inactivaSimulada = items[items.length - 1];
        const ajustados = items.map((a) => (a === estado.inactivaSimulada ? { ...a, es_activo: false } : a));
        return route.fulfill({ response: res, json: Array.isArray(cuerpo) ? ajustados : { ...cuerpo, items: ajustados } });
      }
      return route.fulfill({ response: res, json: cuerpo });
    }
    intentos.push({ metodo: req.method(), url: req.url(), cuerpo: req.postDataJSON() });
    if (modo.tipo === 'real' && req.method() === 'POST') return route.fallback();
    if (modo.tipo === 'simular') return route.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    return route.abort();
  });

  await page.route((url) => RUTA_ESPECIES.test(url.pathname), async (route) => {
    const req = route.request();
    if (req.method() !== 'GET' || !['xhr', 'fetch'].includes(req.resourceType())) return route.fallback();
    const res = await route.fetch();
    const cuerpo = await res.json();
    const ajustar = (e: { nombre: string }) => (e.nombre === ESPECIE_CON_FAMILIA ? { ...e, tipo_modelo: FAMILIA } : e);
    return route.fulfill({ response: res, json: Array.isArray(cuerpo) ? cuerpo.map(ajustar) : { ...cuerpo, items: cuerpo.items.map(ajustar) } });
  });

  return { fijarModo: (m: Modo) => { modo = m; }, intentos, estado };
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion → Fincas → sección Infraestructura. Devuelve el estado HTTP del listado de fincas. */
async function abrirSeccionInfraestructura(page: Page) {
  await page.goto('/configuracion');
  const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const res = await fincas;
  const seccion = page.getByRole('heading', { name: 'Infraestructura Productiva' });
  await seccion.scrollIntoViewIfNeeded();
  await expect(seccion).toBeVisible();
  return res.status();
}

/** Selecciona la finca en la sección y espera el listado de sus áreas. */
async function abrirAreasDeFinca(page: Page) {
  await abrirSeccionInfraestructura(page);
  const areas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_AREAS.test(new URL(r.url()).pathname));
  await page.getByRole('button').filter({ has: page.getByText(FINCA, { exact: true }) }).first().click();
  expect((await areas).status(), 'El listado de áreas de la finca debe cargar').toBe(200);
  await expect(page.getByRole('button', { name: 'Cambiar finca' })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Formulario {
  dialogo: Locator;
  tipo: Locator;
  nombre: Locator;
  superficie: Locator;
  especie: Locator;
  modelo: Locator;
  guardar: Locator;
}

function formulario(dialogo: Locator, guardar: string): Formulario {
  return {
    dialogo,
    tipo: dialogo.getByRole('combobox', { name: 'Tipo de área', exact: true }),
    nombre: dialogo.getByRole('textbox', { name: 'Nombre del área', exact: true }),
    superficie: dialogo.getByRole('spinbutton', { name: 'Superficie (m²)', exact: true }),
    especie: dialogo.getByRole('combobox', { name: 'Especie', exact: true }),
    modelo: dialogo.getByRole('combobox', { name: 'Modelo de IA', exact: true }),
    guardar: dialogo.getByRole('button', { name: guardar, exact: true }),
  };
}

async function abrirRegistro(page: Page): Promise<Formulario> {
  await page.getByRole('button', { name: 'Nueva área' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar área productiva' });
  await expect(dialogo).toBeVisible();
  const form = formulario(dialogo, 'Registrar área');
  // Las especies se cargan al abrir el modal
  await expect(form.especie.locator('option', { hasText: ESPECIE_CON_FAMILIA })).toHaveCount(1, { timeout: 20_000 });
  return form;
}

async function abrirEdicion(page: Page, nombre: string): Promise<Formulario> {
  await page.getByRole('button', { name: `Editar ${nombre}`, exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: `Editar área — ${nombre}` });
  await expect(dialogo).toBeVisible();
  const form = formulario(dialogo, 'Guardar cambios');
  await expect(form.nombre).toHaveValue(nombre);
  await expect(form.especie.locator('option', { hasText: ESPECIE_CON_FAMILIA })).toHaveCount(1, { timeout: 20_000 });
  return form;
}

async function llenarRegistro(form: Formulario, nombre: string) {
  await form.nombre.fill(nombre);
  await form.superficie.fill('100');
  await form.especie.selectOption({ label: ESPECIE_CON_FAMILIA });
}

function esAlta(r: Request) {
  return r.method() === 'POST' && RUTA_AREAS.test(new URL(r.url()).pathname);
}

/** 3.3.1: el campo señalado por el error queda inválido y con el mensaje asociado. */
async function verificarErrorEnCampo(campo: Locator, nombreCampo: string, mensaje: RegExp) {
  await expect.soft(campo, `3.3.1: el error trae field para "${nombreCampo}" pero el campo no se marca con aria-invalid`).toHaveAttribute('aria-invalid', 'true');
  await expect.soft(campo, `3.3.1: el mensaje del error no está asociado al campo "${nombreCampo}" (aria-describedby)`).toHaveAccessibleDescription(mensaje);
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);

  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });

  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  // Una auditoría fallida es un defecto aunque Lighthouse le asigne peso 0 en el puntaje
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Infraestructura Productiva / Áreas (RF-20)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_52_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
  });

  test('1-2. Listado de áreas de una finca - columna Modelo IA y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await prepararDatos(page);
    await iniciarSesionAdmin(page);
    expect(await abrirSeccionInfraestructura(page), 'GET /configuracion/fincas debe responder 200').toBe(200);
    await abrirAreasDeFinca(page);

    // 4.1.2: estado de cada área en texto y acciones con nombre accesible
    const fila = page.locator('table tbody tr').filter({ hasText: AREA_EXISTENTE }).first();
    await expect(fila, `Precondición: la finca debe tener el área "${AREA_EXISTENTE}"`).toBeVisible();
    await expect(fila).toContainText(/Activa?/);
    await expect(page.locator('table thead th').filter({ hasText: 'Modelo IA' }), 'Columna "Modelo IA" del RF-20 v1.1').toHaveCount(1);

    await escanear(page, 'listado-areas', testInfo);
  });

  test('3. Formulario "Registrar área" - especie y modelo de IA con label y name/role/value (1.3.1, 4.1.2)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: `"${ESPECIE_CON_FAMILIA}" servida con tipo_modelo ${FAMILIA}: en TEST ninguna especie tiene familia de modelo.` });
    await prepararDatos(page);
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    const form = await abrirRegistro(page);

    // 1.3.1: todos los campos se ubican por su label; los obligatorios exponen aria-required
    for (const [campo, nombre] of [[form.tipo, 'Tipo de área'], [form.nombre, 'Nombre del área'], [form.superficie, 'Superficie'], [form.especie, 'Especie'], [form.modelo, 'Modelo de IA']] as const) {
      await expect(campo, `1.3.1: no se encontró el campo "${nombre}" por su label`).toBeVisible();
    }
    await expect(form.especie, '1.3.1: "Especie" es obligatoria').toHaveAttribute('aria-required', 'true');
    expect(await form.tipo.locator('option').count(), 'El catálogo real de tipos de área debe tener opciones').toBeGreaterThan(0);

    // 4.1.2 Especie: select nativo, valor inicial vacío y valor elegido expuesto
    await expect(form.especie).toHaveValue('');
    await form.especie.selectOption({ label: ESPECIE_CON_FAMILIA });
    expect(await form.especie.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text.trim()), '4.1.2: el valor anunciado es el nombre de la especie').toBe(ESPECIE_CON_FAMILIA);

    // 4.1.2 Modelo de IA: solo la familia de la especie, con texto legible
    const opcionesModelo = await form.modelo.locator('option').evaluateAll((os) => os.map((o) => ({ value: (o as HTMLOptionElement).value, texto: o.textContent?.trim() ?? '' })));
    testInfo.annotations.push({ type: 'Opciones de Modelo de IA', description: opcionesModelo.map((o) => `${o.value || '(vacío)'}="${o.texto}"`).join(' · ') });
    expect(opcionesModelo.map((o) => o.value).filter(Boolean), 'El modelo de IA solo ofrece la familia de la especie').toEqual([FAMILIA]);
    await form.modelo.selectOption(FAMILIA);
    await expect(form.modelo).toHaveValue(FAMILIA);
    expect(await form.modelo.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text.trim()), '4.1.2: el valor anunciado es el nombre del modelo').toBe(FAMILIA_TEXTO);
    await escanear(page, 'formulario', testInfo);

    // Especie sin familia: el aviso debe estar asociado al select de modelo (1.3.1)
    const sinFamilia = await form.especie.locator('option').evaluateAll((os, conFamilia) =>
      os.map((o) => o.textContent?.trim() ?? '').find((t) => t && t !== conFamilia && !t.startsWith('Selecciona')), ESPECIE_CON_FAMILIA);
    await form.especie.selectOption({ label: sinFamilia! });
    const aviso = form.dialogo.getByText('La especie no tiene familia de modelo configurada', { exact: false });
    await expect(aviso, `Con "${sinFamilia}" (sin familia) se muestra el aviso`).toBeVisible();
    await expect(form.modelo, 'Sin familia, el modelo queda sin asignar').toHaveValue('');
    await expect.soft(form.modelo, '1.3.1: el aviso "La especie no tiene familia de modelo configurada…" no está asociado al select "Modelo de IA" (aria-describedby)').toHaveAccessibleDescription(/no tiene familia de modelo/);
  });

  test('4. Nombre duplicado en la misma finca (real) - anunciado por campo', async ({ page }, testInfo) => {
    const { fijarModo, estado } = await prepararDatos(page);
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    expect(estado.areas.map((a) => a.nombre_infraestructura), `Precondición: "${AREA_EXISTENTE}" debe existir en la finca para que el POST sea un duplicado (si no, no se envía)`).toContain(AREA_EXISTENTE);

    const form = await abrirRegistro(page);
    await llenarRegistro(form, AREA_EXISTENTE);
    fijarModo({ tipo: 'real' });
    const alta = page.waitForResponse((r) => esAlta(r.request()));
    await form.guardar.click();
    const respuesta = await alta;
    testInfo.annotations.push({ type: 'Respuesta real al duplicado', description: `${respuesta.status()} ${await respuesta.text()}` });

    expect(respuesta.status(), `El backend debe responder 409 al nombre duplicado "${AREA_EXISTENTE}" en la misma finca`).toBe(409);
    await expect(form.dialogo.getByRole('alert').first(), '3.3.1: el duplicado se anuncia').toContainText(/existe|duplicad/i);
    await expect.soft(form.nombre, '3.3.1: "Nombre del área" debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');

    await escanear(page, 'error-duplicado', testInfo);
  });

  test('4. Errores 422 nuevos (simulados) - incoherencia de modelo y especie inactiva en el alta', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '422 MODELO_INCOHERENTE_CON_ESPECIE (error_code a confirmar) y 422 ESPECIE_INACTIVA inyectados en el POST; no se crea ningún área.' });
    const { fijarModo, intentos } = await prepararDatos(page);
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    const form = await abrirRegistro(page);
    await llenarRegistro(form, 'Area Qa Accesibilidad');
    await form.modelo.selectOption(FAMILIA);
    const alerta = form.dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' });

    // Incoherencia de modelo
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_MODELO });
    await form.guardar.click();
    await expect(alerta, '3.3.1/4.1.3: la incoherencia de modelo se anuncia en una alerta').toBeVisible();
    await expect(alerta).toHaveAttribute('aria-live', /assertive|polite/);
    await expect(alerta, '3.3.1: la alerta explica la incoherencia').toContainText('familia');
    await expect(form.dialogo, 'El modal sigue abierto para corregir').toBeVisible();
    await verificarErrorEnCampo(form.modelo, 'Modelo de IA', /coincidir con la familia/);
    await escanear(page, 'error-422-modelo', testInfo);

    // Especie inactiva
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_ESPECIE_INACTIVA });
    await form.guardar.click();
    await expect.poll(() => intentos.length).toBe(2);
    await expect(alerta, '3.3.1/4.1.3: la especie inactiva se anuncia').toContainText('inactiva');
    await verificarErrorEnCampo(form.especie, 'Especie', /está inactiva/);
    await escanear(page, 'error-422-especie-inactiva', testInfo);
  });

  test('4. Error 422 nuevo (simulado) - cambio de especie de un área con activos alojados', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '422 CAMBIO_ESPECIE_CON_ACTIVOS_ALOJADOS (error_code a confirmar) inyectado en el PATCH; el área no se modifica.' });
    const { fijarModo, intentos } = await prepararDatos(page);
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    const form = await abrirEdicion(page, AREA_EXISTENTE);

    const actual = await form.especie.inputValue();
    const otra = await form.especie.locator('option').evaluateAll((os, v) => (os as HTMLOptionElement[]).find((o) => o.value && o.value !== v)?.value, actual);
    await form.especie.selectOption(otra!);
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_ACTIVOS_ALOJADOS });
    await form.guardar.click();
    await expect.poll(() => intentos.length, { message: 'Guardar debe enviar el PATCH' }).toBe(1);
    expect(intentos[0].metodo).toBe('PATCH');

    const alerta = form.dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' });
    await expect(alerta, '3.3.1/4.1.3: el cambio de especie con activos alojados se anuncia').toContainText('activos biológicos alojados');
    await expect(alerta).toHaveAttribute('aria-live', /assertive|polite/);
    await expect(form.dialogo, 'El modal sigue abierto').toBeVisible();
    await verificarErrorEnCampo(form.especie, 'Especie', /trasládalos antes de cambiar la especie/);
    await escanear(page, 'error-422-activos-alojados', testInfo);
  });

  test('6. Reactivar un área inactiva - confirmación accesible y estado anunciado', async ({ page }, testInfo) => {
    const { fijarModo, intentos, estado } = await prepararDatos(page, { areaInactiva: true });
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    const inactiva = estado.inactivaSimulada ?? estado.areas.find((a) => !a.es_activo);
    expect(inactiva, 'Precondición: la finca debe tener al menos un área').toBeTruthy();
    testInfo.annotations.push({
      type: estado.inactivaSimulada ? 'Datos simulados' : 'Datos reales',
      description: `${estado.inactivaSimulada ? `"${inactiva!.nombre_infraestructura}" servida como inactiva (la finca no tiene áreas inactivas). ` : ''}PATCH …/reactivar respondido con 200 simulado; el área no se modifica.`,
    });
    const nombre = inactiva!.nombre_infraestructura;
    const fila = page.locator('table tbody tr').filter({ hasText: nombre }).first();
    await expect(fila).toContainText('Inactiva');

    // 2.1.1 / 4.1.2: la acción se alcanza por teclado y nombra el área
    const reactivar = fila.getByRole('button', { name: `Reactivar ${nombre}`, exact: true });
    await expect(reactivar, '4.1.2: la acción "Reactivar" debe nombrar el área').toBeVisible();
    await reactivar.focus();
    await page.keyboard.press('Enter');

    // Diálogo de confirmación
    const confirmacion = page.getByRole('dialog').filter({ hasText: 'Reactivar área' });
    await expect(confirmacion, 'Enter abre la confirmación').toBeVisible();
    await expect(confirmacion).toContainText(nombre);
    await expect.soft(confirmacion, '4.1.2: el diálogo de confirmación "Reactivar área" no tiene nombre accesible (sin aria-labelledby)').toHaveAccessibleName(/Reactivar área/);
    const focoDentro = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect.soft(focoDentro, '2.4.3: al abrir la confirmación el foco debe moverse al diálogo').toBe(true);
    await escanear(page, 'confirmar-reactivar', testInfo);

    // Confirmar: 200 simulado con el área activa
    fijarModo({ tipo: 'simular', status: 200, cuerpo: { ...inactiva, es_activo: true, fecha_actualizacion: new Date().toISOString() } });
    await confirmacion.getByRole('button', { name: 'Reactivar', exact: true }).click();
    await expect.poll(() => intentos.length).toBe(1);
    expect(intentos[0].url, 'La confirmación llama a PATCH …/reactivar').toMatch(/\/reactivar$/);
    await expect(confirmacion).toBeHidden();
    await expect(fila, '4.1.2: el estado nuevo se muestra como texto').toContainText('Activa');
    await expect(fila.getByRole('button', { name: `Desactivar ${nombre}`, exact: true }), 'Tras reactivar se ofrece "Desactivar"').toBeVisible();
  });

  test('5. Teclado - los selects "Especie" y "Modelo de IA" se operan con flechas sin enviar el formulario', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: `"${ESPECIE_CON_FAMILIA}" servida con tipo_modelo ${FAMILIA}.` });
    const { intentos } = await prepararDatos(page);
    await iniciarSesionAdmin(page);
    await abrirAreasDeFinca(page);
    const form = await abrirRegistro(page);

    // Tab desde "Superficie" hasta "Especie" (los campos siguen el orden visual)
    await form.especie.focus();
    await expect(form.especie).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(form.especie, 'Flecha abajo selecciona la primera especie').not.toHaveValue('');
    await form.especie.selectOption({ label: ESPECIE_CON_FAMILIA });
    await page.keyboard.press('Tab');
    await expect(form.modelo, 'Tab pasa de "Especie" a "Modelo de IA"').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(form.modelo, 'Flecha abajo selecciona la familia de la especie').toHaveValue(FAMILIA);
    await expect(form.dialogo, 'Operar los selects no cierra el formulario').toBeVisible();
    expect(intentos, 'Operar los selects no envía el formulario').toHaveLength(0);
  });
});
