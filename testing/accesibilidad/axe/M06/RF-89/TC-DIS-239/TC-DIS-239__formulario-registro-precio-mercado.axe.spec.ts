// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-89 TC-DIS-239: accesibilidad del formulario de registro de precio de mercado |
// | 2026-11-12 | Laura032005 | M06 RF-89 TC-DIS-239: usa la cuenta Contador, no Admin — el RF-89 restringe el registro de precios solo a ese rol (CA-1) |
/**
 * TC-DIS-239 — Accesibilidad WCAG 2.1 AA del formulario de registro de precio de mercado (campos
 * obligatorios, justificación condicional para fuente ESTIMADA, validaciones y confirmación
 * doble por desviación significativa)
 * RF-89 · CU-08 Gestionar precios de mercado de referencia · Rol: Contador
 * Finanzas NIC 41 → Precios de referencia (/finanzas/precios), "Registrar precio" (PrecioModal
 * en PreciosView.tsx)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 3.3.2 (etiquetas de especie, categoría, precio,
 * unidad, vigencia, vencimiento, fuente y evidencia); 3.3.1 (errores en texto asociados al
 * campo); 4.1.3 (campo condicional y errores anunciados); 2.1.1 (flujo por teclado); 4.1.2
 * (name/role/value); 2.4.3 (foco en el diálogo de confirmación doble).
 *
 * Este caso es el que más fielmente refleja el código real: PrecioModal implementa los 3
 * mecanismos completos (fuente ESTIMADA → justificación obligatoria ≥50 caracteres, validación
 * de los campos y la confirmación doble vía registro.error.code ===
 * "DESVIACION_PRECIO_REQUIERE_CONFIRMACION", que reemplaza el botón "Guardar" por "Confirmar y
 * guardar" dentro del mismo modal, sin abrir un segundo diálogo).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, credencialesPorRol, escanear, irA, main, precondicion, PREFIJO_API } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-239';
const RUTA = 'finanzas/precios';
const TITULO = 'Precios de referencia';
const PASOS_LIGHTHOUSE = ['formulario-vacio', 'fuente-estimada', 'desviacion-precio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function abrirFormulario(page: Page) {
  const btn = main(page).getByRole('button', { name: 'Registrar precio', exact: true });
  await btn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar precio" está deshabilitado o no tiene permiso');
  await btn.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Formulario de registro de precio de mercado (RF-89)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // RF-89 Restricciones: "Solo el Contador puede registrar... Ningún otro actor tiene permisos
    // de escritura" (CA-1). Con la cuenta Admin el botón no se renderiza (correcto por RBAC).
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Campos obligatorios con etiqueta y aria-required (3.3.2 / 4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    const requeridos = [
      ['combobox', 'Especie'], ['combobox', 'Categoría de precio'], ['textbox', 'Precio unitario (COP)'],
      ['combobox', 'Fuente'], ['textbox', 'Vigente desde'], ['textbox', 'Evidencia'],
    ] as const;
    for (const [role, name] of requeridos) {
      const campo = dialogo.getByRole(role, { name });
      await expect.soft(campo, `4.1.2: falta el campo "${name}"`).toBeVisible();
      await expect.soft(campo, `3.3.2: "${name}" debe exponer aria-required="true"`).toHaveAttribute('aria-required', 'true');
    }
    await escanear(page, TC_ID, __dirname, 'formulario-vacio', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Fuente ESTIMADA - justificación condicional aparece y se anuncia (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    const fuente = dialogo.getByRole('combobox', { name: 'Fuente' });
    await expect.soft(dialogo.getByRole('textbox', { name: 'Justificación de la estimación' }), 'la justificación no debe estar antes de elegir fuente ESTIMADA').toHaveCount(0);
    await fuente.selectOption('ESTIMADA');
    const justificacion = dialogo.getByRole('textbox', { name: 'Justificación de la estimación' });
    await expect.soft(justificacion, '4.1.3: el campo condicional debe aparecer al elegir ESTIMADA').toBeVisible();
    await expect.soft(justificacion, '3.3.2: debe ser obligatorio').toHaveAttribute('aria-required', 'true');

    await justificacion.fill('corto');
    await dialogo.getByRole('combobox', { name: 'Especie' }).selectOption({ index: 1 }).catch(() => {});
    await dialogo.getByRole('textbox', { name: 'Precio unitario (COP)' }).fill('1000');
    await dialogo.getByRole('textbox', { name: 'Evidencia' }).fill('Estimación propia');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    const error = dialogo.getByText('Documenta la estimación con al menos 50 caracteres.');
    await expect.soft(error, '3.3.1: el error de justificación corta debe mostrarse junto al campo').toBeVisible();

    await escanear(page, TC_ID, __dirname, 'fuente-estimada', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Desviación significativa - confirmación doble accesible dentro del mismo modal (2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirFormulario(page);
    await page.route(`**${PREFIJO_API}/finanzas/precios`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({
        status: 422, contentType: 'application/json',
        body: JSON.stringify({ code: 'DESVIACION_PRECIO_REQUIERE_CONFIRMACION', message: 'El precio ingresado se aleja un 45% del vigente. Confirma para continuar.' }),
      });
    });
    await dialogo.getByRole('combobox', { name: 'Especie' }).selectOption({ index: 1 }).catch(() => {});
    await dialogo.getByRole('textbox', { name: 'Precio unitario (COP)' }).fill('999999');
    await dialogo.getByRole('textbox', { name: 'Vigente desde' }).fill(new Date().toISOString().slice(0, 10));
    await dialogo.getByRole('textbox', { name: 'Evidencia' }).fill('Cotización de prueba');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();

    const aviso = dialogo.getByText('El precio se aleja mucho del vigente');
    await expect.soft(aviso, '4.1.3: la advertencia de desviación debe anunciarse').toBeVisible({ timeout: 10_000 });
    const confirmar = dialogo.getByRole('button', { name: 'Confirmar y guardar', exact: true });
    await expect.soft(confirmar, '2.4.3 / 2.1.1: el botón de confirmación debe quedar visible y enfocable dentro del mismo diálogo (no abre uno nuevo)').toBeVisible();
    anotar(testInfo, 'Confirmación doble', 'Reemplaza el botón "Guardar" por "Confirmar y guardar" en el mismo ModalShell; no hay un segundo <dialog> anidado');

    await escanear(page, TC_ID, __dirname, 'desviacion-precio', testInfo, PASOS_LIGHTHOUSE);
    await page.unroute(`**${PREFIJO_API}/finanzas/precios`);
    await page.keyboard.press('Escape');
  });
});
