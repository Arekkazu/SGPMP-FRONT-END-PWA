/**
 * TC-DIS-152 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del Dashboard de Monitoreo en Tiempo Real
 * (riesgo de semaforización solo-color)
 * RF-58 v1.0 · CU-04 Monitorear y Consultar Telemetría · Rol: Productor · Prioridad: Alta
 * Ruta: /telemetria/monitoreo — MonitoreoView + UnidadCard + SensorCard (SemaforoPill, Gauge)
 * + SensorDetalleModal
 *
 * Tercera ejecución (2026-10-29) sobre 1.4.0-rc.11, ambiente TEST (app en /sigab-test, API en
 * /api-sgpmp-test). Desde el prototipo 13.4 la vista agrupa los sensores por área en secciones
 * plegables (UnidadCard: botón con aria-expanded y un titular con lo que le pasa al área); dentro,
 * los sensores con problema van en tarjeta (SensorCard), los normales en fila (SensorFila) y los
 * que no reportan en un <details>. El semáforo se lee Normal / Cerca del límite / Fuera de rango /
 * Sin datos (o "Sin umbral configurado"). Los avisos de degradación son Alert (role="alert").
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

// Texto visible de SemaforoPill por estado (src/telemetry/components/SemaforoPill.tsx, desde M3-11)
const ETIQUETA_SEMAFORO: Record<string, string> = { VERDE: 'Normal', AMARILLO: 'Cerca del límite', ROJO: 'Fuera de rango', GRIS: 'Sin datos' };
const RE_ESTADO = /^(Normal|Cerca del límite|Fuera de rango|Sin datos|Sin umbral configurado)$/;
const RE_ESTADO_TEXTO = /Normal|Cerca del límite|Fuera de rango|Sin datos|Sin umbral configurado/;

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
  // 2026-10-27: el conteo ya no usa el literal "(es)" — i18next pluraliza a
  // "1 sensor" / "N sensores" desde el fix de T-22 (conteo.sensores_one/_other).
  // 1.4.0: el texto aparece también en las áreas ("N sensores sin datos"): se toma el subtítulo.
  await expect(page.locator('h1 + p')).toContainText(/\d+ sensores?/, { timeout: 60_000 });
  await expect(page.locator('main section').first()).toBeVisible({ timeout: 60_000 });
}

/** Abre todas las áreas plegadas y los grupos "sin datos", para leer cada sensor. */
async function desplegarTodo(page: Page) {
  const cerradas = page.locator('main section > button[aria-expanded="false"]');
  while (await cerradas.count()) await cerradas.first().click();
  await page.locator('main details:not([open]) > summary').evaluateAll((ss) => ss.forEach((s) => (s.parentElement as HTMLDetailsElement).open = true));
}

