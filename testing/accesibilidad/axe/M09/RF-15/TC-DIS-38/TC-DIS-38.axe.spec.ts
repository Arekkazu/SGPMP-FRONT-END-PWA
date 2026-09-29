import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { iniciarSesionAdmin, irAOpcionMenu } from '../../../_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const TC_ID = 'TC-DIS-38';

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Catálogo de Especies`, () => {
  test.setTimeout(120000);

  test('listado del Catálogo de Especies - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAOpcionMenu(page, /configuración/i);
    await page.getByRole('heading', { name: /catálogo de especies/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'listado', results);
    expect(results.violations).toEqual([]);
  });

  test('formulario Nueva especie - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAOpcionMenu(page, /configuración/i);
    await page.getByRole('button', { name: /nueva especie/i }).click();
    await page.getByRole('heading', { name: /^nueva especie$/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'formulario', results);
    expect(results.violations).toEqual([]);
  });

  test('error de nombre duplicado - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAOpcionMenu(page, /configuración/i);
    await page.getByRole('button', { name: /nueva especie/i }).click();
    await page.getByRole('heading', { name: /^nueva especie$/i }).waitFor({ state: 'visible' });

    // getByLabel({exact:true}) compara contra el texto crudo del <label>, que incluye
    // el " *" de campo obligatorio (aria-hidden, así que no cuenta para el nombre
    // accesible real). getByRole('textbox', {name}) sí usa el nombre accesible y es
    // el patrón que usan los demás specs (ver TC-DIS-39) para este mismo diálogo.
    await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Tilapia');
    await page.getByRole('button', { name: /registrar especie/i }).click();
    await page.getByText(/error al guardar/i).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'duplicado', results);
    expect(results.violations).toEqual([]);
  });

});