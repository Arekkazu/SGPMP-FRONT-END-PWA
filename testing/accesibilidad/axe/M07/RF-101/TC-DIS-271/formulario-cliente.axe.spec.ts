// | Fecha      | Nombre      | Que se hizo                                                              |
// |------------|-------------|--------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-271 RF-101: formulario de registro y edición de cliente externo   |
// | 2026-11-22 | Laura032005 | TC-DIS-271 RF-101: el título de la pantalla pasó a «Sistemas externos» (1.5.0-rc.1) |
// | 2026-11-23 | Laura032005 | TC-DIS-271 RF-101: «Guardar» valida al pulsarlo y el rechazo duplicado necesita fecha de vencimiento y un canal (1.5.1) |
/**
 * TC-DIS-271 — Verificar accesibilidad WCAG 2.1 AA del formulario de registro y edición de cliente
 * externo (campos obligatorios, validaciones y errores)
 * RF-101 · CU-06 Autenticar usuario mediante IAM federado (SSO) · Rol: Administrador · Prioridad: Alta
 * Ruta: /integracion/clientes → "Registrar sistema" / "Editar <sistema>"
 *
 * Criterio: 0 violaciones axe A/AA en 3.3.2 (etiquetas visibles e indicación de obligatorio); 3.3.1
 * (errores en texto asociados por aria-describedby); 4.1.3 (errores anunciados); 2.1.1 (registro y
 * edición solo con teclado); 2.4.3 (foco entra al abrir y vuelve al disparador al cerrar); 4.1.2.
 *
 * Errores: ningún canal, sin fecha de vencimiento y duración fuera de 5–60 min se provocan en el
 * formulario; la red con formato CIDR inválido (400) y el nombre duplicado (409) se simulan. Registrar
 * o editar no llega al backend ("Datos simulados"). Datos reales: clientes QA_* (Datos_Semilla §4).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_271_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, escanear, hayTrampaDeFoco, main, precondicion, recorrerConTab } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, accesoDenegado, alertas, auditarCampo, cerrarConEscape, describirFocoDialogo, dialogo, errorApi, irIntegracion,
  quitarSimulaciones, simularClientes, simularEscritura,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-271';
const VIEWPORTS = (process.env.TC_DIS_271_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['registro-vacio', 'registro-errores', 'edicion'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-271 — Formulario de registro y edición de cliente externo', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_271_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await page.keyboard.press('Escape').catch(() => {}); await quitarSimulaciones(page); } });

  async function abrirRegistro() {
    const boton = main(page).getByRole('button', { name: 'Registrar sistema' });
    await boton.focus();
    await page.keyboard.press('Enter');
    await dialogo(page).waitFor({ state: 'visible' });
    return { d: dialogo(page), boton };
  }

  test('a. [3.3.2 / 2.4.3 / 4.1.2] Formulario de registro: etiquetas, requeridos y foco (clientes reales)', async ({}, testInfo) => {
    await irIntegracion(page, 'clientes', /Sistemas externos|Acceso de AgroFusion/);
    const denegado = await accesoDenegado(page).isVisible();
    precondicion(!denegado, 'el Administrador de TEST no tiene permiso sobre clientes_externos');
    if (denegado) { await escanear(page, TC_ID, __dirname, 'registro-vacio', testInfo, LH); return; }
    const { d, boton } = await abrirRegistro();
    const focoInicial = await describirFocoDialogo(page);
    await escanear(page, TC_ID, __dirname, 'registro-vacio', testInfo, LH);
    expect.soft(focoInicial, '2.4.3: al abrir, el foco no entra al formulario').toContain('(diálogo)');
    expect.soft(await camposSinNombre(d), '3.3.2: campos sin nombre accesible').toEqual([]);
    for (const etiqueta of [/^Nombre del sistema/, /^Código interno/, /^Identificador del sistema/, /^La credencial vence el/]) {
      const c = await auditarCampo(d, etiqueta);
      expect.soft(c.requerido && c.asterisco, `3.3.2: "${etiqueta.source}" no se marca como requerido (asterisco + aria-required)`).toBe(true);
    }
    const canales = d.getByRole('group', { name: /Qué puede hacer/i });
    desviacion(/obligatori|al menos uno/i.test(await canales.innerText()), '3.3.2: el grupo "Qué puede hacer" no indica que hay que elegir al menos un canal');
    const ttl = await auditarCampo(d, /Duración de cada acceso/);
    expect.soft(/5 y 60/.test(ttl.ayuda), '3.3.2: el rango de 5 a 60 minutos no está como ayuda vinculada').toBe(true);
    const recorrido = await recorrerConTab(page, 16);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: trampa de foco en el formulario').toBe(false);
    const esc = await cerrarConEscape(page, boton);
    expect.soft(esc.focoEnDisparador, `2.4.3: al cerrar, el foco no vuelve a "Registrar sistema" (queda en ${esc.foco})`).toBe(true);
  });

  test('b. [3.3.1 / 4.1.3] Validaciones del formulario: canal, vencimiento y duración (Datos simulados)', async ({}, testInfo) => {
    await simularClientes(page);
    await irIntegracion(page, 'clientes', /Sistemas externos|Acceso de AgroFusion/);
    const { d } = await abrirRegistro();
    for (const canal of await d.getByRole('group', { name: /Qué puede hacer/i }).getByRole('checkbox').all()) await canal.uncheck();
    await d.getByLabel(/^La credencial vence el/).fill('');
    await d.getByLabel(/Duración de cada acceso/).fill('70');
    await d.getByLabel(/Duración de cada acceso/).blur();
    // Desde 1.5.1 «Guardar» queda habilitado y valida al pulsarlo: el error de un grupo sin tocar aparece al intentar guardar.
    await d.getByRole('button', { name: 'Guardar' }).click();
    await page.waitForTimeout(300);
    await escanear(page, TC_ID, __dirname, 'registro-errores', testInfo, LH);
    const guardar = await d.getByRole('button', { name: 'Guardar' }).isDisabled();
    const vence = await auditarCampo(d, /^La credencial vence el/);
    const ttl = await auditarCampo(d, /Duración de cada acceso/);
    const avisos = await alertas(d);
    anotar(testInfo, 'Sin canal, sin vencimiento, duración 70', `Guardar deshabilitado: ${guardar} · vence: ${JSON.stringify(vence)} · duración: ${JSON.stringify(ttl)} · avisos: ${avisos.join(' ¦ ') || '(ninguno)'}`);
    desviacion(!!ttl.errorBajoCampo && ttl.invalido, '3.3.1: la duración fuera de 5–60 min no muestra error bajo el campo (solo deshabilita "Guardar")');
    desviacion(!!vence.errorBajoCampo, '3.3.1: la fecha de vencimiento vacía no muestra error bajo el campo');
    desviacion(avisos.some((a) => /canal|qué puede hacer|al menos/i.test(a)), '3.3.1: no se avisa en texto que hay que elegir al menos un canal');
  });

  test('c. [3.3.1 / 4.1.3] Rechazos del backend: red CIDR inválida y nombre duplicado (Datos simulados)', async ({}, testInfo) => {
    const casos: Array<[string, number, ReturnType<typeof errorApi>, string]> = [
      ['red inválida', 400, errorApi('IP_INVALIDA', 'La dirección o red permitida no es válida. Use el formato 203.0.113.0/24.', 'ip_permitida'), '203.0.113.0/99'],
      ['nombre duplicado', 409, errorApi('CLIENTE_DUPLICADO', 'Ya existe un sistema con el nombre QA Cliente Activo.', 'nombre'), ''],
    ];
    for (const [nombre, status, cuerpo, ip] of casos) {
      await simularClientes(page);
      await simularEscritura(page, /^\/integracion\/clientes\/?$/, status, cuerpo);
      await irIntegracion(page, 'clientes', /Sistemas externos|Acceso de AgroFusion/);
      const { d } = await abrirRegistro();
      await d.getByLabel(/^Nombre del sistema/).fill('QA Cliente Activo');
      await d.getByLabel(/^Código interno/).fill('QA_NUEVO');
      await d.getByLabel(/^Identificador del sistema/).fill('qa-nuevo');
      // La fecha de vencimiento es obligatoria: sin ella el formulario se detiene antes de enviar y el rechazo simulado no llega.
      await d.getByLabel(/^La credencial vence el/).fill('2027-12-31');
      // También exige al menos un canal: se marca el primero para que el envío llegue al rechazo simulado.
      await d.getByRole('group', { name: /Qué puede hacer/i }).getByRole('checkbox').first().check();
      if (ip) await d.getByLabel(/Dirección o red permitida/).fill(ip);
      await d.getByRole('button', { name: 'Guardar' }).click();
      await page.waitForTimeout(800);
      const avisos = await alertas(d);
      const campo = await auditarCampo(d, ip ? /Dirección o red permitida/ : /^Nombre del sistema/);
      anotar(testInfo, `Rechazo: ${nombre} (${status})`, `avisos: ${avisos.join(' ¦ ') || '(ninguno)'} · campo: ${JSON.stringify(campo)}`);
      expect.soft(avisos.length, `4.1.3: el rechazo "${nombre}" no se anuncia`).toBeGreaterThan(0);
      expect.soft(avisos.join(' '), `regla de textos visibles: el rechazo "${nombre}" muestra el código interno o el HTTP`).not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b(400|409)\b/);
      desviacion(!!campo.errorBajoCampo && campo.invalido, `3.3.1: el error "${nombre}" aparece arriba del formulario y no bajo su campo (sin aria-invalid)`);
      await page.keyboard.press('Escape');
      await quitarSimulaciones(page);
    }
  });

  test('d. [2.1.1 / 2.4.3] Edición de "QA Cliente Activo" solo con teclado (Datos simulados)', async ({}, testInfo) => {
    await simularClientes(page);
    await simularEscritura(page, /^\/integracion\/clientes\/\d+$/, 200, {});
    await irIntegracion(page, 'clientes', /Sistemas externos|Acceso de AgroFusion/);
    const editar = main(page).getByRole('button', { name: 'Editar QA Cliente Activo' });
    await editar.focus();
    await page.keyboard.press('Enter');
    const d = dialogo(page);
    await d.waitFor({ state: 'visible' });
    await escanear(page, TC_ID, __dirname, 'edicion', testInfo, LH);
    await d.getByLabel(/Duración de cada acceso/).focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('20');
    await d.getByRole('button', { name: 'Guardar' }).focus();
    await page.keyboard.press('Enter');
    const cerrado = await d.waitFor({ state: 'hidden', timeout: 8000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(400);
    const foco = await describirFocoDialogo(page);
    anotar(testInfo, 'Tras guardar la edición', `diálogo cerrado: ${cerrado} · foco: ${foco}`);
    expect.soft(cerrado, '2.1.1: la edición no se completa con teclado').toBe(true);
    desviacion(/Editar QA Cliente Activo/.test(foco), `2.4.3: tras guardar, el foco no vuelve al botón "Editar QA Cliente Activo" (queda en ${foco})`);
  });
});
