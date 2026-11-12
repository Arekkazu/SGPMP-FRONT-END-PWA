// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-198 RF-74: aria-live en la alerta automática de CA Crítica  |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-198 RF-74: reejecución con el ICA real de BOV-114-TIL (#1627) |
/**
 * TC-DIS-198 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de aria-live en la alerta automática de CA Crítica
 * RF-74 · CU-02 · Rol: Productor o Veterinario
 * Suministros → Eficiencia (ICA) → "Calcular ahora"
 *
 * Criterio: verificación de 4.1.3: la alerta generada cuando clasificacion_ca=CRITICA está en una
 * región aria-live (assertive, urgencia ALTA) y se anuncia sin mover el foco; 0 violaciones axe A/AA.
 *
 * Datos (reejecución 2026-11-11): activo REAL BOV-114-TIL (#1627, Finca El Rosal), cuyo ICA por ciclo
 * ya está calculado como CRITICA (CA 8,44). Se consulta con Admin, la única cuenta de mi
 * testing/.env.test que ve esa finca. El cálculo manual deja un resultado que no se borra: el POST
 * /calcular se responde en la prueba con el mismo resultado REAL que devuelve el backend, sin
 * escribir nada. La notificación de la campana la emite el backend y no se evalúa aquí.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, describirFoco, desviacion, escanear, irA, json, main, precondicion } from '../../../_shared/sigabA11y';
import { anunciosDurante, consultarIca, sesionDelCaso, simularEscritura } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-198';
const ACTIVO = 1627;
const LH = ['tras-calculo-critico'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-198 — Alerta automática de CA Crítica', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [4.1.3] Cálculo manual sobre el activo real en CRITICA: anuncio sin mover el foco', async ({}, testInfo) => {
    const { page } = s;
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');
    await page.locator('#ica-periodo').selectOption('POR_CICLO');
    const real = await json<{ tiene_resultado: boolean; resultado: Record<string, unknown> | null }>(await consultarIca(page, ACTIVO));
    const resultado = real?.resultado ?? null;
    anotar(testInfo, 'ICA real de #1627 (por ciclo)', resultado ? `${resultado.estado_resultado} · ${resultado.clasificacion_ca} · CA ${resultado.ca_calculado}` : 'sin resultado');
    precondicion(resultado?.clasificacion_ca === 'CRITICA', 'el activo #1627 ya no tiene un ICA por ciclo en CRITICA');
    test.skip(!resultado, 'Sin resultado real');

    const posts = await simularEscritura(page, /\/eficiencia-alimenticia\/calcular$/, () => ({ status: 200, json: { ...resultado, tipo_calculo: 'MANUAL' } }), 800);
    anotar(testInfo, 'Escritura simulada', 'POST /calcular respondido en la prueba con el resultado real del backend (no se escribe nada).');
    const boton = main(page).getByRole('button', { name: 'Calcular ahora', exact: true });
    await boton.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 4000);
    expect.soft(posts.length, 'El cálculo manual no se envió con teclado').toBe(1);
    const vigente = page.locator('section[aria-labelledby="ica-vigente"]');
    await expect.soft(vigente.locator('.ds-badge').filter({ hasText: 'Crítica' }), 'El resultado Crítica no se muestra').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'tras-calculo-critico', testInfo, LH);

    const foco = await describirFoco(page);
    const enRegion = await page.evaluate(() => [...document.querySelectorAll('.ds-badge')].filter((b) => /Crítica/.test(b.textContent ?? '')).map((b) => {
      const r = b.closest('[aria-live]:not([aria-live="off"]), [role="alert"], [role="status"]');
      return r ? (r.getAttribute('aria-live') ?? r.getAttribute('role')) : null;
    }));
    anotar(testInfo, 'Regiones vivas durante el cálculo', anuncios.join(' ¦ ') || '(ninguna)');
    anotar(testInfo, 'Badge Crítica', `región viva del badge: ${JSON.stringify(enRegion)} · foco tras calcular: ${foco}`);

    const alerta = anuncios.filter((a) => /^(alert|live\/assertive|alert\/assertive)/.test(a) && /cr[ií]tic/i.test(a));
    desviacion(alerta.length > 0, '4.1.3: al quedar en Crítica no se anuncia ninguna alerta en una región aria-live assertive; el badge cambia en silencio');
    expect.soft(foco, `4.1.3: el foco se pierde al calcular (queda en ${foco})`).not.toBe('body');
  });
});
