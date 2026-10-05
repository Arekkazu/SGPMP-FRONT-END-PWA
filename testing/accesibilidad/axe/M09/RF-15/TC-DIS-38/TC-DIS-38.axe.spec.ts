/**
 * TC-DIS-38 — Accesibilidad WCAG 2.1 AA del Catálogo de Especies
 * RF-15 · Rol: Administrador · Configuración → pestaña "Catálogo de especies" (/configuracion)
 *
 * Cambio del RF (2026-10-05): el criterio incluye la lista desplegable de grupo de manejo
 * (label y name/role/value) y el anuncio del error nuevo al intentar cambiar el grupo de una
 * especie con dependencias. En la interfaz el grupo de manejo es el select "Familia de modelo
 * de IA" (tipo_modelo, eje "tipo de manejo" de RFC-009).
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados.
 *
 * PROTECCIÓN DE DATOS: una especie registrada o editada es un registro real, así que todo
 * POST/PATCH a /configuracion/especies se intercepta y por defecto se aborta:
 *   - Real, REDIRIGIENDO el POST con el nombre de una especie que ya existe en el catálogo
 *     (el backend lo rechaza por duplicado sin crear nada).
 *   - SIMULADO con el formato estándar del backend: error al cambiar el grupo de manejo de
 *     una especie con dependencias. Probarlo real exige que el backend acepte o evalúe el
 *     cambio sobre una especie en uso. error_code a confirmar con desarrollo.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_38_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-38';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_38_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_ESPECIES = (url: URL) => /\/configuracion\/especies(\/\d+)?$/.test(url.pathname);
const ETIQUETA_GRUPO = 'Familia de modelo de IA';
const GRUPOS_ASIGNABLES = ['MODELO_AVES', 'MODELO_PORCINOS', 'MODELO_ACUICULTURA', 'MODELO_ESPECIES_MEDIANAS', 'MODELO_ESPECIES_GRANDES'];

interface Especie { id_especie: number; nombre: string; tipo_modelo: string | null; es_activo: boolean }

// SIMULADO con el formato estándar del backend (error_code a confirmar con desarrollo)
const errorDependencias = (e: Especie) => ({
  error_code: 'ESPECIE_CON_DEPENDENCIAS',
  message: `No se puede cambiar el grupo de manejo de "${e.nombre}": tiene áreas, activos biológicos o modelos de IA asociados al grupo actual.`,
  fields: [{ field: 'tipo_modelo', message: 'La especie tiene dependencias asociadas a su grupo de manejo actual.' }],
});

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección de escrituras ─────────────────────────────────────────────────

type Modo =
  | { tipo: 'abortar' }
  | { tipo: 'redirigir'; cuerpo: Record<string, unknown> }
  | { tipo: 'simular'; status: number; cuerpo: unknown };

async function protegerEspecies(page: Page) {
  let modo: Modo = { tipo: 'abortar' };
  const intentos: { metodo: string; cuerpo: unknown }[] = [];
  await page.route(URL_ESPECIES, (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return r.continue();
    intentos.push({ metodo: req.method(), cuerpo: req.postDataJSON() });
    if (modo.tipo === 'redirigir' && req.method() === 'POST') return r.continue({ postData: JSON.stringify(modo.cuerpo) });
    if (modo.tipo === 'simular') return r.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    return r.abort();
  });
  return { fijarModo: (m: Modo) => { modo = m; }, intentos };
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion abre en la pestaña "Catálogo de especies"; devuelve el catálogo real. */
async function abrirCatalogo(page: Page): Promise<Especie[]> {
  const respuesta = page.waitForResponse((r) =>
    new URL(r.url()).pathname.endsWith('/configuracion/especies') && r.request().method() === 'GET' && ['xhr', 'fetch'].includes(r.request().resourceType()));
  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: /catálogo de especies/i })).toBeVisible({ timeout: 40_000 });
  const r = await respuesta;
  expect(r.status(), 'GET /configuracion/especies debe responder 200').toBe(200);
  const cuerpo = await r.json();
  return Array.isArray(cuerpo) ? cuerpo : cuerpo.items;
}

