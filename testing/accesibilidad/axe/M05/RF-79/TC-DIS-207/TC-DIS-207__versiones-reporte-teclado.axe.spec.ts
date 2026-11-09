// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-207 RF-79: teclado en el reporte consolidado y sus versiones |
/**
 * TC-DIS-207 — Accesibilidad WCAG 2.1 AA de la navegación por teclado del reporte consolidado y su
 * historial de versiones
 * RF-79 · CU-04 · Rol: Contador o Revisor Fiscal · Prioridad: Media
 * Suministros → Costos del ciclo → Provisión NIC-41
 *
 * Criterio: 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (selector de versión y navegación al reporte
 * anterior por teclado, con foco visible); 1.3.1 (relación programática entre version_reporte,
 * id_reporte_anterior y motivo_correccion). Notas: hash_integridad legible como texto, no truncado.
 *
 * Ambiente: sin cuenta de Contador ni de Revisor Fiscal; se usa Admin. El reporte v2 (con reporte
 * anterior y motivo) y el v1 se simulan: en TEST no hay reportes consolidados ("Datos simulados").
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, describirFoco, desviacion, escanear } from '../../../_shared/sigabA11y';
import { abrirProvision, focoVisible, provision, sesionDelCaso } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-207';
const LH = ['versiones', 'detalle-v2'];
const MOTIVO = 'Se incluyó una entrega de alimento registrada después del primer consolidado.';
const HASH = 'a1b2c3d4'.repeat(8);

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-207 — Teclado en el reporte consolidado y sus versiones', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [2.1.1 / 2.4.7 / 1.3.1] Versiones, reporte anterior, motivo y huella con teclado (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    await abrirProvision(page, [
      provision(812, 2, { id_reporte_anterior: 811, motivo_correccion: MOTIVO, monto_provision: '1050000.00' }),
      provision(811, 1, { estado: 'REEMPLAZADO' }),
    ]);
    anotar(testInfo, 'Datos simulados', 'Ciclo cerrado #901: v2 (anterior #811, con motivo) y v1 (reemplazada).');
    await escanear(page, TC_ID, __dirname, 'versiones', testInfo, LH);
    const panel = page.locator('section[aria-labelledby="nic41-titulo"]');
    const tabla = panel.getByRole('region', { name: 'Versiones del reporte' }).locator('table');
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla de versiones', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas`);
    expect.soft(t.filasDesalineadas, '1.3.1: filas desalineadas con los encabezados').toEqual([]);

    const selectorVersion = await panel.getByRole('combobox', { name: /versi[oó]n/i }).count();
    const enlacesAnterior = await panel.getByRole('link', { name: /anterior/i }).or(panel.getByRole('button', { name: /anterior/i })).count();
    anotar(testInfo, 'Controles de versión', `selector de versión: ${selectorVersion} · acceso al reporte anterior: ${enlacesAnterior}`);
    desviacion(selectorVersion > 0, '2.1.1: no hay selector de versión; cada versión se abre con un botón "Ver" de su fila');
    desviacion(enlacesAnterior > 0, '2.1.1: no hay un control para ir al reporte anterior desde una versión corregida');

    // Teclado: ciclo → región → botones de la tabla.
    const select = panel.locator('#nic41-ciclo');
    await page.keyboard.press('Shift');
    await select.focus();
    expect.soft(await focoVisible(page), '2.4.7: el selector de ciclo no muestra foco visible').toBe(true);
    const ver = tabla.getByRole('button', { name: 'Ver', exact: true });
    const sinFoco: string[] = [];
    await tabla.locator('..').focus().catch(() => {});
    for (let i = 0; i < (await ver.count()); i++) {
      await ver.nth(i).focus();
      if (!(await focoVisible(page))) sinFoco.push(`Ver fila ${i + 1}`);
    }
    expect.soft(sinFoco, '2.4.7: botones sin foco visible').toEqual([]);

    // Detalle de la v2.
    const disparador = ver.first();
    await disparador.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByText(MOTIVO).first().waitFor({ timeout: 10_000 }).catch(() => {});
    await escanear(page, TC_ID, __dirname, 'detalle-v2', testInfo, LH);
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Detalle v2', texto.slice(0, 500));
    expect.soft(texto.includes(MOTIVO), '1.3.1: el detalle no muestra el motivo de la corrección').toBe(true);
    desviacion(/811|v1\b|versi[oó]n 1|reporte anterior/i.test(texto), '1.3.1: el detalle de la v2 no indica cuál es su reporte anterior (id_reporte_anterior no aparece en pantalla)');
    expect.soft(texto.includes(HASH), 'Notas: la huella de integridad no se muestra completa como texto').toBe(true);
    const cabecera = await dialogo.locator('table').first().locator('thead th').count();
    anotar(testInfo, 'Tabla "Desglose por tipo"', `${cabecera} encabezados de columna`);
    await page.keyboard.press('Escape');
    await dialogo.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(200);
    const vuelve = await disparador.evaluate((e) => document.activeElement === e);
    anotar(testInfo, 'Foco al cerrar', await describirFoco(page));
    expect.soft(vuelve, '2.1.1: al cerrar el detalle el foco no vuelve a "Ver"').toBe(true);
  });
});
