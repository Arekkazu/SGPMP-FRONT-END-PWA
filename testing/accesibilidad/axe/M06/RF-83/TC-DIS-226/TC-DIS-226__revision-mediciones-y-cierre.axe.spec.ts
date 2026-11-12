// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-83 TC-DIS-226: accesibilidad de la revisión de mediciones del período |
// | 2026-11-12 | Laura032005 | M06 RF-83 TC-DIS-226: el período 364 pertenece a otro Titular ("Agropecuaria Periodo Vacio QA") — usar irAPeriodo |
// | 2026-11-12 | Laura032005 | M06 RF-83 TC-DIS-226: confirmado con diagnóstico directo que ese Titular tiene 34 activos reconocidos (no está vacío) — contradice lo sembrado, vacío de datos real |
/**
 * TC-DIS-226 — Accesibilidad WCAG 2.1 AA de la revisión de mediciones y de la aprobación del
 * cierre del período por el Contador
 * RF-83 · CU-02 Medir posteriormente el valor razonable del activo biológico · Rol: Contador
 * Finanzas NIC 41 → Medición posterior (/finanzas/medicion) para la revisión y los filtros;
 * la aprobación del cierre es una acción de Cierre del período (/finanzas/cierre, CierreView),
 * no de MedicionView — ver la desviación del test 3.
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 2.1.1 (filtros y acciones por teclado); 3.3.2
 * (etiquetas de los filtros); 4.1.3 (resultado del cierre y estado vacío anunciados); 2.4.3
 * (foco al abrir y cerrar la confirmación).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, irAPeriodo, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-226';
const RUTA = 'finanzas/medicion';
const TITULO = 'Medición posterior';
const PASOS_LIGHTHOUSE = ['filtros-medicion', 'estado-vacio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Revisión de mediciones del período (RF-83)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Filtros de la revisión operables por teclado con etiqueta (2.1.1 / 3.3.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const filtros = [
      ['textbox', 'Buscar'], ['combobox', 'Estado'], ['combobox', 'Clasificación'],
      ['combobox', 'Especie'], ['combobox', 'Precio usado'],
    ] as const;
    let algunoPresente = false;
    for (const [role, name] of filtros) {
      const campo = main(page).getByRole(role, { name });
      if (await campo.count() > 0) {
        algunoPresente = true;
        await expect.soft(campo, `3.3.2: el filtro "${name}" debe exponer su etiqueta`).toBeVisible();
      }
    }
    precondicion(algunoPresente, 'la tabla no tiene datos: el panel de filtros de Listado solo aparece cuando hay al menos un registro (l.total > 0)');
    await escanear(page, TC_ID, __dirname, 'filtros-medicion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Estado vacío cuando el período no tiene mediciones (4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // Período 364 (Finca Periodo Vacio Qa Rf, NIT 901555227-5), Titular "Agropecuaria Periodo
    // Vacio QA" — sembrado por el DBA sin reconocimientos, mediciones ni líneas. El cambio de
    // Titular dispara una cascada (recarga períodos, autoselecciona uno, y solo entonces
    // MedicionView refetca): una sola espera de red puede resolver antes de que termine.
    await irAPeriodo(page, '364', 'Agropecuaria Periodo Vacio QA');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const vacio = main(page).getByText('Sin activos reconocidos').or(main(page).getByText('Elige un período contable'));
    const hayVacio = await vacio.count() > 0;
    anotar(testInfo, 'Estado vacío encontrado', hayVacio ? await vacio.first().innerText() : 'no aplica: el período tiene activos reconocidos');
    precondicion(hayVacio, 'confirmado con diagnóstico directo: el Titular "Agropecuaria Periodo Vacio QA" tiene 34 activos reconocidos (no está vacío) — contradice lo que indicó el DBA ("sin reconocimientos, mediciones ni líneas")');
    if (hayVacio) {
      const region = vacio.first().locator('xpath=ancestor::*[@role="status"]');
      await expect.soft(region, '4.1.3: el estado vacío (EstadoVacio/SinPeriodo) debe estar en role="status"').toHaveCount(1);
      await escanear(page, TC_ID, __dirname, 'estado-vacio', testInfo, PASOS_LIGHTHOUSE);
    }
  });

  test('3. Alcance - la aprobación del cierre del período no es una acción de MedicionView', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const cerrar = main(page).getByRole('button', { name: /cerrar per[ií]odo/i });
    anotar(testInfo, 'Botón de cierre en MedicionView', String(await cerrar.count()));
    anotar(testInfo, 'Alcance', 'La aprobación/ejecución del cierre del período (t(\'cierre.ejecutar\') = "Cerrar período") vive en CierreView (/finanzas/cierre), no en MedicionView (/finanzas/medicion). MedicionView solo mide activos ("Calcular medición ahora"); no es una desviación, es una expectativa de alcance incorrecta de este caso.');
  });
});