function dialogo(page: Page, nombre: string | RegExp): Locator {
  return page.getByRole('dialog', { name: nombre });
}

function selectGrupo(d: Locator): Locator {
  return d.getByRole('combobox', { name: ETIQUETA_GRUPO, exact: true });
}

async function abrirNueva(page: Page) {
  await page.getByRole('button', { name: /nueva especie/i }).click();
  const d = dialogo(page, /^nueva especie$/i);
  await expect(d).toBeVisible();
  return d;
}

async function abrirEdicion(page: Page, especie: Especie) {
  await page.getByRole('button', { name: `Editar ${especie.nombre}`, exact: true }).first().click();
  const d = dialogo(page, `Editar especie — ${especie.nombre}`);
  await expect(d).toBeVisible();
  return d;
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
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Catálogo de Especies (RF-15)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_38_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('1. Listado del Catálogo de Especies - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await protegerEspecies(page);
    const especies = await abrirCatalogo(page);
    testInfo.annotations.push({ type: 'Especies en el catálogo', description: String(especies.length) });
    await escanear(page, 'listado', testInfo);
  });

  test('2. Formulario Nueva especie - grupo de manejo con label y name/role/value (1.3.1, 4.1.2)', async ({ page }, testInfo) => {
    await protegerEspecies(page);
    await abrirCatalogo(page);
    const d = await abrirNueva(page);
    const grupo = selectGrupo(d);

    // 1.3.1 / 4.1.2: label asociado → nombre accesible; rol combobox (select nativo)
    await expect(grupo, `1.3.1/4.1.2: el grupo de manejo debe exponerse como combobox con nombre "${ETIQUETA_GRUPO}"`).toBeVisible();
    const info = await grupo.evaluate((e) => {
      const s = e as HTMLSelectElement;
      const describedby = (s.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return {
        tag: s.tagName,
        labelFor: !!document.querySelector(`label[for="${s.id}"]`),
        opciones: [...s.options].map((o) => ({ value: o.value, texto: o.text.trim() })),
        descripcion: describedby.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' '),
      };
    });
    testInfo.annotations.push({ type: 'Opciones del grupo de manejo', description: info.opciones.map((o) => `${o.value || '(vacío)'}="${o.texto}"`).join(' · ') });
    expect(info.tag, '4.1.2: debe ser un <select> nativo (rol combobox implícito)').toBe('SELECT');
    expect(info.labelFor, '1.3.1: el <label> debe estar asociado con for/id').toBe(true);

    // Value: la opción vacía y los 5 grupos asignables, cada uno con texto legible
    expect(info.opciones.map((o) => o.value).filter(Boolean), '4.1.2: el select ofrece los grupos de manejo asignables (sin el meta-modelo de contagio)').toEqual(GRUPOS_ASIGNABLES);
    for (const o of info.opciones) expect(o.texto, `4.1.2: la opción ${o.value || '(vacía)'} debe tener texto`).not.toBe('');
    await expect(grupo, 'Valor inicial: sin grupo').toHaveValue('');
    await grupo.selectOption('MODELO_AVES');
    await expect(grupo, '4.1.2: el valor elegido se expone en el control').toHaveValue('MODELO_AVES');
    expect(await grupo.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text.trim()), '4.1.2: el valor anunciado es el texto de la opción').toBe('Aves');

    // El texto de ayuda debe estar asociado al control (1.3.1)
    expect.soft(info.descripcion, '1.3.1: el texto de ayuda del grupo de manejo ("El modelo de IA de las áreas…") no está vinculado con aria-describedby').toContain('modelo de IA');

    await grupo.selectOption('');
    await escanear(page, 'formulario', testInfo);
  });

  test('3. Error de nombre duplicado (real) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerEspecies(page);
    const especies = await abrirCatalogo(page);
    const existente = especies.find((e) => e.es_activo) ?? especies[0];
    expect(existente, 'Precondición: el catálogo debe tener al menos una especie').toBeTruthy();
    testInfo.annotations.push({ type: 'Petición redirigida', description: `POST con el nombre de la especie existente "${existente.nombre}": el backend la rechaza por duplicado sin crear nada.` });

    const d = await abrirNueva(page);
    await d.getByRole('textbox', { name: 'Nombre', exact: true }).fill(existente.nombre);
    fijarModo({ tipo: 'redirigir', cuerpo: { nombre: existente.nombre, tipo_modelo: null } });
    const respuesta = page.waitForResponse((r) => URL_ESPECIES(new URL(r.url())) && r.request().method() === 'POST');
    await d.getByRole('button', { name: /registrar especie/i }).click();
    const r = await respuesta;
    testInfo.annotations.push({ type: 'Respuesta real', description: `${r.status()} ${JSON.stringify(await r.json().catch(() => null))}` });
    expect(r.status(), 'El backend debe rechazar el nombre duplicado').toBe(409);

    const alerta = d.getByRole('alert').filter({ hasText: /error al guardar/i });
    await expect(alerta, '3.3.1/4.1.3: el duplicado debe anunciarse en una alerta').toBeVisible();
    await expect(alerta).toHaveAttribute('aria-live', /assertive|polite/);
    await escanear(page, 'duplicado', testInfo);
  });

  test('4. Cambio de grupo de manejo con dependencias (simulado) - error anunciado (3.3.1, 4.1.3)', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerEspecies(page);
    const especies = await abrirCatalogo(page);
    const especie = especies.find((e) => e.es_activo && e.tipo_modelo) ?? especies.find((e) => e.es_activo);
    expect(especie, 'Precondición: debe existir una especie activa para editar').toBeTruthy();
    const nuevoGrupo = GRUPOS_ASIGNABLES.find((g) => g !== especie!.tipo_modelo)!;
    testInfo.annotations.push({ type: 'Datos simulados', description: `PATCH de "${especie!.nombre}" (${especie!.tipo_modelo ?? 'sin grupo'} → ${nuevoGrupo}) respondido con 409 ESPECIE_CON_DEPENDENCIAS (error_code a confirmar con desarrollo); la especie no se modifica.` });

    const d = await abrirEdicion(page, especie!);
    const grupo = selectGrupo(d);
    await expect(grupo, 'El grupo actual de la especie se precarga').toHaveValue(especie!.tipo_modelo ?? '');
    await grupo.selectOption(nuevoGrupo);

    fijarModo({ tipo: 'simular', status: 409, cuerpo: errorDependencias(especie!) });
    await d.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect.poll(() => intentos.length, { message: 'Guardar debe enviar el PATCH' }).toBe(1);
    expect((intentos[0].cuerpo as { tipo_modelo: string }).tipo_modelo).toBe(nuevoGrupo);

    const alerta = d.getByRole('alert').filter({ hasText: /error al guardar/i });
    await expect(alerta, '3.3.1/4.1.3: el error de dependencias debe anunciarse en una alerta').toBeVisible();
    await expect(alerta, 'La alerta debe estar en región viva').toHaveAttribute('aria-live', /assertive|polite/);
    await expect(alerta, '3.3.1: la alerta explica por qué no se puede cambiar el grupo').toContainText('dependencias');
    expect.soft(await alerta.innerText(), '3.3.1: con fields, la alerta reemplaza el mensaje principal (qué dependencias impiden el cambio) por el mensaje del campo').toContain('asociados al grupo actual');
    await expect(d, 'El diálogo sigue abierto tras el error').toBeVisible();
    await expect.soft(grupo, '3.3.1: el error trae field tipo_modelo pero el select no se marca como inválido').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-dependencias', testInfo);
  });
});
