/**
 * TC-DIS-168 — Accesibilidad WCAG 2.1 AA del panel de Configuración del Motor de Inferencia por Especie
 * RF-65 · CU-02 Configurar parámetros del motor de inferencia por especie · Rol: Administrador
 * (el caso admite Veterinario) · Predicción → "Motor" (/prediccion/motor)
 *
 * Criterio (hoja M04): 0 violaciones axe A/AA en 1.3.1 (labels de umbral_riesgo_alto /
 * umbral_alerta_critica / ventana_temporal_minutos / version_modelo_activa / modo_ejecucion
 * asociados), 4.1.2 (tipo_modelo y modo_ejecucion con name/role/value), 3.3.1 (HTTP 422 "El umbral
 * debe estar entre 0.50 y 0.95." y 422 de inconsistencia umbral_alerta_critica ≥ umbral_riesgo_alto
 * anunciados) y 1.4.3 (contraste ≥4.5:1 en los mensajes de error).
 *
 * Los umbrales solo existen en los tipos de paradigma INDIVIDUAL (RFC-009): el spec usa
 * "Especies medianas". Los nombres de tipo_modelo del caso (ESPECIES_PEQUEÑAS…) son anteriores a
 * RFC-009; hoy son 6 valores y se eligen con pestañas (role="tab"), no con un select.
 *
 * PROTECCIÓN DE DATOS: una configuración guardada se propaga a los nodos Edge. Todo POST a
 * /prediccion/motor-ia se responde con 422 SIMULADO (page.route) y nunca llega al backend.
 * El 422 de inconsistencia se prueba dos veces: (a) la validación del cliente, que bloquea el envío,
 * y (b) la respuesta 422 del backend inyectada en un envío válido.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
// | Fecha      | Nombre        | Que se hizo                                                          |
// |------------|---------------|------------------------------------------------------------------------|
// | 2026-10-30 | Laura032005   | M04 RF-65: desambiguar alerta duplicada (global + campo) con .first() |
import { expect, test, type BrowserContext, type Locator, type Page, type Route } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  PREFIJO_API, abrirSesion, anotar, camposSinNombre, describirFoco, escanear, esGet, hayTrampaDeFoco,
  irA, main, precondicion, recorrerConTab,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-168';
const RUTA = 'prediccion/motor';
const TITULO = 'Configuración del Motor de Predicción';
const PASOS_LIGHTHOUSE = ['formulario', 'error-422-rango', 'error-inconsistencia'];

const TIPO_INDIVIDUAL = /^Especies medianas/;
const CAMPOS = ['Umbral de riesgo alto', 'Umbral de alerta crítica', 'Ventana de análisis', 'Modo de ejecución', 'Versión del modelo activo'];
const INCONSISTENCIA_CLIENTE = 'La alerta crítica debe ser mayor o igual al riesgo alto.';

const ERROR_RANGO = {
  error_code: 'UMBRAL_FUERA_DE_RANGO',
  message: 'El umbral debe estar entre 0.50 y 0.95.',
  fields: [{ field: 'umbral_riesgo_alto', message: 'El umbral debe estar entre 0.50 y 0.95.' }],
};
const ERROR_INCONSISTENCIA = {
  error_code: 'UMBRALES_INCONSISTENTES',
  message: 'umbral_alerta_critica debe ser mayor o igual que umbral_riesgo_alto.',
  fields: [{ field: 'umbral_alerta_critica', message: 'umbral_alerta_critica debe ser mayor o igual que umbral_riesgo_alto.' }],
};

const URL_MOTOR = (u: URL) => u.pathname === `${PREFIJO_API}/prediccion/motor-ia`;

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Motor → pestaña de un tipo INDIVIDUAL, con el formulario editable. */
async function abrirFormulario(page: Page) {
  await irA(page, RUTA, TITULO, esGet('/prediccion/motor-ia'));
  await main(page).getByRole('tab', { name: TIPO_INDIVIDUAL }).click();
  await expect(main(page).getByRole('slider', { name: 'Umbral de riesgo alto', exact: true })).toBeVisible();
  const soloLectura = await main(page).getByText('Solo lectura', { exact: true }).isVisible();
  precondicion(!soloLectura, 'la cuenta no puede editar la configuración del motor (permiso C sobre el recurso 41)');
}

