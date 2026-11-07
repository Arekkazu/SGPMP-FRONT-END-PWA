// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-243 RF-87: anuncio del avance del cierre de 9 pasos         |
/**
 * TC-DIS-243 — Verificar accesibilidad WCAG 2.1 AA de aria-live en el avance del cierre masivo de
 * 9 pasos [CRÍTICO]
 * RF-87 · CU-06 - Ejecutar cierre del período contable · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/cierre → "Cerrar período" → confirmar
 *
 * Criterio: 0 violaciones axe A/AA; 4.1.3: el avance (paso N de 9 y nombre del paso) en una región
 * aria-live="polite" sin mover el foco; indicador role="progressbar" con aria-valuenow/aria-valuemax
 * o aria-valuetext ("Paso 3 de 9: …"); el rollback (paso que falló, período sigue abierto, registros
 * intactos) y la finalización exitosa con role="alert" o aria-live="assertive"; 2.2.1 / 2.2.2.
 *
 * El caso pide mockear el avance. Sin cuenta de Contador ni período de prueba que se pueda cerrar
 * (un cierre es irreversible), todo el flujo se simula: permiso cierre_periodo·E, período ABIERTO,
 * prevalidación lista y POST /cierre retenido 8 s (estado "En cierre") que responde éxito o el
 * fallo con rollback del paso 4 ("Datos simulados"). Ningún POST llega al backend.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_243_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear } from '../../../_shared/sigabA11y';
import {
  NIT, PERIODOS, abrirSesionRol, anunciosDurante, concederPermisos, describirFocoDialogo, errorApi, irFinanzas, periodo, prevalidacionLimpia,
  quitarSimulaciones, simularEscritura, simularGet,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-243';
const VIEWPORTS = (process.env.TC_DIS_243_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['cierre-en-curso', 'cierre-fallido'];
const ESPERA = 8000;

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const exito = {
  id_cierre: 1, periodo: 'Noviembre de 2026', estado: 'COMPLETADO', activos_procesados: 3, activos_excluidos: [], lineas_excluidas: [],
  comprobantes: [{ codigo: 'NIC41-2026-11-001', hash: 'a'.repeat(64), valor_total: '1250000.00' }], hash_cierre: 'b'.repeat(64),
  reportes: { estado_resultados: { id_estado: 1, resultado_neto: '1250000.00' } }, id_periodo_siguiente: 9104,
};

async function prepararCierre(page: Page, periodos: unknown[]) {
  await concederPermisos(page, [['cierre_periodo', 5]]);
  await simularGet(page, /^\/finanzas\/periodos\/?$/, periodos);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacionLimpia);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
  await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
}

/** Abre el diálogo y confirma con teclado; devuelve el control que tenía el foco antes. */
async function confirmarCierre(page: Page) {
  await irFinanzas(page, 'cierre', /Cierre del período/);
  const disparador = page.getByRole('button', { name: 'Cerrar período', exact: true });
  await expect(disparador).toBeVisible();
  await disparador.focus();
  await page.keyboard.press('Enter');
  const confirmar = page.getByRole('dialog').getByRole('button', { name: 'Cerrar período', exact: true });
  await confirmar.focus();
  await page.keyboard.press('Enter');
}

