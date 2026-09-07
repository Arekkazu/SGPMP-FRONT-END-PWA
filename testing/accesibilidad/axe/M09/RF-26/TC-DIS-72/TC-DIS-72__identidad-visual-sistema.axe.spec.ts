import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

const ADMIN_EMAIL = 'adminplaywright@gmail.com';
const ADMIN_PASSWORD = 'pruebasadmin123#';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);
  // el JWT vive SOLO en memoria, nunca en localStorage — por eso después
  // del login nunca se usa page.goto() para navegar, eso recarga la
  // página y borra la sesión. Se navega por clic, como un usuario real.
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.getByRole('button', { name: 'Personalización', exact: true }).click();
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-72 — RF-26: Identidad Visual del sistema (accesibilidad)', () => {
  test('selector de finca (vista inicial) no tiene violaciones de accesibilidad', async ({ page }) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Identidad Visual' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultados('axe-TC-DIS-72-selector-finca.json', results);

    expect(results.violations).toEqual([]);
  });

  test('formulario de identidad — campos de color y nombre correctamente asociados', async ({ page }) => {
    await loginComoAdmin(page);

    // Requiere al menos 1 finca activa en el seed (ver TODO de cabecera).
    const primeraFinca = page.getByRole('button', { name: /./ }).first();
    await primeraFinca.click();

    await expect(page.getByRole('heading', { name: 'Vista previa en vivo' })).toBeVisible();

    // Confirma el hallazgo de contraste (#2 del header): estos SÍ deben resolverse.
    await expect(page.getByLabel('Color primario', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Hex Color primario')).toBeVisible();
    await expect(page.getByLabel('Color secundario', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nombre de la organización')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultados('axe-TC-DIS-72-formulario.json', results);

    expect(results.violations).toEqual([]);
  });

  test('la zona de subir logo NO es operable por teclado — confirma el hallazgo #1', async ({ page }) => {
    await loginComoAdmin(page);

    const primeraFinca = page.getByRole('button', { name: /./ }).first();
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
