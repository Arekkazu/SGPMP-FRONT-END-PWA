// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-283 RF-106: niveles de riesgo con texto y marcadores de evento, retroalimentación y conflicto |
/**
 * TC-DIS-283 — Verificar accesibilidad WCAG 2.1 AA de los niveles de riesgo con badge + color y de los
 * marcadores de evento, retroalimentación y conflicto en el Historial Clínico Predictivo [CRÍTICO]
 * RF-106 · CU-04 Visualizar historial clínico predictivo de activo biológico · Rol: Veterinario · Prioridad: Alta
 * Ruta: /prediccion/historial → "Línea de tiempo"
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (los niveles se distinguen por badge con texto —Normal,
 * Riesgo bajo, Riesgo alto, Crítico, los rótulos del historial de Predicción— y no solo por color; el
 * evento sanitario no depende solo del rojo); 1.1.1 (cada marcador —evento sanitario, correcto, parcial,
 * incorrecto, sin evento, conflicto— tiene texto y hay una leyenda visible); 1.4.3 (badges ≥ 4.5:1);
 * 1.4.11 (marcadores ≥ 3:1); regla de textos visibles (sin valores de enum crudos).
 *
 * Datos reales: BOV-M08-001 «Lucero» (Datos_Semilla §7.1). El paso b simula la misma línea de tiempo
 * con eventos sanitarios, las 4 retroalimentaciones y un conflicto ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_283_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  LUCERO, NIVELES, RANGO_LUCERO, abrirSesionM08, consultarHistorial, enumsCrudos, irHistorial, quitarSimulaciones, simularHistorial,
  tarjetasLineaTiempo, temaOscuro, textosCrudos,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-283';
const VIEWPORTS = (process.env.TC_DIS_283_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['linea-real', 'linea-marcadores', 'linea-oscuro'];
const ENUMS = ['INFERENCIA', 'EVENTO_SANITARIO', 'RETROALIMENTACION', 'CONTAGIO', 'ALERTA', 'CORRECTO', 'PARCIAL', 'INCORRECTO', 'SIN_EVENTO'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-283 — Niveles de riesgo y marcadores de la línea de tiempo', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_283_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    await quitarSimulaciones(page);
    await temaOscuro(page, false).catch(() => {});
  });

  /** Por tarjeta: rótulo de nivel visible y si el punto de color tiene alternativa textual. */
  function leerTarjetas() {
    return tarjetasLineaTiempo(page).evaluateAll((tarjetas, niveles) => tarjetas.map((t) => {
      const texto = (t as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      const punto = t.querySelector('span[aria-hidden]');
      return {
        texto: texto.slice(0, 120),
        nivel: (niveles as string[]).find((n) => texto.includes(n)) ?? null,
        puntoOculto: punto?.getAttribute('aria-hidden') === 'true' || punto?.getAttribute('aria-hidden') === '',
        badgeConIcono: [...t.querySelectorAll('span')].some((s) => (niveles as string[]).some((n) => s.textContent?.trim() === n) && !!s.querySelector('svg')),
      };
    }), NIVELES);
  }

  test('a. [1.4.1 / 1.4.3] Lucero real: cada nivel con su rótulo en texto, no solo el punto de color', async ({}, testInfo) => {
    await irHistorial(page);
    const ok = await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    precondicion(ok, `${LUCERO} no aparece en el selector de activos del Veterinario (Datos_Semilla §7.1)`);
    if (!ok) return;
    await escanear(page, TC_ID, __dirname, 'linea-real', testInfo, LH);
    const tarjetas = await leerTarjetas();
    const niveles = [...new Set(tarjetas.map((t) => t.nivel).filter(Boolean))];
    anotar(testInfo, 'Tarjetas', `${tarjetas.length} · niveles con rótulo: ${niveles.join(', ')}`);
    for (const n of NIVELES) precondicion(niveles.includes(n), `no hay ninguna inferencia de nivel "${n}" en la primera página de ${LUCERO}`);
    const inferencias = tarjetas.filter((t) => /Confianza|Patolog/i.test(t.texto));
    expect.soft(inferencias.filter((t) => !t.nivel).map((t) => t.texto), '1.4.1: inferencias cuyo nivel solo se ve por el color del punto').toEqual([]);
    desviacion(tarjetas.every((t) => !t.nivel || t.badgeConIcono), '1.4.1: el badge de nivel lleva texto pero no ícono (el DS pide ícono + texto + color)');
    const crudos = [...await enumsCrudos(main(page), ENUMS), ...await textosCrudos(main(page))];
    desviacion(crudos.length === 0, `regla de textos visibles: la línea de tiempo muestra valores crudos → ${[...new Set(crudos)].join(' ¦ ')}`);
  });

  test('b. [1.1.1 / 1.4.1] Marcadores de evento sanitario, retroalimentación y conflicto con texto y leyenda (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    anotar(testInfo, 'Datos simulados', `Línea de tiempo de ${LUCERO} (§7.1) con 2 eventos sanitarios, las 4 retroalimentaciones y un conflicto.`);
    await irHistorial(page);
    await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    await escanear(page, TC_ID, __dirname, 'linea-marcadores', testInfo, LH);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    const leyenda = await main(page).getByText(/leyenda|significado de los (íconos|marcadores)/i).count();
    anotar(testInfo, 'Texto de la línea de tiempo', texto.slice(0, 600));
    desviacion(leyenda > 0, '1.1.1: no hay una leyenda visible que explique los marcadores');
    desviacion(/evento sanitario|Mastitis clínica|Fiebre/i.test(texto), '1.1.1: el evento sanitario no tiene texto (o no aparece en la línea de tiempo)');
    for (const [nombre, re] of [['correcto', /\bcorrect[ao]\b/i], ['parcial', /parcial/i], ['incorrecto', /incorrect[ao]/i], ['sin evento', /sin evento/i]] as const) {
      desviacion(re.test(texto), `1.1.1: la retroalimentación "${nombre}" no tiene alternativa textual`);
    }
    desviacion(/conflicto/i.test(texto), '1.1.1: la inferencia en conflicto no se anuncia como "conflicto" con las dos valoraciones');
    const crudos = await enumsCrudos(main(page), ENUMS);
    desviacion(crudos.length === 0, `regla de textos visibles: valores de enum en pantalla → ${crudos.join(', ')}`);
  });

  test('c. [1.4.3 / 1.4.11] Badges y marcadores en tema oscuro (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    await irHistorial(page);
    await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    await temaOscuro(page, true);
    await escanear(page, TC_ID, __dirname, 'linea-oscuro', testInfo, LH);
    // axe mide el texto (1.4.3); el contraste del punto de color (1.4.11) se deja medido para revisión manual.
    const puntos = await tarjetasLineaTiempo(page).evaluateAll((ts) => ts.slice(0, 4).map((t) => {
      const p = t.querySelector('span[aria-hidden]') as HTMLElement | null;
      return p ? `${getComputedStyle(p).backgroundColor} sobre ${getComputedStyle(t as HTMLElement).backgroundColor}` : '(sin punto)';
    }));
    anotar(testInfo, 'Colores de los marcadores en tema oscuro (1.4.11, revisar ≥ 3:1)', puntos.join(' ¦ '));
  });
});
