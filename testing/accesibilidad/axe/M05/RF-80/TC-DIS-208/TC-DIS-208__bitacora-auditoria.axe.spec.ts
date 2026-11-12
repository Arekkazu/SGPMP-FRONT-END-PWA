// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-208 RF-80: bitácora de auditoría de suministros             |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-208 RF-80: reejecución; cuenta solo los badges de resultado y el «Ver» con nombre propio |
/**
 * TC-DIS-208 — Accesibilidad WCAG 2.1 AA de la bitácora de Auditoría y Trazabilidad de Registros de
 * Suministros
 * RF-80 · CU-05 Auditar Operaciones del Módulo · Rol: Administrador o Contador · Prioridad: Alta
 * Suministros → Auditoría (/suministros/auditoria)
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (encabezados asociados a sus celdas); 1.4.1 (clasificación
 * NIC41/TECNICO y resultado EXITOSO/FALLIDO/PARCIAL/RECHAZADO/ADVERTENCIA no solo por color); 2.1.1 y
 * 2.4.7 (filtros por tipo de evento, actor, rango de fechas y entidad afectada, con teclado).
 *
 * Datos: bitácora REAL con Admin (57 mil eventos, NIC41 y TECNICO). Los resultados que no aparecen en
 * los eventos reales recientes (FALLIDO, PARCIAL, RECHAZADO, ADVERTENCIA) se simulan en el paso b.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, camposSinNombre, describirFoco, desviacion, escanear, irA, main } from '../../../_shared/sigabA11y';
import { badges, focoVisible, sesionDelCaso, simularGet, textosCrudos } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-208';
const LH = ['bitacora-real', 'resultados-simulados'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const evento = (id: number, resultado: string, clasificacion: string) => ({
  id_auditoria_suministro: id, entidad_afectada: 'registro_suministro', tipo_operacion: 'SUMINISTRO_REGISTRADO', id_usuario: 12, resultado, fecha_evento: '2026-11-05T10:00:00',
  id_activo_biologico: 7001, costo_afectado: '180000.00', clasificacion_registro: clasificacion,
});

test.describe('TC-DIS-208 — Bitácora de auditoría de suministros', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [1.3.1 / 2.1.1 / 2.4.7] Bitácora real: tabla, columnas y filtros con teclado', async ({}, testInfo) => {
    const { page } = s;
    await irA(page, 'suministros/auditoria', 'Auditoría de suministros');
    const tabla = main(page).getByRole('region', { name: 'Auditoría de suministros' }).locator('table');
    await tabla.waitFor({ timeout: 30_000 });
    await escanear(page, TC_ID, __dirname, 'bitacora-real', testInfo, LH);
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla real', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas · desalineadas: ${t.filasDesalineadas.length} · vacías: ${t.celdasVacias.length}`);
    expect.soft(t.filasDesalineadas, '1.3.1: filas desalineadas con los encabezados').toEqual([]);
    for (const [re, n] of [[/operaci/i, 'tipo de evento'], [/activo/i, 'activo'], [/resultado/i, 'resultado'], [/fecha/i, 'fecha y hora']] as const) {
      expect.soft(t.encabezados.some((e) => re.test(e)), `1.3.1: falta la columna ${n}`).toBe(true);
    }
    desviacion(t.encabezados.some((e) => /clasificaci/i.test(e)), '1.3.1/1.4.1: la tabla no tiene columna de clasificación; NIC-41 / Técnico no se ve en el listado (solo en el detalle del evento)');

    const form = main(page).getByRole('search');
    expect.soft(await camposSinNombre(form), '2.1.1: filtros sin nombre accesible').toEqual([]);
    const filtros = await form.locator('select, input').evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? c.id));
    anotar(testInfo, 'Filtros', filtros.join(' ¦ '));
    for (const [re, n] of [[/operaci/i, 'tipo de evento'], [/desde/i, 'fecha desde'], [/hasta/i, 'fecha hasta']] as const) {
      expect.soft(filtros.some((f) => re.test(f)), `2.1.1: falta el filtro ${n}`).toBe(true);
    }
    desviacion(filtros.some((f) => /actor|usuario/i.test(f)), '2.1.1: no hay filtro por actor');
    desviacion(filtros.some((f) => /entidad/i.test(f)), '2.1.1: no hay filtro por entidad afectada');

    await page.keyboard.press('Shift');
    await form.locator('#auditoria-operacion').focus();
    const recorrido: string[] = [];
    const sinFoco: string[] = [];
    for (let i = 0; i < 20; i++) {
      const f = await describirFoco(page);
      recorrido.push(f);
      if (!(await focoVisible(page))) sinFoco.push(f);
      if (/Buscar/.test(f)) break;
      await page.keyboard.press('Tab');
    }
    anotar(testInfo, 'Recorrido con Tab', [...new Set(recorrido)].join(' → '));
    expect.soft(recorrido.some((f) => /Buscar/.test(f)), '2.1.1: el recorrido con Tab no llega a "Buscar"').toBe(true);
    expect.soft([...new Set(sinFoco)], '2.4.7: controles sin foco visible').toEqual([]);

    // Filtrar con teclado sobre la bitácora real (solo lectura).
    await form.locator('#auditoria-clasificacion').selectOption('NIC41');
    const r = page.waitForResponse((x) => /clasificacion_registro=NIC41/.test(x.url()), { timeout: 30_000 });
    await form.getByRole('button', { name: 'Buscar', exact: true }).focus();
    await page.keyboard.press('Enter');
    const resp = await r;
    anotar(testInfo, 'Filtro NIC-41 con teclado', `HTTP ${resp.status()}`);
    expect.soft(resp.ok(), '2.1.1: filtrar por clasificación con teclado no funciona').toBe(true);
  });

  test('b. [1.4.1] Los 5 resultados y las 2 clasificaciones sin depender del color (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    const items = ['EXITOSO', 'FALLIDO', 'PARCIAL', 'RECHAZADO', 'ADVERTENCIA'].map((r, i) => evento(i + 1, r, i % 2 ? 'TECNICO' : 'NIC41'));
    await simularGet(page, /^\/suministros\/auditoria$/, { total: items.length, pagina: 1, registros_por_pagina: 50, items });
    await simularGet(page, /^\/suministros\/auditoria\/\d+$/, { ...items[0], retencion_aplicable: '5 años', hash_integridad: 'f'.repeat(64) });
    anotar(testInfo, 'Datos simulados', 'Un evento por cada resultado: EXITOSO, FALLIDO, PARCIAL, RECHAZADO, ADVERTENCIA.');
    await irA(page, 'suministros/auditoria', 'Auditoría de suministros');
    const tabla = main(page).getByRole('region', { name: 'Auditoría de suministros' }).locator('table');
    await tabla.waitFor({ timeout: 30_000 });
    await escanear(page, TC_ID, __dirname, 'resultados-simulados', testInfo, LH);
    const RESULTADOS = /^(Exitoso|Fallido|Parcial|Rechazado|Advertencia)$/;
    const b = (await badges(tabla)).filter((x) => RESULTADOS.test(x.texto));
    anotar(testInfo, 'Badges de resultado', b.map((x) => `${x.texto}${x.icono ? ' +ícono' : ' (sin ícono)'}`).join(' ¦ '));
    expect.soft(b.length, 'No aparecen los 5 resultados').toBe(5);
    expect.soft(b.every((x) => x.texto.length > 0), '1.4.1: un resultado no tiene texto').toBe(true);
    expect.soft(await textosCrudos(tabla), '1.4.1: un resultado se muestra como valor crudo').toEqual([]);

    await tabla.getByRole('button', { name: /^Ver/ }).first().focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByText('Clasificación').first().waitFor({ timeout: 10_000 }).catch(() => {});
    const clasificacion = (await dialogo.locator('dl > div').filter({ hasText: 'Clasificación' }).innerText().catch(() => '')).replace(/\s+/g, ' ');
    anotar(testInfo, 'Clasificación en el detalle', clasificacion || '(no aparece)');
    expect.soft(/NIC-?41|T[eé]cnico/i.test(clasificacion), '1.4.1: el detalle no comunica la clasificación en texto').toBe(true);
  });
});
