// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-289 RF-105: bandeja de notificaciones (niveles, contador, agrupación y paginación) |
/**
 * TC-DIS-289 — Verificar accesibilidad WCAG 2.1 AA de la bandeja de notificaciones (orden por nivel
 * CRITICA, ADVERTENCIA e INFORMATIVA, contador de no leídas y agrupación)
 * RF-105 · CU-03 Gestionar notificaciones y alertas al usuario · Rol: Veterinario · Prioridad: Alta
 * Ruta: campana de la barra superior (visible en cualquier pantalla) → bandeja
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (nivel y estado nueva/leída con texto, no solo color);
 * 1.3.1 (lista con estructura); 4.1.2 (nombre y valor de la campana y del contador); 4.1.3 (el cambio del
 * contador se anuncia); 2.1.1 (bandeja y paginación por teclado); 1.4.3.
 *
 * Datos reales: 60 notificaciones del Veterinario (Datos_Semilla §9.1). Los pasos b y c simulan esas
 * mismas 60 para controlar el orden, la agrupación y el contador; "marcar como leída" no llega al
 * backend ("Datos simulados"). Las alertas de 290 y 291 están Bloqueadas (no hay pantalla).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_289_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, precondicion } from '../../../_shared/sigabA11y';
import {
  NOTIFICACIONES_VET, abrirBandeja, abrirSesionM08, anunciosDurante, bandeja, botonCampana, describirFocoDialogo, focoVisible, irA,
  quitarSimulaciones, simularEscritura, simularNotificaciones, textosCrudos,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-289';
const VIEWPORTS = (process.env.TC_DIS_289_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['bandeja-real', 'bandeja-simulada', 'bandeja-mas'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-289 — Bandeja de notificaciones', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_289_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    if (await bandeja(page).isVisible().catch(() => false)) await page.keyboard.press('Escape');
    await quitarSimulaciones(page);
  });

  const items = () => bandeja(page).locator('article');

  /** Lo que cada notificación dice en texto (título, mensaje, si se lee "sin leer" y el nivel). */
  function leerItems() {
    return items().evaluateAll((as) => as.map((a) => {
      const texto = (a as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      const sr = [...a.querySelectorAll('.ds-sr-only, [class*="sr-only"]')].map((e) => e.textContent ?? '').join(' ');
      return {
        texto: texto.slice(0, 140),
        nivel: /cr[ií]tic|advertencia|informa/i.exec(`${texto} ${sr}`)?.[0] ?? null,
        estadoEnTexto: /sin leer|nueva|le[ií]da/i.test(`${texto} ${sr}`),
        noLeida: a.className.includes('--unread'),
      };
    }));
  }

  test('a. [1.4.1 / 1.3.1 / 4.1.2] Bandeja real: campana con contador, lista y nivel y estado en texto', async ({}, testInfo) => {
    await irA(page, 'dashboard');
    const campana = botonCampana(page);
    const nombre = await campana.getAttribute('aria-label');
    anotar(testInfo, 'Campana', `nombre accesible: "${nombre}" · aria-expanded=${await campana.getAttribute('aria-expanded')}`);
    precondicion(/sin leer/.test(nombre ?? ''), 'el Veterinario de TEST no tiene notificaciones sin leer (Datos_Semilla §9.1)');
    expect.soft(nombre, '4.1.2: la campana no dice cuántas notificaciones hay sin leer').toMatch(/^Notificaciones( \(\d+\+? sin leer\))?$/);
    const b = await abrirBandeja(page);
    expect.soft(await describirFocoDialogo(page), '2.4.3: al abrir la bandeja el foco no entra en ella').toContain('(diálogo)');
    expect.soft(await campana.getAttribute('aria-expanded'), '4.1.2: la campana no indica que la bandeja está abierta').toBe('true');
    await escanear(page, TC_ID, __dirname, 'bandeja-real', testInfo, LH);
    const lista = await leerItems();
    anotar(testInfo, 'Notificaciones', `${lista.length} visibles · resumen: ${(await b.locator('header p').first().innerText().catch(() => '')).trim()}`);
    precondicion(lista.length > 0, 'la bandeja está vacía');
    desviacion(await b.locator('ul, ol, [role="list"]').count() > 0, '1.3.1: las notificaciones no están en una lista (ul/ol o role="list")');
    desviacion(lista.every((n) => n.nivel), '1.4.1: el nivel (crítica, advertencia, informativa) no se dice en texto en cada notificación');
    desviacion(lista.filter((n) => n.noLeida).every((n) => n.estadoEnTexto), '1.4.1: "sin leer" solo se distingue por el punto de color y la negrita');
    const crudos = await textosCrudos(b);
    const eventoN = lista.filter((n) => /Evento \d+/.test(n.texto)).map((n) => n.texto.slice(0, 40));
    desviacion(crudos.length === 0 && eventoN.length === 0, `regla de textos visibles: códigos en la bandeja → ${[...crudos, ...eventoN].join(' ¦ ')}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect.soft(await campana.evaluate((e) => document.activeElement === e), '2.4.3: al cerrar con Escape el foco no vuelve a la campana').toBe(true);
  });

  test('b. [1.4.1 / 2.1.1] Orden por nivel, agrupación y "Mostrar más" con teclado (Datos simulados)', async ({}, testInfo) => {
    await simularNotificaciones(page);
    anotar(testInfo, 'Datos simulados', `${NOTIFICACIONES_VET.length} notificaciones de §9.1 (3 críticas, 17 advertencias, 35 informativas), por fecha descendente como las entrega el backend.`);
    await irA(page, 'dashboard');
    const b = await abrirBandeja(page);
    await escanear(page, TC_ID, __dirname, 'bandeja-simulada', testInfo, LH);
    const lista = await leerItems();
    anotar(testInfo, 'Primeras 3', lista.slice(0, 3).map((n) => n.texto.slice(0, 60)).join(' ¦ '));
    desviacion(/Alerta cr[ií]tica/.test(lista[0]?.texto ?? '') && /Alerta cr[ií]tica/.test(lista[1]?.texto ?? ''), 'RF-105: las alertas críticas sin leer no van primero (el orden es solo por fecha)');
    const humedad = lista.filter((n) => /Humedad alta/.test(n.texto)).length;
    desviacion(humedad <= 1, `RF-105: las ${humedad} advertencias de "Humedad alta" del mismo activo no se agrupan`);
    const mas = b.getByRole('button', { name: 'Mostrar más' });
    precondicion(await mas.count() > 0, 'la bandeja no ofrece "Mostrar más" con 55 notificaciones');
    if (!(await mas.count())) return;
    await mas.focus();
    expect.soft(await focoVisible(page), '2.4.7: "Mostrar más" no muestra el foco').toBe(true);
    const antes = await items().count();
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    await page.waitForTimeout(500);
    const despues = await items().count();
    await escanear(page, TC_ID, __dirname, 'bandeja-mas', testInfo, LH);
    anotar(testInfo, 'Mostrar más', `${antes} → ${despues} · foco: ${await describirFocoDialogo(page)} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(despues, '2.1.1: "Mostrar más" con teclado no carga más notificaciones').toBeGreaterThan(antes);
    desviacion(despues - antes >= 30 || antes >= 50, 'RF-105: la bandeja pagina de a 20, no de a 50');
    expect.soft(await describirFocoDialogo(page), '2.4.3: tras "Mostrar más" el foco sale de la bandeja').toContain('(diálogo)');
  });

  test('c. [4.1.3 / 4.1.2] Marcar como leída con teclado: el contador cambia y se anuncia (Datos simulados)', async ({}, testInfo) => {
    const lista = NOTIFICACIONES_VET.map((n) => ({ ...n }));
    await simularNotificaciones(page, lista);
    await simularEscritura(page, /^\/notificaciones\/\d+\/leida$/, 200, { ...lista[0], es_leido: true });
    // Tras marcar, la app vuelve a pedir la lista: se refleja la notificación ya leída.
    page.on('request', (r) => {
      const m = /\/notificaciones\/(\d+)\/leida$/.exec(new URL(r.url()).pathname);
      if (m && r.method() === 'PATCH') { const n = lista.find((x) => x.id_notificacion === Number(m[1])); if (n) n.es_leido = true; }
    });
    anotar(testInfo, 'Datos simulados', 'PATCH /notificaciones/{id}/leida responde 200 sin llegar al backend.');
    await irA(page, 'dashboard');
    const campana = botonCampana(page);
    const antes = await campana.getAttribute('aria-label');
    const b = await abrirBandeja(page);
    const resumenAntes = (await b.locator('header p').first().innerText()).trim();
    const marcar = b.getByRole('button', { name: /^Marcar como leída:/ }).first();
    const nombre = await marcar.getAttribute('aria-label');
    await marcar.focus();
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    await page.waitForTimeout(500);
    const resumenDespues = (await b.locator('header p').first().innerText()).trim();
    const foco = await describirFocoDialogo(page);
    anotar(testInfo, 'Marcar como leída', `botón: "${nombre}" · ${resumenAntes} → ${resumenDespues} · campana: "${antes}" → "${await campana.getAttribute('aria-label')}" · foco: ${foco} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(resumenDespues, 'El contador de no leídas no cambió').not.toBe(resumenAntes);
    desviacion(await estaEnRegionViva(b.locator('header p').first()) || vistos.some((a) => /sin leer|le[ií]da/i.test(a)), '4.1.3: el cambio del contador de no leídas no se anuncia');
    desviacion(foco.includes('(diálogo)') && !/^body/.test(foco), `2.4.3: al marcar como leída el botón desaparece y el foco se pierde (queda en ${foco})`);
  });
});
