// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-285 RF-106: tasa de validación clínica, inferencias pendientes y exportación |
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-285 RF-106: botones de retroalimentación buscados solo en el panel de resultados |
/**
 * TC-DIS-285 — Verificar accesibilidad WCAG 2.1 AA de la tasa de validación clínica, de la lista de
 * inferencias pendientes de retroalimentación y de la exportación del reporte
 * RF-106 · CU-04 Visualizar historial clínico predictivo de activo biológico · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/historial
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tasa de validación, pendientes y conflictos con etiqueta; la
 * tasa como texto completo, p. ej. "50 % (3 validadas; 3 excluidas: …)"); 2.4.4 y 4.1.2 (cada botón de
 * retroalimentación identifica su inferencia: fecha y nivel); 2.4.3 (foco al abrir y cerrar el
 * formulario); 2.1.1 y 2.4.7; 4.1.3 (estado de la exportación anunciado); un activo sin
 * retroalimentaciones muestra "Sin datos suficientes para calcular", nunca NaN, 0 % ni un guion suelto.
 *
 * Datos reales: Lucero (tasa esperada 50 %), Canela (25 pendientes) y Brisa (sin retroalimentaciones),
 * Datos_Semilla §7. El paso b simula Canela para garantizar los botones "Retroalimentar". Abrir el
 * formulario es seguro: el envío se aborta (no se registra ninguna retroalimentación).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_285_VIEWPORTS=escritorio
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  BRISA, CANELA, LUCERO, RANGO_LUCERO, abrirSesionM08, abrirYAuditarDialogo, anunciosDurante, cerrarConEscape, consultarHistorial, dialogo,
  guardarDescarga, irHistorial, quitarSimulaciones, simularHistorial, textosCrudos,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-285';
const VIEWPORTS = (process.env.TC_DIS_285_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['tasa-lucero', 'formulario-retro', 'sin-retro'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-285 — Tasa de validación clínica, pendientes y exportación', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_285_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    await page.keyboard.press('Escape').catch(() => {});
    await quitarSimulaciones(page);
  });

  test('a. [1.3.1 / 4.1.3] Lucero real: tasa de validación en texto completo y exportación anunciada', async ({}, testInfo) => {
    await irHistorial(page);
    const ok = await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    precondicion(ok, `${LUCERO} no aparece en el selector de activos del Veterinario (Datos_Semilla §7.1)`);
    if (!ok) return;
    await escanear(page, TC_ID, __dirname, 'tasa-lucero', testInfo, LH);
    const tasa = main(page).getByText(/tasa de validaci/i).first();
    const hayTasa = await tasa.count() > 0;
    const textoTasa = hayTasa ? (await tasa.locator('xpath=..').innerText()).replace(/\s+/g, ' ') : '';
    anotar(testInfo, 'Tasa de validación', textoTasa || '(no existe)');
    desviacion(hayTasa, '1.3.1: la vista no muestra la tasa de validación clínica que pide RF-106');
    if (hayTasa) {
      expect.soft(textoTasa, 'La tasa de Lucero no es 50 %').toMatch(/50\s*%/);
      desviacion(/validad/i.test(textoTasa) && /exclu/i.test(textoTasa), '1.3.1: la tasa no dice cuántas inferencias se validaron y cuántas se excluyeron y por qué');
    }
    desviacion(await main(page).getByText(/pendientes? de retroalimentaci/i).count() > 0, '1.3.1: no hay indicador ni lista de inferencias pendientes de retroalimentación');

    // Exportación del reporte (hoy: botón "Exportar", descarga local en JSON).
    const exportar = main(page).getByRole('button', { name: /Exportar/ });
    await exportar.focus();
    const descarga = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const archivo = await descarga;
    const vistos = await anuncios;
    const ruta = archivo ? await archivo.path().catch(() => null) : null;
    if (ruta) await guardarDescarga(__dirname, `historial-${testInfo.project.name}.json`, fs.readFileSync(ruta));
    anotar(testInfo, 'Exportar con teclado', `descarga: ${archivo?.suggestedFilename() ?? '(ninguna)'} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(archivo, '2.1.1: "Exportar" con teclado no descarga el archivo').not.toBeNull();
    desviacion(vistos.some((a) => /export|descarg|listo|generad/i.test(a)), '4.1.3: el estado de la exportación no se anuncia');
    desviacion(/pdf|xlsx|csv$/i.test(archivo?.suggestedFilename() ?? ''), 'RF-106: la exportación es un JSON técnico, no un reporte histórico sanitario legible');
  });

  test('b. [2.4.4 / 4.1.2 / 2.4.3] Canela: cada "Retroalimentar" identifica su inferencia y el foco entra y vuelve (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    anotar(testInfo, 'Datos simulados', `${CANELA}: 25 inferencias sin retroalimentación (más de 48 h). El envío del formulario se aborta.`);
    await irHistorial(page);
    await consultarHistorial(page, CANELA, '2026-09-01', '2026-11-17');
    // Solo el panel de resultados: <main> también tiene la pestaña «Retroalimentación» de la navegación.
    const botones = main(page).getByRole('tabpanel').getByRole('button', { name: /retroalimenta/i });
    const total = await botones.count();
    precondicion(total > 0, 'el Veterinario de TEST no tiene permiso para registrar retroalimentación (no aparece "Retroalimentar")');
    if (!total) return;
    const nombres = await botones.evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()));
    anotar(testInfo, 'Nombres de los botones', nombres.slice(0, 5).join(' | '));
    desviacion(new Set(nombres).size === nombres.length, `2.4.4: los ${total} botones se llaman igual ("${nombres[0]}"); no dicen la fecha ni el nivel de su inferencia`);
    const d = await abrirYAuditarDialogo(page, botones.first());
    expect(d.abierto, '"Retroalimentar" no abre el formulario').toBe(true);
    await escanear(page, TC_ID, __dirname, 'formulario-retro', testInfo, LH);
    anotar(testInfo, 'Formulario', `nombre="${d.nombre}" · foco inicial: ${d.focoInicial} · texto: ${d.texto.slice(0, 160)}`);
    expect.soft(d.focoInicial, '2.4.3: al abrir, el foco no entra al formulario').toContain('(diálogo)');
    expect.soft(d.focoSaleDelDialogo, '2.4.3: Tab saca el foco del formulario').toBe(false);
    desviacion(/2026|oct/i.test(d.texto) || /Riesgo|Normal|Crítico/.test(d.texto), '2.4.4: el formulario no dice a qué inferencia (fecha y nivel) corresponde');
    const esc = await cerrarConEscape(page, botones.first());
    expect.soft(esc.focoEnDisparador, `2.4.3: al cerrar, el foco no vuelve a "Retroalimentar" (queda en ${esc.foco})`).toBe(true);
    if (!esc.cerrado) await dialogo(page).getByRole('button', { name: /Cancelar|Cerrar/ }).first().click().catch(() => {});
  });

  test('c. [1.3.1] Brisa real: sin retroalimentaciones, la tasa dice "Sin datos suficientes para calcular"', async ({}, testInfo) => {
    await irHistorial(page);
    const ok = await consultarHistorial(page, BRISA, '2026-09-01', '2026-11-17');
    precondicion(ok, `${BRISA} no aparece en el selector de activos del Veterinario (Datos_Semilla §7.2)`);
    if (!ok) return;
    await escanear(page, TC_ID, __dirname, 'sin-retro', testInfo, LH);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/sin datos suficientes para calcular/i.test(texto), '1.3.1: la vista no indica "Sin datos suficientes para calcular" para un activo sin retroalimentaciones');
    expect.soft(/\bNaN\b|tasa[^.]{0,40}\b0\s*%/i.test(texto), 'La tasa muestra NaN o 0 % sin explicación').toBe(false);
    expect.soft(await textosCrudos(main(page)), 'Valores crudos en pantalla').toEqual([]);
  });
});
