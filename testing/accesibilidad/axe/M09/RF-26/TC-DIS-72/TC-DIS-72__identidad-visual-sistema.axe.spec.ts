import { test, expect as expectBase, type Page, type Locator, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import fs from 'fs';
import path from 'path';

// Red lenta: expect de 30 s por defecto (criterio TC-DIS-63/66). Las esperas sobre
// elementos que pueden NO existir (hallazgos) llevan 15 s explícitos para fallar rápido.
const expect = expectBase.configure({ timeout: 30_000 });
const RAPIDO = { timeout: 15_000 };

/**
 * TC-DIS-72 — RF-26: Identidad Visual del sistema (paleta, tipografía, marca)
 * Módulo 9 · Ruta: /configuracion → tab "Personalización" → sección "Identidad Visual"
 * Componente real: src/configuration/components/IdentidadVisualSection.tsx
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Hallazgo real de accesibilidad — el importante de este caso ────────────
 *
 * 1. VIOLACIÓN CONFIRMADA — la zona de "arrastra un logo o haz clic para
 *    seleccionar" (líneas ~365-385) es un <div> con onClick/onDragOver/onDrop,
 *    SIN `role="button"`, SIN `tabIndex`, SIN `onKeyDown`. El <input
 *    type="file"> real (líneas ~431-438) que ese onClick dispara tiene
 *    `style={{ display: 'none' }}`, lo que lo saca por completo del árbol de
 *    accesibilidad y del orden de tabulación.
 *    → Un usuario de teclado (o de lector de pantalla navegando por Tab) NO
 *      tiene NINGUNA forma de abrir el selector de archivo para subir un logo.
 *      WCAG 2.1.1 (Keyboard), Nivel A.
 *    → OJO: esto muy probablemente NO lo marca un escaneo automático de axe,
 *      porque axe no puede inferir que un <div> sin rol "debería" comportarse
 *      como botón solo por tener un onClick. Por eso el test de abajo no
 *      depende de `results.violations` para este hallazgo — usa un assert
 *      directo con getByRole que falla por sí mismo mientras el bug exista.
 *
 * 2. Contraste — el resto del formulario SÍ está bien resuelto:
 *    - `ColorField` (Color primario / Color secundario): ambos inputs (el de
 *      tipo color y el de texto hex) usan `aria-label` real — técnica válida
 *      de WCAG 1.3.1/4.1.2, no es el mismo bug de labels sin htmlFor que
 *      apareció en TC-DIS-66.
 *    - "Nombre de la organización" usa `<label htmlFor="org-name">` +
 *      `<Input id="org-name" .../>` correctamente asociados.
 *    - El botón "Quitar/Descartar logo" es un <button> real con `aria-label`.
 *    - El `<span role="status">` de "Vista previa activa" es un uso correcto
 *      del rol (anuncio corto y transitorio), a diferencia del uso de
 *      `role="status"` sobre bloques de página completos visto en TC-DIS-69.
 *
 * ── TODO — no se puede saber sin ejecutar ──────────────────────────────────
 * - TODO: la sección de colores/logo solo aparece tras seleccionar una finca
 *   de `FincaSelectorIdent`, que depende de que exista al menos 1 finca activa
 *   en el seed de staging. El test usa `.first()` sobre lo que exista.
 * - TODO: confirmar `usePermission(23, 1)` / `usePermission(23, 3)` contra la
 *   cuenta ADMIN_EMAIL — si no hay permiso de crear/editar, el botón de guardar
 *   queda deshabilitado (`canSave` en false), lo cual es esperado y no debe
 *   confundirse con un bug de accesibilidad.
 *
 * ── Re-ejecución en TEST (2026-10-06), misma infraestructura que TC-DIS-63/66 ──
 * - SEGURIDAD DE DATOS: toda escritura (no-GET) bajo /configuracion/identidad-visual/**
 *   (POST guardar con logo, PATCH actualizar: personalizacionApi.ts:34/45) y
 *   /configuracion/personalizacion/** (tema, idioma, dashboard) se ABORTA
 *   (`bloquearEscrituras`). Nada de subir logos ni guardar colores.
 * - Finca FIJA por nombre ("QA DIS Santiago Accesibilidad") dentro de <main>, no
 *   "la primera tarjeta": un selector genérico así hizo clic en "Cerrar sesión" el 29/09.
 * - Login con waitUntil 'commit' + diagnóstico del POST, HAR de /assets/**,
 *   ruta relativa (baseURL del config). Esperas sobre posibles hallazgos: 15 s.
 * - "Vista previa en vivo" es un <div> (IdentidadVisualSection.tsx:469), no un heading:
 *   los asserts que lo esperan como heading fallan (no se tocan; hallazgo 1.3.1 por código).
 * - 06/10: el formulario no se abría en la ejecución automatizada por cómo el test elegía
 *   la finca (sin esperar la lista ni acotar a la sección). Verificado manualmente que la
 *   app sí carga el formulario. Se espera la tarjeta dentro de la sección y se aplica la
 *   opción (b): axe antes del assert del heading.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const NOMBRE_FINCA = process.env.TC_DIS_72_FINCA ?? 'QA DIS Santiago Accesibilidad';
const reTexto = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// testing/.har-cache/assets.har (5 niveles desde la carpeta del TC; ignorado por testing/.gitignore).
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');

async function usarCacheAssets(contexto: BrowserContext) {
  const grabar = !fs.existsSync(HAR_ASSETS);
  await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: grabar, notFound: 'fallback' });
}

/** Aborta toda escritura de identidad visual y personalización; deja pasar GET. */
async function bloquearEscrituras(page: Page, testInfo: { title: string; project: { name: string } }) {
  const bloqueadas: string[] = [];
  await page.route(/\/configuracion\/(identidad-visual|personalizacion)(\/.*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.continue();
    bloqueadas.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.abort('blockedbyclient');
  });
  page.on('close', () => {
    console.log(`[escrituras-bloqueadas] ${testInfo.project.name} · ${testInfo.title}: ${bloqueadas.length}${bloqueadas.length ? ' → ' + bloqueadas.join(', ') : ''}`);
  });
}

/**
 * Tarjeta de la finca fija, acotada a la sección "Identidad Visual": el div más interno
 * que contiene su heading Y la tarjeta (la pestaña Personalización tiene más paneles).
 * 06/10: sin esperar a que la lista cargara y sin acotar a la sección, el test no llegaba
 * a abrir el formulario (verificado manualmente que la app sí lo carga).
 */
function tarjetaFinca(page: Page): Locator {
  const tarjeta = page.getByRole('button', { name: reTexto(NOMBRE_FINCA) });
  return page.getByRole('main').locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Identidad Visual', exact: true }) })
    .filter({ has: tarjeta })
    .last()
    .getByRole('button', { name: reTexto(NOMBRE_FINCA) });
}

/** Espera a que la lista de fincas cargue (tarjeta visible en la sección) y la elige. */
async function elegirFinca(page: Page) {
  const tarjeta = tarjetaFinca(page);
  await expect(tarjeta).toBeVisible();
  await tarjeta.click();
}

/**
 * Evidencia (no assert): tras elegir la finca, ¿se pintó el formulario? En el 66 la app
 * se desmontó entera al cargar datos (#247) y el error-context salía sin snapshot; esto
 * deja constancia de si <main>, el título de la vista previa y un campo existen.
 */
async function registrarEstadoFormulario(page: Page, testInfo: { project: { name: string } }) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const main = await page.getByRole('main').count();
  const titulo = await page.getByText('Vista previa en vivo', { exact: true }).count();
  const color = await page.getByLabel('Color primario', { exact: true }).count();
  console.log(`[formulario] ${testInfo.project.name}: main=${main} | texto "Vista previa en vivo"=${titulo} | campo "Color primario"=${color} | data-theme=${await page.locator('html').getAttribute('data-theme')}`);
}

