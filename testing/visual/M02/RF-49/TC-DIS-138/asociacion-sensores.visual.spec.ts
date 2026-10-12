/**
 * TC-DIS-138 — Consistencia visual del formulario de Asociación de Sensores IoT
 * RF-49 v1.2 · CU-11 Asociar Sensores IoT al Activo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Sensores" → "Asociar sensor"
 *
 * Baselines nuevas por el cambio del formulario (RF-49 v1.2; tarjeta del modal o de la
 * sección, sin el fondo):
 *   - Formulario con asociación DIRECTA (activo individual #46 "A-001"), dispositivo y sensor elegidos.
 *   - Formulario con asociación POBLACIONAL (lote #130), dispositivo y sensor elegidos.
 *   - Advertencia por dispositivo desconectado tras asociar (201 con warning, SIMULADO, mensaje
 *     del RF v1.2).
 * La asociación AMBIENTAL (tipo B) se forma por la infraestructura (RF-22) y el formulario del
 * activo ya no la ofrece (#351); el test verifica que solo haya DIRECTA y POBLACIONAL.
 *
 * Dispositivo #1 "IOT-EST01-HLA-001" con sus sensores reales (listas encadenadas).
 *
 * Reejecución sobre la release 1.0.0-rc.46 (2026-10-09): los activos de QA anteriores (#296 y
 * #297 en "Corral QA JE Origen") ya no existen en TEST. Se usan el individual #46 y el lote
 * #130 (ambos ACTIVOS) en "Estanque-01" (#1), la misma infraestructura del dispositivo #1.
 *
 * PROTECCIÓN DE DATOS: todo POST /activos-biologicos/{id}/sensores se aborta o se responde
 * con el 201 simulado; no se crea ninguna asociación.
 *
 * Una baseline solo se guarda si la vista no tiene defectos: el ancho del modal según el
 * breakpoint del DS v2.0 (bottom sheet en xs/sm, máx. 480px en md, máx. 560px en lg), las
 * etiquetas de los campos (`.ds-field__label`: 12px / 600 / --text-secondary) y que todo el
 * texto use la escala tipográfica del DS se verifican antes de capturar y fallan como DEFECTO.
 * El modal tiene scroll interno (max-height 90vh): antes de capturar se amplía el alto de la
 * ventana, conservando el ancho, para que el formulario completo quede visible.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_138_VIEWPORTS=escritorio
 *
 * ── Reejecución 2026-10-10 (rc.48) ──────────────────────────────────────────
 * El defecto de etiquetas de la ronda anterior está corregido: los selects y el textarea usan
 * .ds-field__label. Se agrega verificarMarcaObligatorio (mismo hallazgo de TC-DIS-129): los 4
 * campos obligatorios son FormSelect de formControls.tsx y su asterisco hereda el color de la
 * etiqueta en vez de la marca del DS (.ds-field__req, --sem-error). DEFECTO: sin baseline del
 * formulario DIRECTA ni POBLACIONAL; la advertencia conserva la suya.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ORIGEN = 'Estanque-01'; // infraestructura #1 de ambos activos y del dispositivo #1
const ID_INFRAESTRUCTURA = 1;
const ID_DISPOSITIVO = '1';
const ESCENARIOS = [
  { tipo: 'DIRECTA', idActivo: 46, tipoActivo: 'INDIVIDUAL', descripcion: 'activo individual #46' },
  { tipo: 'POBLACIONAL', idActivo: 130, tipoActivo: 'LOTE', descripcion: 'lote #130' },
] as const;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_138_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_SENSORES = (url: URL) => /\/activos-biologicos\/\d+\/sensores$/.test(url.pathname);
const URL_SENSORES_DISPOSITIVO = (url: URL) => /\/dispositivos-iot\/\d+\/sensores$/.test(url.pathname);

// 201 SIMULADO con advertencia de dispositivo desconectado (mensaje del RF-49 v1.2)
const EXITO_CON_ADVERTENCIA = {
  id_asociacion: 999001, id_activo_biologico: 130, sensor_id: 3, dispositivo_iot_id: 1,
  id_infraestructura: 1, tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL',
  estado_asociacion: 'ACTIVA', fecha_inicio: '2026-10-07T00:00:00Z', fecha_fin: null,
  advertencia: 'Asociación registrada exitosamente. Advertencia: El dispositivo 1 se encuentra desconectado desde las 08:15:00. Las lecturas podrían no verse reflejadas de inmediato.',
};

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

// DS v2.0: escala tipográfica (todos los anchos) y etiquetas de campo
const ESCALA = [11, 12, 14, 15, 16, 18, 19, 20, 24, 26, 28];
const CAMPOS = ['Tipo de activo', 'Tipo de asociación', 'Dispositivo IoT', 'Sensor', 'Fecha de inicio', 'Motivo'];

test.use({ locale: 'es-CO', timezoneId: 'America/Bogota' });

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Asociar sensor IoT' });
}

function tarjetaModal(page: Page): Locator {
  return dialogo(page).locator('> div');
}

/** Tarjeta de la sección "Sensores IoT" con el mensaje de resultado. */
function tarjetaSeccion(page: Page): Locator {
  return page.locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Sensores IoT' }) })
    .filter({ has: page.getByRole('alert') })
    .last();
}

