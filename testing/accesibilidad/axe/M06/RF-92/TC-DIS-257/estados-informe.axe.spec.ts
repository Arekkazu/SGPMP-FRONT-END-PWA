// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-257 RF-92: estados del informe y secciones bloqueadas       |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-257 RF-92: reejecución; «datos suficientes» y sección bloqueada simulada |
/**
 * TC-DIS-257 — Verificar accesibilidad WCAG 2.1 AA de los estados del informe (Borrador / Aprobado /
 * Archivado / Rechazado) y de las secciones bloqueadas o con advertencia
 * RF-92 · CU-011 - Generar Informe de Revelaciones NIC 41 · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/revelaciones
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (estados y marcas de sección bloqueada / advertencia /
 * datos insuficientes con texto + ícono); 1.3.1 (historial en tabla: versión, estado, fecha,
 * aprobador); 2.4.6 y 1.3.1 (encabezado por sección con su párrafo NIC 41; jerarquía correcta);
 * 2.4.1 (índice para saltar a cada sección); 4.1.2 (descarga no disponible en borrador con motivo);
 * sin enums crudos ni null.
 *
 * Ambiente: en TEST la cuenta Admin no tiene permiso para ver Revelaciones y la del Productor no puede
 * consultar los períodos (paso a). Con permiso visual simulado (revelaciones_nic41·R/U) se evalúa el
 * historial de septiembre 2026 en los cuatro estados y un borrador con datos insuficientes y alerta
 * de consistencia ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_257_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, accesoDenegado, badges, elegirPeriodo, irFinanzas, quitarSimulaciones, simularRevelaciones, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-257';
const VIEWPORTS = (process.env.TC_DIS_257_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['revelaciones-real', 'historial-borrador'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-257 — Estados del informe de revelaciones', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_257_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Revelaciones reales; precondición: período cerrado con versiones del informe', async ({}, testInfo) => {
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await escanear(page, TC_ID, __dirname, 'revelaciones-real', testInfo, LH);
    const denegado = await accesoDenegado(page);
    anotar(testInfo, 'Estado real (Admin)', denegado ? 'No tienes acceso a esta sección (sin permiso revelaciones_nic41)' : (await main(page).innerText()).slice(0, 200));
    precondicion(!denegado, 'la cuenta Admin de TEST no puede ver Revelaciones y no hay cuenta de Contador: el historial se evalúa con permiso y datos simulados (b, c)');
  });

  test('b. [1.4.1 / 1.3.1 / 4.1.2] Historial con los 4 estados y descarga solo para aprobadas (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    anotar(testInfo, 'Datos simulados', 'Permiso revelaciones_nic41·R/U; septiembre 2026 CERRADO con versiones v4 BORRADOR, v3 RECHAZADO, v2 APROBADO, v1 ARCHIVADO.');
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    await escanear(page, TC_ID, __dirname, 'historial-borrador', testInfo, LH);
    const tabla = main(page).getByRole('region', { name: /Historial|versiones/i }).locator('table');
    const t = await auditarTabla(tabla);
    const b = await badges(tabla);
    anotar(testInfo, 'Historial', `Encabezados: ${t.encabezados.join(' | ')} · estados: ${b.map((x) => x.texto).join(', ')}`);
    for (const e of ['Borrador', 'Aprobado', 'Archivado', 'Rechazado']) expect.soft(b.some((x) => x.texto === e), `1.4.1: el estado "${e}" no aparece en texto`).toBe(true);
    desviacion(b.every((x) => x.icono), '1.4.1: los badges de estado del informe no llevan ícono');
    desviacion(t.encabezados.some((e) => /aprobador|aprobad[oa] por/i.test(e)), '1.3.1: el historial no tiene la columna de aprobador');
    const descargas = await main(page).getByRole('button', { name: /^(PDF|Excel)$/ }).count();
    const motivo = await main(page).getByText(/solo .*aprobad|descarga.*aprobad/i).count();
    anotar(testInfo, 'Borrador seleccionado', `botones de descarga: ${descargas} · motivo en texto: ${motivo}`);
    expect.soft(descargas, 'Se ofrece descargar un borrador').toBe(0);
    expect.soft(motivo, '4.1.2: el borrador no explica en texto por qué no se puede descargar').toBeGreaterThan(0);
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('c. [2.4.6 / 1.3.1 / 2.4.1 / 1.4.1] Secciones del borrador: encabezados, índice y marcas de bloqueo/advertencia (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    await main(page).getByText(/Ganancias|Párr|Descripci/i).first().waitFor({ timeout: 15_000 }).catch(() => {});
    const encabezados = await main(page).locator('h1, h2, h3, h4').evaluateAll((hs) => hs.map((h) => `${h.tagName}:${(h.textContent ?? '').trim()}`));
    anotar(testInfo, 'Encabezados', encabezados.join(' | '));
    const secciones = encabezados.filter((h) => h.startsWith('H3'));
    desviacion(secciones.length > 0 && secciones.every((h) => /p[aá]rr|¶|NIIF/i.test(h)), `2.4.6: los encabezados de sección no indican su párrafo NIC 41 (${secciones.join(', ')})`);
    const niveles = encabezados.map((h) => Number(h[1]));
    const saltos = niveles.filter((n, i) => i > 0 && n > niveles[i - 1] + 1).length;
    expect.soft(saltos, '1.3.1: la jerarquía de encabezados salta niveles').toBe(0);
    const indice = await main(page).locator('nav a[href^="#"], a[href^="#rev-"]').count();
    desviacion(indice > 0, '2.4.1: no hay un índice de secciones (Párr. 40–57) para saltar con teclado');
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/datos (in)?suficientes/i.test(texto), '1.4.1: la sección con datos insuficientes no lo dice en texto');
    desviacion(/bloquead/i.test(texto), '1.4.1: no hay marca en texto de sección bloqueada por error en una fuente (ni indicación de la información de origen afectada)');
    const alerta = await main(page).locator('[role="alert"]').filter({ hasText: /difiere|consistencia/i }).count();
    expect.soft(alerta, 'La alerta de consistencia del borrador no se anuncia').toBeGreaterThan(0);
  });
});
