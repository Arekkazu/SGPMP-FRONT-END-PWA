// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-19 | Laura032005 | TC-DIS-291 RF-105: historial de notificaciones con filtros por teclado y estado vacío |
/**
 * TC-DIS-291 — Verificar accesibilidad WCAG 2.1 AA de la vista del historial de notificaciones
 * RF-105 · CU-03 Gestionar notificaciones y alertas al usuario · Rol: Veterinario · Prioridad: Media
 * Ruta: campana de la barra superior → bandeja → filtro "Estado" (Atendidas / Descartadas)
 *
 * Alcance (decisión del 2026-11-19): solo el historial. La revisión del correo de alerta crítica se eliminó del
 * caso. No hay una pantalla aparte de historial: se consulta en la bandeja eligiendo "Atendidas" o "Descartadas"
 * en el filtro "Estado", combinable con "Nivel" y "Módulo".
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (urgencia dicha en texto, no solo color); 2.1.1 (filtros por teclado);
 * 4.1.3 (estado vacío anunciado); 1.4.3; el texto de cada notificación sigue la plantilla
 * [TIPO] | [EVENTO] | [CONTEXTO] | [ACCIÓN SUGERIDA]; el estado vacío distingue "no hay notificaciones" de
 * "ninguna coincide con los filtros" (regla de filtros del proyecto). RF-105 pide el historial de 90 días.
 *
 * Datos: el paso a usa la bandeja real del Veterinario; los pasos b y c simulan notificaciones atendidas y
 * descartadas de Datos_Semilla §9.1 ("Datos simulados"). Ninguna escritura llega al backend.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_291_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva } from '../../../_shared/sigabA11y';
import {
  NOTIFICACIONES_VET, abrirBandeja, abrirSesionM08, anunciosDurante, bandeja, focoVisible, irA, quitarSimulaciones, simularGet,
  textosCrudos, type NotificacionSimulada,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-291';
const VIEWPORTS = (process.env.TC_DIS_291_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['historial-real', 'historial-atendidas', 'historial-vacio'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Historial simulado: las de §9.1 más tres atendidas y dos descartadas de los últimos días. */
function historial(): NotificacionSimulada[] {
  const lista = NOTIFICACIONES_VET.map((n) => ({ ...n }));
  const cerrar = (texto: RegExp, estado: 'ATENDIDA' | 'DESCARTADA', accion: string | null) => {
    const n = lista.find((x) => texto.test(x.mensaje) && x.estado !== 'ATENDIDA' && x.estado !== 'DESCARTADA');
    if (n) Object.assign(n, { estado, es_leido: true, accion_documentada: accion, fecha_atencion: '2026-11-17T10:00:00-05:00' });
  };
  cerrar(/Temperatura fuera de rango/, 'ATENDIDA', 'Se abrió la ventilación del corral y la temperatura bajó a 28 °C.');
  cerrar(/BOV-M08-022/, 'ATENDIDA', 'Se revisó al animal y se registró el tratamiento en su ficha.');
  cerrar(/Precio de mercado/, 'ATENDIDA', null);
  cerrar(/Reporte listo/, 'DESCARTADA', null);
  cerrar(/Precio de mercado/, 'DESCARTADA', null);
  return lista;
}

/** GET /notificaciones con los filtros de la bandeja (nivel, estado y módulo), como el backend. */
async function simularHistorial(page: Page, lista: NotificacionSimulada[]) {
  await simularGet(page, /^\/notificaciones\/?$/, (u: URL) => {
    const pagina = Number(u.searchParams.get('pagina') ?? 1);
    const tamano = Number(u.searchParams.get('tamano') ?? 50);
    const nivel = u.searchParams.get('nivel');
    const estado = u.searchParams.get('estado');
    const modulo = u.searchParams.get('modulo');
    const filtradas = lista
      .filter((n) => !nivel || n.nivel === nivel)
      .filter((n) => !modulo || n.modulo === modulo)
      .filter((n) => (estado ? n.estado === estado : ['NUEVA', 'LEIDA'].includes(n.estado)));
    return {
      total: filtradas.length, no_leidas: lista.filter((n) => n.estado === 'NUEVA').length, pagina, tamano,
      criticas_pendientes: lista.filter((n) => n.nivel === 'CRITICA' && ['NUEVA', 'LEIDA'].includes(n.estado)).length,
      items: filtradas.slice((pagina - 1) * tamano, pagina * tamano),
    };
  });
}

