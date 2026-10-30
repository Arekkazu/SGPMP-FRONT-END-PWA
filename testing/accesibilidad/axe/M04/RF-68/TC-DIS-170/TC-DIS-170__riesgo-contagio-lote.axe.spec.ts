/**
 * TC-DIS-170 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la vista de Riesgo de Contagio del Lote
 * (riesgo de semaforización solo-color)
 * RF-68 · CU-03 Ejecutar inferencia sanitaria en tiempo real · Rol: Administrador (el caso pide
 * Productor o Veterinario; la vista no está gateada por permiso y muestra lo mismo a los tres)
 * Predicción → "Contagio" (/prediccion/contagio)
 *
 * Criterio (hoja M04): 0 violaciones axe A/AA con énfasis CRÍTICO en 1.4.1 (Bajo/Medio/Alto también
 * con texto o ícono), 1.4.3 (contraste ≥4.5:1 en cada indicador de nivel), 4.1.2 (name/role/value en
 * el indicador de nivel y en el flag confianza_baja) y 4.1.3 (alerta RIESGO_CONTAGIO anunciada sin
 * foco en el panel; buena práctica: un fallo se reporta como MEJORA, no como defecto). CA-6 del
 * RF-68: con confianza_baja no se muestra alerta crítica.
 *
 * La vista usa datos simulados (DatosSimuladosBanner): el modelo de contagio aún no expone endpoints.
 * La verificación con NVDA/VoiceOver (paso 5) queda fuera del spec.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
// | Fecha      | Nombre        | Que se hizo                                                            |
// |------------|---------------|--------------------------------------------------------------------------|
// | 2026-10-30 | Laura032005   | M04 RF-68: distinguir error de servidor (BLOQUEO) de lista vacía; pausado por bug backend 500 |
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, irA, main, precondicion, regionesVivas, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-170';
const RUTA = 'prediccion/contagio';
const TITULO = 'Riesgo de Contagio';
const PASOS_LIGHTHOUSE = ['vista', 'detalle-alto', 'detalle-confianza-baja'];

const NIVELES = ['ALTO', 'MEDIO', 'BAJO'];
// 2026-10-27: contagio.nivel_ALTO/MEDIO/BAJO traducen a "Riesgo alto/medio/bajo" desde el primer
// commit del prototipo (33d8cef, anterior a este spec) — nunca fue "ALTO" en mayúsculas sueltas.
const NIVEL_RE = /Riesgo (alto|medio|bajo)/i;
const nivelDe = (texto: string) => NIVEL_RE.exec(texto)?.[1]?.toUpperCase();
const CONFIANZA_BAJA = /confianza baja|datos (incompletos|faltantes)|desincroniz|recalculad/i;

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tarjetas(page: Page) {
  // 2026-10-27: no existe ningún heading "Lotes monitoreados" en RiesgoContagioView — la grilla de
  // lotes es un <div> sin título que sigue directo a los filtros. Las tarjetas son
  // <article role="button"> (ni tienen heading encima, ni son un <button> nativo).
  return main(page).locator('article[role="button"]');
}

/** Abre con Enter la tarjeta i y devuelve el diálogo de detalle del lote. */
async function abrirLote(page: Page, i: number) {
  const tarjeta = tarjetas(page).nth(i);
  await tarjeta.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog');
  await expect(dialogo, '2.1.1: Enter sobre la tarjeta del lote debe abrir su detalle').toBeVisible();
  return { tarjeta, dialogo };
}

