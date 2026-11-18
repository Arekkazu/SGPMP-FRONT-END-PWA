// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-294 RF-107: barra de progreso de un proceso largo y estado de sincronización |
/**
 * TC-DIS-294 — Verificar accesibilidad WCAG 2.1 AA del indicador de proceso en curso (spinner y barra de
 * progreso) y del ícono de estado de sincronización (SINCRONIZADO, SINCRONIZANDO, OFFLINE, CONFLICTO)
 * RF-107 · CU-05 Proveer retroalimentación visual de acciones del sistema · Rol: Administrador · Prioridad: Media
 * Ruta: /finanzas/cierre (proceso largo con progreso calculable) y la barra superior (sincronización)
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.2 (progressbar con nombre, rol y valor); 4.1.3 (inicio, avance
 * y fin anunciados); 1.4.1 (estado con texto); 1.1.1 (íconos con alternativa); 2.1.1 (ícono de
 * sincronización y su detalle por teclado); 1.4.11. RF-107: mientras el proceso corre no se pueden
 * iniciar operaciones que dependen de él, y eso se comunica.
 *
 * El cierre se simula (irreversible): POST /cierre retenido 10 s y GET de períodos que avanza un paso en
 * cada consulta, como hace el backend ("Datos simulados"). El modo sin conexión se simula con el
 * contexto del navegador (setOffline), sin tocar datos.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_294_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  EXITO_CIERRE, PERIODOS, abrirSesionM08, anunciosDurante, botonCerrarPeriodo, confirmarCierre, irA, irFinanzas, prepararCierre,
  quitarSimulaciones, simularEscritura,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-294';
const VIEWPORTS = (process.env.TC_DIS_294_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['cierre-en-curso', 'sin-conexion'];
const ESPERA = 10_000; // por debajo del timeout de 15 s de Axios

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-294 — Progreso de un proceso largo y estado de sincronización', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_294_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    await page.context().setOffline(false);
    await quitarSimulaciones(page);
  });

  test('a. [4.1.2 / 4.1.3] Cierre en curso: barra con nombre y valor, avance anunciado y botón bloqueado (Datos simulados)', async ({}, testInfo) => {
    let enCurso = false;
    let consultas = 0;
    // Mientras el POST corre, cada GET de períodos devuelve el cierre un paso más adelante.
    await prepararCierre(page, () => PERIODOS.map((p) => (p.id_periodo_contable === 9103 && enCurso
      ? { ...p, estado: 'EN_CIERRE', ultimo_cierre: { id_cierre: 1, estado: 'EN_PROCESO', paso_actual: Math.min(9, ++consultas + 1), fecha_inicio: '2026-11-30T10:00:00' } }
      : p)));
    await simularEscritura(page, /\/cierre$/, 200, EXITO_CIERRE, ESPERA);
    page.on('request', (r) => { if (/\/cierre$/.test(r.url()) && r.method() === 'POST') enCurso = true; });
    anotar(testInfo, 'Datos simulados', `Cierre de 40 activos de noviembre 2026: POST retenido ${ESPERA / 1000} s; el período avanza un paso por consulta.`);
    await irFinanzas(page, 'cierre', /Cierre del período/);
    const anuncios = anunciosDurante(page, ESPERA + 3000);
    await confirmarCierre(page);
    await page.waitForTimeout(2500);
    const barra = await page.locator('[role="progressbar"]').evaluateAll((els) => els.map((e) => ({
      nombre: e.getAttribute('aria-label') ?? (e.getAttribute('aria-labelledby') ? document.getElementById(e.getAttribute('aria-labelledby')!)?.textContent ?? '' : ''),
      now: e.getAttribute('aria-valuenow'), max: e.getAttribute('aria-valuemax'), texto: e.getAttribute('aria-valuetext'),
    })));
    // Con el período "En cierre" el botón deja de mostrarse: eso también impide reiniciar el cierre.
    const boton = botonCerrarPeriodo(page);
    const visible = await boton.isVisible().catch(() => false);
    const bloqueo = {
      visible,
      busy: visible ? await boton.getAttribute('aria-busy') : null,
      deshabilitado: visible ? await boton.getAttribute('aria-disabled') : null,
    };
    await escanear(page, TC_ID, __dirname, 'cierre-en-curso', testInfo, LH);
    const vistos = await anuncios;
    anotar(testInfo, 'Barra de progreso', JSON.stringify(barra));
    anotar(testInfo, 'Botón "Cerrar período" durante el proceso', JSON.stringify(bloqueo));
    anotar(testInfo, 'Anuncios', vistos.join(' ¦ ') || '(ninguno)');
    expect.soft(barra.length, '4.1.2: no hay role="progressbar" durante el cierre').toBeGreaterThan(0);
    expect.soft(barra.every((b) => b.nombre && b.now && b.max), '4.1.2: la barra no tiene nombre o valor').toBe(true);
    const pasos = new Set(vistos.flatMap((a) => [...a.matchAll(/paso\s*(\d+)\s*de\s*9/gi)].map((m) => m[1])));
    desviacion(pasos.size >= 2, `4.1.3: el avance no se anuncia paso a paso (pasos anunciados: ${[...pasos].join(', ') || 'ninguno'})`);
    desviacion(vistos.some((a) => /\d+\s*\/\s*\d+\s*activos|\d+ de \d+ activos/i.test(a)), 'RF-107: el progreso no dice "[N]/[Total] activos procesados"');
    desviacion(vistos.some((a) => /cerrad|complet/i.test(a)), '4.1.3: el fin del proceso no se anuncia');
    expect.soft(!bloqueo.visible || bloqueo.busy === 'true' || bloqueo.deshabilitado === 'true', 'RF-107: durante el proceso se puede volver a iniciar el cierre').toBe(true);
  });

  test('b. [1.4.1 / 1.1.1 / 2.1.1 / 4.1.3] Estado de sincronización: ícono, detalle por módulo y sin conexión', async ({}, testInfo) => {
    await irA(page, 'dashboard');
    const banner = page.getByRole('banner');
    const indicador = banner.getByRole('button', { name: /sincroniz|conexi[oó]n|offline/i }).or(banner.getByRole('status'));
    const hay = await indicador.count() > 0;
    anotar(testInfo, 'Controles de la barra superior', (await banner.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? ''))).join(' | '));
    desviacion(hay, 'RF-107: no hay ícono de estado de sincronización (sincronizado, sincronizando, sin conexión, conflicto) en la barra superior');
    if (hay) {
      await indicador.first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      desviacion(await page.getByText(/por m[oó]dulo|pendientes de sincronizar/i).count() > 0, '2.1.1: el ícono de sincronización no abre el detalle por módulo con el teclado');
    }
    // Sin conexión: qué se anuncia y dónde.
    const anuncios = anunciosDurante(page, 4000);
    await page.context().setOffline(true);
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'sin-conexion', testInfo, LH);
    const avisos = await page.locator('[role="alert"], [role="status"]').allInnerTexts();
    anotar(testInfo, 'Al quedar sin conexión', `anuncios: ${vistos.join(' ¦ ') || '(ninguno)'} · avisos visibles: ${avisos.map((a) => a.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ¦ ') || '(ninguno)'}`);
    desviacion(vistos.some((a) => /sin conexi[oó]n|offline/i.test(a)), '4.1.3: perder la conexión no se anuncia en texto');
    await page.context().setOffline(false);
    const conflicto = await main(page).getByText(/conflicto/i).count();
    anotar(testInfo, 'Estado CONFLICTO', conflicto ? 'visible' : 'no se puede provocar ni ver desde la interfaz');
  });
});