test.describe('TC-DIS-291 — Historial de notificaciones', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_291_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    if (await bandeja(page).isVisible().catch(() => false)) await page.keyboard.press('Escape');
    await quitarSimulaciones(page);
  });

  /** Elige una opción de un filtro de la bandeja con el teclado y espera la recarga. */
  async function filtrar(etiqueta: string, opcion: string) {
    const sel = bandeja(page).getByLabel(etiqueta, { exact: true });
    await sel.focus();
    expect.soft(await focoVisible(page), `2.4.7: el filtro "${etiqueta}" no muestra el foco`).toBe(true);
    await sel.selectOption({ label: opcion });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }

  const articulos = () => bandeja(page).locator('article');

  test('a. [2.1.1 / 4.1.3] Historial real: notificaciones atendidas del Veterinario con el filtro "Estado"', async ({}, testInfo) => {
    await irA(page, 'dashboard');
    await abrirBandeja(page);
    const opciones = await bandeja(page).getByLabel('Estado', { exact: true }).locator('option').allInnerTexts();
    anotar(testInfo, 'Opciones del filtro "Estado"', opciones.join(' | '));
    expect.soft(opciones, 'El filtro "Estado" no ofrece las atendidas').toContain('Atendidas');
    expect.soft(opciones, 'El filtro "Estado" no ofrece las descartadas').toContain('Descartadas');
    const anuncios = anunciosDurante(page, 3000);
    await filtrar('Estado', 'Atendidas');
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'historial-real', testInfo, LH);
    const n = await articulos().count();
    const vacio = (await bandeja(page).locator('.notification-tray__empty').innerText().catch(() => '')).trim();
    anotar(testInfo, 'Atendidas reales', `${n} notificaciones${vacio ? ` · vacío: "${vacio}"` : ''} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    // El Veterinario de TEST puede no tener ninguna atendida todavía: entonces se revisa el estado vacío real.
    if (!n) expect.soft(await estaEnRegionViva(bandeja(page).locator('.notification-tray__empty')), '4.1.3: el estado vacío del historial no se anuncia').toBe(true);
  });

  test('b. [1.4.1 / 2.1.1] Atendidas y descartadas: urgencia en texto, plantilla y filtros combinados con teclado (Datos simulados)', async ({}, testInfo) => {
    const lista = historial();
    await simularHistorial(page, lista);
    anotar(testInfo, 'Datos simulados', 'Bandeja de §9.1 con 3 notificaciones atendidas (2 críticas con su acción) y 2 descartadas.');
    await irA(page, 'dashboard');
    await abrirBandeja(page);
    await filtrar('Estado', 'Atendidas');
    await escanear(page, TC_ID, __dirname, 'historial-atendidas', testInfo, LH);
    const items = await articulos().evaluateAll((as) => as.map((a) => (a as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));
    anotar(testInfo, 'Atendidas', `${items.length} · ${items.slice(0, 4).map((x) => x.slice(0, 90)).join(' ¦ ')}`);
    // Con el filtro aplicado deben quedar 3; si siguen las del panel principal, el filtro no se aplicó.
    expect.soft(items.length, 'El filtro "Estado" no se aplica: la bandeja sigue mostrando el panel principal y el historial no se puede consultar (useNotificaciones: `cargar` no depende de `filtros`)').toBe(3);
    if (items.length !== 3) return;
    const criticas = items.filter((x) => /Alerta cr[ií]tica/.test(x));
    expect.soft(criticas.every((x) => /Cr[ií]tica/.test(x.replace(/Alerta cr[ií]tica/, ''))), '1.4.1: la urgencia de las críticas no se dice en texto (solo el color)').toBe(true);
    expect.soft(criticas.every((x) => /Atendida:/.test(x)), 'El historial no muestra la acción registrada de las críticas atendidas').toBe(true);
    const fueraDePlantilla = items.filter((x) => !/[^|]+\|[^|]+\|[^|]+\|[^|]+/.test(x));
    expect.soft(fueraDePlantilla, 'RF-105: notificaciones que no siguen la plantilla [TIPO] | [EVENTO] | [CONTEXTO] | [ACCIÓN]').toEqual([]);
    const sinNivel = items.filter((x) => !/Cr[ií]tica|Advertencia|Informativa/.test(x.replace(/Alerta cr[ií]tica|^Advertencia \||^Información \|/g, '')));
    desviacion(sinNivel.length === 0, `1.4.1: ${sinNivel.length} notificaciones del historial no dicen su nivel en texto`);
    expect.soft(await textosCrudos(bandeja(page)), 'regla de textos visibles: valores crudos en el historial').toEqual([]);

    // Filtros combinados con AND: atendidas + nivel crítico + módulo telemetría.
    await filtrar('Nivel', 'Crítica');
    await filtrar('Módulo', 'Telemetría');
    const combinadas = await articulos().allInnerTexts();
    anotar(testInfo, 'Atendidas · Crítica · Telemetría', combinadas.map((x) => x.replace(/\s+/g, ' ').slice(0, 80)).join(' ¦ ') || '(ninguna)');
    expect.soft(combinadas.length, 'Los filtros no se combinan (se esperaba solo la alerta de temperatura)').toBe(1);
    await filtrar('Estado', 'Descartadas');
    await filtrar('Nivel', 'Todos');
    await filtrar('Módulo', 'Todos');
    expect.soft(await articulos().count(), 'El historial no muestra las 2 descartadas').toBe(2);
    desviacion(await bandeja(page).getByRole('button', { name: /Limpiar filtros/ }).count() > 0, 'regla de filtros: no hay «Limpiar filtros» con filtros activos');
  });

  test('c. [4.1.3] Filtros sin resultados: estado vacío anunciado y que distinga "no hay" de "ninguna coincide" (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page, historial());
    await irA(page, 'dashboard');
    await abrirBandeja(page);
    await filtrar('Estado', 'Descartadas');
    const anuncios = anunciosDurante(page, 3000);
    await filtrar('Nivel', 'Crítica');
    const vistos = await anuncios;
    const vacio = bandeja(page).locator('.notification-tray__empty');
    const hayVacio = await vacio.isVisible().catch(() => false);
    anotar(testInfo, 'Notificaciones tras filtrar Descartadas · Crítica', String(await articulos().count()));
    expect.soft(hayVacio, 'No aparece el estado vacío: los filtros no se aplican y la bandeja sigue mostrando el panel principal').toBe(true);
    await escanear(page, TC_ID, __dirname, 'historial-vacio', testInfo, LH);
    const texto = (await vacio.innerText().catch(() => '')).trim();
    anotar(testInfo, 'Estado vacío (Descartadas · Crítica)', `"${texto}" · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    if (hayVacio) expect.soft(await estaEnRegionViva(vacio), '4.1.3: el estado vacío no se anuncia').toBe(true);
    if (hayVacio) desviacion(/coincid|filtro/i.test(texto), `regla de filtros: con filtros activos el vacío dice «${texto}» y no distingue "ninguna coincide con los filtros" de "no tienes notificaciones"`);
    const noventa = await bandeja(page).getByText(/90 d[ií]as|archivad|anteriores/i).count();
    desviacion(noventa > 0, 'RF-105: el historial no tiene cómo consultar notificaciones de hasta 90 días ni archivadas (la opción incluir_archivadas no tiene control en la pantalla)');
  });
});
