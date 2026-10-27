/**
 * TC-DIS-178 — Accesibilidad WCAG 2.1 AA del formulario de Registro y Edición de Patologías
 * en el Catálogo
 * RF-64 v1.1 · CU-01 Gestionar Catálogo de Patologías · Rol: Administrador · Prioridad: Alta
 * Ruta: /prediccion/patologias — PatologiasView + PatologiaFormModal + VariablesSelector
 * + PatologiasTable (acciones de una patología base)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Criterios (hoja "CASOS DE PRUEBA UI/UX"): 0 violaciones axe A/AA en
 *   1.3.1  — relación programática de las etiquetas de especie_aplicable, del checklist de
 *            variables_sensoricas_asociadas y de descripcion_clinica;
 *   2.1.1 / 2.4.7 — navegación completa por teclado del checklist y foco visible;
 *   3.3.1 / 4.1.3 — errores (nombre duplicado, mínimo 2 variables, descripción < 50 caracteres)
 *            anunciados por aria-live/role=alert y asociados al campo con aria-describedby;
 *   4.1.2  — name/role/value de los controles;
 * y el intento de editar una patología base (es_base=true) bloqueado de forma accesible, no
 * solo visual (notas del caso).
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * Datos: catálogo REAL (14 patologías: base y agregadas). El rol del caso es Veterinario o
 * Administrador; se usa Administrador (no hay cuenta Veterinario en .env.test).
 * PROTECCIÓN DE DATOS: toda escritura se aborta por defecto. Única excepción, el error E4: el
 * POST con el NOMBRE de una patología que ya existe (misma especie) llega al backend, que lo
 * rechaza; antes un GET de salvaguarda confirma que ese nombre existe. Si no existe, el POST se
 * aborta y el caso falla por precondición.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_178_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-178';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_178_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const DESCRIPCION_VALIDA = 'Prueba QA de accesibilidad: signos clínicos respiratorios con fiebre y decaimiento general.';

const ruta = (url: string) => new URL(url).pathname.replace(/^.*\/api-sgpmp-test/, '');

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y protección de escrituras ────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

interface Estado {
  catalogo: Record<string, unknown>[];
  /** Nombre (y especie) de una patología existente: solo un POST con ese nombre pasa al backend. */
  duplicado: { nombre: string; especie: string } | null;
  posts: { cuerpo: Record<string, unknown>; real: boolean }[];
}

async function interceptar(page: Page): Promise<Estado> {
  const estado: Estado = { catalogo: [], duplicado: null, posts: [] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = ruta(req.url());
    if (metodo === 'OPTIONS' || /^\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo === 'GET' && p === '/prediccion/patologias') {
      const res = await route.fetch();
      const json = await res.json();
      estado.catalogo = json.items ?? json ?? [];
      return route.fulfill({ response: res, json });
    }
    if (metodo === 'POST' && p === '/prediccion/patologias') {
      const cuerpo = req.postDataJSON() ?? {};
      const real = !!estado.duplicado
        && String(cuerpo.nombre_patologia).trim().toLowerCase() === estado.duplicado.nombre.trim().toLowerCase()
        && String(cuerpo.especie_aplicable) === estado.duplicado.especie;
      estado.posts.push({ cuerpo, real });
      return real ? route.fallback() : route.abort();
    }
    if (metodo !== 'GET') return route.abort();
    return route.fallback();
  });
  return estado;
}

