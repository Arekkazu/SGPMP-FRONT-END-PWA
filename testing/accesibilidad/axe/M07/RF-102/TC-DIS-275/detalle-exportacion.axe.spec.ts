// | Fecha      | Nombre      | Que se hizo                                                               |
// |------------|-------------|---------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-275 RF-102: detalle del evento de auditoría y exportación CSV/JSON |
/**
 * TC-DIS-275 — Verificar accesibilidad WCAG 2.1 AA del detalle del evento de auditoría y de la
 * exportación a CSV/JSON
 * RF-102 · CU-07 Gestionar auditoría y trazabilidad del módulo de integración · Rol: Administrador · Prioridad: Media
 * Ruta: /integracion/auditoria
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (detalle con pares etiqueta-valor en lenguaje del usuario:
 * identificador del evento, tipo de evento, fecha y hora, huella de integridad); 2.4.3 (foco al abrir y
 * cerrar el detalle); 2.1.1 (exportación por teclado); 4.1.3 (estado de la exportación anunciado);
 * 4.1.2; sin controles para editar o eliminar registros (append-only); sin nombres internos de columnas.
 *
 * Datos reales: eventos de §5 (con huella y con correo del usuario y NIT del titular). La exportación es
 * una lectura (GET), pero su respuesta se simula con demora para poder observar el anuncio de inicio
 * y fin ("Datos simulados"); el archivo simulado no contiene datos reales.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_275_VIEWPORTS=escritorio
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { PREFIJO_API, anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, anunciosDurante, cerrarConEscape, dialogo, guardarDescarga, irIntegracion, quitarSimulaciones, simularAuditoria,
  textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-275';
const VIEWPORTS = (process.env.TC_DIS_275_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['auditoria-detalle', 'auditoria-exportando'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-275 — Detalle del evento de auditoría y exportación', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_275_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  const tabla = () => main(page).locator('table').first();

  test('a. [1.3.1 / 2.4.3] Detalle de un evento con etiquetas en lenguaje del usuario (eventos reales)', async ({}, testInfo) => {
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    await escanear(page, TC_ID, __dirname, 'auditoria-detalle', testInfo, LH);
    const primera = tabla().locator('tbody tr').first();
    const abridor = primera.locator('a, button, [role="button"], [tabindex]').first();
    const hayDetalle = (await abridor.count()) > 0 || (await primera.getAttribute('tabindex')) !== null;
    anotar(testInfo, 'Primera fila', (await primera.innerText().catch(() => '(sin filas)')).replace(/\s+/g, ' '));
    desviacion(hayDetalle, '1.3.1 / 2.4.3: los eventos no se pueden abrir en un detalle (la tabla resume el evento en "Detalle" pero no muestra identificador ni huella de integridad)');
    if (!hayDetalle) return;
    await abridor.focus();
    await page.keyboard.press('Enter');
    const abierto = await dialogo(page).waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!abierto) return;
    const pares = await dialogo(page).locator('dt, th[scope="row"], label').allInnerTexts();
    anotar(testInfo, 'Etiquetas del detalle', pares.join(' | '));
    for (const e of [/identificador/i, /tipo de evento|evento/i, /fecha/i, /huella|integridad/i]) {
      expect.soft(pares.some((p) => e.test(p)), `1.3.1: el detalle no tiene la etiqueta ${e.source}`).toBe(true);
    }
    expect.soft(pares.join(' '), 'regla de textos visibles: el detalle muestra nombres internos de columnas').not.toMatch(/id_evento|tipo_evento|timestamp|hash_integridad/);
    const esc = await cerrarConEscape(page, abridor);
    expect.soft(esc.focoEnDisparador, '2.4.3: al cerrar el detalle, el foco no vuelve al evento').toBe(true);
  });

  test('b. [2.1.1 / 4.1.3] Exportar CSV y JSON con teclado: inicio y fin anunciados (Datos simulados)', async ({}, testInfo) => {
    await simularAuditoria(page);
    await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/integracion\/auditoria\/exportar$/.test(u.pathname), async (route) => {
      const formato = new URL(route.request().url()).searchParams.get('formato') ?? 'csv';
      await new Promise((r) => setTimeout(r, 2000));
      const cuerpo = formato === 'json' ? '[{"evento":"Consulta del documento contable","fecha":"2026-11-10"}]' : 'Evento,Fecha\nConsulta del documento contable,2026-11-10\n';
      await route.fulfill({ status: 200, body: cuerpo, headers: { 'content-type': formato === 'json' ? 'application/json' : 'text/csv', 'content-disposition': `attachment; filename="auditoria_integracion.${formato}"` } });
    });
    anotar(testInfo, 'Datos simulados', 'La exportación responde tras 2 s con un archivo de prueba de una fila.');
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    for (const formato of ['CSV', 'JSON']) {
      const boton = main(page).getByRole('button', { name: formato, exact: true });
      await expect.soft(boton, `No hay botón de exportar ${formato}`).toBeVisible();
      await boton.focus();
      const descarga = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      const anuncios = anunciosDurante(page, 3500);
      await page.keyboard.press('Enter');
      if (formato === 'CSV') await escanear(page, TC_ID, __dirname, 'auditoria-exportando', testInfo, LH);
      const vistos = await anuncios;
      const archivo = await descarga;
      const ruta = archivo ? await archivo.path().catch(() => null) : null;
      if (ruta) await guardarDescarga(__dirname, `exportado-${testInfo.project.name}.${formato.toLowerCase()}`, fs.readFileSync(ruta));
      anotar(testInfo, `Exportar ${formato}`, `descarga: ${archivo ? archivo.suggestedFilename() : '(ninguna)'} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
      expect.soft(archivo, `2.1.1: exportar ${formato} con teclado no descarga el archivo`).not.toBeNull();
      desviacion(vistos.some((a) => /export|generando|descarg|listo/i.test(a)), `4.1.3: el inicio o el fin de la exportación ${formato} no se anuncian (el botón solo muestra un spinner)`);
    }
  });

  test('c. [4.1.2] Sin controles para editar o eliminar registros (eventos reales)', async ({}, testInfo) => {
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const controles = await main(page).getByRole('button', { name: /editar|eliminar|borrar|modificar/i }).count();
    anotar(testInfo, 'Controles de edición o eliminación', String(controles));
    expect.soft(controles, 'Hay controles para editar o eliminar registros de auditoría (append-only)').toBe(0);
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });
});
