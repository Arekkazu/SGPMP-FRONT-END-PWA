/**
 * TC-DIS-140 — Accesibilidad WCAG 2.1 AA de la vista de Indicadores Zootécnicos
 * RF-51 · CU-12 Consultar Indicadores y Exponer Datos · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Indicadores"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados.
 *
 * Datos reales (Productor de prueba, 2026-09-30):
 *   - #296 lote: 3 indicadores disponibles (ganancia_peso, tasa_morbilidad, tasa_mortalidad),
 *     2 no disponibles y 2 advertencias DATOS_INSUFICIENTES.
 *   - #291 individual con muestra insuficiente: con un tipo filtrado (CRECIMIENTO) el backend
 *     responde 422 INDICADOR_NO_DISPONIBLE; con TODOS responde 200 con advertencias.
 *   - #280 individual con outlier: 200 con advertencia OUTLIER_CRITICO (el backend no
 *     responde 500 para outliers, como supone el caso).
 * Errores: reales 422 INDICADOR_NO_DISPONIBLE, 400 PARAMETROS_INVALIDOS (fechas invertidas)
 * y 404 ACTIVO_NO_ENCONTRADO; SIMULADOS 403, 409 y 500 (outlier, como lo describe el caso).
 * Tema: la preferencia es de la cuenta compartida (cambia entre corridas). Se fija sirviendo
 * GET /configuracion/personalizacion/tema(/global): Claro en todos los pasos y, además, la vista
 * con datos se escanea también en Oscuro (el sistema de diseño exige ambos temas).
 * Solo lecturas: no se modifican datos.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_140_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-140';
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_CON_DATOS = 296;
const ID_MUESTRA_INSUFICIENTE = 291;
const ID_OUTLIER = 280;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_140_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_INDICADORES = (url: URL) => /\/activos-biologicos\/\d+\/indicadores$/.test(url.pathname);
/** Códigos técnicos que no debería leer un Productor: prefijos EN_MAYÚSCULAS: o identificadores snake_case. */
const JERGA_TECNICA = /\b[A-Z]{2,}(?:_[A-Z]+)+:|\b[a-z]+_[a-z_]+\b/;

