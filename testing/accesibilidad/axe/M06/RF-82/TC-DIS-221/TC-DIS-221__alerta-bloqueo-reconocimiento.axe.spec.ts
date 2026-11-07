// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-82 TC-DIS-221: accesibilidad de la alerta de bloqueo del reconocimiento |
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
import { abrirSesion, anotar, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

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
    await irA(page, RUTA, TITULO);
    const revisar = main(page).getByRole('button', { name: /^Revisar$/, exact: true }).first();
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

  test('3. Advertencia por falta de costo de adquisición (precondición: depende de un activo con origen COMPRA y sin costo_adquisicion)', async ({}, testInfo) => {
    precondicion(false, 'requiere un activo con origen_financiero_activo = COMPRA y costo_adquisicion nulo preparado en el ambiente; las advertencias de PropuestaModal (p.advertencias) son texto libre que redacta el backend — se verificaría que cada una quede en un <Alert variant="warning"> con texto visible, como las demás de este modal');
  });
});
