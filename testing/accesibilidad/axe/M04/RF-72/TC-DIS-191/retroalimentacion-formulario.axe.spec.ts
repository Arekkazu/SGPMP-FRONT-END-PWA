/**
 * TC-DIS-191 — Verificar accesibilidad WCAG 2.1 AA del formulario de Retroalimentación Clínica
 * sobre Resultados de Inferencia
 * RF-72 · CU-08 - Registrar Retroalimentación Clínica · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/historial → "Retroalimentar" — RetroalimentacionFormModal
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario (cuenta de Finca Prueba Alfa, datos semilla del 2026-10-22).
 *   - Resultado de inferencia INDIVIDUAL en el historial: activo #876 (datos REALES).
 *   - Catálogo de patologías activo con al menos 3 patologías (comorbilidades).
 *   - Resultado de inferencia POBLACIONAL en el historial: área #878 (datos REALES).
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   2.1.1 / 2.4.7 — navegación completa por teclado del selector de estado_retroalimentacion,
 *                   del selector múltiple de hasta 3 patologías y del campo de observaciones;
 *   4.1.2 — name/role/value correctos en los controles, incluido el contador de caracteres de
 *           observaciones (máx. 500).
 * Notas del caso: el diagnóstico real (obligatorio en PARCIAL/INCORRECTO) aparece manteniendo el
 * foco y se anuncia; sobre un resultado POBLACIONAL el formulario no muestra una patología predicha
 * y, si avisa que no se usa para reentrenamiento, el aviso está asociado (aria-describedby).
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * El formulario se abre desde el Historial (inferencias reales). La vista "Retroalimentación" no se
 * usa: su lista de pendientes es de ejemplo (banner "Datos simulados").
 * Selector de activo: en TEST la lista `/activos-biologicos/?por_pagina=200` responde 307 → 404 y
 * la vista cae al campo numérico; la prueba escribe el ID o lo elige si la lista cargó.
 * PROTECCIÓN DE DATOS: ninguna evaluación se registra; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_191_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-191';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_191_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ACTIVO_INDIVIDUAL = 876;
const AREA_POBLACIONAL = 878;
const DESDE = '2020-01-01';

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

/** Solo lecturas: ninguna evaluación llega al backend. Devuelve las escrituras intentadas. */
async function protegerEscrituras(page: Page) {
  const escrituras: string[] = [];
  await page.route((url) => API.test(url.href), (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'GET' || metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    escrituras.push(`${metodo} ${p.replace(/^.*\/api-sgpmp-test/, '')}`);
    return route.abort();
  });
  return escrituras;
}

/** Consulta el historial de `id` y abre el formulario de retroalimentación del primer resultado. */
async function abrirFormulario(page: Page, id: number): Promise<Locator> {
  await page.goto(`${APP}/prediccion/historial`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/historial/i, { timeout: 60_000 });
  const campo = page.locator('#hist-activo');
  await campo.waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if ((await campo.evaluate((e) => e.tagName)) === 'SELECT') await campo.selectOption(String(id));
  else await campo.fill(String(id));
  await page.locator('#hist-desde').fill(DESDE);
  await page.getByRole('button', { name: /consultar/i }).click();
  const retro = page.locator('main').getByRole('button', { name: /retroalimentar/i }).first();
  await expect(retro, `BLOQUEO: el historial de #${id} no ofrece "Retroalimentar" para el rol Veterinario`).toBeVisible({ timeout: 60_000 });
  await retro.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: /retroalimentaci[oó]n cl[ií]nica/i })).toBeVisible({ timeout: 15_000 });
  return dialogo;
}

