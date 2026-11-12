// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-85 TC-DIS-231: no existe alerta RECONOCIMIENTO_PENDIENTE ni ingreso manual de costos para productos |
// | 2026-11-12 | Laura032005 | M06 RF-85 TC-DIS-231: confirmado con el DBA que "precio nulo" no se puede sembrar (restricción de BD); documentado como alcance, no precondición pendiente |
/**
 * TC-DIS-231 — Accesibilidad WCAG 2.1 AA de la alerta RECONOCIMIENTO_PENDIENTE y del ingreso
 * manual de costos de venta
 * RF-85 · CU-04 Reconocer producto agrícola en punto de cosecha · Rol: Contador
 * Finanzas NIC 41 → Productos agrícolas (/finanzas/productos), ProductosView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 4.1.3 (alerta anunciada); 3.3.2 (etiquetas de
 * los campos de costo manual); 3.3.1 (errores en texto asociados al campo); 2.1.1 (operable por
 * teclado); 1.4.1 (estado pendiente con texto).
 *
 * ProductosView.tsx solo lista productos ya reconocidos (el evento_productivo se "reconoce al
 * procesarse"): no tiene ningún estado RECONOCIMIENTO_PENDIENTE, ni alerta, ni un formulario de
 * ingreso manual de costos de venta para productos sin precio de mercado. Un producto sin
 * precio solo muestra el texto "Sin precio" en la columna correspondiente, sin bloquear el
 * reconocimiento ni pedir una acción del Contador. Se reporta como desviación real: el RF-85
 * implementado no tiene el flujo de bloqueo/confirmación manual que sí tiene RF-82 para activos
 * biológicos (TC-DIS-221/223).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-231';
const RUTA = 'finanzas/productos';
const TITULO = 'Productos agrícolas';
const PASOS_LIGHTHOUSE = ['sin-precio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - RECONOCIMIENTO_PENDIENTE de productos agrícolas (RF-85)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - no hay alerta de RECONOCIMIENTO_PENDIENTE ni bloqueo visible', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const alerta = main(page).getByText(/pendiente de reconocimiento|reconocimiento pendiente/i);
    anotar(testInfo, 'Alertas de reconocimiento pendiente en ProductosView', String(await alerta.count()));
    desviacion(await alerta.count() > 0, 'ProductosView no tiene un estado ni una alerta de RECONOCIMIENTO_PENDIENTE: lista solo lo ya reconocido, sin un paso de revisión/confirmación equivalente al de RF-82 (ReconocimientosView)');

    const sinPrecio = main(page).getByText('Sin precio', { exact: true });
    const hay = await sinPrecio.count() > 0;
    anotar(testInfo, 'Productos "Sin precio"', String(await sinPrecio.count()));
    if (hay) {
      await expect.soft(sinPrecio.first(), '1.4.1: "Sin precio" debe leerse como texto, no depender del color').toBeVisible();
      await escanear(page, TC_ID, __dirname, 'sin-precio', testInfo, PASOS_LIGHTHOUSE);
    } else {
      anotar(testInfo, 'Alcance', 'Confirmado con el DBA: la base de datos exige precio_mercado_producto al crear un producto, así que no se puede sembrar uno con precio nulo (restricción de integridad). El evento 1373 quedó pendiente de reconocer, pero eso no se refleja como "Sin precio" en ProductosView (que solo lista lo ya reconocido).');
    }
  });

  test('2. Desviación - no hay un formulario de ingreso manual de costos de venta para productos', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const costoManual = main(page).getByRole('spinbutton', { name: /costo.*venta/i });
    anotar(testInfo, 'Campos de costo manual en ProductosView', String(await costoManual.count()));
    desviacion(await costoManual.count() > 0, 'ProductosView es de solo lectura (tabla + KPIs): no existe ningún control para ingresar costos de venta manualmente sobre un producto agrícola');
  });
});