async function cerrar(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

// 2026-10-30: PAUSADO — GET /prediccion/riesgo-contagio responde HTTP 500 (ERROR_INTERNO) para la
// cuenta de prueba desde que el DBA sembró los 4 resultados de TC-DIS-170 (timestamp del error:
// 2026-10-30T18:39:59Z). No es un bloqueo de dato ni un defecto de este spec — es un bug de backend,
// ver issue #467. Reactivar (quitar .skip) cuando se confirme el fix.
test.describe.skip(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Riesgo de contagio del lote (RF-68)`, () => {
  test.describe.configure({ mode: 'default' });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. CRÍTICO - cada nivel Bajo/Medio/Alto con texto además del color (1.4.1) y nombre en la tarjeta (4.1.2)', async ({}, testInfo) => {
    const respuesta = page.waitForResponse(esGet('/prediccion/riesgo-contagio'), { timeout: 30_000 }).catch(() => null);
    await irA(page, RUTA, TITULO);
    const r = await respuesta;
    const cuerpo = r ? await r.text().catch(() => '') : null;
    anotar(testInfo, 'GET /prediccion/riesgo-contagio', `HTTP ${r?.status() ?? 'sin respuesta'} · ${cuerpo === null ? 'sin cuerpo' : `${cuerpo.length} bytes`}`);
    // 2026-10-30: BLOQUEO DE AMBIENTE real, no precondición de dato — un 200 con lista vacía es
    // precondición; un error de servidor (visto como "No se pudieron cargar los cálculos de
    // contagio" en la vista, probablemente disparado por el seed nuevo) es un defecto a reportar,
    // no algo que un script de QA pueda rodear corriendo de nuevo.
    expect(r?.ok() ?? false, `BLOQUEO DE AMBIENTE: GET /prediccion/riesgo-contagio responde HTTP ${r?.status() ?? 'sin respuesta'} en vez de 200 — revisar con backend, posiblemente disparado por el seed de datos nuevo`).toBe(true);
    if (await main(page).getByRole('note').filter({ hasText: 'Datos simulados' }).isVisible()) {
      anotar(testInfo, 'Datos', 'Vista con datos simulados (DatosSimuladosBanner): el modelo de contagio aún no expone endpoints.');
    }
    const textos = (await tarjetas(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    anotar(testInfo, 'Tarjetas de lote (nombre accesible = texto del botón)', textos.join(' || '));
    // 2026-10-29: la vista ya consulta datos reales (antes mock); precondición de dato, no
    // defecto de UI, si el ambiente no tiene lotes para esta cuenta en este momento.
    precondicion(textos.length > 0, 'no hay lotes monitoreados en el ambiente para esta cuenta');
    if (textos.length === 0) return;
    // 2026-10-29: confirmado corregido — la grilla de tarjetas ahora es un <section
    // aria-labelledby="ctg-lotes"> con su propio <h2>; se verifica en vivo, no se asume fijo.
    const grilla = await tarjetas(page).first().evaluate((el) => {
      const seccion = el.closest('section');
      const nombre = seccion?.getAttribute('aria-labelledby') ?? seccion?.getAttribute('aria-label') ?? null;
      return { tieneSeccion: !!seccion, nombre };
    });
    anotar(testInfo, 'Nombre accesible de la grilla de lotes', JSON.stringify(grilla));
    desviacion(!!grilla.nombre, '2.4.6/1.3.1: la grilla de tarjetas de lote no tiene ningún heading ni aria-label que la identifique');

    const sinNivel = textos.filter((t) => !NIVEL_RE.test(t));
    expect.soft(sinNivel, '1.4.1 CRÍTICO / 4.1.2: tarjetas cuyo nivel solo se comunica por color').toEqual([]);
    const presentes = [...new Set(textos.map(nivelDe).filter(Boolean))];
    precondicion(NIVELES.every((n) => presentes.includes(n)), `faltan niveles en los lotes: ${NIVELES.filter((n) => !presentes.includes(n)).join(', ') || 'ninguno'}`);

    // Ícono distintivo por nivel (el caso acepta texto o ícono; se registra si hay ícono)
    const iconos = await tarjetas(page).evaluateAll((els) => els.map((e) => e.querySelectorAll('svg').length));
    anotar(testInfo, 'Íconos por tarjeta', iconos.join(', '));

    await escanear(page, TC_ID, __dirname, 'vista', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Detalle de un lote Alto - nivel con texto, tabla alternativa a la tendencia (1.1.1 / 1.3.1) y foco al cerrar (2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const textos = await tarjetas(page).allInnerTexts();
    const i = textos.findIndex((t) => nivelDe(t) === 'ALTO');
    precondicion(i >= 0, 'no hay ningún lote en nivel Alto');
    if (i < 0) return;

    const { tarjeta, dialogo } = await abrirLote(page, i);
    await expect.soft(dialogo.getByText(/Riesgo alto/i).first(), '1.4.1: el detalle debe nombrar el nivel como texto').toBeVisible();
    // 2026-10-27: la tabla "Historial del lote" (y su gráfica) solo se pintan en la sub-pestaña
    // "Historial del lote" del detalle (tab por defecto: "Factores del cálculo"). SubPestanas
    // (shared/design-system/SubPestanas.tsx) es un <nav> de botones, no un widget ARIA de tabs.
    await dialogo.getByRole('button', { name: 'Historial del lote', exact: true }).click();
    const historial = dialogo.getByRole('table');
    await expect.soft(historial, '1.1.1: la gráfica "Tendencia de contagio" necesita la tabla "Historial del lote" como alternativa').toBeVisible();
    if (await historial.count()) {
      const a = await auditarTabla(historial);
      anotar(testInfo, 'Historial del lote', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
      expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
      const niveles = (await textosColumna(historial, 'Nivel de riesgo de contagio')).map((n) => nivelDe(n) ?? n);
      expect.soft(niveles.filter((n) => !NIVELES.includes(n)), '1.4.1: el nivel de cada hora debe leerse como texto').toEqual([]);
    }
    await escanear(page, TC_ID, __dirname, 'detalle-alto', testInfo, PASOS_LIGHTHOUSE);
    await cerrar(page);
    const vuelve = await tarjeta.evaluate((e) => e === document.activeElement);
    expect.soft(vuelve, '2.4.3: al cerrar el detalle el foco debe volver a la tarjeta del lote').toBe(true);
  });

  test('3. confianza_baja - indicador perceptible sin color (1.4.1 / 4.1.2) y sin alerta crítica (CA-6)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const textos = (await tarjetas(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
    desviacion(textos.some((t) => CONFIANZA_BAJA.test(t)), 'ninguna tarjeta indica confianza baja: el aviso solo aparece dentro del detalle del lote');

    let encontrado = -1;
    const resumen: string[] = [];
    for (let i = 0; i < textos.length; i++) {
      const { dialogo } = await abrirLote(page, i);
      const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
      const confianza = texto.match(/Confianza \d+%/)?.[0] ?? '—';
      resumen.push(`${textos[i].split(' ')[0]}: ${confianza}${CONFIANZA_BAJA.test(texto) ? ' · aviso de datos faltantes' : ''}`);
      if (encontrado < 0 && CONFIANZA_BAJA.test(texto)) {
        encontrado = i;
        const aviso = dialogo.getByText(CONFIANZA_BAJA).first();
        await expect.soft(aviso, '1.4.1: el aviso de confianza baja debe ser texto visible, no solo color').toBeVisible();
        expect.soft(texto, 'CA-6 del RF-68: con confianza baja no se debe mostrar alerta crítica').not.toMatch(/alerta cr[ií]tica/i);
        await escanear(page, TC_ID, __dirname, 'detalle-confianza-baja', testInfo, PASOS_LIGHTHOUSE);
      }
      await cerrar(page);
    }
    anotar(testInfo, 'Lotes', resumen.join(' || '));
    precondicion(encontrado >= 0, 'ningún lote tiene confianza_baja = true (datos incompletos o desincronizados)');
  });

  test('4. Alerta RIESGO_CONTAGIO anunciada sin foco en el panel (4.1.3, buena práctica)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const vivas = await regionesVivas(page);
    const anunciada = vivas.some((v) => /contagio/i.test(v));
    anotar(testInfo, 'Regiones vivas', vivas.join(' ; ') || 'ninguna');
    // El criterio pide reportar un fallo de este punto como mejora, no como defecto
    if (!anunciada) {
      anotar(testInfo, 'MEJORA (4.1.3)', 'No hay región aria-live que anuncie la alerta RIESGO_CONTAGIO por nivel Alto; la vista simulada no genera alertas en vivo.');
    }
  });
});