/** Elemento enfocado y si muestra un indicador de foco. */
async function enfocado(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return { descripcion: '(body)', focoVisible: false, rol: '' };
    const cs = getComputedStyle(a);
    const id = a.id;
    const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent : '';
    const rol = a.getAttribute('role') ?? a.tagName.toLowerCase();
    return {
      descripcion: `${rol} "${(label || a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`,
      focoVisible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
      rol,
    };
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

test.describe('TC-DIS-191 — Formulario de Retroalimentación Clínica', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_191_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesion(page);
  });

  test(`a. Formulario sobre una inferencia INDIVIDUAL real (#${ACTIVO_INDIVIDUAL}); escaneo`, async ({ page }, testInfo) => {
    const escrituras = await protegerEscrituras(page);
    const dialogo = await abrirFormulario(page, ACTIVO_INDIVIDUAL);
    testInfo.annotations.push({ type: 'Contexto del formulario', description: (await dialogo.innerText()).replace(/\s+/g, ' ').slice(0, 250) });
    await escanear(page, 'formulario-individual', testInfo);
    expect(escrituras, 'Abrir el formulario no envía nada').toEqual([]);
  });

  test('b. [4.1.2] Name / role / value de los controles y contador de observaciones (máx. 500)', async ({ page }, testInfo) => {
    await protegerEscrituras(page);
    const dialogo = await abrirFormulario(page, ACTIVO_INDIVIDUAL);

    // Selector de estado: un radiogroup con nombre y 4 radios con nombre y estado
    const grupo = await dialogo.locator('[role="radiogroup"]').first().evaluate((g) => ({
      nombre: g.getAttribute('aria-label') ?? (g.getAttribute('aria-labelledby') ? document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent : null) ?? null,
      radios: [...g.querySelectorAll('[role="radio"]')].map((r) => ({ nombre: (r.textContent ?? '').replace(/\s+/g, ' ').trim(), checked: r.getAttribute('aria-checked') })),
    }));
    testInfo.annotations.push({ type: 'Selector de estado', description: JSON.stringify(grupo) });
    expect.soft(grupo.radios.map((r) => r.checked), '4.1.2: cada opción expone aria-checked').not.toContain(null);
    expect.soft(grupo.nombre, 'DEFECTO 4.1.2: el radiogroup de calificación no tiene nombre accesible (su rótulo es un <label> sin control asociado)').toBeTruthy();

    // Observaciones: rótulo, máximo 500 y contador de caracteres asociado
    const obs = dialogo.getByLabel(/observaciones cl[ií]nicas/i);
    await expect(obs, '1.3.1 / 4.1.2: observaciones con rótulo').toHaveCount(1);
    const infoObs = await obs.evaluate((t) => ({
      maxLength: (t as HTMLTextAreaElement).maxLength,
      describedby: t.getAttribute('aria-describedby'),
      contador: (t.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' '),
    }));
    await obs.fill('Observación de prueba');
    const contadorVisible = await dialogo.getByText(/\d+\s*\/\s*500/).count();
    testInfo.annotations.push({ type: 'Observaciones', description: `${JSON.stringify(infoObs)} · contador "n/500" visible: ${contadorVisible}` });
    expect.soft(infoObs.maxLength, 'DEFECTO: observaciones no limita a 500 caracteres (maxlength)').toBe(500);
    expect.soft(contadorVisible, 'DEFECTO 4.1.2: observaciones no tiene contador de caracteres (n/500)').toBeGreaterThan(0);
    expect.soft(infoObs.describedby, 'DEFECTO 4.1.2: el contador de caracteres no está asociado al campo (aria-describedby)').toBeTruthy();
  });

  test('c. [2.1.1 / 2.4.7] Selector de estado y observaciones solo con teclado', async ({ page }, testInfo) => {
    await protegerEscrituras(page);
    const dialogo = await abrirFormulario(page, ACTIVO_INDIVIDUAL);
    const primera = dialogo.getByRole('radio').first();
    await page.keyboard.press('Shift');
    await primera.focus();
    const recorrido = [await enfocado(page)];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await enfocado(page));
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab desde "Correcto"', description: recorrido.map((p) => `${p.descripcion}${p.focoVisible ? '' : ' [SIN FOCO VISIBLE]'}`).join(' → ') });
    expect.soft(recorrido.filter((p) => !p.focoVisible && p.descripcion !== '(body)').map((p) => p.descripcion), 'DEFECTO 2.4.7: controles que reciben foco sin indicador visible').toEqual([]);
    expect.soft(recorrido.some((p) => /Observaciones/i.test(p.descripcion)), '2.1.1: observaciones se alcanza con Tab').toBe(true);

    // Patrón radio: las flechas mueven la selección dentro del grupo
    await primera.focus();
    await page.keyboard.press('ArrowRight');
    const tras = await enfocado(page);
    testInfo.annotations.push({ type: 'Flecha derecha en el radiogroup', description: tras.descripcion });
    const radiosEnTab = recorrido.filter((p) => p.rol === 'radio').length;
    testInfo.annotations.push({ type: 'Radios como paradas de Tab', description: String(radiosEnTab) });

    // Selección con teclado
    await primera.focus();
    await page.keyboard.press('Space');
    await expect.soft(primera, '2.1.1: Espacio selecciona la opción').toHaveAttribute('aria-checked', 'true');
  });

  test('d. Estado PARCIAL por teclado: aparece el diagnóstico real, conserva el foco y se anuncia; hasta 3 patologías', async ({ page }, testInfo) => {
    const escrituras = await protegerEscrituras(page);
    const dialogo = await abrirFormulario(page, ACTIVO_INDIVIDUAL);
    const parcial = dialogo.getByRole('radio', { name: /parcial/i });
    await page.keyboard.press('Shift');
    await parcial.focus();
    await page.keyboard.press('Enter');
    await expect(parcial).toHaveAttribute('aria-checked', 'true');
    const rotulo = dialogo.getByText(/patolog[ií]a del diagn[oó]stico real/i);
    await expect(rotulo, 'Con PARCIAL aparece el diagnóstico real').toBeVisible({ timeout: 5_000 });
    const foco = await enfocado(page);
    testInfo.annotations.push({ type: 'Foco al aparecer el diagnóstico', description: foco.descripcion });
    expect.soft(foco.descripcion, 'El foco se mantiene en la opción elegida').toMatch(/Parcial/);

    const anuncio = await rotulo.evaluate((el) => {
      let n: Element | null = el;
      while (n && n.getAttribute('role') !== 'dialog') {
        const live = n.getAttribute('aria-live');
        if ((live && live !== 'off') || ['status', 'alert'].includes(n.getAttribute('role') ?? '')) return 'región viva';
        n = n.parentElement;
      }
      return null;
    });
    const controla = await parcial.getAttribute('aria-controls');
    testInfo.annotations.push({ type: 'Anuncio del campo nuevo', description: `región viva: ${anuncio ?? 'no'} · aria-controls en la opción: ${controla ?? 'no'}` });
    expect.soft(anuncio ?? controla, 'DEFECTO 4.1.3: el campo de diagnóstico aparece sin anunciarse (sin región viva ni relación aria-controls)').toBeTruthy();

    // Selector múltiple: grupo con nombre; hasta 3 por teclado
    const opciones = dialogo.locator('button[aria-pressed]');
    const n = await opciones.count();
    testInfo.annotations.push({ type: 'Patologías disponibles', description: String(n) });
    expect.soft(n, 'Precondición: al menos 3 patologías en el catálogo').toBeGreaterThanOrEqual(3);
    const grupo = await opciones.first().evaluate((b) => {
      const g = b.closest('[role="group"], fieldset');
      return g ? (g.getAttribute('aria-label') ?? g.querySelector('legend')?.textContent ?? '(sin nombre)') : null;
    });
    expect.soft(grupo, 'DEFECTO 1.3.1 / 4.1.2: las patologías son botones sueltos; no están en un grupo con el rótulo "Patología del diagnóstico real"').toBeTruthy();
    for (let i = 0; i < Math.min(4, n); i++) {
      await opciones.nth(i).focus();
      await page.keyboard.press('Enter');
    }
    const marcadas = await dialogo.locator('button[aria-pressed="true"]').count();
    const cuarta = n >= 4 ? await opciones.nth(3).evaluate((b) => ({ pressed: b.getAttribute('aria-pressed'), disabled: (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true' })) : null;
    testInfo.annotations.push({ type: 'Selección por teclado', description: `marcadas tras 4 Enter: ${marcadas} · cuarta: ${JSON.stringify(cuarta)}` });
    expect.soft(marcadas, '2.1.1: se seleccionan hasta 3 patologías con teclado').toBe(3);
    if (cuarta) expect.soft(cuarta.disabled, 'La 4.ª opción comunica que el máximo está alcanzado (disabled / aria-disabled)').toBe(true);
    await escanear(page, 'diagnostico-real', testInfo);
    expect(escrituras, 'No se registró ninguna evaluación').toEqual([]);
  });

  test(`e. Formulario sobre una inferencia POBLACIONAL real (#${AREA_POBLACIONAL})`, async ({ page }, testInfo) => {
    await protegerEscrituras(page);
    const dialogo = await abrirFormulario(page, AREA_POBLACIONAL);
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'Contexto del formulario POBLACIONAL', description: texto.slice(0, 300) });
    expect.soft(/patolog[ií]a (predicha|estimada)/i.test(texto), 'El formulario POBLACIONAL no muestra una patología predicha para comparar').toBe(false);
    const aviso = /reentrenamiento/i.test(texto);
    testInfo.annotations.push({ type: 'Aviso de reentrenamiento', description: aviso ? 'sí' : 'no (el formulario no informa que la retroalimentación POBLACIONAL no se usa para reentrenar)' });
    if (aviso) {
      const asociado = await dialogo.evaluate((d) => !!d.getAttribute('aria-describedby'));
      expect.soft(asociado, 'El aviso de reentrenamiento está asociado al formulario (aria-describedby)').toBe(true);
    }
    await escanear(page, 'formulario-poblacional', testInfo);
  });
});