async function abrirFormulario(page: Page, idActivo: number) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  // Esperar la ficha: la infraestructura del activo se pasa al formulario al abrirlo
  await expect(page.getByText(ORIGEN).first()).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Sensores', exact: true }).click();
  await page.getByRole('button', { name: 'Asociar sensor', exact: true }).first().click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page).getByText(new RegExp(`Infraestructura del activo.*#${ID_INFRAESTRUCTURA}`))).toBeVisible();
}

/** Elige el dispositivo de prueba y el primer sensor de su lista (listas encadenadas). */
async function elegirDispositivoYSensor(page: Page) {
  const d = dialogo(page);
  const dispositivo = d.getByRole('combobox', { name: /Dispositivo IoT/ });
  const sensor = d.getByRole('combobox', { name: /^Sensor/ });
  await expect(dispositivo.locator(`option[value="${ID_DISPOSITIVO}"]`), `Precondición: el dispositivo #${ID_DISPOSITIVO} debe estar en la lista`).toBeAttached({ timeout: 20_000 });
  const sensores = page.waitForResponse((r) => URL_SENSORES_DISPOSITIVO(new URL(r.url())), { timeout: 15_000 }).catch(() => null);
  await dispositivo.selectOption(ID_DISPOSITIVO);
  const res = await sensores;
  if (res) expect(res.status(), 'Los sensores del dispositivo deben cargar').toBe(200);
  await expect(sensor).toBeEnabled();
  await sensor.selectOption({ index: 1 });
}

// ── Verificaciones previas a la captura ──────────────────────────────────────

/** DEFECTO si la tarjeta del modal no respeta el breakpoint del DS v2.0. */
async function verificarBreakpoint(page: Page) {
  const nombre = test.info().project.name;
  const viewport = page.viewportSize()!;
  const caja = (await tarjetaModal(page).boundingBox())!;
  test.info().annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · ${Math.round(caja.width)}×${Math.round(caja.height)} · y ${Math.round(caja.y)}` });
  if (viewport.width < 768) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
    expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${nombre} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
  } else if (viewport.width < 1200) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, md) el modal debe medir máximo 480px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(480);
  } else {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px`).toBe(560);
  }
}

/** DEFECTO si las etiquetas de los campos no usan el estilo de etiqueta del DS (12px / 600 / --text-secondary). */
async function verificarEtiquetas(page: Page) {
  const resultado = await dialogo(page).evaluate((d, campos) => {
    const ref = document.createElement('span');
    ref.style.color = 'var(--text-secondary)';
    document.body.appendChild(ref);
    const secundario = getComputedStyle(ref).color;
    ref.remove();
    return campos.map((campo) => {
      const label = [...d.querySelectorAll('label')].find((l) => (l.textContent ?? '').replace('*', '').trim() === campo);
      if (!label) return { campo, estilo: 'sin <label>', ok: false };
      const cs = getComputedStyle(label);
      return { campo, estilo: `${cs.fontSize} / ${cs.fontWeight}`, ok: cs.fontSize === '12px' && cs.fontWeight === '600' && cs.color === secundario };
    });
  }, CAMPOS);
  const distintas = resultado.filter((r) => !r.ok);
  expect.soft(
    distintas.map((r) => r.campo),
    `DEFECTO: etiquetas fuera del estilo de etiqueta del DS (.ds-field__label 12px / 600 / --text-secondary): ${distintas.map((r) => `"${r.campo}" ${r.estilo}`).join(' · ')}; en el mismo formulario conviven dos estilos de etiqueta`,
  ).toEqual([]);
}

/**
 * DEFECTO si el asterisco de los campos obligatorios no es la marca del DS (.ds-field__req,
 * color --sem-error), la misma que pinta el Input del DS en el resto de formularios.
 */
