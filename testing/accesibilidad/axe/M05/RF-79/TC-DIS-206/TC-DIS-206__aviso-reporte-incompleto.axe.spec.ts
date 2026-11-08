// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-206 RF-79: aviso de reporte potencialmente incompleto       |
/**
 * TC-DIS-206 — Accesibilidad WCAG 2.1 AA del aviso de reporte potencialmente incompleto en la Provisión
 * de Costos NIC 41
 * RF-79 · CU-04 Acumular Inversión y Proveer Costos a M06 · Rol: Contador o Revisor Fiscal · Prioridad: Alta
 * Suministros → Costos del ciclo → Provisión NIC-41 → Ver
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (ícono/badge y etiqueta textual, no solo color); 4.1.2
 * (name/role/value del aviso, incluido su detalle de causa: registros problemáticos o discrepancia).
 *
 * Ambiente: TEST no tiene cuenta de Contador ni de Revisor Fiscal; se usa Admin (consulta y ejecuta
 * la provisión). Ningún activo de TEST tiene ciclo con reporte consolidado: ciclo y versiones se
 * simulan ("Datos simulados").
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear } from '../../../_shared/sigabA11y';
import { abrirProvision, provision, sesionDelCaso } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-206';
const LH = ['listado-incompleto', 'detalle-incompleto'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-206 — Aviso de reporte potencialmente incompleto', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [1.4.1 / 4.1.2] Aviso en la lista de versiones y en el detalle (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    await abrirProvision(page, [provision(811, 1, { es_reporte_potencialmente_incompleto: true })]);
    anotar(testInfo, 'Datos simulados', 'Ciclo cerrado #901 del activo BOV-101 con el reporte v1 marcado como potencialmente incompleto.');
    await escanear(page, TC_ID, __dirname, 'listado-incompleto', testInfo, LH);

    const panel = page.locator('section[aria-labelledby="nic41-titulo"]');
    const celda = panel.locator('table tbody td').filter({ hasText: 'Potencialmente incompleto' });
    await expect.soft(celda, '1.4.1: la lista no dice en texto que el reporte está incompleto').toBeVisible();
    const aviso = await celda.evaluate((td) => {
      const d = [...td.querySelectorAll('div')].find((x) => /incompleto/.test(x.textContent ?? '')) as HTMLElement | undefined;
      return { etiqueta: d?.textContent?.trim() ?? '', icono: !!d?.querySelector('svg'), badge: !!d?.closest('.ds-badge') || !!d?.querySelector('.ds-badge'), rol: d?.getAttribute('role') ?? null };
    });
    anotar(testInfo, 'Aviso en la lista', JSON.stringify(aviso));
    desviacion(aviso.icono || aviso.badge, '1.4.1: en la lista de versiones el aviso es solo texto, sin ícono ni badge');

    await panel.getByRole('button', { name: 'Ver', exact: true }).focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    const alerta = dialogo.locator('[role="alert"]').filter({ hasText: 'Potencialmente incompleto' });
    await expect.soft(alerta, '4.1.2: el detalle no expone el aviso con role="alert"').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'detalle-incompleto', testInfo, LH);
    const texto = (await alerta.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const conIcono = await alerta.locator('svg').count();
    anotar(testInfo, 'Aviso en el detalle', `${texto} · íconos: ${conIcono}`);
    expect.soft(conIcono, '1.4.1: el aviso del detalle no lleva ícono').toBeGreaterThan(0);
    desviacion(/\$\s?[\d.]+|registro\s+\S*\d|r-1/i.test(texto),
      '4.1.2: el aviso no da el detalle de la causa: dice en general que puede haber una discrepancia o provisiones sin entregar, sin listar los registros problemáticos ni el valor de la discrepancia');
  });
});
