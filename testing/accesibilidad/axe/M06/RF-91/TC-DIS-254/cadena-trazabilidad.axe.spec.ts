// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-254 RF-91: cadena de trazabilidad de 4 niveles              |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-254 RF-91: reejecución con las líneas reales del período #241 |
/**
 * TC-DIS-254 — Verificar accesibilidad WCAG 2.1 AA de la cadena de trazabilidad de 4 niveles
 * navegable con teclado y lector de pantalla [CRÍTICO]
 * RF-91 · CU-010 - Asegurar trazabilidad contable desde telemetría hasta el asiento · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/trazabilidad → "Ver cadena" → CadenaModal
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (cadena como estructura ordenada —lista ordenada o
 * encabezados por nivel— con el nombre de cada nivel, sin depender de flechas); 1.3.2 (orden de
 * lectura: evidencia de origen → evento biológico → variación → línea de asiento); 2.1.1, 2.4.3 y
 * 2.4.7 (eslabones y su detalle alcanzables por teclado); 4.1.2 (eslabones expandibles con
 * aria-expanded); 1.1.1 (íconos con alternativa o aria-hidden); identificadores de negocio, no ids.
 *
 * Ambiente: el período real de TEST no tiene líneas de asiento (paso a). Las líneas y sus cadenas se
 * simulan: IoT con los 4 niveles, registro manual sin Nivel 1 y una línea de un activo POBLACIONAL
 * ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_254_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, LINEAS, PERIODOS, abrirSesionRol, elegirPeriodo, abrirYAuditarDialogo, cadena, cerrarConEscape, irFinanzas, quitarSimulaciones, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-254';
const VIEWPORTS = (process.env.TC_DIS_254_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['trazabilidad-real', 'cadena-iot'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function simular(page: Page) {
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/lineas$/, LINEAS);
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
  await simularGet(page, /^\/finanzas\/lineas\/\d+\/cadena$/, (u: URL) => cadena(Number(u.pathname.match(/lineas\/(\d+)/)![1])));
}

/** Estructura de la cadena dentro del diálogo abierto. */
function estructura(page: Page) {
  return page.getByRole('dialog').evaluate((d) => {
    const lista = d.querySelector('ol, ul');
    return {
      tipoLista: lista?.tagName.toLowerCase() ?? null,
      items: [...(lista?.querySelectorAll(':scope > li') ?? [])].map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim()),
      encabezados: [...d.querySelectorAll('h2, h3, h4')].map((h) => `${h.tagName}:${(h.textContent ?? '').trim()}`),
      expandibles: d.querySelectorAll('[aria-expanded]').length,
      iconosSinAlt: [...d.querySelectorAll('svg')].filter((s) => s.getAttribute('aria-hidden') !== 'true' && !s.getAttribute('aria-label') && !s.querySelector('title')).length,
      focables: [...d.querySelectorAll('button, a[href], [tabindex="0"]')].map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim()),
    };
  });
}

