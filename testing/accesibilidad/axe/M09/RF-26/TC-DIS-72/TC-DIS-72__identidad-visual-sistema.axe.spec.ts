import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import fs from 'fs';
import path from 'path';

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
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

async function loginComoAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  }
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { timeout: 90_000 });
  // Mitigación del reporte de Sara (hallazgo 2): navegar inmediatamente tras el
  // login invalidaba la sesión bajo automatización.
  await page.waitForLoadState('networkidle');
  await irAConfiguracion(page, /^(Personalización|Personalization)$/);
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
    // Acotado a <main> + filtro por ", " (cada tarjeta de FincaSelectorIdent
    // muestra "municipio, departamento"): un selector sin acotar (getByRole
    // ('button', {name:/./}).first()) resolvía al botón "Cerrar sesión" del
    // sidebar y cerraba la sesión de verdad en vez de elegir una finca.
    const primeraFinca = page.getByRole('main').getByRole('button').filter({ hasText: ',' }).first();
    await primeraFinca.click();

    await expect(page.getByRole('heading', { name: 'Vista previa en vivo' })).toBeVisible();

    // Confirma el hallazgo de contraste (#2 del header): estos SÍ deben resolverse.
    await expect(page.getByLabel('Color primario', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Hex Color primario')).toBeVisible();
    await expect(page.getByLabel('Color secundario', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nombre de la organización')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-72', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-72-formulario.json', results);

    expect(results.violations).toEqual([]);
  });

  test('la zona de subir logo NO es operable por teclado — confirma el hallazgo #1', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    const primeraFinca = page.getByRole('main').getByRole('button').filter({ hasText: ',' }).first();
    await primeraFinca.click();
    await expect(page.getByRole('heading', { name: 'Vista previa en vivo' })).toBeVisible();

    // Este assert debe FALLAR mientras el bug exista: el <div> de la zona de
    // logo no tiene role="button", así que getByRole no lo encuentra. No es
    // un error del test — es la confirmación en código del hallazgo #1.
    await expect(
      page.getByRole('button', { name: 'Arrastra un logo o haz clic para seleccionar' })
    ).toBeVisible();
  });
});