async function loginComoAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  }
  // Diagnóstico del POST de login: status y cuerpo de la RESPUESTA (nunca el request,
  // que lleva la contraseña); el token de una respuesta exitosa se tapa.
  page.on('response', async (r) => {
    if (r.request().method() !== 'POST' || !/\/sesiones\/?$/.test(new URL(r.url()).pathname)) return;
    const cuerpo = (await r.text().catch(() => '')).replace(/("(?:access_)?token"\s*:\s*")[^"]+/g, '$1[TAPADO]');
    console.log(`[login-diag] POST ${new URL(r.url()).pathname} → ${r.status()} ${r.statusText()} | ${cuerpo.slice(0, 500)}`);
  });
  page.on('requestfailed', (req) => {
    if (req.method() === 'POST' && /\/sesiones\/?$/.test(new URL(req.url()).pathname)) {
      console.log(`[login-diag] POST ${new URL(req.url()).pathname} FALLÓ EN RED: ${req.failure()?.errorText}`);
    }
  });

  // 'commit' en vez de 'load': con red lenta el evento load pasa de 90 s.
  // Ruta relativa: el ambiente lo decide `use.baseURL` de playwright.config.ts.
  await page.goto('/login', { waitUntil: 'commit', timeout: 300_000 });
  const correo = page.getByLabel('Correo electrónico');
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { timeout: 300_000 });
  // Mitigación del reporte de Sara (hallazgo 2): navegar inmediatamente tras el
  // login invalidaba la sesión bajo automatización.
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await irAConfiguracion(page, /^(Personalización|Personalization)$/);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
}

async function dentroDelViewport(page: Page, loc: Locator): Promise<boolean> {
  const box = await loc.boundingBox().catch(() => null);
  const vp = page.viewportSize();
  return !!box && !!vp && box.x >= -1 && box.x + box.width <= vp.width + 1;
}

