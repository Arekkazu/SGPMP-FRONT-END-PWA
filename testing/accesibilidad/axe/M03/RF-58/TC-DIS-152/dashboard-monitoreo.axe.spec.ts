/**
 * TC-DIS-152 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del Dashboard de Monitoreo en Tiempo Real
 * (riesgo de semaforización solo-color)
 * RF-58 v1.0 · CU-04 Monitorear y Consultar Telemetría · Rol: Productor · Prioridad: Alta
 * Ruta: /telemetria/monitoreo — MonitoreoView + UnidadCard + SensorCard (SemaforoPill, Gauge)
 * + SensorDetalleModal
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Criterios (hoja "CASOS DE PRUEBA UI/UX"): 0 violaciones axe A/AA, con énfasis CRÍTICO en
 *   1.4.1 — cada estado del semáforo VERDE/AMARILLO/ROJO/GRIS se comunica también con texto o
 *           ícono (perfil Productor con baja alfabetización digital, posible daltonismo);
 *   1.4.3 — contraste ≥ 4.5:1 en cada tarjeta de variable (axe color-contrast);
 *   4.1.2 — name/role/value en cada tarjeta;
 *   4.1.3 — el indicador de degradación ("Actualización con retraso" / "Trabajando sin
 *           conexión", RF-58 Restricción 1, Niveles 2 y 3) se anuncia por aria-live.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 * La verificación "manual" del 1.4.1 se automatiza leyendo el DOM: texto + ícono por estado.
 *
 * Datos: sensores REALES del Productor (finca "Finca Prueba Alfa"), con los 4 estados del
 * semáforo. La degradación se SIMULA ("Datos simulados"): Nivel 2 retrasando 3,5 s la respuesta
 * real de GET /iot/monitoreo/dashboard (2 000 < latencia ≤ 5 000 ms); Nivel 3 sin respuesta del
 * backend (petición abortada) y luego navegador sin red. El reloj de la página se controla con
 * page.clock para disparar el refresco automático de 30 s sin esperar.
 * PROTECCIÓN DE DATOS: toda escritura al backend se aborta; la vista es de solo lectura.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_152_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-152';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_152_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const REFRESCO_MS = 30_000;
const LATENCIA_NIVEL_2_MS = 3_500;

// Texto visible de SemaforoPill por estado (src/telemetry/components/SemaforoPill.tsx)
const ETIQUETA_SEMAFORO: Record<string, string> = { VERDE: 'Normal', AMARILLO: 'Advertencia', ROJO: 'Fuera de rango', GRIS: 'Sin señal' };

const ruta = (url: string) => new URL(url).pathname.replace(/^.*\/api-sgpmp-test/, '');

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión, datos y degradación simulada ────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

type Modo = 'normal' | 'retraso' | 'sin-respuesta';

/** Solo lecturas; el dashboard responde normal, con retraso (Nivel 2) o no responde (Nivel 3). */
async function interceptar(page: Page) {
  const estado = { modo: 'normal' as Modo, sensores: [] as Record<string, unknown>[] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = ruta(req.url());
    if (metodo === 'OPTIONS' || /^\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    if (p.startsWith('/iot/monitoreo/dashboard')) {
      if (estado.modo === 'sin-respuesta') return route.abort('timedout');
      const res = await route.fetch();
      const json = await res.json();
      if (estado.modo === 'normal') estado.sensores = json.sensores ?? [];
      if (estado.modo === 'retraso') await new Promise((r) => setTimeout(r, LATENCIA_NIVEL_2_MS));
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

async function irAMonitoreo(page: Page) {
  await page.goto(`${APP}/telemetria/monitoreo`);
  await expect(page.getByRole('heading', { level: 1, name: 'Monitoreo en Tiempo Real' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/\d+ sensor\(es\)/)).toBeVisible({ timeout: 60_000 });
}

/** Textos de todas las regiones que un lector de pantalla anuncia sin mover el foco. */
async function textoAnunciado(page: Page) {
  return (await page.locator('[aria-live="assertive"], [aria-live="polite"], [role="alert"], [role="status"], [role="log"]').allInnerTexts())
    .join(' | ').replace(/\s+/g, ' ');
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

test.describe('TC-DIS-152 — Dashboard de Monitoreo en Tiempo Real', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_152_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. [CRÍTICO 1.4.1] Nivel 0: cada estado del semáforo con texto e ícono; tarjetas con nombre (4.1.2)', async ({ page }, testInfo) => {
    const datos = await interceptar(page);
    await irAMonitoreo(page);

    // Precondición: los 4 estados del semáforo están en los datos reales del Productor
    const enDatos = [...new Set(datos.sensores.map((s) => String(s.estado_semaforo)))].sort();
    testInfo.annotations.push({ type: 'Datos', description: `${datos.sensores.length} sensores reales · estados: ${enDatos.join(', ')}` });
    expect(enDatos, 'Precondición: datos con los 4 estados del semáforo').toEqual(['AMARILLO', 'GRIS', 'ROJO', 'VERDE']);

    // 1.4.1 por tarjeta de sensor: el pill del semáforo tiene su texto y su ícono, y coincide con el dato
    const tarjetas = page.locator('button.ds-option').filter({ has: page.getByRole('img') });
    const n = await tarjetas.count();
    expect(n, 'Hay tarjetas de sensor').toBeGreaterThan(0);
    const leidas = await tarjetas.evaluateAll((els) => els.map((el) => {
      const pills = [...el.querySelectorAll('span')].filter((s) => /^(Normal|Advertencia|Fuera de rango|Sin señal)$/.test(s.textContent?.trim() ?? ''));
      const pill = pills[0];
      return {
        nombre: el.querySelector('div div')?.textContent?.trim() ?? '',
        estado: pill?.textContent?.trim() ?? '',
        icono: !!pill?.parentElement?.querySelector('svg') || !!pill?.querySelector('svg'),
      };
    }));
    const porEstado: Record<string, number> = {};
    for (const t of leidas) {
      porEstado[t.estado || '(sin texto)'] = (porEstado[t.estado || '(sin texto)'] ?? 0) + 1;
      expect.soft(t.estado, `DEFECTO 1.4.1: la tarjeta "${t.nombre}" no muestra el estado del semáforo en texto`).toMatch(/^(Normal|Advertencia|Fuera de rango|Sin señal)$/);
      expect.soft(t.icono, `DEFECTO 1.4.1: el estado "${t.estado}" de "${t.nombre}" no tiene ícono`).toBe(true);
    }
    testInfo.annotations.push({ type: 'Semáforo en pantalla', description: JSON.stringify(porEstado) });
    for (const [codigo, texto] of Object.entries(ETIQUETA_SEMAFORO)) {
      if (enDatos.includes(codigo)) expect.soft(porEstado[texto] ?? 0, `El estado ${codigo} se muestra como "${texto}"`).toBeGreaterThan(0);
    }

    // 4.1.2: cada tarjeta (botón) tiene nombre accesible con el sensor y su estado
    const nombres = await tarjetas.evaluateAll((els) => els.slice(0, 40).map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()));
    for (const nombre of nombres) {
      expect.soft(nombre, 'DEFECTO 4.1.2: tarjeta de sensor sin nombre accesible con su estado').toMatch(/Normal|Advertencia|Fuera de rango|Sin señal/);
    }

    // 1.4.1 / 1.3.1 en el resumen de cada unidad: el estado general y los contadores con texto
    const unidades = await page.locator('section > div:first-child').evaluateAll((els) => els.map((el) => {
      const pills = [...el.querySelectorAll('span')].map((s) => s.textContent?.trim() ?? '');
      const estadoGeneral = pills.find((t) => /^(VERDE|AMARILLO|ROJO|GRIS|Normal|Advertencia|Fuera de rango|Sin señal)$/.test(t)) ?? '';
      const contadores = [...el.querySelectorAll('span[title]')].map((s) => ({
        titulo: s.getAttribute('title') ?? '',
        visible: (s.textContent ?? '').trim(),
        etiquetaAccesible: s.getAttribute('aria-label') ?? '',
      }));
      return { nombre: el.querySelector('div div div div')?.textContent?.trim() ?? '', estadoGeneral, contadores };
    }));
    testInfo.annotations.push({ type: 'Unidades', description: unidades.map((u) => `${u.nombre}: ${u.estadoGeneral}`).join(' · ') });
    // Un defecto por tipo (no uno por unidad): se listan las unidades afectadas
    const colorComoEstado = unidades.filter((u) => /^(VERDE|AMARILLO|ROJO|GRIS)$/.test(u.estadoGeneral)).map((u) => `${u.nombre}=${u.estadoGeneral}`);
    expect.soft(colorComoEstado, 'DEFECTO 1.4.1: el estado general de la unidad muestra el nombre del color (VERDE/ROJO/GRIS), no su significado, y sin ícono').toEqual([]);
    // El texto visible es solo un número; "Sensores en línea" vive en title, que los lectores no leen de forma fiable
    const contadoresSinEtiqueta = [...new Set(unidades.flatMap((u) => u.contadores.filter((c) => !/\D/.test(c.visible) && !c.etiquetaAccesible).map((c) => c.titulo)))];
    expect.soft(contadoresSinEtiqueta, `DEFECTO 1.3.1: contadores de las ${unidades.length} unidades que muestran solo un número (la etiqueta está solo en title)`).toEqual([]);

    await escanear(page, 'nivel0', testInfo);
  });

  test('b. [4.1.3] Nivel 2: "Actualización con retraso" visible y anunciado (Datos simulados)', async ({ page }, testInfo) => {
    const datos = await interceptar(page);
    await page.clock.install();
    await irAMonitoreo(page);
    await page.getByLabel('Filtrar por ID de infraestructura').focus();
    const antes = await textoAnunciado(page);

    // Latencia 3,5 s en el refresco automático (Nivel 2: 2 000 < latencia ≤ 5 000 ms)
    datos.modo = 'retraso';
    await page.clock.runFor(REFRESCO_MS + 1_000);
    await page.clock.resume();
    await page.waitForTimeout(LATENCIA_NIVEL_2_MS + 3_000);

    const anunciado = await textoAnunciado(page);
    const visible = await page.getByText(/Actualizaci[oó]n con retraso/i).count();
    const subtitulo = (await page.locator('h1 + p').innerText()).trim();
    testInfo.annotations.push({ type: 'Nivel 2', description: `indicador visible: ${visible} · regiones live: "${anunciado || '(vacío)'}" · subtítulo: "${subtitulo}"` });
    expect.soft(visible, 'DEFECTO RF-58 Nivel 2: no aparece el indicador "Actualización con retraso"').toBeGreaterThan(0);
    expect.soft(anunciado === antes ? '' : anunciado, 'DEFECTO 4.1.3: el indicador de degradación (Nivel 2) no se anuncia por aria-live').toMatch(/retraso/i);
    expect.soft(subtitulo, 'DEFECTO RF-58 Nivel 2: el indicador no muestra la hora del último dato').toMatch(/\d{1,2}:\d{2}/);
    await escanear(page, 'nivel2-retraso', testInfo);
  });

  test('c. [4.1.3] Nivel 3: "Trabajando sin conexión" visible y anunciado (Datos simulados)', async ({ page, context }, testInfo) => {
    const datos = await interceptar(page);
    await page.clock.install();
    await irAMonitoreo(page);
    await page.getByLabel('Filtrar por ID de infraestructura').focus();

    // 1) El backend deja de responder en el refresco automático (Nivel 3: ausencia de respuesta)
    datos.modo = 'sin-respuesta';
    await page.clock.runFor(REFRESCO_MS + 1_000);
    await page.clock.resume();
    await page.waitForTimeout(5_000);
    const anuncioBackend = await textoAnunciado(page);
    const indicadorBackend = await page.getByText(/Trabajando sin conexi[oó]n/i).count();
    testInfo.annotations.push({ type: 'Nivel 3 (backend sin respuesta)', description: `indicador RF-58: ${indicadorBackend} · regiones live: "${anuncioBackend || '(vacío)'}"` });
    expect.soft(indicadorBackend, 'DEFECTO RF-58 Nivel 3: sin respuesta del backend no aparece "Trabajando sin conexión"').toBeGreaterThan(0);
    expect.soft(anuncioBackend, 'DEFECTO 4.1.3: la pérdida de respuesta del backend no se anuncia').toMatch(/conexi[oó]n|cach[eé]/i);
    await escanear(page, 'nivel3-backend', testInfo);

    // 2) El navegador pierde la red
    await context.setOffline(true);
    await page.waitForTimeout(2_000);
    const anuncioOffline = await textoAnunciado(page);
    const indicadorOffline = await page.getByText(/Trabajando sin conexi[oó]n/i).count();
    testInfo.annotations.push({ type: 'Nivel 3 (sin red)', description: `indicador RF-58: ${indicadorOffline} · regiones live: "${anuncioOffline || '(vacío)'}"` });
    expect.soft(indicadorOffline, 'DEFECTO RF-58 Nivel 3: sin red no aparece el texto "Trabajando sin conexión"').toBeGreaterThan(0);
    expect.soft(anuncioOffline, 'DEFECTO 4.1.3: la desconexión no se anuncia').toMatch(/conexi[oó]n/i);
    expect.soft(anuncioOffline, 'DEFECTO RF-58 Nivel 3: el indicador no muestra la hora del último dato').toMatch(/\d{1,2}:\d{2}/);
    // 1.4.1: el aviso tiene ícono además del color
    const aviso = page.getByRole('alert').filter({ hasText: /conexi[oó]n/i }).first();
    if (await aviso.count()) expect.soft(await aviso.locator('svg').count(), 'DEFECTO 1.4.1: el aviso de desconexión no tiene ícono').toBeGreaterThan(0);
    await escanear(page, 'nivel3-sin-red', testInfo);
    await context.setOffline(false);
  });

  test('d. Teclado: detalle de un sensor por teclado, foco visible y retorno del foco (2.1.1 / 2.4.3 / 2.4.7)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAMonitoreo(page);
    const tarjeta = page.locator('button.ds-option').filter({ hasText: /Fuera de rango|Advertencia/ }).filter({ has: page.getByRole('img') }).first();
    await tarjeta.focus();
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, sombra: cs.boxShadow !== 'none' };
    });
    testInfo.annotations.push({ type: 'Foco en tarjeta', description: JSON.stringify(foco) });
    expect.soft(foco.outline || foco.sombra, 'DEFECTO 2.4.7: la tarjeta enfocada no muestra foco visible').toBe(true);

    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog').first();
    await expect(dialogo).toBeVisible({ timeout: 30_000 });
    await escanear(page, 'detalle-sensor', testInfo);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    const vuelve = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY');
    expect.soft(vuelve, 'DEFECTO 2.4.3: al cerrar el detalle el foco no vuelve a la tarjeta').toBe('BUTTON');
  });
});
