// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-212: accesibilidad del formulario de aplicación de medicamento |
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-212: "Medicamento" coincidía también con "Lote del medicamento"; se agrega exact:true |
/**
 * TC-DIS-212 — Accesibilidad WCAG 2.1 AA del formulario de Registro de Aplicación de
 * Medicamentos y de sus mensajes de error por campo
 * RF-76 · CU-01 Registrar Suministros (Aplicación de Medicamentos) · Rol: Veterinario
 * Suministros → Medicamentos (/suministros/medicamentos), modal "Registrar aplicación"
 * (MedicamentoFormModal)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (los campos del formulario con
 * etiqueta visible asociada; obligatoriedad indicada en texto y no solo con un asterisco de
 * color; lote, fecha_vencimiento_lote y observaciones identificados como opcionales); 2.1.1 y
 * 2.4.7 (selector via_administracion operable por teclado con foco visible); 3.3.1 (errores E2
 * —fecha futura—, E4 —dosis ≤ 0—, E6 —motivo_aplicacion < 10 caracteres— y nombre_veterinario
 * vacío identificados junto al campo con aria-invalid).
 *
 * El asterisco de "obligatorio" (span.ds-field__req) está marcado aria-hidden en el DS (Input,
 * Select, AreaTexto): la obligatoriedad real que llega a un lector de pantalla es aria-required,
 * no el glifo visual. Se verifica ese atributo, no el carácter "*".
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-212';
const RUTA = 'suministros/medicamentos';
const TITULO = 'Aplicación de medicamentos';
const PASOS_LIGHTHOUSE = ['formulario-vacio', 'formulario-con-errores'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function abrirFormulario(page: Page) {
  const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
  precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso de creación)');
  await btn.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Formulario de aplicación de medicamento (RF-76)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Formulario vacío - etiquetas visibles asociadas, obligatoriedad por aria-required y campos opcionales marcados (1.3.1 / 3.3.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const requeridos = [
      ['combobox', 'Activo biológico'], ['textbox', /^Medicamento$/], ['combobox', 'Vía de administración'],
      ['textbox', 'Fecha de aplicación'], ['textbox', 'Hora de aplicación'], ['spinbutton', 'Dosis total aplicada'],
      ['textbox', 'Unidad de la dosis'], ['spinbutton', /Costo por unidad de dosis/], ['textbox', 'Veterinario responsable'],
      ['textbox', 'Motivo de la aplicación'],
    ] as const;
    for (const [role, name] of requeridos) {
      const campo = dialogo.getByRole(role, { name });
      await expect.soft(campo, `4.1.2: falta el campo requerido "${name}"`).toBeVisible();
      await expect.soft(campo, `3.3.2: "${name}" debe exponer aria-required="true"`).toHaveAttribute('aria-required', 'true');
    }

    const opcionales = [['textbox', 'Lote del medicamento'], ['textbox', 'Vencimiento del lote'], ['textbox', 'Observaciones']] as const;
    for (const [role, name] of opcionales) {
      await expect.soft(dialogo.getByRole(role, { name }), `3.3.2: el campo opcional "${name}" debe estar presente`).toBeVisible();
    }
    await expect.soft(dialogo.getByText('Opcional.').first(), '3.3.2: debe indicarse en texto cuáles campos son opcionales, no solo con ausencia de asterisco').toBeVisible();

    await escanear(page, TC_ID, __dirname, 'formulario-vacio', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Vía de administración - selector operable por teclado con las 6 vías (2.1.1 / 2.4.7)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    const via = dialogo.getByRole('combobox', { name: 'Vía de administración' });
    await via.focus();
    const opciones = await via.locator('option').allTextContents();
    anotar(testInfo, 'Opciones de vía', opciones.join(', '));
    expect.soft(opciones.length, '2.1.1: deben existir las 6 vías de administración más el placeholder').toBeGreaterThanOrEqual(7);
    await via.selectOption({ label: 'Intramuscular' });
    await expect.soft(via, '2.1.1: la selección por teclado debe reflejarse en el valor del control').toHaveValue('INTRAMUSCULAR');
  });

  test('3. E4 y E6 - dosis ≤ 0 y motivo_aplicacion corto se identifican en texto junto al campo (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const dosis = dialogo.getByRole('spinbutton', { name: 'Dosis total aplicada' });
    await dosis.fill('0');
    await dosis.blur();
    await expect.soft(dialogo.getByText('Ingresa un número mayor que cero.'), '3.3.1 (E4): error de dosis ≤ 0 junto al campo').toBeVisible();
    await expect.soft(dosis, '4.1.2: aria-invalid="true" en dosis inválida').toHaveAttribute('aria-invalid', 'true');

    const motivo = dialogo.getByRole('textbox', { name: 'Motivo de la aplicación' });
    await motivo.fill('muy corto');
    await motivo.blur();
    await expect.soft(dialogo.getByText('Escribe al menos 10 caracteres.'), '3.3.1 (E6): error de motivo corto junto al campo').toBeVisible();
    await expect.soft(motivo, '4.1.2: aria-invalid="true" en motivo corto').toHaveAttribute('aria-invalid', 'true');

    await escanear(page, TC_ID, __dirname, 'formulario-con-errores', testInfo, PASOS_LIGHTHOUSE);
  });

  test('4. E2 y veterinario vacío - fecha futura y nombre_veterinario vacío se identifican en texto (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const futura = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
    const fecha = dialogo.getByRole('textbox', { name: 'Fecha de aplicación' });
    await fecha.fill(futura);
    await fecha.blur();
    await expect.soft(dialogo.getByText('La fecha no puede ser futura.'), '3.3.1 (E2): error de fecha futura junto al campo').toBeVisible();

    const veterinario = dialogo.getByRole('textbox', { name: 'Veterinario responsable' });
    await veterinario.fill(' ');
    await veterinario.blur();
    await expect.soft(dialogo.getByText('Indica el veterinario responsable.'), '3.3.1: error de veterinario vacío junto al campo').toBeVisible();
    await expect.soft(veterinario, '4.1.2: aria-invalid="true" en veterinario vacío').toHaveAttribute('aria-invalid', 'true');
  });
});
