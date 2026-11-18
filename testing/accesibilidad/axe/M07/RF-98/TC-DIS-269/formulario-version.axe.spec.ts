// | Fecha      | Nombre      | Que se hizo                                                                |
// |------------|-------------|----------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-269 RF-98: formulario de nueva versión del contrato y errores por campo |
/**
 * TC-DIS-269 — Verificar accesibilidad WCAG 2.1 AA del formulario de registro de una nueva versión del
 * contrato y de sus mensajes de error por campo
 * RF-98 · CU-04 Gestionar versiones del contrato de integración · Rol: Administrador · Prioridad: Media
 * Ruta: /integracion/contrato → "Registrar versión"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (labels visibles; requeridos con asterisco y
 * aria-required; formato MAJOR.MINOR y mínimo de 30 días como ayuda vinculada por aria-describedby);
 * 4.1.2 (el selector de mappers expone name/role/value); 3.3.1 y 3.3.3 (cada error debajo de su campo
 * con role="alert" y cómo corregirlo); 4.1.3 (la aparición del plazo al elegir MAJOR se comunica);
 * 2.1.1 y 2.4.7; nunca se ofrece crear la versión como Activa; sin enums ni códigos crudos.
 *
 * Errores: versión duplicada (3.1 ya existe), formato inválido y plazo < 30 días se provocan en el
 * formulario; los rechazos del backend (duplicada 409, anexo no aprobado 422, mappers no válidos 422)
 * se simulan, porque el formulario solo ofrece anexos en revisión o aprobados y en TEST un anexo en
 * revisión es válido (RFC-030). Ninguna escritura llega al backend ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_269_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, escanear, main, recorrerConTab, hayTrampaDeFoco } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, alertas, anunciosDurante, auditarCampo, dialogo, errorApi, irIntegracion, quitarSimulaciones, simularContrato,
  simularEscritura, textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-269';
const VIEWPORTS = (process.env.TC_DIS_269_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['formulario-vacio', 'formulario-errores'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-269 — Formulario de nueva versión del contrato', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_269_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await page.keyboard.press('Escape').catch(() => {}); await quitarSimulaciones(page); } });

  async function abrirFormulario() {
    await simularContrato(page);
    await irIntegracion(page, 'contrato', /Contrato contable/);
    const boton = main(page).getByRole('button', { name: 'Registrar versión' });
    await boton.focus();
    await page.keyboard.press('Enter');
    await dialogo(page).waitFor({ state: 'visible' });
    return dialogo(page);
  }

  test('a. [1.3.1 / 3.3.2 / 4.1.2] Formulario vacío: etiquetas, requeridos y ayudas (Datos simulados)', async ({}, testInfo) => {
    const d = await abrirFormulario();
    anotar(testInfo, 'Datos simulados', 'Anexos 3.0 y 4.0 aprobados y 5.0 en borrador; versiones del escenario A.');
    await escanear(page, TC_ID, __dirname, 'formulario-vacio', testInfo, LH);
    expect.soft(await camposSinNombre(d), '1.3.1: campos sin nombre accesible').toEqual([]);
    const versionCampo = await auditarCampo(d, /^Versión/);
    const gracia = await auditarCampo(d, /Plazo de retiro/);
    anotar(testInfo, 'Campo Versión', JSON.stringify(versionCampo));
    anotar(testInfo, 'Campo Plazo', JSON.stringify(gracia));
    expect.soft(versionCampo.requerido && versionCampo.asterisco, '3.3.2: "Versión" no se marca como requerido (asterisco + aria-required)').toBe(true);
    desviacion(/MAJOR\.MINOR|\d+\.\d+|mayor\.menor/i.test(versionCampo.ayuda), '3.3.2: el formato esperado de la versión (MAJOR.MINOR, p. ej. 4.0) no está como ayuda vinculada por aria-describedby');
    expect.soft(/30/.test(gracia.ayuda), '3.3.2: el mínimo de 30 días del plazo no está como ayuda vinculada').toBe(true);
    desviacion(gracia.requerido, '3.3.2: el plazo de retiro (obligatorio en un cambio mayor) no se marca como requerido');

    const mapeadores = d.getByRole('group', { name: /Qué envía/i });
    const casillas = await mapeadores.getByRole('checkbox').evaluateAll((cs) => cs.map((c) => ({
      nombre: (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '', marcada: (c as HTMLInputElement).checked, deshabilitada: (c as HTMLInputElement).disabled,
    })));
    anotar(testInfo, 'Mappers', JSON.stringify(casillas));
    expect.soft(casillas.every((c) => c.nombre), '4.1.2: hay casillas de mappers sin nombre').toBe(true);
    desviacion(casillas.some((c) => !c.deshabilitada), '4.1.2: el selector de mappers no es operable (todas las casillas están deshabilitadas; "Facturas de compra" va fija)');
    const texto = await d.innerText();
    expect.soft(/Activa/.test(await d.locator('select').allInnerTexts().then((x) => x.join(' '))), 'El formulario ofrece crear la versión directamente como Activa').toBe(false);
    anotar(testInfo, 'Texto del formulario', texto.replace(/\s+/g, ' ').slice(0, 300));
    const crudos = await textosCrudos(d);
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [4.1.3 / 2.1.1] Elegir "Cambio mayor" muestra el plazo sin perder el foco (Datos simulados)', async ({}, testInfo) => {
    const d = await abrirFormulario();
    const tipo = d.getByLabel('Tipo de cambio');
    await tipo.selectOption('MINOR');
    expect.soft(await d.getByLabel(/Plazo de retiro/).count(), 'Con cambio menor no debería pedirse el plazo').toBe(0);
    await tipo.focus();
    const anuncios = anunciosDurante(page, 2500);
    await tipo.selectOption('MAJOR');
    const vistos = await anuncios;
    const foco = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('id') ?? document.activeElement?.tagName ?? 'body');
    anotar(testInfo, 'Al elegir MAJOR', `anuncios: ${vistos.join(' ¦ ') || '(ninguno)'} · foco: ${foco}`);
    expect.soft(await d.getByLabel(/Plazo de retiro/).count(), 'El campo de plazo no aparece al elegir cambio mayor').toBe(1);
    desviacion(vistos.some((a) => /plazo|retiro|30/i.test(a)), '4.1.3: la aparición del campo "Plazo de retiro" no se anuncia');
    expect.soft(foco, '2.4.3: el foco se pierde al cambiar el tipo').not.toBe('BODY');
    await d.getByLabel('Tipo de cambio').focus();
    const recorrido = await recorrerConTab(page, 10);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: trampa de foco en el formulario').toBe(false);
  });

  test('c. [3.3.1 / 3.3.3] Formato inválido y plazo < 30 días se explican bajo el campo (Datos simulados)', async ({}, testInfo) => {
    const d = await abrirFormulario();
    await d.getByLabel(/^Versión/).fill('4');
    await d.getByLabel(/^Versión/).blur();
    await d.getByLabel(/Plazo de retiro/).fill('15');
    await d.getByLabel(/Plazo de retiro/).blur();
    await page.waitForTimeout(300);
    const v = await auditarCampo(d, /^Versión/);
    const g = await auditarCampo(d, /Plazo de retiro/);
    const guardar = d.getByRole('button', { name: 'Guardar' });
    const deshabilitado = await guardar.isDisabled();
    anotar(testInfo, 'Formato "4" y plazo 15', `Versión: ${JSON.stringify(v)} · Plazo: ${JSON.stringify(g)} · Guardar deshabilitado: ${deshabilitado}`);
    desviacion(!!v.errorBajoCampo && v.invalido, '3.3.1: el formato de versión inválido no muestra error bajo el campo (solo deshabilita "Guardar" sin decir por qué)');
    desviacion(!!g.errorBajoCampo && g.invalido, '3.3.1: el plazo menor a 30 días no muestra error bajo el campo (solo deshabilita "Guardar")');
  });

  test('d. [3.3.1 / 3.3.3 / 4.1.3] Rechazos del backend: duplicada, anexo no aprobado, mappers (Datos simulados)', async ({}, testInfo) => {
    const rechazos: Array<[string, number, ReturnType<typeof errorApi>]> = [
      ['duplicada', 409, errorApi('VERSION_DUPLICADA', 'Ya existe la versión 3.1 del contrato.', 'contrato_version')],
      ['anexo', 422, errorApi('ANEXO_NO_APROBADO', 'El anexo de mapeo no está aprobado.', 'id_mapeo_anexo_aaef')],
      ['mappers', 422, errorApi('MAPEADORES_INVALIDOS', 'Los mappers seleccionados no están operativos.', 'mapeadores')],
    ];
    for (const [nombre, status, cuerpo] of rechazos) {
      const d = await abrirFormulario();
      await simularEscritura(page, /^\/integracion\/contratos\/?$/, status, cuerpo);
      await d.getByLabel(/^Versión/).fill(nombre === 'duplicada' ? '3.1' : '6.0');
      await d.getByRole('button', { name: 'Guardar' }).click();
      await page.waitForTimeout(800);
      if (nombre === 'duplicada') await escanear(page, TC_ID, __dirname, 'formulario-errores', testInfo, LH);
      const avisos = await alertas(d);
      const campo = nombre === 'duplicada' ? await auditarCampo(d, /^Versión/) : null;
      anotar(testInfo, `Rechazo ${nombre} (${status})`, `avisos: ${avisos.join(' ¦ ') || '(ninguno)'}${campo ? ` · campo: ${JSON.stringify(campo)}` : ''}`);
      expect.soft(avisos.length, `4.1.3: el rechazo "${nombre}" no se anuncia`).toBeGreaterThan(0);
      expect.soft(avisos.join(' '), `regla de textos visibles: el rechazo "${nombre}" muestra el código interno`).not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b(409|422)\b/);
      if (campo) desviacion(!!campo.errorBajoCampo, '3.3.1: el error de versión duplicada aparece arriba del formulario, no bajo el campo "Versión"');
      await page.keyboard.press('Escape');
      await quitarSimulaciones(page);
    }
  });
});
