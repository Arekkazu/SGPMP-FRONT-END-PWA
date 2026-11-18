// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-273 RF-101: listado de clientes por estado y acciones suspender, reactivar y revocar |
/**
 * TC-DIS-273 — Verificar accesibilidad WCAG 2.1 AA del listado de clientes con estados ACTIVO,
 * SUSPENDIDO y REVOCADO y de las acciones suspender, reactivar y revocar [CRÍTICO]
 * RF-101 · CU-06 Autenticar usuario mediante IAM federado (SSO) · Rol: Administrador · Prioridad: Media
 * Ruta: /integracion/clientes
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados asociados); 1.4.1 (estado con
 * etiqueta textual, no solo color); 2.1.1 (acciones por teclado); 2.4.3 (foco en el diálogo de
 * confirmación y de vuelta al disparador); 4.1.3 (resultado y 409 anunciados en lenguaje claro).
 * RF-107 (acción crítica): el modal de revocación no se cierra con Escape ni con clic fuera; solo con
 * Confirmar o Cancelar.
 *
 * Datos reales: QA Cliente Activo / Suspendido / Revocado (Datos_Semilla §4). Suspender, reactivar y
 * revocar NO llegan al backend: las respuestas se simulan ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_273_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, abrirYAuditarDialogo, accesoDenegado, alertas, anunciosDurante, auditarCampo, badges, cerrarConEscape, dialogo, errorApi,
  fila, irIntegracion, quitarSimulaciones, simularClientes, simularEscritura, textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-273';
const VIEWPORTS = (process.env.TC_DIS_273_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['listado-real', 'dialogo-suspender', 'dialogo-revocar'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-273 — Listado de clientes externos y cambios de estado', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_273_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await page.keyboard.press('Escape').catch(() => {}); await quitarSimulaciones(page); } });

  const tabla = () => main(page).locator('table').first();

  test('a. [1.3.1 / 1.4.1] Listado real con los tres estados', async ({}, testInfo) => {
    await irIntegracion(page, 'clientes', /Acceso de AgroFusion/);
    const denegado = await accesoDenegado(page).isVisible();
    precondicion(!denegado, 'el Administrador de TEST no tiene permiso sobre clientes_externos');
    await escanear(page, TC_ID, __dirname, 'listado-real', testInfo, LH);
    if (denegado) return;
    const t = await auditarTabla(tabla());
    const b = await badges(tabla());
    anotar(testInfo, 'Tabla', `Encabezados: ${t.encabezados.join(' | ')} · estados: ${b.map((x) => `${x.texto}${x.icono ? ' (ícono)' : ''}`).join(', ')}`);
    for (const e of ['Activo', 'Suspendido', 'Revocado']) precondicion(b.some((x) => x.texto === e), `no hay ningún sistema en estado "${e}" (Datos_Semilla §4)`);
    expect.soft(t.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(t.thEnThead, '1.3.1: la tabla no tiene encabezados en <thead>').toBe(true);
    desviacion(b.length > 0 && b.every((x) => x.icono), '1.4.1: los badges de estado del sistema no llevan ícono');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [2.1.1 / 2.4.3 / 3.3.1 / 4.1.3] Suspender por teclado: motivo obligatorio y resultado anunciado (Datos simulados)', async ({}, testInfo) => {
    await simularClientes(page);
    await simularEscritura(page, /^\/integracion\/clientes\/\d+\/suspender$/, 200, {});
    anotar(testInfo, 'Datos simulados', 'Clientes QA de §4; suspender responde 200 sin llegar al backend.');
    await irIntegracion(page, 'clientes', /Acceso de AgroFusion/);
    const disparador = main(page).getByRole('button', { name: 'Suspender QA Cliente Activo' });
    const d = await abrirYAuditarDialogo(page, disparador);
    expect(d.abierto, 'Suspender no abre un diálogo').toBe(true);
    await escanear(page, TC_ID, __dirname, 'dialogo-suspender', testInfo, LH);
    anotar(testInfo, 'Diálogo de suspensión', `nombre="${d.nombre}" · foco inicial: ${d.focoInicial} · botones: ${d.botones.join(' | ')}`);
    expect.soft(d.focoSaleDelDialogo, '2.4.3: Tab saca el foco del diálogo').toBe(false);
    const motivo = await auditarCampo(dialogo(page), /^Motivo/);
    expect.soft(motivo.requerido, '3.3.2: el motivo de la suspensión no se marca como obligatorio').toBe(true);
    await dialogo(page).getByLabel(/^Motivo/).focus();
    await dialogo(page).getByLabel(/^Motivo/).blur();
    const sinMotivo = await auditarCampo(dialogo(page), /^Motivo/);
    anotar(testInfo, 'Confirmar sin motivo', JSON.stringify(sinMotivo));
    desviacion(!!sinMotivo.errorBajoCampo, '3.3.1: confirmar sin motivo no muestra ni anuncia un error bajo el campo');
    await dialogo(page).getByLabel(/^Motivo/).fill('Prueba de suspensión QA');
    const anuncios = anunciosDurante(page, 3000);
    await dialogo(page).getByRole('button', { name: /^Suspender$/ }).click();
    const vistos = await anuncios;
    anotar(testInfo, 'Tras suspender', vistos.join(' ¦ ') || '(sin anuncio)');
    expect.soft(vistos.some((a) => /suspendido/i.test(a)), '4.1.3: el resultado de la suspensión no se anuncia').toBe(true);
  });

  test('c. [2.4.3 / RF-107] Revocar: el modal crítico no se cierra con Escape ni con clic fuera (Datos simulados)', async ({}, testInfo) => {
    await simularClientes(page);
    await irIntegracion(page, 'clientes', /Acceso de AgroFusion/);
    const disparador = main(page).getByRole('button', { name: 'Revocar QA Cliente Para Revocar 1' });
    const d = await abrirYAuditarDialogo(page, disparador);
    expect(d.abierto, 'Revocar no abre un diálogo').toBe(true);
    await escanear(page, TC_ID, __dirname, 'dialogo-revocar', testInfo, LH);
    anotar(testInfo, 'Diálogo de revocación', `rol=${d.rol} · nombre="${d.nombre}" · foco inicial: ${d.focoInicial} · texto: ${d.texto.slice(0, 160)}`);
    expect.soft(/definitiva|no se puede deshacer/i.test(d.texto), '3.3.4: el diálogo no dice que la revocación es definitiva').toBe(true);
    desviacion(/cancelar/i.test(d.focoInicial), `2.4.3: el foco inicial no queda en la acción segura (Cancelar); queda en ${d.focoInicial}`);
    const esc = await cerrarConEscape(page, disparador);
    anotar(testInfo, 'Escape', `cerrado=${esc.cerrado}`);
    desviacion(!esc.cerrado, 'RF-107 CA-05: el modal de revocación (acción crítica) se cierra con Escape');
    if (esc.cerrado) {
      await disparador.focus();
      await page.keyboard.press('Enter');
      await dialogo(page).waitFor({ state: 'visible' });
    }
    await page.mouse.click(5, 5);
    const sigue = await dialogo(page).isVisible();
    desviacion(sigue, 'RF-107 CA-05: el modal de revocación se cierra con un clic fuera del modal');
  });

  test('d. [4.1.3 / 3.3.3] Sistema revocado: sin acción de reactivar y explicación en texto (Datos simulados)', async ({}, testInfo) => {
    await simularClientes(page);
    await simularEscritura(page, /^\/integracion\/clientes\/\d+\/reactivar$/, 409, errorApi('CLIENTE_REVOCADO', 'Un sistema revocado no se puede reactivar. Registre uno nuevo.'));
    await irIntegracion(page, 'clientes', /Acceso de AgroFusion/);
    const revocado = fila(tabla(), 'QA Cliente Revocado');
    const botones = await revocado.getByRole('button').count();
    const texto = (await revocado.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Fila de QA Cliente Revocado', `${texto} · botones: ${botones}`);
    expect.soft(botones, 'Un sistema revocado ofrece acciones').toBe(0);
    desviacion(/no se puede reactivar|definitiv|registre uno nuevo/i.test(texto), '3.3.3: el sistema revocado no explica en texto que no se puede reactivar; el 409 del backend nunca se alcanza desde la interfaz');
    const reactivar = main(page).getByRole('button', { name: 'Reactivar QA Cliente Suspendido' });
    await reactivar.focus();
    await page.keyboard.press('Enter');
    await dialogo(page).waitFor({ state: 'visible' });
    await dialogo(page).getByRole('button', { name: /^Reactivar$/ }).click();
    await page.waitForTimeout(800);
    const avisos = await alertas(dialogo(page));
    anotar(testInfo, 'Reactivar con rechazo 409 simulado', avisos.join(' ¦ ') || '(sin aviso)');
    expect.soft(avisos.length, '4.1.3: el rechazo 409 al reactivar no se anuncia').toBeGreaterThan(0);
    expect.soft(avisos.join(' '), 'regla de textos visibles: el 409 muestra el código interno').not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b409\b/);
  });
});