/** Botones de sensor (tarjeta o fila) dentro de las áreas. */
function sensoresEnPantalla(page: Page) {
  return page.locator('main [id^="area-"] button.ds-option');
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
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás.
  // El timeout global (30 s) no alcanza para login + axe + Lighthouse.
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

    // Las áreas en reposo plegadas se abren para leer todos los sensores de la página
    const plegadas = await page.locator('main section > button[aria-expanded="false"]').count();
    await desplegarTodo(page);

    // 1.4.1 por sensor (tarjeta o fila): el pill del semáforo tiene su texto y su ícono, y coincide con el dato
    const tarjetas = sensoresEnPantalla(page);
    const n = await tarjetas.count();
    expect(n, 'Hay sensores en pantalla').toBeGreaterThan(0);
    const leidas = await tarjetas.evaluateAll((els, re) => els.map((el) => {
      const pill = [...el.querySelectorAll('span')].find((s) => new RegExp(re).test(s.textContent?.trim() ?? '') && s.querySelector('svg'))
        ?? [...el.querySelectorAll('span')].find((s) => new RegExp(re).test(s.textContent?.trim() ?? ''));
      return {
        nombre: (el.querySelector('div div, span span')?.textContent ?? '').trim(),
        estado: pill?.textContent?.trim() ?? '',
        icono: !!pill?.querySelector('svg'),
      };
    }), RE_ESTADO.source);
    const porEstado: Record<string, number> = {};
    for (const t of leidas) {
      porEstado[t.estado || '(sin texto)'] = (porEstado[t.estado || '(sin texto)'] ?? 0) + 1;
      expect.soft(t.estado, `DEFECTO 1.4.1: el sensor "${t.nombre}" no muestra el estado del semáforo en texto`).toMatch(RE_ESTADO);
      expect.soft(t.icono, `DEFECTO 1.4.1: el estado "${t.estado}" de "${t.nombre}" no tiene ícono`).toBe(true);
    }
    testInfo.annotations.push({ type: 'Semáforo en pantalla', description: `${n} sensores (${plegadas} áreas estaban plegadas) · ${JSON.stringify(porEstado)}` });
    for (const [codigo, texto] of Object.entries(ETIQUETA_SEMAFORO)) {
      if (enDatos.includes(codigo) && codigo !== 'GRIS') expect.soft(porEstado[texto] ?? 0, `El estado ${codigo} se muestra como "${texto}"`).toBeGreaterThan(0);
    }
    if (enDatos.includes('GRIS')) expect.soft((porEstado['Sin datos'] ?? 0) + (porEstado['Sin umbral configurado'] ?? 0), 'El estado GRIS se muestra como "Sin datos" o "Sin umbral configurado"').toBeGreaterThan(0);

    // 4.1.2: cada sensor (botón) tiene nombre accesible con el sensor y su estado
    const nombres = await tarjetas.evaluateAll((els) => els.slice(0, 60).map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()));
    for (const nombre of nombres) {
      expect.soft(nombre, 'DEFECTO 4.1.2: sensor sin nombre accesible con su estado').toMatch(RE_ESTADO_TEXTO);
    }

    // 1.4.1 / 1.3.1 / 4.1.2 en cada área: botón con estado expandido y titular con lo que le pasa, contadores con texto
    const unidades = await page.locator('main section > button[aria-expanded]').evaluateAll((bs) => bs.map((b) => {
      const visibles = [...b.querySelectorAll('span')].filter((s) => s.querySelector('svg')).map((s) => (s.textContent ?? '').replace(/\s+/g, ' ').trim());
      return {
        nombre: (b.querySelector('div div div')?.textContent ?? '').trim(),
        expandido: b.getAttribute('aria-expanded'),
        controla: b.getAttribute('aria-controls'),
        texto: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
        contadores: visibles,
      };
    }));
    testInfo.annotations.push({ type: 'Áreas', description: unidades.slice(0, 6).map((u) => `${u.texto.slice(0, 120)} [aria-expanded=${u.expandido}]`).join(' ‖ ') });
    expect.soft(unidades.filter((u) => !u.controla).map((u) => u.nombre), '4.1.2: cada área plegable referencia su contenido (aria-controls)').toEqual([]);
    const colorComoEstado = unidades.filter((u) => /\b(VERDE|AMARILLO|ROJO|GRIS)\b/.test(u.texto)).map((u) => u.nombre);
    expect.soft(colorComoEstado, 'DEFECTO 1.4.1: el estado del área muestra el nombre del color, no su significado').toEqual([]);
    const contadoresSoloNumero = [...new Set(unidades.flatMap((u) => u.contadores.filter((c) => /^\d+$/.test(c))))];
    expect.soft(contadoresSoloNumero, 'DEFECTO 1.3.1: contadores de las áreas que muestran solo un número').toEqual([]);

    await escanear(page, 'nivel0', testInfo);
  });

  test('b. [4.1.3] Nivel 2: "Actualización con retraso" visible y anunciado (Datos simulados)', async ({ page }, testInfo) => {
    const datos = await interceptar(page);
    await page.clock.install();
    await irAMonitoreo(page);
    // Foco fuera de los avisos: en el selector de área
    await page.locator('#monitoreo-area').focus();
    const antes = await textoAnunciado(page);

    // Latencia 3,5 s en el refresco automático (Nivel 2: 2 000 < latencia ≤ 5 000 ms)
    datos.modo = 'retraso';
    await page.clock.runFor(REFRESCO_MS + 1_000);
    await page.clock.resume();
    const indicador = page.getByText(/Actualizaci[oó]n con retraso/i);
    await expect.soft(indicador.first(), 'DEFECTO RF-58 Nivel 2: no aparece el indicador "Actualización con retraso"').toBeVisible({ timeout: LATENCIA_NIVEL_2_MS + 8_000 });

    const anunciado = await textoAnunciado(page);
    const visible = await indicador.count();
    const subtitulo = (await page.locator('h1 + p').innerText()).trim();
    const avisoTexto = visible ? (await page.getByRole('alert').filter({ hasText: /retraso/i }).first().innerText().catch(() => '')).replace(/\s+/g, ' ') : '';
    testInfo.annotations.push({ type: 'Nivel 2', description: `indicador visible: ${visible} · aviso: "${avisoTexto}" · regiones live: "${anunciado || '(vacío)'}" · subtítulo: "${subtitulo}"` });
    expect.soft(anunciado === antes ? '' : anunciado, 'DEFECTO 4.1.3: el indicador de degradación (Nivel 2) no se anuncia por aria-live').toMatch(/retraso/i);
    expect.soft(`${avisoTexto} ${subtitulo}`, 'DEFECTO RF-58 Nivel 2: el indicador no muestra la hora del último dato').toMatch(/\d{1,2}:\d{2}/);
    await escanear(page, 'nivel2-retraso', testInfo);
    // El aviso debe seguir mientras dura la degradación (el Alert info del DS se oculta solo a los 6 s)
    await page.waitForTimeout(8_000);
    expect.soft(await indicador.count(), 'DEFECTO RF-58 Nivel 2: el aviso "Actualización con retraso" desaparece solo a los pocos segundos aunque la degradación sigue').toBeGreaterThan(0);
  });

  test('c. [4.1.3] Nivel 3: "Trabajando sin conexión" visible y anunciado (Datos simulados)', async ({ page, context }, testInfo) => {
    const datos = await interceptar(page);
    await page.clock.install();
    await irAMonitoreo(page);
    await page.locator('#monitoreo-area').focus();

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
    const tarjeta = sensoresEnPantalla(page).filter({ hasText: /Fuera de rango|Cerca del límite/ }).first();
    await page.keyboard.press('Shift');
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
