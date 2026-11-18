// | Fecha      | Nombre      | Que se hizo                                                                   |
// |------------|-------------|-------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-272 RF-101: secreto mostrado una sola vez al rotar (copiar, aviso y cierre) |
/**
 * TC-DIS-272 — Verificar accesibilidad WCAG 2.1 AA de la visualización única del client_secret al
 * registrar o rotar (copiar, aviso de no recuperable y cierre) [CRÍTICO]
 * RF-101 · CU-06 Autenticar usuario mediante IAM federado (SSO) · Rol: Administrador · Prioridad: Alta
 * Ruta: /integracion/clientes → "Cambiar la credencial de QA Cliente Rotacion"
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.3 (aviso de "se muestra una sola vez" y resultado de copiar
 * anunciados); 1.4.1 (aviso con texto e ícono); 1.4.3; 2.1.1 (copiar y cerrar por teclado); 4.1.2
 * (nombre del botón copiar); 2.4.3 (foco al cerrar); el motivo de la rotación es obligatorio.
 *
 * Rotar invalida de inmediato el secreto anterior (RF-101 5.7): la rotación NO llega al backend. Se
 * simula la respuesta con un secreto de prueba que no es real ("Datos simulados"); nunca se pegan
 * secretos reales en la evidencia.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_272_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main } from '../../../_shared/sigabA11y';
import {
  SECRETO_SIMULADO, abrirSesionM07, alertas, anunciosDurante, auditarCampo, describirFocoDialogo, dialogo, irIntegracion,
  quitarSimulaciones, simularClientes, simularEscritura, temaOscuro,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-272';
const VIEWPORTS = (process.env.TC_DIS_272_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['rotar-motivo', 'secreto-claro', 'secreto-oscuro'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-272 — Secreto visible una sola vez al rotar la credencial', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_272_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    await page.keyboard.press('Escape').catch(() => {});
    await quitarSimulaciones(page);
    await temaOscuro(page, false);
  });

  const disparador = () => main(page).getByRole('button', { name: 'Cambiar la credencial de QA Cliente Rotacion' });

  async function abrirRotacion() {
    await simularClientes(page);
    await simularEscritura(page, /^\/integracion\/clientes\/\d+\/rotar$/, 200, { client_secret: SECRETO_SIMULADO });
    await irIntegracion(page, 'clientes', /Acceso de AgroFusion/);
    await disparador().focus();
    await page.keyboard.press('Enter');
    await dialogo(page).waitFor({ state: 'visible' });
    return dialogo(page);
  }

  test('a. [3.3.1 / 3.3.2] Rotar sin motivo: el motivo es obligatorio y el error se asocia al campo (Datos simulados)', async ({}, testInfo) => {
    const d = await abrirRotacion();
    anotar(testInfo, 'Datos simulados', `Rotación de "QA Cliente Rotacion" respondida con un secreto de prueba (${SECRETO_SIMULADO}).`);
    await escanear(page, TC_ID, __dirname, 'rotar-motivo', testInfo, LH);
    const motivo = await auditarCampo(d, /^Motivo/);
    expect.soft(motivo.requerido && motivo.asterisco, '3.3.2: "Motivo" no se marca como obligatorio').toBe(true);
    await d.getByLabel(/^Motivo/).focus();
    await d.getByLabel(/^Motivo/).blur();
    const confirmar = d.getByRole('button', { name: 'Cambiar credencial' });
    const deshabilitado = await confirmar.isDisabled();
    const tras = await auditarCampo(d, /^Motivo/);
    anotar(testInfo, 'Sin motivo', `"Cambiar credencial" deshabilitado: ${deshabilitado} · campo: ${JSON.stringify(tras)}`);
    desviacion(!!tras.errorBajoCampo && tras.invalido, '3.3.1: confirmar sin motivo no muestra ni anuncia un error bajo el campo "Motivo"; solo deshabilita "Cambiar credencial"');
    const aviso = await alertas(d);
    expect.soft(aviso.some((a) => /deja de funcionar de inmediato/i.test(a)), '4.1.3: el aviso de que la credencial actual deja de funcionar no se anuncia').toBe(true);
  });

  test('b. [4.1.3 / 1.4.1 / 4.1.2 / 2.1.1] Secreto mostrado una vez: aviso, copiar y cierre por teclado (Datos simulados)', async ({}, testInfo) => {
    const d = await abrirRotacion();
    await d.getByLabel(/^Motivo/).fill('Rotación periódica de prueba QA');
    const anuncios = anunciosDurante(page, 3000);
    await d.getByRole('button', { name: 'Cambiar credencial' }).click();
    const vistos = await anuncios;
    const secreto = dialogo(page);
    await expect(secreto.getByRole('heading', { name: 'Credencial del sistema' })).toBeVisible();
    await escanear(page, TC_ID, __dirname, 'secreto-claro', testInfo, LH);
    const focoInicial = await describirFocoDialogo(page);
    anotar(testInfo, 'Al mostrar el secreto', `anuncios: ${vistos.join(' ¦ ') || '(ninguno)'} · foco inicial: ${focoInicial}`);
    const aviso = secreto.getByText(/No se vuelve a mostrar/);
    expect.soft(await estaEnRegionViva(aviso), '4.1.3: el aviso "No se vuelve a mostrar" no se anuncia').toBe(true);
    expect.soft(await aviso.locator('xpath=ancestor::*[@role="alert"][1]').locator('svg').count(), '1.4.1: el aviso no lleva ícono').toBeGreaterThan(0);

    const copiar = secreto.getByRole('button', { name: 'Copiar el secreto' });
    await expect.soft(copiar, '4.1.2: el botón de copiar no tiene nombre accesible').toHaveCount(1);
    await copiar.focus();
    const tras = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const copiado = await tras;
    anotar(testInfo, 'Copiar con teclado', copiado.join(' ¦ ') || '(sin anuncio)');
    desviacion(copiado.some((a) => /copiado/i.test(a)), '4.1.3: copiar con teclado no anuncia el resultado (puede fallar el portapapeles del navegador de pruebas; si falla, la UI no dice nada)');

    await temaOscuro(page, true).catch(() => {});
    await escanear(page, TC_ID, __dirname, 'secreto-oscuro', testInfo, LH);

    await secreto.getByRole('button', { name: 'Ya lo guardé' }).focus();
    await page.keyboard.press('Enter');
    await secreto.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    const foco = await describirFocoDialogo(page);
    const sigueVisible = await page.getByText(SECRETO_SIMULADO).count();
    anotar(testInfo, 'Tras cerrar', `foco: ${foco} · el secreto sigue en pantalla: ${sigueVisible > 0}`);
    expect.soft(sigueVisible, 'El secreto se puede volver a ver tras cerrar').toBe(0);
    desviacion(/Cambiar la credencial de QA Cliente Rotacion/.test(foco), `2.4.3: al cerrar, el foco no vuelve al botón que inició la rotación (queda en ${foco})`);
  });
});
