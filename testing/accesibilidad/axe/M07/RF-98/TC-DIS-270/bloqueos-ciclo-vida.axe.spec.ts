// | Fecha      | Nombre      | Que se hizo                                                                  |
// |------------|-------------|------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-270 RF-98: límite de versiones, activación bloqueada, estado inconsistente y permiso |
/**
 * TC-DIS-270 — Verificar accesibilidad WCAG 2.1 AA de los bloqueos y alertas del ciclo de vida del
 * contrato (límite de versiones, activación bloqueada, transiciones no permitidas y estado inconsistente)
 * RF-98 · CU-04 Gestionar versiones del contrato de integración · Rol: Administrador y Productor · Prioridad: Media
 * Ruta: /integracion/contrato
 *
 * Criterio: 0 violaciones axe A/AA en 3.3.1 y 4.1.3 (límite —con la versión a retirar—, activación
 * bloqueada con su motivo, alerta crítica de estado inconsistente y aviso de permiso anunciados sin mover
 * el foco); 1.4.1 (alerta crítica y activación bloqueada con ícono y texto); 4.1.2 (sin botones de
 * modificar o reactivar en versiones activas, en retiro o retiradas; si se muestran deshabilitados, con su
 * motivo por aria-describedby); 3.3.3 (cada mensaje dice qué hacer); sin enums ni códigos crudos.
 *
 * Datos: escenario A (§3.2): 2.0 en retiro + 3.0 activa = límite; 4.0 cumple pero supera el límite;
 * 5.0 con vigencia alcanzada y anexo en Borrador (en TEST un anexo En revisión ya no bloquea, RFC-030).
 * El estado inconsistente no se puede crear desde la aplicación (RF-98 5.6) y se simula. Los rechazos
 * del backend se simulan; ninguna escritura llega al backend ("Datos simulados").
 * Usuario sin rol Administrador: la cuenta real del Productor (TEST_PRODUCTOR).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_270_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main } from '../../../_shared/sigabA11y';
import {
  CONTRATOS_INCONSISTENTES, abrirSesionM07, accesoDenegado, alertas, anunciosDurante, errorApi, fila, irIntegracion,
  quitarSimulaciones, simularContrato, simularEscritura, textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-270';
const VIEWPORTS = (process.env.TC_DIS_270_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['limite-versiones', 'estado-inconsistente', 'sin-permiso'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-270 — Bloqueos y alertas del ciclo de vida del contrato', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_270_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  const versiones = () => main(page).getByRole('region', { name: /Versiones del contrato/i });

  test('a. [3.3.1 / 4.1.3 / 3.3.3] Límite de dos versiones vigentes al activar la 4.0 (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    await simularEscritura(page, /^\/integracion\/contratos\/\d+\/activar$/, 409,
      errorApi('LIMITE_VERSIONES_VIGENTES', 'Ya hay dos versiones vigentes (2.0 y 3.0). Retire la versión 2.0 antes de activar otra.'));
    anotar(testInfo, 'Datos simulados', 'Escenario A; activar 4.0 responde 409 con el límite de versiones.');
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const boton = fila(versiones(), /^\s*4\.0/).getByRole('button', { name: /Activar/i });
    await boton.focus();
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'limite-versiones', testInfo, LH);
    const avisos = await alertas(main(page));
    const focoEnBoton = await boton.evaluate((b) => document.activeElement === b).catch(() => false);
    anotar(testInfo, 'Límite', `anuncios: ${vistos.join(' ¦ ') || '(ninguno)'} · avisos: ${avisos.join(' ¦ ')} · foco en "Activar": ${focoEnBoton}`);
    expect.soft(vistos.some((a) => /dos versiones|l[ií]mite/i.test(a)), '4.1.3: el límite de versiones no se anuncia').toBe(true);
    expect.soft(/2\.0/.test(avisos.join(' ')), '3.3.3: el mensaje no dice qué versión hay que retirar primero').toBe(true);
    desviacion(focoEnBoton, '4.1.3: el anuncio del límite mueve el foco fuera del botón "Activar"');
  });

  test('b. [3.3.1 / 1.4.1] Activación bloqueada de la 5.0: el motivo se lee junto a la versión (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const f = fila(versiones(), /^\s*5\.0/);
    const texto = (await f.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Fila 5.0 (anexo en Borrador, vigencia alcanzada)', texto);
    desviacion(/bloquead|no se puede activar|anexo.*(borrador|aprob)/i.test(texto), '3.3.1 / 1.4.1: la versión 5.0 no dice en texto por qué no se puede activar (el anexo está en Borrador); solo muestra "Pendiente" y el botón "Activar"');
    const activar = await f.getByRole('button', { name: /Activar/i }).count();
    if (activar) {
      const descr = await f.getByRole('button', { name: /Activar/i }).getAttribute('aria-describedby');
      desviacion(!!descr, '4.1.2: "Activar" de una versión que no puede activarse no está deshabilitado ni lleva su motivo por aria-describedby');
    }
  });

  test('c. [4.1.2] Versiones activa, en retiro y retirada sin acciones de modificar ni reactivar (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page);
    await irIntegracion(page, 'contrato', /Contrato contable/);
    for (const [v, nombre] of [['1.0', 'Retirada'], ['2.0', 'En retiro'], ['3.0', 'Activa']] as const) {
      const botones = await fila(versiones(), new RegExp(`^\\s*${v.replace('.', '\\.')}`)).getByRole('button').allInnerTexts();
      anotar(testInfo, `Botones de ${v} (${nombre})`, botones.join(' | ') || '(ninguno)');
      expect.soft(botones.some((b) => /modificar|editar|reactivar/i.test(b)), `4.1.2: la versión ${v} (${nombre}) ofrece modificar o reactivar`).toBe(false);
    }
    const retirada = (await fila(versiones(), /^\s*1\.0/).innerText()).replace(/\s+/g, ' ');
    desviacion(/no se puede reactivar|definitiv|ya no est[aá] disponible/i.test(retirada), '3.3.3: la versión retirada no explica en texto que no se puede reactivar ni modificar');
  });

  test('d. [4.1.3 / 1.4.1] Alerta crítica de estado inconsistente (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page, CONTRATOS_INCONSISTENTES);
    anotar(testInfo, 'Datos simulados', 'Tres versiones vigentes a la vez (2.0 en retiro, 3.0 y 4.0 activas): no se puede crear desde la aplicación (RF-98 5.6).');
    await irIntegracion(page, 'contrato', /Contrato contable/);
    await escanear(page, TC_ID, __dirname, 'estado-inconsistente', testInfo, LH);
    const avisos = await alertas(main(page));
    anotar(testInfo, 'Avisos', avisos.join(' ¦ ') || '(ninguno)');
    desviacion(avisos.some((a) => /inconsistente|m[aá]s de dos/i.test(a)), '4.1.3: con tres versiones vigentes no aparece ninguna alerta crítica (role="alert") que lo advierta y explique que se bloquean nuevas activaciones');
    const activar = await versiones().getByRole('button', { name: /Activar/i }).count();
    desviacion(activar === 0, '3.3.1: con el estado inconsistente se siguen ofreciendo botones "Activar"');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('e. [4.1.3 / 3.3.3] Usuario sin rol Administrador: aviso de permiso inline (Productor real)', async ({ browser }, testInfo) => {
    const s = await abrirSesionM07(browser, testInfo, 'productor');
    try {
      await irIntegracion(s.page, 'contrato');
      await escanear(s.page, TC_ID, __dirname, 'sin-permiso', testInfo, LH);
      const aviso = accesoDenegado(s.page);
      const visible = await aviso.isVisible();
      const texto = visible ? (await aviso.locator('xpath=ancestor-or-self::*[@role][1]').innerText().catch(() => '')).replace(/\s+/g, ' ') : '';
      anotar(testInfo, 'Productor en Contrato', visible ? texto : (await main(s.page).innerText()).slice(0, 200));
      expect.soft(visible, 'El Productor no ve el aviso "No tienes acceso a esta sección"').toBe(true);
      if (visible) expect.soft(await estaEnRegionViva(aviso), '4.1.3: el aviso de permiso no está en una región que se anuncie').toBe(true);
      desviacion(/administrador|solicit|pida/i.test(texto), '3.3.3: el aviso de permiso no dice qué hacer (p. ej. pedir acceso al Administrador)');
    } finally {
      await s.contexto.close();
    }
  });
});
