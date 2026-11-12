// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-78 TC-DIS-217: accesibilidad del flujo de corrección de registros de suministro |
// | 2026-11-11 | Laura032005 | M05 RF-78 TC-DIS-217: reejecución con datos reales del DBA; consultarPrimerActivo ya no toma el primero del combobox a ciegas (a veces caía en un activo sin ciclo), ahora apunta a BOV-114-TIL (1627); se probó con Gestor de Granja por un posible tema de permiso en "Corregir", mismo resultado — con más contexto, el "bloqueo" era esta pantalla tardando más de 60s en cargar (acumulado + 80 registros en paralelo), no backend ni permisos; timeout ampliado a 120s |
// | 2026-11-11 | Laura032005 | M05 RF-78 TC-DIS-217: con la ficha de RF-78 (Restricción 8) se reemplaza el placeholder de E6 por una reproducción real (corregir el mismo registro dos veces sin cambiar cantidad/precio); E7 se documenta como no reproducible desde la UI (id_registro_original siempre se adjunta automáticamente), no como dato faltante |
/**
 * TC-DIS-217 — Accesibilidad WCAG 2.1 AA del flujo de corrección de registros de suministro y
 * de sus mensajes de rechazo
 * RF-78 · CU-04 Acumular Inversión y Proveer Costos a M06 · Rol: Gestor de Granja
 * Suministros → Costos del ciclo (/suministros/costos), botón "Corregir" sobre un registro
 * (CorreccionSuministroModal)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (acción de corrección y
 * formulario de ajuste operables por teclado con foco visible); 1.3.1 y 3.3.2 (relación
 * programática entre el registro de ajuste y id_registro_original; obligatoriedad de
 * motivo_correccion indicada en texto); 3.3.1 y 4.1.3 (errores E3, E6 —HTTP 409— y E7 —HTTP
 * 422— anunciados mediante aria-live).
 *
 * CorreccionSuministroModal no tiene un campo de fecha (solo cantidad, precio_unitario,
 * justificacion_precio, motivo_correccion): E3 (fecha fuera del rango del ciclo) no se puede
 * provocar desde este modal porque la fecha de la corrección no es editable ahí — se reporta
 * como desviación, no se simula con datos inventados. La referencia al registro original se da
 * como texto descriptivo (costeo.corregir_detalle), no como un id_registro_original expuesto
 * literalmente: se verifica que ese texto identifique el registro, que es lo que la UI ofrece.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, desviacion, describirFoco, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-217';
const RUTA = 'suministros/costos';
const TITULO = 'Costos del ciclo productivo';
const PASOS_LIGHTHOUSE = ['formulario-correccion'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  // BOV-114-TIL (id 1627): ciclo "Levante y ceba" real, fase Ceba activa desde el 1/10 (dato del DBA).
  await combo.fill('1627');
  await combo.blur();
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Corrección de registros de suministro (RF-78)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // Se probó con Gestor de Granja por una teoría de permisos que resultó ser falsa: esa cuenta
    // no tiene asignada la finca de BOV-114-TIL ("No hay activos visibles para tu usuario"), lo
    // que causaba el mismo 404 "sin ciclo" por una razón totalmente distinta (RLS por finca, no
    // falta del ciclo). Admin sí ve todas las fincas (dato del DBA): se vuelve a esa cuenta.
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Acción "Corregir" operable por teclado - foco entra al diálogo con la referencia al registro original (2.1.1 / 2.4.7 / 1.3.1)', async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    await corregir.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    precondicion(await corregir.count() > 0, 'no hay un registro de tipo REGISTRO (no CORRECCION) sobre el que probar la corrección, o falta el permiso U');
    if (await corregir.count() === 0) return;

    await corregir.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.4.3: el foco debe entrar al formulario de ajuste al abrirlo').toBeVisible();
    const foco = await describirFoco(page);
    anotar(testInfo, 'Foco al abrir', foco);

    const referencia = await dialogo.locator('p').first().innerText();
    anotar(testInfo, 'Referencia al registro original', referencia);
    expect.soft(referencia.length, '1.3.1: el formulario debe identificar el registro que se está corrigiendo').toBeGreaterThan(0);

    await escanear(page, TC_ID, __dirname, 'formulario-correccion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. motivo_correccion - obligatorio en texto, no solo con asterisco (3.3.2) y error asociado (3.3.1)', async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    await corregir.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    precondicion(await corregir.count() > 0, 'no hay un registro corregible disponible');
    if (await corregir.count() === 0) return;

    await corregir.click();
    const dialogo = page.getByRole('dialog');
    const motivo = dialogo.getByRole('textbox', { name: 'Motivo de la corrección' });
    await expect.soft(motivo, '3.3.2: motivo_correccion debe exponer aria-required="true"').toHaveAttribute('aria-required', 'true');
    await motivo.fill('corto');
    await motivo.blur();
    const error = dialogo.getByText(/Escribe al menos \d+ caracteres/).last();
    await expect.soft(error, '3.3.1: el error de motivo corto debe mostrarse junto al campo').toBeVisible();
    await expect.soft(motivo, '4.1.2: aria-invalid="true" en motivo insuficiente').toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.press('Escape');
    const vuelve = await corregir.evaluate((e) => e === document.activeElement);
    expect.soft(vuelve, '2.4.3: al cerrar con Escape el foco debe volver al botón "Corregir"').toBe(true);
  });

  test('3. E3 - desviación: la fecha no es editable en la corrección, no se puede provocar desde este modal', async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    await corregir.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    precondicion(await corregir.count() > 0, 'no hay un registro corregible disponible');
    if (await corregir.count() === 0) return;
    await corregir.click();
    const dialogo = page.getByRole('dialog');
    const fecha = await dialogo.getByRole('textbox', { name: /fecha/i }).count();
    anotar(testInfo, 'Campos de fecha en CorreccionSuministroModal', String(fecha));
    desviacion(fecha > 0, 'el formulario de corrección no tiene un campo de fecha editable: E3 (fecha fuera del rango del ciclo) no se puede provocar sobre este flujo tal como está implementado');
    await page.keyboard.press('Escape');
  });

  test('4. E6 - rechazo por corrección duplicada (HTTP 409), reproducida con el mismo registro dos veces (RF-78 Restricción 8)', async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    await corregir.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    precondicion(await corregir.count() > 0, 'no hay un registro corregible disponible');
    if (await corregir.count() === 0) return;

    // RF-78 Restricción 8: un registro (incluida una corrección) es duplicado si coincide en
    // activo+ciclo+tipo+fecha_aplicacion+cantidad+precio_unitario_resuelto. CorreccionSuministroModal
    // precarga cantidad/precio del original: enviar la corrección dos veces sin cambiarlos
    // reproduce el 409 real, sin inventar datos ni tocar la base de datos.
    const enviarCorreccionSinCambios = async () => {
      await corregir.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('textbox', { name: 'Justificación del precio' }).fill('Mismo precio de catálogo, sin cambios en esta corrección');
      await dialogo.getByRole('textbox', { name: 'Motivo de la corrección' }).fill('Reproducción del caso E6 (RF-DIS-217, duplicado 409)');
      await dialogo.getByRole('button', { name: 'Registrar corrección', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    };

    await enviarCorreccionSinCambios();
    const primeraAlerta = page.getByRole('alert');
    anotar(testInfo, 'E6 - primer envío', await primeraAlerta.count() > 0 ? await primeraAlerta.innerText() : 'sin alerta; diálogo cerrado (corrección aceptada)');
    await page.keyboard.press('Escape').catch(() => {});

    await enviarCorreccionSinCambios();
    const segundaAlerta = page.getByRole('alert');
    const huboAlerta = await segundaAlerta.count() > 0;
    anotar(testInfo, 'E6 - segundo envío (idéntico)', huboAlerta ? await segundaAlerta.innerText() : 'sin alerta; el backend aceptó dos correcciones idénticas (no aplicó la Restricción 8 de deduplicación)');
    if (huboAlerta) {
      await expect.soft(segundaAlerta, '4.1.3 (E6): el rechazo de duplicado debe anunciarse en una región visible/anunciable, sin perder el foco a body').toBeVisible();
      const foco = await describirFoco(page);
      expect.soft(foco, '4.1.3: el foco no debe perderse al mostrar el error de duplicado').not.toBe('body');
    }
  });

  test('5. E7 - desviación: id_registro_original siempre se adjunta automáticamente, no se puede omitir desde este modal', async ({}, testInfo) => {
    // RF-78 Flujo alterno E7: "tipo_operacion = CORRECCION pero id_registro_original está
    // ausente o no existe → HTTP 422". CorreccionSuministroModal solo se abre a partir de un
    // "Corregir" sobre una fila real (prop `original: LineaHistorial`): el id del registro
    // original siempre viaja con la solicitud, nunca vacío. No hay manera de omitirlo desde la
    // UI tal como está implementada — se documenta como desviación de alcance, no como dato
    // faltante: no existe un camino de usuario real que reproduzca E7 sin manipular la base de
    // datos para dejar una corrección con una referencia inválida.
    anotar(testInfo, 'E7 (CorreccionSuministroModal)', 'id_registro_original se toma de `original.id_registro_suministro` (la fila real que abrió el modal) y siempre viaja con la solicitud; la UI no ofrece ningún camino para enviarlo vacío o inválido.');
  });
});
