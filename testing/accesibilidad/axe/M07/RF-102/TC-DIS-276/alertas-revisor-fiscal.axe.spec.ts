// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-276 RF-102: alerta de registro alterado y vista restringida del Revisor Fiscal |
/**
 * TC-DIS-276 — Verificar accesibilidad WCAG 2.1 AA de las alertas de fallo de integridad o de
 * persistencia y de la vista restringida del Auditor externo
 * RF-102 · CU-07 Gestionar auditoría y trazabilidad del módulo de integración · Rol: Administrador y Revisor Fiscal · Prioridad: Media
 * Ruta: /integracion/auditoria
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.3 (alerta anunciada); 1.4.1 (severidad con texto, no solo
 * color); 1.4.3; 3.3.1 (mensaje de acceso restringido claro); 2.1.1. El Revisor Fiscal no puede
 * exportar ni ver la IP de origen ni los motivos de rechazo de credenciales; solo ve períodos cerrados.
 *
 * PENDIENTE (líder): RF-102 se contradice sobre si el Revisor Fiscal ve "Contrato activado" de períodos
 * cerrados (§11.4) o ningún evento de contratos (§4.3). Este spec solo anota qué tipos de evento le
 * ofrece el filtro; no lo juzga hasta que se decida.
 *
 * Datos: registro alterado de Datos_Semilla §5.2 (lo inserta desarrollo; la tabla es de solo inserción).
 * Revisor Fiscal real: TEST_REVISOR_FISCAL, con lectura sobre auditoria_integracion_cierres. Las
 * respuestas 403 se simulan ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_276_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { PREFIJO_API, anotar, desviacion, escanear, estaEnRegionViva, main, precondicion, textosColumna } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, accesoDenegado, alertas, errorApi, irIntegracion, quitarSimulaciones, simularAuditoria,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-276';
const VIEWPORTS = (process.env.TC_DIS_276_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['alerta-alterado', 'revisor-real', 'revisor-restringido'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-276 — Alerta de registro alterado y vista del Revisor Fiscal', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_276_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [4.1.3 / 1.4.1] Administrador: el registro alterado genera una alerta anunciada con severidad en texto', async ({}, testInfo) => {
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const alterados = (await textosColumna(main(page).locator('table').first(), 'Integridad')).filter((x) => /Alterado/.test(x)).length;
    precondicion(alterados > 0, 'no hay ningún registro alterado en TEST (Datos_Semilla §5.2): se evalúa con datos simulados');
    if (!alterados) {
      await simularAuditoria(page);
      anotar(testInfo, 'Datos simulados', 'Primer evento del 2026-11-10 marcado como alterado.');
      await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    }
    await escanear(page, TC_ID, __dirname, 'alerta-alterado', testInfo, LH);
    const avisos = await alertas(page.locator('body'));
    anotar(testInfo, 'Avisos con un registro alterado', avisos.join(' ¦ ') || '(ninguno)');
    desviacion(avisos.some((a) => /alterad|integridad|cr[ií]tic/i.test(a)), '4.1.3: un registro alterado no genera ninguna alerta anunciada (role="alert"); solo cambia el badge de la fila a "Alterado"');
    desviacion(avisos.some((a) => /cr[ií]tic/i.test(a)), '1.4.1: la severidad crítica no se dice en texto');
    const enlace = await main(page).getByRole('link', { name: /evento|ver/i }).count();
    desviacion(enlace > 0, '2.1.1: la alerta no tiene acción ni enlace hacia el evento alterado');
  });

  test('b. [2.1.1 / 1.4.3] Revisor Fiscal real: sin exportar, sin IP de origen ni motivos de rechazo', async ({ browser }, testInfo) => {
    const s = await abrirSesionM07(browser, testInfo, 'revisor');
    try {
      await irIntegracion(s.page, 'auditoria');
      const denegado = await accesoDenegado(s.page).isVisible();
      precondicion(!denegado, 'el Revisor Fiscal de TEST no tiene lectura sobre auditoria_integracion_cierres');
      await escanear(s.page, TC_ID, __dirname, 'revisor-real', testInfo, LH);
      if (denegado) return;
      const exportar = await main(s.page).getByRole('button', { name: /^(CSV|JSON)$/ }).count();
      const texto = await main(s.page).innerText();
      const tipos = await main(s.page).getByLabel('Evento').locator('option').allInnerTexts();
      anotar(testInfo, 'Tipos de evento que ofrece el filtro al Revisor', tipos.join(' | '));
      expect.soft(exportar, 'El Revisor Fiscal puede exportar (RF-102 lo prohíbe)').toBe(0);
      expect.soft(/Desde \d{1,3}(\.\d{1,3}){3}/.test(texto), 'El Revisor Fiscal ve la IP de origen').toBe(false);
      expect.soft(/Cliente suspendido|credencial/i.test(texto), 'El Revisor Fiscal ve motivos de rechazo de credenciales').toBe(false);
      expect.soft(await main(s.page).getByLabel('Respuesta').count(), 'El Revisor Fiscal tiene el filtro de respuesta HTTP').toBe(0);
    } finally {
      await s.contexto.close();
    }
  });

  test('c. [3.3.1 / 4.1.3] Revisor Fiscal: período abierto o eventos restringidos responden 403 en texto claro (Datos simulados)', async ({ browser }, testInfo) => {
    const s = await abrirSesionM07(browser, testInfo, 'revisor');
    try {
      await s.page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/integracion\/auditoria\/?$/.test(u.pathname.replace(PREFIJO_API, '')), (route) =>
        route.fulfill({ status: 403, contentType: 'application/json', json: errorApi('ACCESO_AUDITORIA_DENEGADO', 'Solo puede consultar eventos de períodos contables cerrados.') }));
      anotar(testInfo, 'Datos simulados', 'La consulta responde 403 como lo haría para un período abierto o un evento de clientes externos.');
      await irIntegracion(s.page, 'auditoria');
      await s.page.waitForTimeout(800);
      await escanear(s.page, TC_ID, __dirname, 'revisor-restringido', testInfo, LH);
      const avisos = await alertas(main(s.page));
      anotar(testInfo, 'Aviso de acceso restringido', avisos.join(' ¦ ') || '(ninguno)');
      expect.soft(avisos.length, '4.1.3: el acceso restringido no se anuncia').toBeGreaterThan(0);
      expect.soft(avisos.join(' '), 'regla de textos visibles: el aviso muestra el código interno o el HTTP').not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b403\b/);
      desviacion(/cerrad/i.test(avisos.join(' ')), '3.3.1: el aviso no explica que solo se pueden consultar períodos cerrados');
      if (avisos.length) expect.soft(await estaEnRegionViva(main(s.page).locator('[role="alert"]').first()), '4.1.3: el aviso no está en una región viva').toBe(true);
    } finally {
      await s.contexto.close();
    }
  });
});
