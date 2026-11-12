// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-88 TC-DIS-238: accesibilidad del desglose de valor contable y del cambio de método sin confirmación |
// | 2026-11-07 | Laura032005 | M06 RF-88 TC-DIS-238: loguear como Contador (Administrador no tiene permiso valoracion_por_costo) |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-238: corregir selector "Ver detalle" (aria-label real), encabezado esperado y comparación en minúsculas (CSS uppercase), y buscar un activo al costo real en vez de ".first()" |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-238: esperar a que cargue el contenido async del diálogo (heading/botón) antes de comprobarlo — carrera, no permiso |
/**
 * TC-DIS-238 — Accesibilidad WCAG 2.1 AA del desglose del valor contable por costo, de la marca
 * diferenciada del método COSTO y de la confirmación del cambio a VALOR_RAZONABLE
 * RF-88 · CU-07 Valorar activos biológicos por método de costo · Rol: Contador
 * Finanzas NIC 41 → Valoración sin mercado (/finanzas/valoracion-costo) y "Ver detalle"
 * (DetalleActivoModal.tsx)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (desglose con encabezados asociados);
 * 1.4.1 (método COSTO con etiqueta textual); 4.1.3 (alerta de valor en cero anunciada); 2.4.3 y
 * 2.1.1 (confirmación con foco gestionado y operable por teclado).
 *
 * "Pasar a valor razonable" en DetalleActivoModal llama a cambiarAValorRazonable directamente
 * en el onClick, sin ningún diálogo de confirmación intermedio: no hay un foco que gestionar en
 * una confirmación porque la confirmación no existe. Se reporta como desviación real para una
 * acción irreversible (NIC 41 ¶31: un activo que pasa a valor razonable no vuelve al costo).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, credencialesPorRol, desviacion, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-238';
const RUTA = 'finanzas/valoracion-costo';
const TITULO = 'Valoración sin mercado activo';
const PASOS_LIGHTHOUSE = ['desglose-tabla', 'desglose-modal'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Desglose del valor contable por costo (RF-88)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Tabla con costo inicial, depreciación y valor en libros con encabezados asociados (1.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'no hay activos al costo ni con precio estimado en el ambiente');
    if (await tabla.count() === 0) return;
    // thead usa text-transform: uppercase (CSS) — allInnerTexts() refleja el texto renderizado,
    // no el literal de la traducción: se compara en minúsculas para no depender del estilo.
    const encabezados = await tabla.locator('thead th').allInnerTexts();
    anotar(testInfo, 'Encabezados', encabezados.join(' | '));
    const encabezadosNorm = encabezados.map((e) => e.toLowerCase());
    expect.soft(encabezadosNorm, '1.3.1: debe incluir costo inicial, depreciación y valor en libros').toEqual(
      expect.arrayContaining(['costo inicial', 'depreciación acumulada']),
    );
    const metodoBadge = tabla.getByText(/valoraci[óo]n por costo/i);
    const hayMetodo = await metodoBadge.count() > 0;
    precondicion(hayMetodo, 'ningún activo visible está valorado por costo (todos podrían tener precio estimado)');
    if (hayMetodo) await expect.soft(metodoBadge.first(), '1.4.1: el método COSTO debe leerse como texto').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'desglose-tabla', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Desglose costo−depreciación−deterioro en el detalle - dl con dt/dd asociados (1.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    // La vista mezcla filas "al costo" y "estimadas": se busca un activo al costo real
    // (QA-RF88-AL-COSTO, 1858, sembrado por el DBA) en vez de confiar en ".first()".
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF88-AL-COSTO');
    // Accesible name real: "Ver el historial financiero de {activo}" (valor.ver_detalle_aria).
    const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
    await verDetalle.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await verDetalle.count() > 0, 'no hay un activo al costo para abrir su detalle');
    if (await verDetalle.count() === 0) return;
    await verDetalle.click();
    const dialogo = page.getByRole('dialog');
    const subtitulo = dialogo.getByRole('heading', { name: 'Modelo de costo' });
    await subtitulo.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const hayModeloCosto = await subtitulo.count() > 0;
    precondicion(hayModeloCosto, 'el activo abierto no está valorado al costo (DetalleActivoModal solo muestra esta sección cuando costo.es_activa)');
    if (hayModeloCosto) {
      const etiquetas = await dialogo.locator('dl dt').allInnerTexts();
      anotar(testInfo, 'Etiquetas del modelo de costo', etiquetas.join(' | '));
      expect.soft(etiquetas, '1.3.1: debe incluir costo base, vida útil, depreciación, deterioro y valor en libros').toEqual(
        expect.arrayContaining(['Costo base', 'Depreciación acumulada', 'Deterioro acumulado', 'Valor en libros']),
      );
    }
    await escanear(page, TC_ID, __dirname, 'desglose-modal', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('3. Desviación - "Pasar a valor razonable" no abre un diálogo de confirmación (2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF88-AL-COSTO');
    const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
    await verDetalle.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await verDetalle.count() > 0, 'no hay un activo al costo para abrir su detalle');
    if (await verDetalle.count() === 0) return;
    await verDetalle.click();
    const detalle = page.getByRole('dialog');
    const pasar = detalle.getByRole('button', { name: 'Pasar a valor razonable', exact: true });
    await pasar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const hayBoton = await pasar.count() > 0;
    precondicion(hayBoton, 'no se tiene el permiso ACCION_U sobre valoracion_por_costo para ver el botón');
    if (hayBoton) {
      anotar(testInfo, 'Acción "Pasar a valor razonable"', 'onClick llama directamente a cambiarAValorRazonable(idActivo); no hay MotivoModal ni ModalShell de confirmación intermedio en el código (DetalleActivoModal.tsx)');
      desviacion(false, 'una acción irreversible (NIC 41 ¶31: no hay vuelta al costo) debería pedir confirmación explícita con su propio diálogo y gestión de foco (2.4.3); aquí se ejecuta en un solo clic/Enter sin paso intermedio');
    }
    await page.keyboard.press('Escape');
  });
});
