import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { iniciarSesionAdmin, irAOpcionMenu } from '../../../_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const TC_ID = 'TC-DIS-41';

async function irAEspecie(page, nombreEspecie = 'Tilapia') {
  await irAOpcionMenu(page, /configuración/i);
  await page.getByRole('button', { name: /^por especie$/i }).click();
  await page.getByText(nombreEspecie, { exact: true }).first().click();
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Etapas/Patologías/Métricas`, () => {
  test.setTimeout(60000);

  test('Ciclos Biológicos - listado - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAEspecie(page);
    await page.getByRole('heading', { name: /ciclos biológicos/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'ciclos-listado', results);
    expect(results.violations).toEqual([]);
  });

  test('formulario Nuevo ciclo biológico - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAEspecie(page);
    await page.getByRole('button', { name: /nuevo ciclo/i }).click();
    await page.getByRole('heading', { name: /nuevo ciclo biológico/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'ciclo-formulario', results);
    expect(results.violations).toEqual([]);
  });

  test('formulario Nueva patología - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAEspecie(page);
    await page.getByText('Patologías', { exact: true }).click();
    await page.getByRole('button', { name: /nueva patología/i }).click();
    await page.getByRole('heading', { name: /^nueva patología$/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'patologia-formulario', results);
    expect(results.violations).toEqual([]);
  });

  test('formulario Nueva métrica de producción - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await irAEspecie(page);
    await page.getByText('Métricas', { exact: true }).click();
    await page.getByRole('button', { name: /nueva métrica/i }).click();
    await page.getByRole('heading', { name: /nueva métrica de producción/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    guardarResultadoAxe(TC_ID, __dirname, 'metrica-formulario', results);
    expect(results.violations).toEqual([]);
  });

});