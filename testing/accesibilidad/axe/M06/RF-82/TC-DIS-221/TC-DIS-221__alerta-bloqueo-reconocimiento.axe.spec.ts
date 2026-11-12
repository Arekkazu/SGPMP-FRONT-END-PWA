// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-82 TC-DIS-221: accesibilidad de la alerta de bloqueo del reconocimiento |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-221: test3 documentado como no sembrable (restricción de BD), confirmado con el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-221: corregir selector "Revisar" (aria-label real "Revisar el reconocimiento de...") y seleccionar período 363 |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-221: el período 363 pertenece a otro Titular ("Agropecuaria Medicion QA") — usar irAPeriodo con el Titular correcto |
/**
 * TC-DIS-221 — Accesibilidad WCAG 2.1 AA de la alerta de bloqueo del reconocimiento (criterios
 * NIC 41 no cumplidos) y de la advertencia por falta de costo de adquisición
 * RF-82 · CU-01 Reconocer inicialmente activo biológico · Rol: Contador
 * Finanzas NIC 41 → Reconocimiento inicial (/finanzas/reconocimiento), ReconocimientosView.tsx
 *
 * IMPORTANTE — estado del código al escribir este spec (2026-11-06): el módulo "Finanzas NIC 41"
 * (`src/financial_valuation/`, RF-82 a RF-89) existe y está implementado en la rama `dev`
 * (confirmado leyendo FinanzasPage.tsx, ReconocimientosView.tsx y finanzas.json de
 * `origin/dev`), pero todavía no está fusionado a `test`: no aparece en este checkout ni en el
 * ambiente sigab-test contra el que corre `testing/playwright.config.ts`. Este spec se escribe
 * contra los selectores y el texto reales de `dev` y quedará listo para ejecutarse en cuanto el
 * módulo se fusione a `test` — ejecutarlo hoy fallará con "BLOQUEO DE AMBIENTE" porque la ruta
 * /finanzas no existe todavía en sigab-test.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 4.1.3 (mensajes de estado anunciados sin mover
 * el foco, role="alert" o "status"); 1.4.1 (severidad bloqueo/advertencia con etiqueta textual,
 * no solo color); 1.4.3 (contraste de texto ≥ 4.5:1); 3.3.1 (la alerta identifica el criterio o
 * campo que falla).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, irAPeriodo, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-221';
const RUTA = 'finanzas/reconocimiento';
const TITULO = 'Reconocimiento inicial';
const PASOS_LIGHTHOUSE = ['vista-con-bloqueados', 'modal-con-bloqueo'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Alerta de bloqueo del reconocimiento (RF-82)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Aviso de bloqueo en la vista - alerta role="alert"/"status" con el identificador del activo (1.4.1 / 3.3.1 / 4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const avisoBloqueados = main(page).getByText(/activo(s)? no se puede(n)? reconocer todavía/i);
    const hay = await avisoBloqueados.count() > 0;
    precondicion(hay, 'no hay activos bloqueados en el ambiente de prueba (ningún activo incumple los 3 criterios del Párrafo 10 de la NIC 41)');
    if (hay) {
      const region = avisoBloqueados.locator('xpath=ancestor::*[@role="alert" or @role="status"]').first();
      await expect.soft(region, '4.1.3: el aviso de activos bloqueados debe estar en role="alert" o "status"').toHaveCount(1);
      const texto = await avisoBloqueados.innerText();
      anotar(testInfo, 'Aviso de bloqueados', texto);
    }
    await escanear(page, TC_ID, __dirname, 'vista-con-bloqueados', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Detalle del bloqueo en el modal - cada bloqueo con su propio Alert de error (1.4.1 / 3.3.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // QA-RF82-PENDIENTE (1861) o QA-RF82-BLOQUEADO (1864), período 363, Titular "Agropecuaria
    // Medicion QA" — sembrados por el DBA.
    await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento (pendiente o bloqueada) para abrir');
    if (await revisar.count() === 0) return;

    await revisar.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    const alertasError = dialogo.locator('[role="alert"]');
    const n = await alertasError.count();
    anotar(testInfo, 'Alertas en el modal de reconocimiento', String(n));
    if (n > 0) {
      const textos = await alertasError.allInnerTexts();
      expect.soft(textos.filter((t) => !t.trim()), '3.3.1: cada bloqueo/advertencia debe tener texto, no solo un ícono de color').toEqual([]);
    }

    await escanear(page, TC_ID, __dirname, 'modal-con-bloqueo', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('3. Desviación - no se puede sembrar un activo COMPRA con costo_adquisicion nulo', async ({}, testInfo) => {
    anotar(testInfo, 'Alcance', 'Confirmado con el DBA: la base de datos exige costo_adquisicion > 0 al crear una compra, así que este escenario no se puede preparar en el ambiente bajo ninguna circunstancia (restricción de integridad, no una limitación de datos temporal). Las advertencias de PropuestaModal (p.advertencias) ya se verifican en el test 2 con los bloqueos reales (activo 1864, finca 464): usan el mismo <Alert variant="warning"> con texto visible.');
  });
});
