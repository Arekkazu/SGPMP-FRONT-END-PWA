// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-256 RF-91: vista de trazabilidad de solo lectura (Auditor)  |
// | 2026-11-12 | Laura032005 | TC-DIS-256 RF-91: cuenta real de Auditor externo disponible (TEST_AUDITOR_*); paso a reescrito con login y navegación reales |
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
 * Ambiente: ya existe una cuenta real con rol AUDITOR (TEST_AUDITOR_*). Confirmado por diagnóstico
 * directo (2026-11-12): con esa cuenta, Trazabilidad contable (/finanzas/trazabilidad) responde
 * "No tienes acceso a esta sección — Tu rol no tiene permiso para ver «Líneas de asiento del
 * período»" para TODOS los Titulares y períodos probados (abiertos, en cierre y cerrados por
 * igual) — es un hueco de permisos (RBAC) del rol AUDITOR sobre `lineas_asiento_nic41` en este
 * ambiente, no una restricción condicionada al estado del período como describe RF-91, y no una
 * falta de datos. El paso a verifica esa denegación real (sí es accesible: role="status", nombra
 * el recurso). El escenario positivo (Auditor leyendo un período CERRADO) no se puede ejercer con
 * esta cuenta en este ambiente; el paso b lo cubre con Admin y datos simulados, como respaldo de
 * la mecánica de la UI (cadena navegable, sin acciones de re-verificación).
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
const LH = ['acceso-real-auditor', 'periodo-cerrado'];

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

  test('a. [3.3.1 / 4.1.3] Acceso real del Auditor externo a Trazabilidad contable (cuenta real TEST_AUDITOR_*)', async ({ browser }, testInfo) => {
    const { contexto: ctxAuditor, page: pageAuditor } = await abrirSesionRol(browser, testInfo, 'auditor');
    await irFinanzas(pageAuditor, 'trazabilidad', /Trazabilidad contable/);
    // El primer acceso del Auditor dispara un toast "Permisos actualizados...recargará
    // automáticamente"; esa recarga debe terminar antes de leer el estado real de la vista.
    await pageAuditor.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await pageAuditor.waitForTimeout(1_500);
    // "acceso" solo no basta: el toast anterior también es role="status" y contiene esa palabra
    // ("...reflejar los nuevos accesos"). Se filtra por la frase exacta de la denegación real.
    const estado = main(pageAuditor).locator('[role="status"], [role="alert"]').filter({ hasText: /no tienes acceso/i });
    const hayDenegacion = await estado.count() > 0;
    const texto = hayDenegacion ? await estado.first().innerText() : '(sin mensaje de denegación: el Auditor pudo ver la vista)';
    anotar(testInfo, 'Respuesta real de Trazabilidad para el Auditor', texto);
    if (hayDenegacion) {
      await expect.soft(estado.first(), '4.1.3: la denegación debe estar en una región que el lector anuncie').toHaveAttribute('role', /status|alert/);
      expect.soft(texto, '3.3.1: debe nombrar el recurso al que no tiene acceso, no un mensaje genérico').toMatch(/líneas de asiento|trazabilidad/i);
      anotar(testInfo, 'Alcance', 'Confirmado con un diagnóstico directo sobre todos los Titulares del ambiente: el rol AUDITOR no tiene permiso de lectura sobre líneas_asiento_nic41 para NINGÚN período (abierto, en cierre o cerrado) — es un hueco de permisos (RBAC) de este ambiente, no una restricción condicionada al estado del período como describe RF-91, y no fue posible sembrarlo porque no depende de datos sino de la configuración de permisos del rol. El escenario positivo (Auditor leyendo un período cerrado) se cubre en el paso b con Admin y datos simulados.');
      await escanear(pageAuditor, TC_ID, __dirname, 'acceso-real-auditor', testInfo, LH);
    } else {
      // Si en algún momento se habilita el permiso, el Auditor debería ver la cadena sin acciones de edición.
      const acciones = await main(pageAuditor).getByRole('button', { name: /Verificar|Editar|Modificar/i }).count();
      expect.soft(acciones, '4.1.2: el Auditor no debe ver acciones de re-verificación o edición').toBe(0);
      await escanear(pageAuditor, TC_ID, __dirname, 'acceso-real-auditor', testInfo, LH);
    }
    await ctxAuditor.close();
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
