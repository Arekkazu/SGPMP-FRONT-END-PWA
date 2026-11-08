// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-85 TC-DIS-232: accesibilidad de los filtros del historial de productos agrícolas |
// | 2026-11-07 | Laura032005 | M06 RF-85 TC-DIS-232: no evaluar foco en un filtro deshabilitado por falta de datos (no es un fallo de teclado) |
/**
 * TC-DIS-232 — Accesibilidad WCAG 2.1 AA de los filtros y del estado vacío del historial de
 * reconocimientos de productos agrícolas (activo, período, tipo de producto y rango de valores)
 * RF-85 · CU-04 Reconocer producto agrícola en punto de cosecha · Rol: Contador
 * Finanzas NIC 41 → Productos agrícolas (/finanzas/productos), ProductosView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados asociados); 3.3.2
 * (etiquetas de los 4 filtros); 3.3.1 (error de rango en texto asociado); 4.1.3 (estado vacío y
 * cambio de resultados anunciados); 2.1.1 (filtros operables por teclado).
 *
 * El período ya es global a todo el módulo (BarraPeriodo), no un filtro propio de esta vista.
 * ProductosView ofrece 3 filtros reales (Tipo, Producto, Especie) más una búsqueda de texto
 * libre que ya cubre "activo" (busca por identificador). No existe un filtro de rango de
 * valores (mínimo/máximo de valor_producto): se reporta como desviación, no se inventa.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-232';
const RUTA = 'finanzas/productos';
const TITULO = 'Productos agrícolas';
const PASOS_LIGHTHOUSE = ['filtros-productos', 'sin-coincidencias'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Filtros del historial de productos agrícolas (RF-85)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Filtros reales (Tipo, Producto, Especie, búsqueda) con etiqueta asociada (3.3.2 / 2.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filtros = [['textbox', 'Buscar'], ['combobox', 'Tipo'], ['combobox', 'Producto'], ['combobox', 'Especie']] as const;
    let algunoPresente = false;
    for (const [role, name] of filtros) {
      const campo = main(page).getByRole(role, { name });
      if (await campo.count() > 0) {
        algunoPresente = true;
        await expect.soft(campo, `3.3.2: el filtro "${name}" debe exponer su etiqueta`).toBeVisible();
        // Listado (comunes.tsx) deshabilita el filtro cuando hay menos de 2 valores distintos
        // para ofrecer ("ningún filtro ofrece algo que no existe"): no es un fallo de teclado.
        if (await campo.isEnabled()) {
          await campo.focus();
          await expect.soft(campo, `2.1.1: "${name}" debe ser enfocable con Tab`).toBeFocused();
        } else {
          anotar(testInfo, `Filtro "${name}" deshabilitado`, 'menos de 2 valores distintos en los datos del período (comportamiento esperado, no se evalúa el foco)');
        }
      }
    }
    precondicion(algunoPresente, 'el período elegido no tiene productos agrícolas reconocidos (el panel de filtros solo aparece con l.total > 0)');

    const rango = main(page).getByRole('spinbutton', { name: /valor m[íi]nimo|valor m[áa]ximo/i });
    anotar(testInfo, 'Filtro de rango de valores', String(await rango.count()));
    desviacion(await rango.count() > 0, 'no existe un filtro de rango de valores (mínimo/máximo) sobre valor_producto en ProductosView');

    await escanear(page, TC_ID, __dirname, 'filtros-productos', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Sin coincidencias tras filtrar - estado anunciado con acción para limpiar (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const buscar = main(page).getByRole('textbox', { name: 'Buscar' });
    precondicion(await buscar.count() > 0, 'no hay productos reconocidos para poder filtrar');
    if (await buscar.count() === 0) return;

    await buscar.fill('xx-no-existe-ningun-producto-con-este-texto-xx');
    const sinCoincidencias = main(page).getByText('Ningún registro coincide con los filtros');
    await expect.soft(sinCoincidencias, '4.1.3: el estado sin coincidencias debe anunciarse').toBeVisible();
    const enRegionViva = await sinCoincidencias.evaluate((e) => !!e.closest('[role="status"]'));
    expect.soft(enRegionViva, '4.1.3: el estado vacío (EstadoVacio) debe estar en role="status"').toBe(true);
    const limpiar = main(page).getByRole('button', { name: 'Limpiar filtros', exact: true });
    await expect.soft(limpiar, '2.1.1: debe existir una acción accesible para limpiar los filtros').toBeVisible();

    await escanear(page, TC_ID, __dirname, 'sin-coincidencias', testInfo, PASOS_LIGHTHOUSE);
  });
});
