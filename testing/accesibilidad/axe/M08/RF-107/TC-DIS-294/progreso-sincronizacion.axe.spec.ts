// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-294 RF-107: barra de progreso de un proceso largo y estado de sincronización |
/**
 * TC-DIS-294 — Verificar accesibilidad WCAG 2.1 AA del indicador de proceso en curso (spinner y barra de
 * progreso) y del ícono de estado de sincronización (SINCRONIZADO, SINCRONIZANDO, OFFLINE, CONFLICTO)
 * RF-107 · CU-05 Proveer retroalimentación visual de acciones del sistema · Rol: Administrador · Prioridad: Media
 * Ruta: /finanzas/cierre (proceso largo con progreso calculable) e indicador de sincronización, presente en
 * todas las pantallas (EstadoSincronizacion, agregado el 2026-11-18)
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
import { anotar, desviacion, escanear } from '../../../_shared/sigabA11y';
import {
  EXITO_CIERRE, PERIODOS, abrirSesionM08, anunciosDurante, botonCerrarPeriodo, cerrarConEscape, confirmarCierre, focoVisible, irA, irFinanzas,
  prepararCierre, quitarSimulaciones, simularEscritura,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-294';
const VIEWPORTS = (process.env.TC_DIS_294_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['cierre-en-curso', 'detalle-sincronizacion', 'sin-conexion'];
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

  test('b. [1.4.1 / 1.1.1 / 2.1.1 / 4.1.3] Estado de sincronización: texto, detalle por módulo y sin conexión', async ({}, testInfo) => {
    await irA(page, 'dashboard');
    const indicador = page.getByRole('button', { name: /^Estado de sincronizaci[oó]n:/ });
    const hay = await indicador.count() > 0;
    expect.soft(hay, 'RF-107: no hay indicador de estado de sincronización').toBe(true);
    if (!hay) return;
    const info = await indicador.evaluate((b) => ({
      nombre: b.getAttribute('aria-label') ?? '', texto: (b as HTMLElement).innerText.trim(), icono: !!b.querySelector('svg'),
    }));
    anotar(testInfo, 'Indicador con conexión', JSON.stringify(info));
    expect.soft(info.texto, '1.4.1: el estado no se dice en texto, solo con el ícono o el color').toMatch(/Sincronizado|Sincronizando|Sin conexi[oó]n|Conflicto/);
    // Detalle por módulo con el teclado.
    await indicador.focus();
    expect.soft(await focoVisible(page), '2.4.7: el indicador no muestra el foco').toBe(true);
    await page.keyboard.press('Enter');
    const detalle = page.getByRole('dialog', { name: /Sincronizaci[oó]n de datos/ });
    await expect.soft(detalle, '2.1.1: el indicador no abre el detalle por módulo con el teclado').toBeVisible();
    if (await detalle.isVisible()) {
      await escanear(page, TC_ID, __dirname, 'detalle-sincronizacion', testInfo, LH);
      const filas = await detalle.locator('tbody th[scope="row"]').allInnerTexts();
      anotar(testInfo, 'Módulos del detalle', filas.join(', '));
      expect.soft(filas.length, '1.3.1: el detalle no lista los módulos').toBeGreaterThan(0);
      const esc = await cerrarConEscape(page, indicador);
      expect.soft(esc.focoEnDisparador, `2.4.3: al cerrar el detalle el foco no vuelve al indicador (queda en ${esc.foco})`).toBe(true);
    }
    // Sin conexión: el texto cambia y se anuncia.
    const anuncios = anunciosDurante(page, 4000);
    await page.context().setOffline(true);
    const vistos = await anuncios;
    const offline = await indicador.evaluate((b) => ({ nombre: b.getAttribute('aria-label') ?? '', texto: (b as HTMLElement).innerText.trim() }));
    await escanear(page, TC_ID, __dirname, 'sin-conexion', testInfo, LH);
    anotar(testInfo, 'Sin conexión', `${JSON.stringify(offline)} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(offline.texto, 'RF-107: el indicador no cambia a "Sin conexión" al perder la red').toMatch(/Sin conexi[oó]n/);
    desviacion(vistos.some((a) => /sin conexi[oó]n/i.test(a)), '4.1.3: el cambio a "Sin conexión" no se anuncia (el indicador no está en una región viva)');
    await page.context().setOffline(false);
    await page.waitForTimeout(1500);
    anotar(testInfo, 'Al volver la conexión', (await indicador.innerText()).trim());
    anotar(testInfo, 'Estado CONFLICTO', 'no se puede provocar desde la interfaz sin escrituras; se revisa por el texto del componente (Conflicto)');
  });
});
