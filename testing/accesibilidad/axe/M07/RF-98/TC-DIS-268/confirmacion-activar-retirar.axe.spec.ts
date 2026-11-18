// | Fecha      | Nombre      | Que se hizo                                                                 |
// |------------|-------------|-----------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-268 RF-98: diálogos de confirmación al activar y al retirar una versión |
/**
 * TC-DIS-268 — Verificar accesibilidad WCAG 2.1 AA de la confirmación al activar y al deprecar una
 * versión del contrato de integración [CRÍTICO]
 * RF-98 · CU-04 Gestionar versiones del contrato de integración · Rol: Administrador · Prioridad: Alta
 * Ruta: /integracion/contrato
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.2 (role dialog/alertdialog con aria-modal, nombre por
 * aria-labelledby y descripción por aria-describedby); 2.1.2 y 2.4.3 (foco atrapado, foco inicial en
 * la acción segura, Escape cancela y el foco vuelve al disparador); 3.3.4 (la transición irreversible
 * exige confirmación y el botón nombra la acción y la versión); 4.1.3 (el resultado se anuncia);
 * 2.4.7 (foco visible en el diálogo).
 *
 * Datos: escenario B de Datos_Semilla_M07_M08.md §3.3 (3.0 activa, 4.0 MAJOR pendiente lista). Activar
 * y retirar son irreversibles y cambian la versión que recibe AgroFusion en TEST: TODO el caso usa
 * datos y respuestas simulados; ninguna escritura llega al backend ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_268_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  CONTRATOS_B, abrirSesionM07, abrirYAuditarDialogo, anunciosDurante, cerrarConEscape, describirFocoDialogo, dialogo, fila,
  irIntegracion, quitarSimulaciones, simularContrato, simularEscritura,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-268';
const VIEWPORTS = (process.env.TC_DIS_268_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['dialogo-retirar', 'dialogo-activar'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-268 — Confirmación al activar y al retirar una versión del contrato', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_268_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  const versiones = () => main(page).getByRole('region', { name: /Versiones del contrato/i });

  test('a. [4.1.2 / 2.1.2 / 2.4.3 / 3.3.4] Diálogo para retirar la versión activa 3.0 (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page, CONTRATOS_B);
    anotar(testInfo, 'Datos simulados', 'Escenario B: 2.0 retirada, 3.0 activa, 4.0 MAJOR pendiente lista para activarse.');
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const disparador = fila(versiones(), /^\s*3\.0/).getByRole('button', { name: /Retirar/i });
    const d = await abrirYAuditarDialogo(page, disparador);
    expect(d.abierto, 'Retirar la versión activa no abre ningún diálogo de confirmación').toBe(true);
    await escanear(page, TC_ID, __dirname, 'dialogo-retirar', testInfo, LH);
    anotar(testInfo, 'Diálogo de retiro', `rol=${d.rol} · aria-modal=${d.ariaModal} · nombre="${d.nombre}" · descripción="${d.descripcion}" · foco inicial: ${d.focoInicial} · botones: ${d.botones.join(' | ')}`);
    anotar(testInfo, 'Recorrido con Tab', d.recorrido.join(' → '));
    expect.soft(['dialog', 'alertdialog'].includes(d.rol ?? ''), '4.1.2: el diálogo no expone role dialog/alertdialog').toBe(true);
    expect.soft(d.ariaModal, '4.1.2: el diálogo no tiene aria-modal="true"').toBe('true');
    expect.soft(d.nombre, '4.1.2: el diálogo no tiene nombre accesible').not.toBe('');
    desviacion(!!d.describedby && d.descripcion.length > 0, '4.1.2: la explicación (no se puede revertir, plazo y fecha de retiro) no está vinculada por aria-describedby');
    desviacion(/no se puede (deshacer|revertir)|irreversible|definitiv/i.test(d.texto), '3.3.4: el diálogo no dice que el retiro no se puede revertir');
    desviacion(/\d{1,2}\s+de\s+\w+|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(d.texto), '3.3.4: el diálogo no dice en qué fecha la versión dejará de estar disponible (solo pide el plazo en días)');
    desviacion(/cancelar/i.test(d.focoInicial), `2.4.3: el foco inicial no queda en la acción segura (Cancelar); queda en ${d.focoInicial}`);
    expect.soft(d.focoSaleDelDialogo, '2.1.2: Tab/Shift+Tab sacan el foco del diálogo').toBe(false);
    expect.soft(d.controlesSinFocoVisible, '2.4.7: controles del diálogo sin foco visible').toEqual([]);
    const confirmar = d.botones.find((b) => /retirar/i.test(b)) ?? '';
    desviacion(/3\.0/.test(confirmar), `3.3.4: el botón de confirmación no nombra la versión ("${confirmar}"); debería decir p. ej. "Retirar versión 3.0"`);
    const esc = await cerrarConEscape(page, disparador);
    anotar(testInfo, 'Escape', `cerrado=${esc.cerrado} · foco tras cerrar: ${esc.foco}`);
    expect.soft(esc.cerrado, '2.1.2: Escape no cancela el diálogo').toBe(true);
    expect.soft(esc.focoEnDisparador, '2.4.3: al cancelar, el foco no vuelve al botón que abrió el diálogo').toBe(true);
  });

  test('b. [3.3.4 / 4.1.2] Activar la versión 4.0 (MAJOR) pide confirmación y advierte el retiro de la 3.0 (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page, CONTRATOS_B);
    const escrituras = await simularEscritura(page, /^\/integracion\/contratos\/\d+\/activar$/, 200, { ...CONTRATOS_B[4], estado: 'ACTIVO' });
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const disparador = fila(versiones(), /^\s*4\.0/).getByRole('button', { name: /Activar/i });
    await disparador.focus();
    await page.keyboard.press('Enter');
    const abierto = await dialogo(page).waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    anotar(testInfo, 'Activar 4.0', abierto ? 'abre un diálogo de confirmación' : `no abre diálogo; solicitudes de activación enviadas: ${escrituras.length}`);
    desviacion(abierto, '3.3.4: "Activar" ejecuta la activación sin pedir confirmación, aunque es irreversible y deja la 3.0 en retiro');
    if (!abierto) return;
    await escanear(page, TC_ID, __dirname, 'dialogo-activar', testInfo, LH);
    const texto = (await dialogo(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/3\.0/.test(texto) && /retir|deprec/i.test(texto), '3.3.4: el diálogo de activación no advierte que la versión 3.0 pasará a retiro');
    await page.keyboard.press('Escape');
  });

  test('c. [4.1.3 / 2.4.3] Confirmar el retiro: resultado anunciado y foco de vuelta en la fila (Datos simulados)', async ({}, testInfo) => {
    await simularContrato(page, CONTRATOS_B);
    await simularEscritura(page, /^\/integracion\/contratos\/\d+\/deprecar$/, 200, { ...CONTRATOS_B[2], estado: 'DEPRECADO', fecha_inactivacion: '2027-02-15' });
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const disparador = fila(versiones(), /^\s*3\.0/).getByRole('button', { name: /Retirar/i });
    await disparador.focus();
    await page.keyboard.press('Enter');
    await dialogo(page).waitFor({ state: 'visible' });
    await dialogo(page).getByRole('button', { name: /Retirar/i }).focus();
    const anuncios = anunciosDurante(page, 4000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    const foco = await describirFocoDialogo(page);
    anotar(testInfo, 'Tras confirmar', `anuncios: ${vistos.join(' ¦ ') || '(ninguno)'} · foco: ${foco}`);
    desviacion(vistos.some((a) => /retir|deprec/i.test(a)), '4.1.3: el retiro confirmado no se anuncia (no hay role=status/alert con el resultado)');
    const enFila = await fila(versiones(), /^\s*3\.0/).evaluate((tr) => tr.contains(document.activeElement)).catch(() => false);
    desviacion(enFila, `2.4.3: tras confirmar, el foco no vuelve a la fila de la versión 3.0 (queda en ${foco})`);
  });
});
