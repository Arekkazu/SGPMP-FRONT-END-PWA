// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-75 TC-DIS-209: accesibilidad del formulario de registro de consumo de alimento |
// | 2026-11-06 | Laura032005 | M05 RF-75 TC-DIS-209: corrige el conteo de hints "Opcional." tras la primera corrida contra sigab-test |
/**
 * TC-DIS-209 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del formulario de Registro de Consumo de
 * Alimentos y de sus mensajes de error por campo
 * RF-75 · CU-01 Registrar Suministros (Consumo de Alimentos) · Rol: Productor, Veterinario o
 * Administrador
 * Suministros → Alimentación (/suministros/alimentacion), modal "Registrar consumo"
 * (ConsumoFormModal)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (cada campo —activo, tipo de
 * alimento, fecha_consumo, hora_suministro, cantidad_alimento, costo_unitario, observaciones—
 * con etiqueta visible asociada programáticamente); 3.3.1 (los errores E2, E3 y E4 se
 * identifican en texto junto al campo afectado, con aria-invalid="true"); 4.1.2 (name/role/value
 * de los controles del formulario).
 *
 * E4 (cantidad_alimento = 0) y E2 (fecha_consumo futura) están cubiertos por la validación de
 * ConsumoFormModal.tsx (comun.mayor_que_cero / comun.fecha_futura, min={20}/max={hoyLocal()} en
 * los campos del DS). E3 (fecha_consumo anterior a fecha_cambio_fase) depende de una regla de
 * negocio contra el historial de fases del ciclo activo que no existe en el formulario — solo
 * valida que la fecha no sea futura: se reporta como desviación, no se fuerza con datos
 * inventados.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-209';
const RUTA = 'suministros/alimentacion';
const TITULO = 'Registro de alimentación';
const PASOS_LIGHTHOUSE = ['formulario-vacio', 'formulario-con-errores'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Escribe y confirma la primera opción filtrada de un Combobox (patrón ARIA 1.2 del DS). */
async function elegirOpcion(page: Page, idCampo: string, texto: string) {
  const campo = page.getByRole('combobox', { name: new RegExp(idCampo, 'i') }).or(page.locator(`#${idCampo}`));
  await campo.fill(texto);
  await campo.press('ArrowDown');
  await campo.press('Enter');
}

async function abrirFormulario(page: Page) {
  const btn = main(page).getByRole('button', { name: 'Registrar consumo', exact: true });
  precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar consumo" está deshabilitado (sin conexión o sin permiso de creación)');
  await btn.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo, '2.4.3: abrir el modal debe mover el foco dentro de él').toBeVisible();
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Formulario de consumo de alimento (RF-75)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Formulario vacío - cada campo con etiqueta visible asociada (1.3.1 / 3.3.2) y name/role/value (4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const campos = [
      ['combobox', 'Activo biológico'], ['combobox', 'Tipo de alimento'], ['textbox', 'Fecha del suministro'],
      ['textbox', 'Hora del suministro'], ['spinbutton', /Cantidad suministrada/], ['spinbutton', 'Costo por unidad ($)'],
      ['textbox', 'Observaciones'],
    ] as const;
    for (const [role, name] of campos) {
      await expect.soft(dialogo.getByRole(role, { name }), `4.1.2: falta el campo "${name}" con su rol accesible`).toBeVisible();
    }
    // hora_suministro y observaciones son los dos campos opcionales del formulario; ambos muestran el hint "Opcional." a la vez (no depende del foco).
    await expect.soft(dialogo.getByText('Opcional.')).toHaveCount(2);

    await escanear(page, TC_ID, __dirname, 'formulario-vacio', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. E4 - cantidad_alimento = 0 se identifica en texto junto al campo (3.3.1) con aria-invalid (4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const cantidad = dialogo.getByRole('spinbutton', { name: /Cantidad suministrada/ });
    await cantidad.fill('0');
    await cantidad.blur();
    const error = dialogo.getByText('Ingresa un número mayor que cero.');
    await expect.soft(error, '3.3.1 (E4): el error de cantidad = 0 debe mostrarse junto al campo').toBeVisible();
    await expect.soft(error, 'el error debe tener role="alert" para anunciarse').toHaveAttribute('role', 'alert');
    await expect.soft(cantidad, '4.1.2: el campo inválido debe exponer aria-invalid="true"').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(cantidad, 'el campo debe referenciar su error por aria-describedby').toHaveAttribute('aria-describedby', /consumo-cantidad-err/);
  });

  test('3. E2 - fecha_consumo futura se identifica en texto junto al campo (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);

    const futura = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const fecha = dialogo.getByRole('textbox', { name: 'Fecha del suministro' });
    await fecha.fill(futura);
    await fecha.blur();
    const error = dialogo.getByText('La fecha no puede ser futura.');
    await expect.soft(error, '3.3.1 (E2): el error de fecha futura debe mostrarse junto al campo').toBeVisible();
    await expect.soft(fecha, '4.1.2: aria-invalid="true" en la fecha futura').toHaveAttribute('aria-invalid', 'true');

    await escanear(page, TC_ID, __dirname, 'formulario-con-errores', testInfo, PASOS_LIGHTHOUSE);
  });

  test('4. E3 - fecha_consumo anterior a fecha_cambio_fase (desviación: no hay validación cliente contra el historial de fases)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    const fecha = dialogo.getByRole('textbox', { name: 'Fecha del suministro' });
    await fecha.fill('2020-01-01');
    await fecha.blur();
    const sinError = await dialogo.getByText(/fecha de cambio de fase|cambio_fase/i).count();
    anotar(testInfo, 'E3 (ConsumoFormModal)', `Solo valida fecha futura (comun.fecha_futura). Mensajes relacionados con fase encontrados: ${sinError}.`);
    desviacion(sinError > 0, 'el formulario no valida en cliente que fecha_consumo sea posterior a fecha_cambio_fase (E3); solo bloquea fechas futuras. Si el backend rechaza, el campo "activo" no queda señalado como lo exige el criterio');
  });

  test('5. Activo seleccionado - cálculo de total estimado anunciado sin mover el foco (buena práctica 4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    const total = dialogo.locator('p[aria-live="polite"]').filter({ hasText: 'Costo total estimado' });
    await expect.soft(total, '4.1.3: el total estimado debe estar en una región aria-live').toHaveAttribute('aria-live', 'polite');
    await dialogo.getByRole('spinbutton', { name: /Cantidad suministrada/ }).fill('10');
    await dialogo.getByRole('spinbutton', { name: 'Costo por unidad ($)' }).fill('2000');
    await expect.soft(total, 'el total debe recalcularse en la región viva').toContainText('$');
    anotar(testInfo, 'Total estimado', (await total.innerText()).replace(/\s+/g, ' '));
  });
});