async function irAPatologias(page: Page) {
  await page.goto(`${APP}/prediccion/patologias`);
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de Patologías' })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

async function abrirFormulario(page: Page) {
  await page.getByRole('button', { name: 'Nueva patología' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Nueva patología' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

/** Relación programática campo → etiqueta, descripción y error. */
async function a11yDeCampo(campo: Locator) {
  return campo.evaluate((el) => {
    const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    const descrito = ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? `(#${id} no existe)`).join(' | ');
    const etiqueta = (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? el.getAttribute('aria-label') ?? '';
    return { etiqueta, descrito, invalido: el.getAttribute('aria-invalid'), requerido: el.getAttribute('aria-required') ?? String((el as HTMLInputElement).required) };
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
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
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-178 — Formulario de Registro y Edición de Patologías', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_178_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. Formulario vacío: escaneo y relación programática de etiquetas (1.3.1 / 4.1.2)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAPatologias(page);
    const dialogo = await abrirFormulario(page);

    const nombre = await a11yDeCampo(dialogo.getByRole('textbox', { name: /Nombre de la patología/ }));
    const especie = await a11yDeCampo(dialogo.getByRole('combobox', { name: 'Especie aplicable' }));
    const descripcion = await a11yDeCampo(dialogo.locator('#pat-form-desc'));
    testInfo.annotations.push({ type: 'Campos', description: JSON.stringify({ nombre, especie, descripcion }) });
    expect.soft(nombre.etiqueta, '1.3.1: nombre con etiqueta').toMatch(/Nombre de la patología/);
    expect.soft(nombre.requerido, '3.3.2: nombre marcado como obligatorio').toBe('true');
    expect.soft(especie.etiqueta, '1.3.1: especie_aplicable con etiqueta').toMatch(/Especie aplicable/);
    expect.soft(descripcion.etiqueta, '1.3.1: descripcion_clinica con etiqueta').toMatch(/Descripción clínica/);
    expect.soft(descripcion.requerido, '3.3.2: descripción marcada como obligatoria').toBe('true');
    expect.soft(descripcion.descrito, 'DEFECTO 3.3.2: la regla "mínimo 50 caracteres" no está asociada a la descripción (aria-describedby)').toMatch(/50/);

    // Checklist de variables: grupo con nombre, estado de cada opción y obligatoriedad
    const grupo = dialogo.getByRole('group', { name: /Variables sensóricas asociadas/ });
    await expect.soft(grupo, '1.3.1: el checklist es un grupo con nombre').toBeVisible();
    const opciones = grupo.getByRole('button');
    const n = await opciones.count();
    const estados = await opciones.evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')));
    expect.soft(n, 'El checklist tiene opciones').toBeGreaterThan(1);
    expect.soft(estados.every((s) => s === 'false' || s === 'true'), '4.1.2: cada variable expone su estado (aria-pressed)').toBe(true);
    const reglaGrupo = await grupo.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return { describedby: ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' '), requerido: el.getAttribute('aria-required') };
    });
    testInfo.annotations.push({ type: 'Grupo de variables', description: JSON.stringify({ opciones: n, ...reglaGrupo }) });
    expect.soft(reglaGrupo.describedby, 'DEFECTO 1.3.1/3.3.2: la regla "entre 2 y 6 variables" y la obligatoriedad no están asociadas al grupo').toMatch(/2 y 6/);
    // Etiqueta visible "Variables sensóricas asociadas *" sin for/id (no ligada al grupo)
    const etiquetaSuelta = await dialogo.locator('label', { hasText: 'Variables sensóricas asociadas' }).evaluate((l) => !(l as HTMLLabelElement).htmlFor && !l.id);
    expect.soft(etiquetaSuelta, 'DEFECTO 1.3.1: la etiqueta visible "Variables sensóricas asociadas *" es un <label> sin control asociado').toBe(false);

    await escanear(page, 'formulario-vacio', testInfo);
  });

  test('b. Teclado: recorrido completo del formulario y del checklist, foco visible (2.1.1 / 2.4.7)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAPatologias(page);
    const dialogo = await abrirFormulario(page);

    // Recorre con Tab dentro del diálogo y registra cada parada
    await dialogo.getByRole('textbox', { name: /Nombre de la patología/ }).focus();
    const paradas: { control: string; focoVisible: boolean; alto: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const cs = getComputedStyle(el);
        const nombre = el.getAttribute('aria-label') ?? (el as HTMLInputElement).labels?.[0]?.textContent ?? el.textContent ?? el.tagName;
        return {
          control: `${el.tagName.toLowerCase()}:${nombre.replace(/\s+/g, ' ').trim().slice(0, 40)}`,
          focoVisible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
          alto: el.getBoundingClientRect().height,
          dentro: !!el.closest('[role="dialog"]'),
        };
      });
      if (!info.dentro) break;
      paradas.push(info);
      if (paradas.length > 1 && info.control === paradas[0].control) break;
      await page.keyboard.press('Tab');
    }
    testInfo.annotations.push({ type: 'Orden de foco', description: paradas.map((p) => p.control).join(' → ') });
    const sinFoco = paradas.filter((p) => !p.focoVisible).map((p) => p.control);
    expect.soft(sinFoco, 'DEFECTO 2.4.7: controles sin foco visible').toEqual([]);
    expect.soft(paradas.some((p) => /variables|Temperatura/i.test(p.control)), '2.1.1: el checklist de variables se alcanza con Tab').toBe(true);

    // Selección de variables con Espacio
    const grupo = dialogo.getByRole('group', { name: /Variables sensóricas asociadas/ });
    const primera = grupo.getByRole('button').nth(0);
    const segunda = grupo.getByRole('button').nth(1);
    await primera.focus();
    await page.keyboard.press('Space');
    await segunda.focus();
    await page.keyboard.press('Space');
    await expect.soft(primera, '2.1.1: Espacio marca la variable').toHaveAttribute('aria-pressed', 'true');
    await expect.soft(segunda, '2.1.1: Espacio marca la variable').toHaveAttribute('aria-pressed', 'true');
    const altos = await grupo.getByRole('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    testInfo.annotations.push({ type: 'Alto de las opciones', description: `${Math.min(...altos)} px (DS: mínimo 48 px)` });
    expect.soft(Math.min(...altos), 'DEFECTO DS (2.5.5): opciones del checklist por debajo de 48 px de alto').toBeGreaterThanOrEqual(48);

    await escanear(page, 'formulario-teclado', testInfo);
  });

  test('c. Errores de validación anunciados y asociados al campo (3.3.1 / 4.1.3)', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAPatologias(page);
    const dialogo = await abrirFormulario(page);

    // Envío vacío: nombre obligatorio, descripción < 50, variables < 2
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialogo.getByRole('alert').first()).toBeVisible();
    const alertas = (await dialogo.getByRole('alert').allInnerTexts()).map((t) => t.trim());
    testInfo.annotations.push({ type: 'Errores (envío vacío)', description: alertas.join(' | ') });
    expect.soft(alertas.join(' '), '3.3.1: error de nombre').toMatch(/nombre es obligatorio/i);
    expect.soft(alertas.join(' '), '3.3.1: error de descripción < 50').toMatch(/Mínimo 50 caracteres/);
    expect.soft(alertas.join(' '), '3.3.1: error de mínimo 2 variables').toMatch(/entre 2 y 6 variables/);

    const nombre = await a11yDeCampo(dialogo.getByRole('textbox', { name: /Nombre de la patología/ }));
    const descripcion = await a11yDeCampo(dialogo.locator('#pat-form-desc'));
    testInfo.annotations.push({ type: 'Asociación de errores', description: JSON.stringify({ nombre, descripcion }) });
    expect.soft(nombre.invalido, '3.3.1: nombre con aria-invalid').toBe('true');
    expect.soft(nombre.descrito, '3.3.1: error del nombre asociado con aria-describedby').toMatch(/obligatorio/i);
    expect.soft(descripcion.invalido, '3.3.1: descripción con aria-invalid').toBe('true');
    expect.soft(descripcion.descrito, 'DEFECTO 3.3.1: el error de la descripción no está asociado al campo (aria-describedby)').toMatch(/Mínimo 50/);
    const grupoError = await dialogo.getByRole('group', { name: /Variables sensóricas asociadas/ }).evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return { describedby: ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' '), invalido: el.getAttribute('aria-invalid') };
    });
    expect.soft(grupoError.describedby, 'DEFECTO 3.3.1: el error "entre 2 y 6 variables" no está asociado al grupo').toMatch(/2 y 6/);
    await escanear(page, 'errores-envio-vacio', testInfo);

    // E4: nombre duplicado → rechazo real del backend (GET de salvaguarda: el nombre existe)
    const existente = estado.catalogo.find((p) => p.es_activo && String(p.especie_aplicable) === 'TODAS');
    expect(existente, 'Precondición: existe una patología activa (especie TODAS) para el nombre duplicado').toBeTruthy();
    estado.duplicado = { nombre: String(existente!.nombre_patologia), especie: 'TODAS' };
    testInfo.annotations.push({ type: 'Nombre duplicado usado', description: estado.duplicado.nombre });
    await dialogo.getByRole('textbox', { name: /Nombre de la patología/ }).fill(estado.duplicado.nombre);
    await dialogo.locator('#pat-form-desc').fill(DESCRIPCION_VALIDA);
    const grupo = dialogo.getByRole('group', { name: /Variables sensóricas asociadas/ });
    for (let i = 0; i < 2; i++) if ((await grupo.getByRole('button').nth(i).getAttribute('aria-pressed')) !== 'true') await grupo.getByRole('button').nth(i).click();
    const respuesta = page.waitForResponse((r) => ruta(r.url()) === '/prediccion/patologias' && r.request().method() === 'POST', { timeout: 30_000 }).catch(() => null);
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    const res = await respuesta;
    const status = res?.status() ?? 0;
    const cuerpo = res ? await res.json().catch(() => ({})) : {};
    testInfo.annotations.push({ type: 'E4 (real)', description: `${status} ${JSON.stringify(cuerpo).slice(0, 300)}` });
    expect(status, 'El backend rechaza el nombre duplicado (no se crea nada)').toBeGreaterThanOrEqual(400);
    await page.waitForTimeout(1_000);
    const nombreTrasE4 = await a11yDeCampo(dialogo.getByRole('textbox', { name: /Nombre de la patología/ }));
    const alertasE4 = (await dialogo.getByRole('alert').allInnerTexts()).join(' | ');
    testInfo.annotations.push({ type: 'E4 en pantalla', description: `alertas: "${alertasE4}" · nombre: ${JSON.stringify(nombreTrasE4)}` });
    expect.soft(alertasE4, '4.1.3: el error de nombre duplicado se anuncia (role=alert)').not.toBe('');
    expect.soft(nombreTrasE4.descrito, 'DEFECTO 3.3.1: el error de nombre duplicado no queda asociado al campo nombre').not.toBe('');
    expect.soft(estado.posts.filter((p) => !p.real).length, 'Ningún otro POST salió del navegador').toBe(0);
    await escanear(page, 'error-nombre-duplicado', testInfo);
  });

  test('d. Patología base: el bloqueo de edición se comunica de forma accesible (no solo visual)', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAPatologias(page);
    const base = estado.catalogo.find((p) => p.es_base);
    expect(base, 'Precondición: existe una patología base').toBeTruthy();
    const nombreBase = String(base!.nombre_patologia);
    const verBase = page.getByRole('button', { name: `Ver ${nombreBase}`, exact: true });
    await expect(verBase).toBeVisible();
    const fila = page.locator('tbody tr').filter({ has: verBase });

    // 2026-10-27 (M4-11, previo a esta evaluación): para es_base=true ya no hay un botón
    // "Editar X" deshabilitado — se reemplazó por un <span> con ícono de candado y el
    // motivo como texto visible en la fila (antes el motivo solo estaba en un title).
    const editar = fila.getByRole('button', { name: `Editar ${nombreBase}`, exact: true });
    expect.soft(await editar.count(), 'DEFECTO: reapareció un botón "Editar" para una patología base').toBe(0);
    const motivo = fila.getByText('Patología base: no editable', { exact: true });
    await expect.soft(motivo, '1.3.1/4.1.2: el motivo de bloqueo debe ser texto visible en la fila, no solo un title').toBeVisible();

    // La fila sí informa el tipo "Base" con texto (pill de tipo)
    expect.soft(await fila.innerText(), 'La fila indica "Base" con texto').toMatch(/Base/);
    await escanear(page, 'patologia-base', testInfo);
  });
});