// SIMULADOS con el formato estándar del backend
const ERROR_403 = { error_code: 'ACCESO_DENEGADO', message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.', fields: [] };
const ERROR_409 = { error_code: 'CALCULO_EN_CURSO', message: 'Los indicadores del activo se están recalculando. Intente de nuevo en unos minutos.', fields: [] };
const ERROR_500_OUTLIER = { error_code: 'VALOR_BIOLOGICAMENTE_IMPOSIBLE', message: 'OUTLIER_CRITICO: el valor calculado (500.0000 kg/dia) excede el umbral de plausibilidad biologica.', fields: [] };

/** Sirve la preferencia de tema (1 = Claro, 2 = Oscuro) con el formato real de TEST. */
async function fijarTema(page: Page, themeMode: 1 | 2) {
  const cuerpos: Record<string, unknown> = {
    '/configuracion/personalizacion/tema': { theme_mode: themeMode, fuente: 'personal', id_tema_visual: 10 },
    '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: themeMode, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
  };
  await page.route((url) => Object.keys(cuerpos).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(cuerpos).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpos[clave]) });
  });
}

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esperarIndicadores(page: Page) {
  return page.waitForResponse((r) => URL_INDICADORES(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
}

async function abrirIndicadores(page: Page, idActivo: number) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  const respuesta = esperarIndicadores(page);
  await secciones.getByRole('button', { name: 'Indicadores', exact: true }).click();
  const r = await respuesta;
  await expect(page.getByRole('heading', { name: 'Indicadores zootécnicos' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return r;
}

function filtros(page: Page) {
  return {
    tipo: page.getByRole('combobox', { name: 'Tipo', exact: true }),
    desde: page.getByLabel('Desde', { exact: true }),
    hasta: page.getByLabel('Hasta', { exact: true }),
  };
}

async function filtrar(page: Page, accion: () => Promise<void>) {
  const respuesta = esperarIndicadores(page);
  await accion();
  return respuesta;
}

function alertaError(page: Page): Locator {
  return page.getByRole('alert').filter({ hasText: 'Error al cargar indicadores' });
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
  // En móvil las tarjetas quedan bajo el pliegue dentro del contenedor con scroll y axe no
  // evalúa su contraste: se llevan a la vista antes de escanear.
  const tarjetaNoDisponible = page.getByText('No disponible').first();
  if (await tarjetaNoDisponible.count()) await tarjetaNoDisponible.scrollIntoViewIfNeeded();
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

/** ¿El elemento está dentro de una región viva (role alert/status o aria-live)? */
function enRegionViva(loc: Locator): Promise<boolean> {
  return loc.first().evaluate((e) => !!e.closest('[role="alert"],[role="status"],[aria-live]:not([aria-live="off"])'));
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Indicadores zootécnicos (RF-51)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_140_VIEWPORTS.`);
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTema(page, 1);
    await iniciarSesionProductor(page);
  });

  test('1-2. Vista con datos - 0 violaciones axe, estructura 1.3.1 y estado no solo por color 1.4.1', async ({ page }, testInfo) => {
    const r = await abrirIndicadores(page, ID_CON_DATOS);
    const cuerpo = await r.json();
    const disponibles = cuerpo.indicadores.filter((i: { disponible: boolean }) => i.disponible);
    testInfo.annotations.push({ type: 'Datos', description: `#${ID_CON_DATOS}: ${cuerpo.indicadores.map((i: { tipo: string; disponible: boolean; valor: string | null; unidad: string }) => `${i.tipo}=${i.disponible ? `${i.valor} ${i.unidad}` : 'no disponible'}`).join(' · ')}` });
    expect(disponibles.length, 'Precondición: al menos 2 indicadores calculados').toBeGreaterThanOrEqual(2);

    // 1.3.1: cada indicador expone nombre / valor / unidad / periodo con estructura (encabezado, lista descriptiva o tabla)
    for (const ind of disponibles) {
      await expect(page.getByText(ind.tipo, { exact: true }), `El indicador ${ind.tipo} debe mostrarse`).toBeVisible();
    }
    const estructura = await page.evaluate(() => ({
      encabezados: document.querySelectorAll('main h4, main [role="heading"][aria-level="4"]').length,
      listasDescriptivas: document.querySelectorAll('main dl').length,
      tablas: document.querySelectorAll('main table').length,
      listas: document.querySelectorAll('main [role="list"], main ul').length,
    }));
    testInfo.annotations.push({ type: 'Estructura de las tarjetas', description: JSON.stringify(estructura) });
    expect.soft(estructura.encabezados + estructura.listasDescriptivas + estructura.tablas, '1.3.1: las tarjetas son <div> sin estructura: nombre, valor, unidad y periodo no se relacionan (sin encabezado, <dl> ni tabla)').toBeGreaterThan(0);

    // Nombres legibles para el Productor (no códigos técnicos)
    expect.soft(await page.getByText('ganancia_peso', { exact: true }).count(), 'Los nombres de indicador se muestran como códigos (ganancia_peso → "GANANCIA_PESO" por CSS), no como texto traducido').toBe(0);

    // 1.4.1: "no disponible" se comunica con texto; no debe depender solo de atenuar (opacity)
    await expect(page.getByText('No disponible').first(), '1.4.1: el estado no disponible debe comunicarse con texto').toBeVisible();
    const conOpacidad = await page.getByText('No disponible').first().evaluate((e) => {
      let n: HTMLElement | null = e as HTMLElement;
      while (n) { if (Number(getComputedStyle(n).opacity) < 1) return true; n = n.parentElement; }
      return false;
    });
    expect.soft(conOpacidad, 'Sistema de diseño: las tarjetas no disponibles usan opacity sobre el texto (reduce el contraste real)').toBe(false);

    // Advertencias (muestra insuficiente) comprensibles
    const advertencias = page.locator('li').filter({ hasText: 'DATOS_INSUFICIENTES' });
    const textoAdv = (await page.locator('main ul li').allInnerTexts()).join(' | ');
    testInfo.annotations.push({ type: 'Advertencias mostradas', description: textoAdv });
    expect.soft(await advertencias.count(), 'Las advertencias muestran el código técnico (DATOS_INSUFICIENTES: …) y nombres internos (conversion_alimenticia)').toBe(0);

    await escanear(page, 'vista-con-datos-claro', testInfo);

    // Mismo contenido en tema Oscuro
    await fijarTema(page, 2);
    await abrirIndicadores(page, ID_CON_DATOS);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await escanear(page, 'vista-con-datos-oscuro', testInfo);
  });

  test('3. Muestra insuficiente (422 real) y outliers - anunciados y comprensibles', async ({ page }, testInfo) => {
    // 422 real: tipo filtrado sin muestra suficiente
    await abrirIndicadores(page, ID_MUESTRA_INSUFICIENTE);
    const r422 = await filtrar(page, () => filtros(page).tipo.selectOption('CRECIMIENTO'));
    expect(r422.status(), 'El backend debe responder 422 por muestra insuficiente').toBe(422);
    expect((await r422.json()).error_code).toBe('INDICADOR_NO_DISPONIBLE');
    await expect(alertaError(page), '3.3.1: la muestra insuficiente (422) debe anunciarse').toBeVisible();
    const texto422 = await alertaError(page).innerText();
    testInfo.annotations.push({ type: 'Mensaje 422', description: texto422.replace(/\s+/g, ' ') });
    expect.soft(texto422, 'Comprensibilidad: el mensaje de muestra insuficiente muestra códigos técnicos (DATOS_INSUFICIENTES:, ganancia_peso) al Productor').not.toMatch(JERGA_TECNICA);
    expect.soft(await alertaError(page).getAttribute('class'), 'Rol visual: una muestra insuficiente es informativa, pero se muestra como "Error al cargar indicadores" (alert-error)').not.toMatch(/--error/);
    await escanear(page, 'error-422-muestra-insuficiente', testInfo);

    // Outlier real: llega como advertencia OUTLIER_CRITICO en un 200
    const rOutlier = await abrirIndicadores(page, ID_OUTLIER);
    const adv = (await rOutlier.json()).advertencias as string[];
    expect(adv.some((a) => a.startsWith('OUTLIER_CRITICO')), 'Precondición: el activo tiene un outlier detectado').toBe(true);
    const outlier = page.getByText(/OUTLIER_CRITICO|plausibilidad/).first();
    await expect(outlier, 'El outlier debe mostrarse').toBeVisible();
    expect.soft(await enRegionViva(outlier), '4.1.3: el bloque de advertencias (outlier) no está en región viva ni tiene role="alert"/"status"').toBe(true);
    expect.soft(await outlier.innerText(), 'Comprensibilidad: el outlier muestra el código OUTLIER_CRITICO y "kg/dia" sin tildes ni explicación para el Productor').not.toMatch(JERGA_TECNICA);
    await escanear(page, 'advertencia-outlier', testInfo);
  });

  test('3.3.1. Errores anunciados: 400 y 404 reales; 403, 409 y 500 simulados', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '403, 409 y 500 (outlier "valor biológicamente imposible", como lo describe el caso) inyectados; 400 y 404 reales.' });

    // 400 real: rango de fechas invertido
    await abrirIndicadores(page, ID_CON_DATOS);
    const f = filtros(page);
    await filtrar(page, () => f.desde.fill('2026-09-20'));
    const r400 = await filtrar(page, () => f.hasta.fill('2026-01-01'));
    expect(r400.status()).toBe(400);
    await expect(alertaError(page), '3.3.1: el 400 debe anunciarse').toContainText('no puede ser posterior');
    const tarjetasTrasError = await page.getByText('ganancia_peso', { exact: true }).count();
    expect.soft(tarjetasTrasError, '3.3.1: tras el error se siguen mostrando los indicadores de la consulta anterior').toBe(0);
    await escanear(page, 'error-400-fechas', testInfo);

    // 404 real
    const r404 = await abrirIndicadores(page, 999999);
    expect(r404.status()).toBe(404);
    await expect(alertaError(page), '3.3.1: el 404 debe anunciarse').toContainText('no existe');

    // Simulados
    for (const [status, cuerpo, texto] of [[403, ERROR_403, 'Acceso denegado'], [409, ERROR_409, 'recalculando'], [500, ERROR_500_OUTLIER, '']] as const) {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await page.route(URL_INDICADORES, (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) }));
      await abrirIndicadores(page, ID_CON_DATOS);
      await expect(alertaError(page), `3.3.1: el ${status} debe anunciarse`).toBeVisible();
      if (texto) await expect(alertaError(page)).toContainText(texto);
      if (status === 500) {
        const t500 = await alertaError(page).innerText();
        testInfo.annotations.push({ type: 'Mensaje 500', description: t500.replace(/\s+/g, ' ') });
        expect.soft(t500, '5xx: el mensaje no debe exponer detalles técnicos (OUTLIER_CRITICO, umbral) y debe ser comprensible').not.toMatch(JERGA_TECNICA);
      }
    }
  });

  test('4. Teclado - filtro de tipo y rango de fechas operables', async ({ page }, testInfo) => {
    await abrirIndicadores(page, ID_CON_DATOS);
    const f = filtros(page);

    // Tab hasta el filtro de tipo
    await page.getByRole('navigation', { name: 'Secciones del activo' }).getByRole('button', { name: 'Indicadores', exact: true }).focus();
    const recorrido: string[] = [];
    for (let i = 0; i < 12 && !(await f.tipo.evaluate((e) => e === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await page.evaluate(() => { const e = document.activeElement as HTMLElement; return `${e.tagName}${e.id ? `#${e.id}` : ''}`; }));
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab', description: recorrido.join(' → ') });
    await expect(f.tipo, '2.1.1: el filtro de tipo debe alcanzarse con Tab').toBeFocused();

    let respuesta = esperarIndicadores(page);
    await page.keyboard.press('ArrowDown'); // TODOS → CRECIMIENTO
    expect(new URL((await respuesta).url()).searchParams.get('tipo_indicador'), '2.1.1: el tipo debe cambiarse con flechas').toBe('CRECIMIENTO');

    // Desde / Hasta escritos con teclado
    await page.keyboard.press('Tab');
    await expect(f.desde, '2.1.1: "Desde" debe alcanzarse con Tab').toBeFocused();
    // Cada tecla dispara una consulta (0002-09-01, 0020-09-01…); se espera la del valor final
    const consultas: string[] = [];
    page.on('request', (req) => { if (URL_INDICADORES(new URL(req.url()))) consultas.push(new URL(req.url()).search); });
    respuesta = page.waitForResponse((r) => URL_INDICADORES(new URL(r.url())) && new URL(r.url()).searchParams.get('fecha_inicio') === '2026-09-01');
    await page.keyboard.type('01092026');
    await expect.poll(() => f.desde.inputValue(), { message: '2.1.1: "Desde" debe poder escribirse con teclado' }).toBe('2026-09-01');
    await respuesta;

    for (let i = 0; i < 4 && !(await f.hasta.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(f.hasta, '2.1.1: "Hasta" debe alcanzarse con Tab').toBeFocused();
    respuesta = page.waitForResponse((r) => URL_INDICADORES(new URL(r.url())) && new URL(r.url()).searchParams.get('fecha_fin') === '2026-09-30');
    await page.keyboard.type('30092026');
    await expect.poll(() => f.hasta.inputValue(), { message: '2.1.1: "Hasta" debe poder escribirse con teclado' }).toBe('2026-09-30');
    await respuesta;
    testInfo.annotations.push({ type: 'Consultas al escribir las fechas', description: `${consultas.length}: ${consultas.join(' · ')}` });
    expect.soft(consultas.length, 'Cada tecla en los filtros de fecha dispara una consulta al backend (años parciales 0002, 0020, 0202…)').toBeLessThanOrEqual(2);
  });
});
