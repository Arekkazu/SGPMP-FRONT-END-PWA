// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-258 RF-92: aprobación y rechazo del informe, compromisos    |
/**
 * TC-DIS-258 — Verificar accesibilidad WCAG 2.1 AA del flujo de aprobación y rechazo del informe, de
 * la alerta de consistencia y del ingreso manual de compromisos y activos pignorados
 * RF-92 · CU-011 · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/revelaciones → "Generar informe" / "Aprobar" / "Rechazar"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (campos repetibles con label por fila; botones
 * Agregar/Quitar identifican su fila); 4.1.3 (alerta de consistencia con role="alert"); 3.3.1
 * (justificación y razón de rechazo obligatorias validadas bajo el campo con role="alert"); 4.1.2,
 * 2.1.2 y 2.4.3 (diálogos de aprobación y rechazo: versión aprobada inmutable, anterior pasa a
 * Archivado, foco atrapado y devuelto); 3.3.4 (la aprobación exige confirmación explícita).
 *
 * Ambiente: sin cuenta de Contador ni permiso de Admin sobre Revelaciones. Permiso visual simulado
 * (revelaciones_nic41·C/R/U), período cerrado e historial simulados. Generar, aprobar y rechazar se
 * interceptan: ningún informe se genera ni se resuelve ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_258_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, abrirYAuditarDialogo, cerrarConEscape, elegirPeriodo, errorApi, irFinanzas, quitarSimulaciones, simularEscritura, simularRevelaciones,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-258';
const VIEWPORTS = (process.env.TC_DIS_258_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['generar-informe', 'rechazo'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-258 — Aprobación y rechazo del informe de revelaciones', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_258_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 3.3.2 / 4.1.3] Generar: compromisos y pignorados por teclado, declaración sin novedad y alerta de consistencia (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    await simularEscritura(page, /\/periodos\/\d+\/revelaciones$/, 422, errorApi('ERROR_CONSISTENCIA', 'El valor de cierre de BOV-101 en la conciliación difiere del comprobante en $ 5.000. Justifica la diferencia para continuar.', 'justificacion_inconsistencias'));
    anotar(testInfo, 'Datos simulados', 'Permiso revelaciones_nic41·C/R/U; septiembre 2026 CERRADO; POST /revelaciones responde 422 ERROR_CONSISTENCIA (FA-2).');
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    const generar = page.getByRole('button', { name: /Nueva versión|Generar/i }).first();
    await generar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    for (const nombre of [/Agregar compromiso/i, /Agregar activo|pignorad/i]) {
      const agregar = dialogo.getByRole('button', { name: nombre });
      await agregar.focus(); await page.keyboard.press('Enter');
      await agregar.focus(); await page.keyboard.press('Enter');
    }
    await escanear(page, TC_ID, __dirname, 'generar-informe', testInfo, LH);
    const etiquetas = await dialogo.locator('input, select').evaluateAll((cs) => cs.map((c) => `${c.id}: ${(c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''}`));
    anotar(testInfo, 'Campos repetibles', etiquetas.join(' ¦ '));
    const porFila = etiquetas.filter((e) => /^r[cp]-/.test(e)).map((e) => e.split(': ')[1]);
    desviacion(new Set(porFila).size === porFila.length, '1.3.1/3.3.2: las filas repetidas comparten la misma etiqueta ("Descripción", "Contraparte"…); ninguna indica a qué compromiso o activo pignorado pertenece');
    const quitar = await dialogo.getByRole('button', { name: /Quitar/i }).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? ''));
    anotar(testInfo, 'Botones Quitar', quitar.join(' ¦ '));
    desviacion(new Set(quitar).size === quitar.length, `1.3.1: los botones "Quitar" no identifican su fila (${[...new Set(quitar)].join(', ')})`);

    // Quitar filas y probar la declaración sin novedad.
    while (await dialogo.getByRole('button', { name: /Quitar/i }).count()) await dialogo.getByRole('button', { name: /Quitar/i }).first().click();
    await dialogo.getByRole('checkbox').check();
    await dialogo.getByRole('button', { name: /Generar borrador/i }).click();
    await page.waitForTimeout(800);
    const alerta = dialogo.locator('[role="alert"]').filter({ hasText: /difiere/i });
    await expect.soft(alerta, '4.1.3: la alerta de consistencia no se anuncia con role="alert"').toBeVisible();
    const bajoCampo = await dialogo.locator('#rev-justificacion-err').count();
    desviacion(bajoCampo > 0, '3.3.1: la justificación obligatoria de la inconsistencia no se valida debajo del campo (solo en la alerta global)');
  });

  test('b. [3.3.4 / 4.1.2] Aprobación del borrador: confirmación explícita de acción irreversible (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    const resoluciones = await simularEscritura(page, /\/revelaciones\/\d+\/resolucion$/, 200, { ok: true });
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    const aprobar = main(page).getByRole('button', { name: /^Aprobar/ });
    await expect(aprobar, 'El borrador no ofrece "Aprobar"').toBeVisible();
    const d = await abrirYAuditarDialogo(page, aprobar);
    anotar(testInfo, 'Aprobar', d.abierto ? `abre diálogo: ${d.texto.slice(0, 300)}` : `no abre diálogo; resoluciones enviadas: ${resoluciones.length}`);
    desviacion(d.abierto, '3.3.4: "Aprobar" resuelve el informe al instante, sin diálogo de confirmación de acción irreversible');
    if (d.abierto) {
      desviacion(/inmutable|no se puede modificar/i.test(d.texto) && /archivad/i.test(d.texto), '4.1.2: el diálogo no dice que la versión aprobada es inmutable y que la anterior pasa a Archivado');
      await cerrarConEscape(page, aprobar);
    }
  });

  test('c. [3.3.1 / 2.1.2 / 2.4.3] Rechazo del borrador con razón obligatoria (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    const resoluciones = await simularEscritura(page, /\/revelaciones\/\d+\/resolucion$/, 200, { ok: true });
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    const rechazar = main(page).getByRole('button', { name: /^Rechazar/ });
    const d = await abrirYAuditarDialogo(page, rechazar);
    expect(d.abierto, 'El rechazo no abre un diálogo').toBe(true);
    await escanear(page, TC_ID, __dirname, 'rechazo', testInfo, LH);
    anotar(testInfo, 'Diálogo de rechazo', `nombre="${d.nombre}" · foco inicial: ${d.focoInicial} · ${d.texto.slice(0, 250)}`);
    expect.soft(d.focoSaleDelDialogo, '2.1.2: el foco sale del diálogo').toBe(false);
    desviacion(/cancelar/i.test(d.focoInicial), `2.4.3: el foco inicial no queda en la acción segura (queda en ${d.focoInicial})`);
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('button', { name: /^Rechazar/ }).click();
    await expect.soft(dialogo.locator('.ds-field__error[role="alert"]'), '3.3.1: rechazar sin razón no muestra el error debajo del campo').toBeVisible();
    expect.soft(resoluciones.length, 'Se envió un rechazo sin razón').toBe(0);
    const esc = await cerrarConEscape(page, rechazar);
    expect.soft(esc.focoEnDisparador, `2.4.3: al cerrar, el foco no vuelve a "Rechazar" (${esc.foco})`).toBe(true);
  });
});
