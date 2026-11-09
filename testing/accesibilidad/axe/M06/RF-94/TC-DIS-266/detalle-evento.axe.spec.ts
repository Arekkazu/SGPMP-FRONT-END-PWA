// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-266 RF-94: detalle de un evento de auditoría                |
/**
 * TC-DIS-266 — Verificar accesibilidad WCAG 2.1 AA del detalle de un evento de auditoría (datos
 * legibles, hash de integridad expandible y aviso de información truncada)
 * RF-94 · CU-013 · Rol: Auditor externo o Administrador · Prioridad: Media
 * Ruta: /finanzas/auditoria → fila del evento → detalle
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (datos del evento como lista de definiciones, no JSON
 * crudo); 4.1.2 (control del hash con aria-expanded y nombre; botón de copiar con nombre); 4.1.3
 * (confirmación de copia por aria-live); 1.3.1 (aviso de información truncada asociado al detalle);
 * 2.4.3 (al cerrar, el foco vuelve a la fila); 1.4.10 (el hash de 64 caracteres no fuerza scroll
 * horizontal a 320px).
 *
 * Ambiente: cuenta Admin. Los eventos (uno normal y uno con payload truncado de más de 64 KB) se
 * simulan porque los períodos reales no tienen eventos ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_266_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import { PERIODOS, abrirSesionRol, abrirYAuditarDialogo, irFinanzas, quitarSimulaciones, simularGet } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-266';
const VIEWPORTS = (process.env.TC_DIS_266_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['bitacora-detalle'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const evento = (k: number, truncado: boolean) => ({
  id_evento: `ev-${k}`, descripcion_evento: truncado ? 'Cierre del período completado' : 'Costo registrado', tipo_evento: truncado ? 'CIERRE_PERIODO_COMPLETADO' : 'COSTO_REGISTRADO',
  fecha_hora: '2026-11-30T10:15:00', actor: 'Sara González', activo: truncado ? null : 'BOV-101', id_periodo_contable: 9103,
  resumen_payload: truncado ? { truncado: true, tamano_original_kb: 92, activos_procesados: 1000 } : { monto: '180000.00', subtipo: 'Mano de obra', hash: 'a1'.repeat(32) },
  monto_afectado: truncado ? null : '180000.00', severidad: 'INFO', integridad_verificable: true,
});

test.describe('TC-DIS-266 — Detalle de un evento de auditoría', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_266_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 4.1.2 / 4.1.3 / 2.4.3 / 1.4.10] Abrir el detalle de un evento con teclado (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/auditoria$/, { total_registros: 2, pagina_actual: 1, registros_por_pagina: 25, eventos: [evento(1, false), evento(2, true)], resumen_severidad: { INFO: 2, WARNING: 0, ERROR: 0, CRITICAL: 0 } });
    anotar(testInfo, 'Datos simulados', 'Dos eventos de noviembre 2026: costo registrado (BOV-101) y cierre completado con payload truncado (92 KB).');
    await irFinanzas(page, 'auditoria', /Bitácora de auditoría/);
    const tabla = main(page).getByRole('region', { name: /Explorar/i }).locator('table');
    await tabla.waitFor({ timeout: 15_000 });
    await escanear(page, TC_ID, __dirname, 'bitacora-detalle', testInfo, LH);
    const fila = tabla.locator('tbody tr').first();
    const disparador = fila.locator('button, a, [tabindex="0"]').first();
    const hayDisparador = (await disparador.count()) > 0 || (await fila.getAttribute('tabindex')) !== null;
    anotar(testInfo, 'Fila del evento', `${(await fila.innerText()).replace(/\s+/g, ' ')} · control para abrir el detalle: ${hayDisparador ? 'sí' : 'no'}`);
    desviacion(hayDisparador, '1.3.1/4.1.2: la bitácora no tiene detalle de evento: ninguna fila se puede abrir (no hay datos legibles del evento, hash expandible, copia del hash ni aviso de información truncada)');
    if (hayDisparador) {
      const d = await abrirYAuditarDialogo(page, (await disparador.count()) ? disparador : fila);
      anotar(testInfo, 'Detalle', d.abierto ? d.texto.slice(0, 400) : 'no abre');
    }
    const hash = await main(page).getByText(/hash|huella|integridad/i).count();
    anotar(testInfo, 'Integridad en la tabla', `${hash} referencia(s); la columna solo dice "Íntegro" / "Sin hash"`);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect.soft(ancho, '1.4.10: la bitácora produce scroll horizontal de la página').toBe(false);
  });
});