test.describe('TC-DIS-243 — Anuncio del avance del cierre de 9 pasos', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_243_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [4.1.3 / 2.2.1] Cierre en curso: progressbar, región aria-live y anuncio del éxito (Datos simulados)', async ({}, testInfo) => {
    await prepararCierre(page, PERIODOS);
    await simularEscritura(page, /\/cierre$/, 200, exito, ESPERA);
    anotar(testInfo, 'Datos simulados', `Permiso cierre_periodo·E; noviembre 2026 ABIERTO; POST /cierre retenido ${ESPERA / 1000} s y respondido como COMPLETADO con período siguiente.`);
    await confirmarCierre(page);
    await page.waitForTimeout(800);
    const focoDurante = await describirFocoDialogo(page);
    await escanear(page, TC_ID, __dirname, 'cierre-en-curso', testInfo, LH);

    const barra = await page.locator('[role="progressbar"]').evaluateAll((els) => els.map((e) => ({
      now: e.getAttribute('aria-valuenow'), max: e.getAttribute('aria-valuemax'), text: e.getAttribute('aria-valuetext'), nombre: e.getAttribute('aria-label') ?? e.getAttribute('aria-labelledby'),
    })));
    const anuncios = await anunciosDurante(page, ESPERA);
    anotar(testInfo, 'Durante el cierre', `progressbar: ${JSON.stringify(barra)} · foco: ${focoDurante}`);
    anotar(testInfo, 'Regiones vivas observadas', anuncios.join(' ¦ ') || '(ninguna)');

    desviacion(barra.length > 0, '4.1.3: no hay indicador role="progressbar" del avance del cierre');
    desviacion(barra.some((b) => (b.now && b.max) || /paso\s*\d+\s*de\s*9/i.test(b.text ?? '')), '4.1.3: el indicador no expone aria-valuenow/aria-valuemax ni aria-valuetext "Paso N de 9"');
    desviacion(anuncios.some((a) => /paso\s*\d+\s*(de|\/)\s*9/i.test(a)), '4.1.3: ninguna región aria-live anuncia "Paso N de 9" y el nombre del paso');
    desviacion(anuncios.some((a) => /cerrad|complet/i.test(a) && /alert|assertive|status|polite/.test(a)), '4.1.3: la finalización exitosa del cierre no se anuncia');
    const aviso = await page.locator('.ds-toasts').innerText().catch(() => '');
    anotar(testInfo, 'Tras el cierre', `Toasts: ${aviso.replace(/\s+/g, ' ').trim() || '(ninguno)'}`);
  });

  test('b. [4.1.3] Fallo técnico en el paso 4 con rollback: anuncio del paso, período abierto y registros intactos (Datos simulados)', async ({}, testInfo) => {
    const fallido = periodo(9103, 'ABIERTO', '2026-11-01', {
      ultimo_cierre: { id_cierre: 2, estado: 'FALLIDO', paso_actual: 4, error_detalle: 'Error técnico al revaluar los activos. Se revirtieron los cambios.', fecha_inicio: '2026-11-30T10:00:00', fecha_fin: '2026-11-30T10:02:00' },
    });
    let llamado = false;
    await prepararCierre(page, PERIODOS);
    // Tras el fallo la app recarga los períodos: el abierto llega con ultimo_cierre FALLIDO.
    await simularGet(page, /^\/finanzas\/periodos\/?$/, () => (llamado ? [PERIODOS[0], PERIODOS[1], fallido] : PERIODOS));
    await simularEscritura(page, /\/cierre$/, 500, errorApi('CIERRE_FALLIDO', 'El cierre falló en el paso 4 (revaluación de activos). Se hizo rollback: el período sigue abierto y los registros están intactos.'), 3000);
    page.on('request', (r) => { if (/\/cierre$/.test(r.url()) && r.method() === 'POST') llamado = true; });
    anotar(testInfo, 'Datos simulados', `POST /cierre responde 500 CIERRE_FALLIDO tras 3 s; período ${NIT} con ultimo_cierre FALLIDO en el paso 4.`);
    await confirmarCierre(page);
    const anuncios = await anunciosDurante(page, 6000);
    await escanear(page, TC_ID, __dirname, 'cierre-fallido', testInfo, LH);
    const alertas = await page.locator('[role="alert"]').allInnerTexts();
    anotar(testInfo, 'Regiones vivas observadas', anuncios.join(' ¦ ') || '(ninguna)');
    anotar(testInfo, 'role=alert tras el fallo', alertas.map((a) => a.replace(/\s+/g, ' ').trim()).join(' ¦ ') || '(ninguna)');

    desviacion(anuncios.some((a) => /(alert|assertive).*fall/i.test(a)), '4.1.3: el fallo del cierre no se anuncia con role="alert" / aria-live="assertive"');
    desviacion(alertas.some((a) => /paso\s*4/i.test(a)), '4.1.3: el anuncio no indica en qué paso falló el cierre');
    desviacion(alertas.some((a) => /abierto|rollback|revirti|intact/i.test(a)), '4.1.3: el anuncio no dice que el período sigue abierto y los registros están intactos');
  });
});
