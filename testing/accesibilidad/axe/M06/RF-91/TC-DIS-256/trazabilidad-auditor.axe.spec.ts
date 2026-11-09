// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-256 RF-91: vista de trazabilidad de solo lectura (Auditor)  |
/**
 * TC-DIS-256 — Verificar accesibilidad WCAG 2.1 AA de la vista de trazabilidad de solo lectura para
 * el Auditor externo [CRÍTICO]
 * RF-91 · CU-010 · Rol: Auditor externo (AUDITOR) · Prioridad: Alta
 * Ruta: /finanzas/trazabilidad (período cerrado)
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 y 1.3.2 (misma estructura ordenada de la cadena que para
 * el Contador); 4.1.2 (sin controles de acción sin función —re-verificar, editar—); 3.3.1 y 4.1.3
 * (el acceso no permitido a períodos no cerrados se anuncia con role="alert" o aria-live); 2.1.1 y
 * 2.4.7.
 *
 * Ambiente: TEST no tiene una cuenta con rol AUDITOR. El paso a deja la precondición sin cumplir
 * (BLOQUEO del rol). El paso b evalúa con Admin lo que la vista ofrece en un período CERRADO con
 * asientos simulados (sin re-verificación, carácter de solo lectura). La restricción por rol a
 * períodos abiertos no se puede reproducir sin la cuenta ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_256_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, LINEAS, PERIODOS, abrirSesionRol, abrirYAuditarDialogo, cadena, cerrarConEscape, elegirPeriodo, irFinanzas, quitarSimulaciones, simularGet,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-256';
const VIEWPORTS = (process.env.TC_DIS_256_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['periodo-cerrado'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-256 — Trazabilidad de solo lectura para el Auditor externo', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_256_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Precondición: cuenta con rol Auditor externo', async ({}, testInfo) => {
    const hay = !!process.env.TEST_AUDITOR_EMAIL;
    anotar(testInfo, 'Cuentas en testing/.env.test', 'Admin, Productor, Veterinario; no hay TEST_AUDITOR_*');
    precondicion(hay, 'TEST no tiene una cuenta con rol AUDITOR: no se puede verificar la vista real del Auditor ni el mensaje de acceso no permitido a períodos abiertos (BLOQUEO)');
  });

  test('b. [1.3.1 / 4.1.2 / 2.1.1] Período cerrado: cadena navegable y sin acciones de re-verificación (Admin, Datos simulados)', async ({}, testInfo) => {
    const cerradas = LINEAS.map((l) => ({ ...l, id_periodo_contable: 9101, estado_trazabilidad: 'VERIFICADO' }));
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/lineas$/, cerradas);
    await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
    await simularGet(page, /^\/finanzas\/lineas\/\d+\/cadena$/, (u: URL) => ({ ...cadena(601), id_linea_asiento_nic41: Number(u.pathname.match(/lineas\/(\d+)/)![1]) }));
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026 CERRADO con 5 asientos verificados (IoT, manual, poblacional).');
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    await elegirPeriodo(page, 9101);
    await escanear(page, TC_ID, __dirname, 'periodo-cerrado', testInfo, LH);
    const acciones = await main(page).getByRole('button', { name: /Verificar|Editar|Modificar/i }).count();
    expect.soft(acciones, '4.1.2: en el período cerrado se ofrecen acciones de re-verificación o edición').toBe(0);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/solo lectura|solo consulta|no se puede modificar|cerrado/i.test(texto.replace(/Cerrado/g, '')),
      '4.1.2: la vista del período cerrado no comunica en texto su carácter de solo lectura');
    const ver = main(page).getByRole('button', { name: /cadena/i }).first();
    const d = await abrirYAuditarDialogo(page, ver);
    expect.soft(d.abierto, '2.1.1: la cadena no se abre con teclado').toBe(true);
    expect.soft(d.controlesSinFocoVisible, '2.4.7: controles sin foco visible').toEqual([]);
    anotar(testInfo, 'Cadena', d.texto.slice(0, 300));
    await cerrarConEscape(page, ver);
  });
});