/** Campo numérico que acompaña al slider (mismo valor; es el que se escribe con teclado). */
function numero(page: Page, nombre: string): Locator {
  return main(page).getByRole('slider', { name: nombre, exact: true }).locator('xpath=following-sibling::input[@type="number"]');
}

/** Responde todo POST al motor con `cuerpo` (422) y devuelve el contador de envíos. */
async function simular422(page: Page, cuerpo: object) {
  const estado = { envios: 0 };
  await page.route(URL_MOTOR, (r: Route) => {
    if (r.request().method() !== 'POST') return r.fallback();
    estado.envios++;
    return r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
  return estado;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Configuración del motor de inferencia (RF-65)`, () => {
  test.describe.configure({ mode: 'default' });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Formulario - 0 violaciones axe A/AA, labels de los 5 campos (1.3.1) y tipo_modelo/modo_ejecucion con name/role/value (4.1.2)', async ({}, testInfo) => {
    await abrirFormulario(page);

    const faltan: string[] = [];
    for (const nombre of CAMPOS) {
      if ((await main(page).getByLabel(nombre, { exact: true }).count()) === 0) faltan.push(nombre);
    }
    expect.soft(faltan, '1.3.1: campos sin label asociado').toEqual([]);
    const sinNombre = await camposSinNombre(main(page));
    anotar(testInfo, 'Controles sin nombre accesible', sinNombre.join(' | ') || 'ninguno');
    expect.soft(sinNombre, '1.3.1 / 4.1.2: el campo numérico junto a cada slider no tiene label: el lector lo anuncia solo como "spin button"').toEqual([]);

    // tipo_modelo: pestañas
    const pestanas = main(page).getByRole('tablist', { name: 'Tipo de modelo', exact: true }).getByRole('tab');
    const seleccionadas = await pestanas.evaluateAll((els) => els.map((e) => `${(e.textContent ?? '').trim()}=${e.getAttribute('aria-selected')}`));
    anotar(testInfo, 'tipo_modelo (pestañas)', seleccionadas.join(' | '));
    expect.soft(seleccionadas.filter((s) => s.endsWith('=true')).length, '4.1.2: exactamente una pestaña de tipo_modelo con aria-selected="true"').toBe(1);
    const paneles = await main(page).getByRole('tabpanel').count();
    expect.soft(paneles, '4.1.2: las pestañas de tipo_modelo no controlan ningún role="tabpanel" (falta aria-controls/tabpanel)').toBeGreaterThan(0);

    const modo = main(page).getByRole('combobox', { name: 'Modo de ejecución', exact: true });
    await expect.soft(modo, '4.1.2: modo_ejecucion debe ser un combobox con nombre').toBeVisible();
    anotar(testInfo, 'modo_ejecucion', `valor: ${await modo.inputValue()}`);

    await escanear(page, TC_ID, __dirname, 'formulario', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Umbral de riesgo alto fuera de rango (0.30) - HTTP 422 simulado anunciado (3.3.1) y asociado al campo', async ({}, testInfo) => {
    await abrirFormulario(page);
    await numero(page, 'Umbral de riesgo alto').fill('0.3');
    const estado = await simular422(page, ERROR_RANGO);
    anotar(testInfo, 'Datos simulados', 'POST /prediccion/motor-ia respondido con 422 (rango); nada llega al backend.');
    try {
      const guardar = main(page).getByRole('button', { name: 'Guardar configuración', exact: true });
      await expect(guardar, 'con un umbral de 0.30 el cliente no bloquea el envío').toBeEnabled();
      await guardar.click();
      await expect.poll(() => estado.envios, { message: 'El guardado debe llegar al POST simulado' }).toBe(1);
      // 2026-10-29: ahora hay 2 anuncios con el mismo texto — la alerta global y el error de
      // campo asociado (confirmado abajo con aria-invalid) — antes solo existía la global.
      const alerta = main(page).getByRole('alert').filter({ hasText: ERROR_RANGO.message }).first();
      await expect(alerta, '3.3.1: el 422 de rango debe anunciarse con role="alert"').toBeVisible();
      anotar(testInfo, 'Error', (await alerta.innerText()).replace(/\s+/g, ' '));
      const invalido = await main(page).getByRole('slider', { name: 'Umbral de riesgo alto', exact: true }).getAttribute('aria-invalid');
      expect.soft(invalido, '3.3.1: el error de "Umbral de riesgo alto" solo aparece en la alerta global, no en el campo (aria-invalid)').toBe('true');
      await escanear(page, TC_ID, __dirname, 'error-422-rango', testInfo, PASOS_LIGHTHOUSE);
    } finally {
      await page.unroute(URL_MOTOR);
    }
  });

  test('3. Alerta crítica < riesgo alto - error del cliente y 422 simulado anunciados (3.3.1)', async ({}, testInfo) => {
    await abrirFormulario(page);

    // (a) Validación del cliente: bloquea el envío
    await numero(page, 'Umbral de riesgo alto').fill('0.9');
    await numero(page, 'Umbral de alerta crítica').fill('0.6');
    const cliente = main(page).getByRole('alert').filter({ hasText: INCONSISTENCIA_CLIENTE });
    await expect(cliente, '3.3.1: la inconsistencia debe anunciarse con role="alert"').toBeVisible();
    await expect.soft(main(page).getByRole('button', { name: 'Guardar configuración', exact: true }), 'el cliente debe bloquear el guardado').toBeDisabled();
    await escanear(page, TC_ID, __dirname, 'error-inconsistencia', testInfo, PASOS_LIGHTHOUSE);

    // (b) 422 del backend sobre un envío que el cliente sí deja pasar
    await numero(page, 'Umbral de riesgo alto').fill('0.7');
    await numero(page, 'Umbral de alerta crítica').fill('0.85');
    await expect(cliente).toBeHidden();
    const estado = await simular422(page, ERROR_INCONSISTENCIA);
    anotar(testInfo, 'Datos simulados', 'POST /prediccion/motor-ia respondido con 422 (inconsistencia); nada llega al backend.');
    try {
      await main(page).getByRole('button', { name: 'Guardar configuración', exact: true }).click();
      await expect.poll(() => estado.envios, { message: 'El guardado debe llegar al POST simulado' }).toBe(1);
      // 2026-10-29: mismo caso que el 422 de rango — ahora hay 2 anuncios con el mismo texto.
      await expect(main(page).getByRole('alert').filter({ hasText: ERROR_INCONSISTENCIA.message }).first(), '3.3.1: el 422 de inconsistencia debe anunciarse con role="alert"').toBeVisible();
      await escanear(page, TC_ID, __dirname, 'error-422-inconsistencia', testInfo, PASOS_LIGHTHOUSE);
    } finally {
      await page.unroute(URL_MOTOR);
    }
  });

  test('4. Teclado - los 5 campos y modo_ejecucion operables con Tab/flechas, sin trampas de foco (2.1.1)', async ({}, testInfo) => {
    await abrirFormulario(page);
    await main(page).getByRole('tab', { name: TIPO_INDIVIDUAL }).focus();
    const recorrido = await recorrerConTab(page, 30);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    const noAlcanzados = [...CAMPOS, 'Guardar configuración'].filter((c) => !recorrido.some((f) => f.includes(`"${c}`)));
    expect.soft(noAlcanzados, '2.1.1: controles que Tab no alcanza').toEqual([]);

    // Slider con flechas
    const slider = main(page).getByRole('slider', { name: 'Umbral de riesgo alto', exact: true });
    await slider.focus();
    const antes = await slider.inputValue();
    await page.keyboard.press('ArrowRight');
    const despues = await slider.inputValue();
    anotar(testInfo, 'Slider con flechas', `${antes} → ${despues} · foco: ${await describirFoco(page)}`);
    expect.soft(despues !== antes, '2.1.1: la flecha derecha debe cambiar el umbral').toBe(true);
  });
});
