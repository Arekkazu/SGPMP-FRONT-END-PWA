// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-248 RF-90: formulario de costo manual con proveedor         |
/**
 * TC-DIS-248 — Verificar accesibilidad WCAG 2.1 AA del formulario de costo manual con proveedor
 * (origen del costo, datos del tercero y factura, aviso de fuente única) y de sus mensajes de error
 * por campo
 * RF-90 · CU-09 · Rol: Contador (y Administrador) · Prioridad: Alta
 * Ruta: /finanzas/costos → "Registrar costo"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (labels visibles en origen, NIT, DV, razón
 * social, prefijo, número, fecha y vencimiento; requeridos con asterisco y aria-required); 4.1.3 y
 * 3.3.2 (al cambiar el origen, los campos del proveedor se comunican sin perder el foco; aviso de
 * fuente única por aria-describedby); 4.1.2 (cuenta débito resuelta como texto/readonly etiquetado);
 * 3.3.1 y 3.3.3 (cada error debajo del campo con role="alert"; factura duplicada indica el registro
 * existente; período cerrado orienta al ajuste); 2.1.1 y 2.4.7; sin enums crudos.
 *
 * Ambiente: Admin abre el formulario real. Los errores del backend (DATOS_PROVEEDOR_INCOMPLETOS,
 * FACTURA_DUPLICADA, CUENTA_NO_CONFIGURADA, JUSTIFICACION_OBLIGATORIA, PERIODO_CONTABLE_CERRADO)
 * se simulan como respuesta del POST /costos; ningún costo se registra ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_248_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, describirFoco, escanear } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, PERIODOS, abrirSesionRol, errorApi, focoVisible, irFinanzas, quitarSimulaciones, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-248';
const VIEWPORTS = (process.env.TC_DIS_248_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['formulario-vacio', 'formulario-proveedor'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const ERRORES: [string, string, string][] = [
  ['DATOS_PROVEEDOR_INCOMPLETOS', 'Faltan datos del proveedor: el NIT debe tener entre 6 y 15 dígitos.', 'tercero_nit'],
  ['FACTURA_DUPLICADA', 'La factura FE-1203 de Vet Andina SAS ya está registrada en el costo del 05/11/2026.', 'factura_numero'],
  ['CUENTA_NO_CONFIGURADA', 'No hay cuenta contable configurada para Veterinario · Bovino en la matriz contable.', ''],
  ['JUSTIFICACION_OBLIGATORIA', 'La justificación es obligatoria para este costo.', 'justificacion'],
  ['PERIODO_CONTABLE_CERRADO', 'El período del costo está cerrado. Regístralo como ajuste en el período abierto.', 'fecha_costo'],
];

async function abrirFormulario(page: Page) {
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await irFinanzas(page, 'costos', /Costos del período/);
  const abrir = page.getByRole('button', { name: 'Registrar costo', exact: true });
  await abrir.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test.describe('TC-DIS-248 — Formulario de costo manual con proveedor', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_248_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 3.3.2 / 4.1.3] Formulario vacío y cambio de origen a "Compra a proveedor" con teclado', async ({}, testInfo) => {
    const dialogo = await abrirFormulario(page);
    anotar(testInfo, 'Datos simulados', 'Lista de activos simulada (BOV-101, BOV-102, LOTE-TIL-07) para poder elegir el destino del costo.');
    await escanear(page, TC_ID, __dirname, 'formulario-vacio', testInfo, LH);
    const origen = dialogo.locator('#co-origen');
    await origen.focus();
    await origen.selectOption({ label: 'Compra a proveedor' }).catch(() => origen.selectOption('COMPRA_PROVEEDOR'));
    await page.waitForTimeout(300);
    const focoTras = await describirFoco(page);
    anotar(testInfo, 'Foco tras cambiar el origen', focoTras);
    expect.soft(/select/.test(focoTras), '4.1.3: el foco se pierde al cambiar el origen').toBe(true);
    await escanear(page, TC_ID, __dirname, 'formulario-proveedor', testInfo, LH);

    const campos = ['#co-nit', '#co-dv', '#co-razon', '#co-prefijo', '#co-numero', '#co-ffactura', '#co-fvenc'];
    const info = await Promise.all(campos.map((c) => dialogo.locator(c).evaluate((e) => {
      const i = e as HTMLInputElement;
      return { id: i.id, label: i.labels?.[0]?.textContent?.trim() ?? '', req: i.required, ariaReq: i.getAttribute('aria-required'), describedby: i.getAttribute('aria-describedby') };
    }).catch(() => null)));
    anotar(testInfo, 'Campos del proveedor', info.map((i) => i ? `${i.id}: "${i.label}" req=${i.req} aria-required=${i.ariaReq}` : 'no aparece').join(' ¦ '));
    expect.soft(info.every(Boolean), 'Faltan campos del proveedor tras elegir "Compra a proveedor"').toBe(true);
    for (const i of info.filter((x) => x && x.req)) expect.soft(i!.ariaReq === 'true' && /\*/.test(i!.label), `3.3.2: ${i!.id} es requerido sin asterisco o sin aria-required="true"`).toBe(true);
    expect.soft(await camposSinNombre(dialogo), '1.3.1: campos sin nombre accesible').toEqual([]);

    const aparicion = await page.evaluate(() => [...document.querySelectorAll('[aria-live], [role="status"]')].some((e) => /proveedor|factura/i.test(e.textContent ?? '')));
    desviacion(aparicion, '4.1.3: la aparición de los campos del proveedor no se comunica (ninguna región viva)');
    const aviso = await dialogo.getByText(/registres manualmente|fuente única|exportación de SIGAB/i).first().evaluate((p) => {
      const id = p.id;
      return { texto: p.textContent ?? '', vinculado: !!id && !!document.querySelector(`[aria-describedby~="${id}"]`) };
    }).catch(() => ({ texto: '', vinculado: false }));
    anotar(testInfo, 'Aviso de fuente única', aviso.texto || '(no aparece)');
    expect.soft(aviso.texto, 'No se muestra el aviso de fuente única por factura').not.toBe('');
    desviacion(aviso.vinculado, '3.3.2: el aviso de fuente única no está vinculado al formulario por aria-describedby');
    const cuenta = await dialogo.getByText(/cuenta (débito|contable)/i).count();
    desviacion(cuenta > 0, '4.1.2: el formulario no muestra la cuenta débito resuelta por el sistema como dato de solo lectura');

    // 2.1.1 / 2.4.7: recorrer el formulario con Tab.
    const sinFoco: string[] = [];
    await dialogo.locator('#co-subtipo').focus();
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press('Tab');
      if (!(await focoVisible(page))) sinFoco.push(await describirFoco(page));
    }
    expect.soft([...new Set(sinFoco)], '2.4.7: controles sin foco visible').toEqual([]);
  });

  test('b. [3.3.1 / 3.3.3] Errores del cliente y del backend: ubicación y anuncio (Datos simulados)', async ({}, testInfo) => {
    let actual = ERRORES[0];
    await page.route((u) => /\/finanzas\/costos$/.test(u.pathname), (r) => (r.request().method() === 'POST'
      ? r.fulfill({ status: actual[0] === 'PERIODO_CONTABLE_CERRADO' ? 422 : actual[0] === 'FACTURA_DUPLICADA' ? 409 : 400, json: errorApi(actual[0], actual[1], actual[2] || undefined) })
      : r.fallback()));
    const dialogo = await abrirFormulario(page);
    await dialogo.locator('#co-origen').selectOption({ label: 'Compra a proveedor' }).catch(() => dialogo.locator('#co-origen').selectOption('COMPRA_PROVEEDOR'));
    await dialogo.locator('#co-monto').fill('260000');
    await dialogo.locator('#co-activo').selectOption({ index: 1 });

    // Validación del cliente: proveedor incompleto.
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    const cliente = await dialogo.locator('[role="alert"]').allInnerTexts();
    const nitError = await dialogo.locator('#co-nit').getAttribute('aria-invalid');
    anotar(testInfo, 'Validación del cliente', `${cliente.join(' ¦ ')} · aria-invalid NIT=${nitError}`);
    desviacion(nitError === 'true' && await dialogo.locator('#co-nit-err').count() > 0,
      '3.3.1: el error de proveedor incompleto sale en una alerta global al inicio del formulario, no debajo de NIT/DV/razón social/número/fecha');

    await dialogo.locator('#co-nit').fill('900456789');
    await dialogo.locator('#co-dv').fill('3');
    await dialogo.locator('#co-razon').fill('Vet Andina SAS');
    await dialogo.locator('#co-numero').fill('1203');
    await dialogo.locator('#co-ffactura').fill('2026-11-05');
    for (const e of ERRORES) {
      actual = e;
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.waitForTimeout(700);
      const alertas = (await dialogo.locator('[role="alert"]').allInnerTexts()).map((a) => a.replace(/\s+/g, ' ').trim());
      const bajoCampo = e[2] ? await dialogo.locator(`[id$="-err"]`).count() : 0;
      anotar(testInfo, `Error ${e[0]} (Datos simulados)`, `${alertas.join(' ¦ ') || '(sin anuncio)'} · mensajes bajo el campo: ${bajoCampo}`);
      expect.soft(alertas.some((a) => a.includes(e[1].slice(0, 25))), `3.3.1: el error ${e[0]} no se anuncia con role="alert"`).toBe(true);
      if (e[2]) desviacion(bajoCampo > 0, `3.3.1: el error ${e[0]} (campo ${e[2]}) no aparece debajo del campo afectado, solo en la alerta global`);
      const crudos = await textosCrudos(dialogo);
      desviacion(!crudos.some((c) => c.includes(e[0])), `el código interno ${e[0]} aparece en pantalla`);
    }
  });
});