async function verificarMarcaObligatorio(page: Page) {
  const resultado = await dialogo(page).evaluate((d, campos) => {
    const ref = document.createElement('span');
    ref.style.color = 'var(--sem-error)';
    document.body.appendChild(ref);
    const error = getComputedStyle(ref).color;
    ref.remove();
    return campos.flatMap((campo) => {
      const label = [...d.querySelectorAll('label')].find((l) => (l.textContent ?? '').replace('*', '').trim() === campo);
      const marca = label ? [...label.querySelectorAll('span')].find((s) => (s.textContent ?? '').trim() === '*') : undefined;
      if (!marca) return [];
      const color = getComputedStyle(marca).color;
      return [{ campo, color, ok: color === error }];
    });
  }, CAMPOS);
  test.info().annotations.push({ type: 'Asterisco de obligatorio', description: resultado.map((r) => `"${r.campo}" ${r.color}`).join(' · ') });
  const distintas = resultado.filter((r) => !r.ok);
  expect.soft(
    distintas.map((r) => r.campo),
    `DEFECTO: el asterisco de obligatorio de ${distintas.map((r) => `"${r.campo}"`).join(', ')} no usa la marca del DS (.ds-field__req, --sem-error) y se ve del color de la etiqueta; el Input del DS lo pinta en rojo en el resto de formularios`,
  ).toEqual([]);
}

/** DEFECTO si algún texto con estilo propio del módulo usa un tamaño fuera de la escala tipográfica del DS v2.0. */
async function verificarEscala(objetivo: Locator, zona: string) {
  const fuera = await objetivo.evaluate((raiz, escala) => {
    const res: string[] = [];
    const vistos = new Set<string>();
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = (n.textContent ?? '').trim();
      const el = n.parentElement;
      // Componentes del DS (botón, alerta) se evalúan con su propio CSS, no como estilo del módulo
      if (!texto || !el || el.closest('option, label, .ds-sr-only, .ds-btn, .ds-alert')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const clave = `${fs}|${texto.slice(0, 40)}`;
      if (!escala.includes(fs) && !vistos.has(clave)) { vistos.add(clave); res.push(`"${texto.slice(0, 40)}" ${fs}px`); }
    }
    return res;
  }, ESCALA);
  expect.soft(fuera, `DEFECTO: ${zona}: texto fuera de la escala tipográfica del DS v2.0 (texto UI = body-md 14px): ${fuera.join(' · ')}`).toEqual([]);
}

/** Amplía el alto de la ventana (conservando el ancho) si el modal no cabe sin scroll. */
async function ajustarAltoParaModal(page: Page) {
  const alto = await tarjetaModal(page).evaluate((e) => e.scrollHeight);
  const viewport = page.viewportSize()!;
  const necesario = Math.ceil(alto / 0.9) + 40;
  if (necesario > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: necesario });
    await expect.poll(() => tarjetaModal(page).evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
  }
}

/** Captura el objetivo. Sin baseline si hay defectos. */
async function capturar(page: Page, objetivo: Locator, nombre: string) {
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(objetivo).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-138 - Consistencia visual - Asociación de sensores IoT (RF-49)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_138_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    // Ninguna asociación llega al backend
    await page.route(URL_SENSORES, (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  for (const esc of ESCENARIOS) {
    test(`1. Formulario con asociación ${esc.tipo} (${esc.descripcion})`, async ({ page }, testInfo) => {
      await abrirFormulario(page, esc.idActivo);
      const d = dialogo(page);
      await expect(d.getByRole('combobox', { name: /Tipo de activo/ })).toHaveValue(esc.tipoActivo);
      const tipo = d.getByRole('combobox', { name: /Tipo de asociación/ });
      await expect(tipo).toHaveValue(esc.tipo);
      // RF v1.2: el tipo AMBIENTAL va por la infraestructura (RF-22), no por este formulario
      const tipos = await tipo.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
      testInfo.annotations.push({ type: 'Tipos de asociación ofrecidos', description: tipos.join(' · ') });
      expect(tipos, 'El formulario del activo ofrece DIRECTA y POBLACIONAL').toEqual(['DIRECTA', 'POBLACIONAL']);
      await elegirDispositivoYSensor(page);

      await ajustarAltoParaModal(page);
      await verificarBreakpoint(page);
      await verificarEtiquetas(page);
      await verificarMarcaObligatorio(page);
      await verificarEscala(tarjetaModal(page), 'formulario');
      await capturar(page, tarjetaModal(page), `asociacion-${esc.tipo.toLowerCase()}.png`);
    });
  }

  test('2. Advertencia por dispositivo desconectado (201 con warning, simulado)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '201 con advertencia de dispositivo desconectado (mensaje del RF v1.2) inyectado; no se crea ninguna asociación.' });
    await page.route(URL_SENSORES, (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(EXITO_CON_ADVERTENCIA) })
        : r.continue());
    await abrirFormulario(page, 130);
    await elegirDispositivoYSensor(page);
    await dialogo(page).getByRole('button', { name: 'Asociar sensor', exact: true }).click();
    await expect(dialogo(page)).toBeHidden();
    await expect(page.getByRole('alert').filter({ hasText: 'desconectado' })).toBeVisible();

    await verificarEscala(tarjetaSeccion(page), 'sección "Sensores IoT"');
    await capturar(page, tarjetaSeccion(page), 'asociacion-advertencia-desconectado.png');
  });
});