test.describe('TC-DIS-254 — Cadena de trazabilidad de 4 niveles', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_254_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Trazabilidad real; precondición: línea con evidencia IoT y los 4 niveles', async ({}, testInfo) => {
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    // Reejecución 2026-11-11: período real de Finca El Rosal (NIT 901458732).
    await elegirPeriodo(page, 241);
    await escanear(page, TC_ID, __dirname, 'trazabilidad-real', testInfo, LH);
    const filas = await main(page).locator('table tbody tr').count();
    anotar(testInfo, 'Estado real', `${filas} línea(s) de asiento en el período elegido`);
    precondicion(filas > 0, 'el período real no tiene líneas de asiento; la cadena se evalúa con datos simulados (b, c)');
  });

  test('b. [1.3.1 / 1.3.2 / 4.1.2 / 1.1.1 / 2.1.1] Cadena de la línea IoT abierta con teclado (Datos simulados)', async ({}, testInfo) => {
    await simular(page);
    anotar(testInfo, 'Datos simulados', '5 líneas de noviembre 2026; la #601 (BOV-101, variación por transformación biológica) tiene evidencia IoT y la cadena completa.');
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    const ver = main(page).getByRole('button', { name: /cadena/i }).first();
    const nombre = await ver.getAttribute('aria-label');
    anotar(testInfo, 'Botón de la fila', nombre ?? '(sin aria-label)');
    const d = await abrirYAuditarDialogo(page, ver);
    expect(d.abierto, 'La cadena no se abre con teclado').toBe(true);
    await page.getByRole('dialog').getByText(/Eslabones|cadena/i).first().waitFor({ timeout: 10_000 }).catch(() => {});
    await escanear(page, TC_ID, __dirname, 'cadena-iot', testInfo, LH);
    const e = await estructura(page);
    anotar(testInfo, 'Estructura', `lista=${e.tipoLista} · encabezados: ${e.encabezados.join(' | ')} · expandibles: ${e.expandibles}`);
    anotar(testInfo, 'Eslabones (orden de lectura)', e.items.join(' → '));
    anotar(testInfo, 'Foco en el diálogo', d.recorrido.join(' → '));

    desviacion(e.tipoLista === 'ol' || e.encabezados.filter((h) => /nivel/i.test(h)).length >= 4, '1.3.1: la cadena no es una lista ordenada ni tiene un encabezado por nivel (usa una lista no ordenada)');
    desviacion(e.items.filter((i) => /nivel\s*[1-4]/i.test(i)).length >= 4, `1.3.1: los eslabones no se nombran por nivel (Nivel 1 captura física … Nivel 4 registro contable): ${e.items.join(' | ')}`);
    const orden = [/lectura|captura|IoT/i, /evento/i, /variaci|precio/i, /asiento|comprobante|cierre/i].map((re) => e.items.findIndex((i) => re.test(i)));
    desviacion(orden.every((x, i) => x >= 0 && (i === 0 || x > orden[i - 1])), `1.3.2: el orden de lectura no sigue evidencia → evento → variación → línea de asiento (${e.items.join(' → ')})`);
    desviacion(e.expandibles > 0, '4.1.2/2.1.1: los eslabones no se pueden expandir para ver su detalle (sin aria-expanded ni controles por eslabón)');
    expect.soft(e.iconosSinAlt, '1.1.1: íconos de la cadena sin alternativa ni aria-hidden').toBe(0);
    desviacion(e.items.some((i) => /\b(4501|33|77)\b/.test(i)) || e.items.some((i) => /BOV-101|Pesaje|NIC41-/.test(i)),
      'los eslabones no muestran su identificador de negocio ni su evidencia (solo "registrado"/"falta")');
    const crudos = await textosCrudos(page.getByRole('dialog'));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos en la cadena → ${crudos.join(' ¦ ')}`);
    await cerrarConEscape(page, ver);
  });

  test('c. [1.3.1] Línea de registro manual (sin Nivel 1) y línea de un activo POBLACIONAL (Datos simulados)', async ({}, testInfo) => {
    await simular(page);
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    const botones = main(page).getByRole('button', { name: /cadena/i });
    // #602 registro manual
    await abrirYAuditarDialogo(page, botones.nth(1));
    await page.waitForTimeout(500);
    const manual = await estructura(page);
    anotar(testInfo, 'Línea manual (#602)', manual.items.join(' → '));
    desviacion(manual.items.some((i) => /no requerido/i.test(i)), '1.3.1: el Nivel 1 de un registro manual no se anuncia como "No requerido para este tipo de evidencia"');
    await cerrarConEscape(page, botones.nth(1));
    // #603 activo poblacional
    await abrirYAuditarDialogo(page, botones.nth(2));
    await page.waitForTimeout(500);
    const texto = await page.getByRole('dialog').innerText();
    anotar(testInfo, 'Línea poblacional (#603)', texto.replace(/\s+/g, ' ').slice(0, 300));
    desviacion(/poblacional|individual/i.test(texto), '1.3.1: la cadena no identifica si la entidad es un activo individual o poblacional');
    await cerrarConEscape(page, botones.nth(2));
  });
});
