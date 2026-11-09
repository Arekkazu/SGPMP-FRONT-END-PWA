// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-198 RF-74: aria-live en la alerta automática de CA Crítica  |
/**
 * TC-DIS-198 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de aria-live en la alerta automática de CA Crítica
 * RF-74 · CU-02 · Rol: Productor o Veterinario
 * Suministros → Eficiencia (ICA) → "Calcular ahora"
 *
 * Criterio: verificación de 4.1.3: la alerta generada cuando clasificacion_ca=CRITICA está en una
 * región aria-live (assertive, urgencia ALTA) y se anuncia sin mover el foco; 0 violaciones axe A/AA.
 *
 * Datos: el cálculo manual deja un resultado que no se borra y ningún activo de TEST tiene datos para
 * dar CA > 5,0: el POST /calcular se responde en la prueba con CRITICA ("Datos simulados"). La
 * notificación que el backend enviaría a la campana no se puede simular desde este flujo: se revisa
 * lo que la pantalla anuncia tras el cálculo.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, describirFoco, desviacion, escanear, irA, main } from '../../../_shared/sigabA11y';
import { anunciosDurante, consultarIca, resultadoIca, sesionDelCaso, simularActivos, simularEscritura, simularIca } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-198';
const LH = ['tras-calculo-critico'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-198 — Alerta automática de CA Crítica', () => {
  const s = sesionDelCaso(TC_ID, 'PRODUCTOR');

  test('a. [4.1.3] Cálculo manual con resultado CRITICA: anuncio sin mover el foco (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    let calculado = false;
    const critico = resultadoIca({ clasificacion_ca: 'CRITICA', ca_calculado: '5.60', tipo_calculo: 'MANUAL' });
    await simularActivos(page);
    await simularIca(page, () => (calculado ? critico : resultadoIca({ clasificacion_ca: 'ACEPTABLE', ca_calculado: '3.10' })), []);
    const posts = await simularEscritura(page, /\/eficiencia-alimenticia\/calcular$/, () => { calculado = true; return { status: 200, json: critico }; }, 800);
    anotar(testInfo, 'Datos simulados', 'BOV-101 pasa de Aceptable a Crítica (CA 5,60) al responder POST /calcular.');
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');
    await consultarIca(page, 7001);

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