// El JWT vive solo en memoria: tras el login NO se usa page.goto() (recarga y
// borra la sesión); se navega por el sidebar como un usuario real.
// El ítem del sidebar es un <Link> (rol link, no button). En móvil/tablet el
// sidebar está fuera del viewport hasta abrir el menú lateral.
async function irAConfiguracion(page: Page, pestana?: RegExp) {
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral|toggle side menu/i });
  const linkConfig = page.getByRole('link', { name: /^(configuración|settings)$/i });
  await linkConfig.waitFor({ state: 'attached', timeout: 30_000 });

  if (await linkConfig.getAttribute('aria-disabled') === 'true') {
    throw new Error(
      `BLOQUEO DE AMBIENTE (no es hallazgo de accesibilidad): la cuenta ${ADMIN_EMAIL} ` +
      'no tiene permiso sobre Configuración — el ítem del sidebar sale bloqueado.',
    );
  }
  for (let intento = 0; intento < 5 && !(await dentroDelViewport(page, linkConfig)); intento++) {
    if (await menuToggle.isVisible().catch(() => false)) await menuToggle.click();
    await page.waitForTimeout(400);
  }
  await linkConfig.click();
  await page.waitForURL(/configuracion/);
  if (pestana) {
    const boton = page.getByRole('button', { name: pestana });
    await boton.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
      throw new Error(
        `BLOQUEO DE AMBIENTE: la pestaña ${pestana} no aparece — la cuenta ${ADMIN_EMAIL} ` +
        'no tiene permiso de lectura sobre ese recurso.',
      );
    });
    await boton.click();
  }
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-72 — RF-26: Identidad Visual del sistema (accesibilidad)', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    await usarCacheAssets(context);
    await bloquearEscrituras(page, testInfo);
  });

  test('selector de finca (vista inicial) no tiene violaciones de accesibilidad', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Identidad Visual' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-72', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-72-selector-finca.json', results);

    expect(results.violations).toEqual([]);
  });

  test('formulario de identidad — campos de color y nombre correctamente asociados', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // Requiere al menos 1 finca activa en el seed (ver TODO de cabecera).
    // Un selector sin acotar (getByRole('button', {name:/./}).first()) resolvía al
    // botón "Cerrar sesión" del sidebar y cerraba la sesión de verdad.
    // 2026-10-06: finca FIJA por nombre, acotada a la sección Identidad Visual y
    // esperando a que la lista cargue (ver tarjetaFinca / elegirFinca).
    await elegirFinca(page);

    // Opción (b), 2026-10-06 (criterio TC-DIS-63/66): el formulario se da por abierto con el
    // campo "Hex Color primario" (aria-label real) y axe corre ANTES del assert del heading.
    // "Vista previa en vivo" es un <div> (IdentidadVisualSection.tsx:469): ese assert sigue
    // fallando y documenta el hallazgo (1.3.1).
    await expect(page.getByLabel('Hex Color primario')).toBeVisible();
    await registrarEstadoFormulario(page, testInfo);

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-72', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-72-formulario.json', results);

    await expect(page.getByRole('heading', { name: 'Vista previa en vivo' })).toBeVisible(RAPIDO);

    // Confirma el hallazgo de contraste (#2 del header): estos SÍ deben resolverse.
    await expect(page.getByLabel('Color primario', { exact: true })).toBeVisible(RAPIDO);
    await expect(page.getByLabel('Hex Color primario')).toBeVisible(RAPIDO);
    await expect(page.getByLabel('Color secundario', { exact: true })).toBeVisible(RAPIDO);
    await expect(page.getByLabel('Nombre de la organización')).toBeVisible(RAPIDO);

    expect(results.violations).toEqual([]);
  });

  test('la zona de subir logo NO es operable por teclado — confirma el hallazgo #1', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // Finca FIJA por nombre (ver test anterior). El formulario se da por abierto con el
    // breadcrumb "Fincas › {finca}" (el nombre de la finca dentro de la sección).
    await elegirFinca(page);
    await expect(page.getByRole('main').getByText(NOMBRE_FINCA, { exact: true })).toBeVisible();
    await registrarEstadoFormulario(page, testInfo);
    // Este assert falla antes de llegar al logo ("Vista previa en vivo" es un <div>); se deja
    // tal cual: el hallazgo del logo (2.1.1) queda documentado por código.
    await expect(page.getByRole('heading', { name: 'Vista previa en vivo' })).toBeVisible(RAPIDO);

    // Este assert debe FALLAR mientras el bug exista: el <div> de la zona de
    // logo no tiene role="button", así que getByRole no lo encuentra. No es
    // un error del test — es la confirmación en código del hallazgo #1.
    await expect(
      page.getByRole('button', { name: 'Arrastra un logo o haz clic para seleccionar' })
    ).toBeVisible(RAPIDO);
  });
});
