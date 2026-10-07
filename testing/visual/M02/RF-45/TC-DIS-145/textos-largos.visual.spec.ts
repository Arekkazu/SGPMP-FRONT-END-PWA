/**
 * TC-DIS-145 — Textos largos en "Motivo de baja" y "Motivo de transferencia" (resistencia de layout)
 * RF-45 / RF-48 · CU-09 / CU-10 · Rol: Productor (formularios e historial) y Administrador (bitácora)
 *
 * Qué se verifica, en movil / tablet / escritorio:
 *   1. Formulario "Registrar baja": motivo de >200 caracteres (con un token largo sin espacios).
 *   2. Formulario "Transferencia interna": motivo de >200 caracteres.
 *   3. Tabla: pestaña "Historial" del activo (columna Descripción, donde se muestra el motivo).
 *   4. Detalle: listado "Auditoría y trazabilidad" (columna Descripción de cada evento).
 *   Los formularios pasan por el resumen de confirmación ("Confirma la baja" / "Confirma la
 *   transferencia", flujo vigente desde 2026-10-07), que también muestra el motivo: se mide igual.
 *   En cada vista: sin overflow horizontal de la página, el contenedor de la tabla no crece por
 *   el texto largo (se compara antes/después) y el texto se ajusta (word-wrap) o se trunca con "…".
 *   Se guardan capturas antes/después en ./resultados (para adjuntar en Taiga) y en el reporte.
 *
 * PROTECCIÓN DE DATOS: la baja es irreversible y la transferencia deja historial permanente, así
 * que "Guardar" NO llega al backend: el POST se intercepta y se responde con éxito SIMULADO. Para
 * ver el motivo largo en la tabla y el detalle, a la respuesta REAL del historial (#296) y de la
 * bitácora (página 1) se le agregan dos registros SIMULADOS (baja y transferencia) con esos motivos.
 *
 * Datos: lote #296 (ACTIVO) en "Corral QA JE Origen"; destino de transferencia #51.
 * Tema: se fija Claro sirviendo GET /configuracion/personalizacion/tema(/global) (cuerpo real).
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_145_VIEWPORTS=escritorio
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_LOTE = 296;
const ID_ORIGEN = 48;
const ID_DESTINO = 51;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_145_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const DIR_RESULTADOS = path.join(__dirname, 'resultados');

// >200 caracteres, con un token largo sin espacios (referencia de laboratorio) que obliga a partir palabra
const TOKEN_LARGO = 'REF-LAB-2026-09-29-MUESTRA-SANGRE-LOTE296-PCR-NEGATIVO-ANTIBIOGRAMA-COMPLETO';
const MOTIVO_BAJA =
  `Mortalidad súbita de tres animales del lote durante la ola de calor de la última semana de septiembre; ` +
  `el veterinario descartó causa infecciosa tras la necropsia y el análisis de laboratorio ${TOKEN_LARGO}; ` +
  `se registra la baja parcial por muerte y se refuerza la ventilación del corral y el suministro de agua.`;
const MOTIVO_TRANSFERENCIA =
  `Traslado del lote completo al corral de destino por mantenimiento programado del techo y del sistema de ` +
  `bebederos del corral de origen, según la orden de trabajo ${TOKEN_LARGO}; el regreso al corral original ` +
  `se evaluará una vez el área técnica entregue el acta de cierre de obra y la verificación sanitaria.`;

const URL_BAJA = (url: URL) => /\/activos-biologicos\/\d+\/eventos\/baja$/.test(url.pathname);
const URL_TRANSFERENCIA = (url: URL) => /\/activos-biologicos\/\d+\/transferencias$/.test(url.pathname);
const URL_HISTORIAL = (url: URL) => url.pathname.endsWith(`/activos-biologicos/${ID_LOTE}/historial`);
const URL_BITACORA = (url: URL) => url.pathname.endsWith('/activos-biologicos/auditoria');
const esApi = (tipo: string) => ['xhr', 'fetch'].includes(tipo);

// Respuestas SIMULADAS de "Guardar"
const BAJA_201 = {
  id_evento: 999101, id_activo_biologico: ID_LOTE, tipo_evento: 'BAJA', fecha_evento: '2026-09-30T00:00:00Z',
  descripcion: MOTIVO_BAJA, baja: { tipo: 'muerte', cantidad_afectada: 3 },
};
const TRANSFERENCIA_201 = {
  id_movimiento: 999102, id_activo_biologico: ID_LOTE, infraestructura_origen: 'Corral QA JE Origen',
  infraestructura_destino: 'Corral QA JE Destino OK', fecha_transferencia: '2026-09-30T00:00:00Z',
  motivo_transferencia: MOTIVO_TRANSFERENCIA, mensaje: 'Transferencia registrada correctamente.',
};

// Registros SIMULADOS agregados a las respuestas reales para mostrar los motivos largos
const HISTORIAL_LARGOS = [
  { categoria: 'BAJA', fecha_evento: '2026-09-30T15:00:00Z', descripcion: MOTIVO_BAJA, detalle_especifico: null, usuario_responsable: 'Ana Ramirez', modulo_origen: 'modulo2' },
  { categoria: 'TRANSFERENCIA', fecha_evento: '2026-09-30T14:00:00Z', descripcion: MOTIVO_TRANSFERENCIA, detalle_especifico: null, usuario_responsable: 'Ana Ramirez', modulo_origen: 'modulo2' },
];
const bitacoraLarga = (id: number, rf: string, tipo: string, descripcion: string, hora: string) => ({
  id_bitacora: id, id_evento: `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`, rf_origen: rf, tipo_evento: tipo,
  clasificacion_biologica: 'GESTION_OPERATIVA', id_activo_biologico: ID_LOTE, tipo_activo: 'POBLACIONAL',
  timestamp_evento: `2026-09-30T${hora}Z`, timestamp_registro: `2026-09-30T${hora}Z`, resultado: 'EXITOSO', descripcion,
  detalle_tecnico: {}, id_usuario_responsable: 35, modulo_consumidor: 'modulo2', severidad_log: 'INFO',
  id_evento_correlacionado: null, hash_integridad: 'f'.repeat(64), registro_incompleto: false,
});
const BITACORA_LARGOS = [
  bitacoraLarga(999201, 'RF45', 'BAJA_REGISTRADA', MOTIVO_BAJA, '15:00:00'),
  bitacoraLarga(999202, 'RF48', 'TRANSFERENCIA_REGISTRADA', MOTIVO_TRANSFERENCIA, '14:00:00'),
];

const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

test.use({ locale: 'es-CO', timezoneId: 'America/Bogota' });

// ── Utilidades ───────────────────────────────────────────────────────────────

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!esApi(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/** Ningún POST de baja ni de transferencia llega al backend: éxito SIMULADO. */
async function simularGuardado(page: Page) {
  const enviados: { url: string; cuerpo: Record<string, unknown> }[] = [];
  await page.route((url) => URL_BAJA(url) || URL_TRANSFERENCIA(url), (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    enviados.push({ url: r.request().url(), cuerpo: r.request().postDataJSON() });
    const cuerpo = URL_BAJA(new URL(r.request().url())) ? BAJA_201 : TRANSFERENCIA_201;
    return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
  return enviados;
}

async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

async function abrirPestana(page: Page, pestana: string) {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('Corral QA JE Origen').first()).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: pestana, exact: true }).click();
}

interface Medicion {
  paginaDesborda: number;      // px de scroll horizontal del documento / contenedor principal
  contenedorDesborda: number;  // px de scroll horizontal del contenedor medido
  anchoContenedor: number;
}

/** Overflow horizontal de la página (documento y <main>) y del contenedor indicado. */
async function medir(page: Page, contenedor: Locator): Promise<Medicion> {
  const pagina = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('main');
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });
  const c = await contenedor.evaluate((e) => ({ desborda: e.scrollWidth - e.clientWidth, ancho: e.getBoundingClientRect().width }));
  return { paginaDesborda: pagina, contenedorDesborda: c.desborda, anchoContenedor: Math.round(c.ancho) };
}

/** DEFECTO si el motivo mostrado en el resumen de confirmación se sale de la tarjeta del modal. */
async function verificarResumen(page: Page, dlg: Locator, tarjeta: Locator, motivo: string, antes: Medicion, testInfo: TestInfo, nombre: string) {
  const dd = dlg.locator('dd').filter({ hasText: motivo.slice(0, 40) });
  await expect(dd, 'El resumen de confirmación debe mostrar el motivo completo').toHaveText(motivo);
  const resumen = await medir(page, tarjeta);
  const texto = await presentacionTexto(dd);
  await capturaEvidencia(page, tarjeta, `${nombre}-confirmacion`, testInfo);
  anotar(testInfo, 'Resumen de confirmación', { resumen, motivo: texto });
  expect.soft(resumen.contenedorDesborda, 'DEFECTO: el resumen de confirmación desborda horizontalmente con el motivo largo').toBeLessThanOrEqual(1);
  expect.soft(resumen.anchoContenedor, 'DEFECTO: el modal se ensancha en el resumen de confirmación').toBe(antes.anchoContenedor);
  expect.soft(texto.desbordaCelda, `DEFECTO: en el resumen, el token largo sin espacios (${TOKEN_LARGO.length} caracteres) se sale de su línea`).toBeLessThanOrEqual(1);
  expect.soft(resumen.paginaDesborda, 'DEFECTO: la página no debe tener overflow horizontal').toBeLessThanOrEqual(1);
}

/** Cómo se presenta el texto largo: ajuste de línea o truncamiento con "…". */
async function presentacionTexto(celda: Locator) {
  return celda.evaluate((e) => {
    const s = getComputedStyle(e);
    const rect = e.getBoundingClientRect();
    return {
      whiteSpace: s.whiteSpace,
      textOverflow: s.textOverflow,
      overflowWrap: s.overflowWrap,
      wordBreak: s.wordBreak,
      ancho: Math.round(rect.width),
      desbordaCelda: e.scrollWidth - e.clientWidth,
      lineas: Math.round(rect.height / (Number.isNaN(parseFloat(s.lineHeight)) ? parseFloat(s.fontSize) * 1.2 : parseFloat(s.lineHeight))),
      envuelve: s.whiteSpace !== 'nowrap' && rect.height > (Number.isNaN(parseFloat(s.lineHeight)) ? parseFloat(s.fontSize) * 1.2 : parseFloat(s.lineHeight)) * 1.5,
      trunca: s.textOverflow === 'ellipsis' && s.overflow !== 'visible',
    };
  });
}

async function capturaEvidencia(page: Page, objetivo: Locator, nombre: string, testInfo: TestInfo) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  // El contenido vive en un contenedor con scroll: se amplía el alto (no el ancho) para que la
  // evidencia muestre el elemento completo; no afecta las mediciones horizontales.
  const caja = await objetivo.boundingBox();
  const viewport = page.viewportSize();
  if (caja && viewport && caja.y + caja.height + 40 > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: Math.ceil(caja.y + caja.height + 40) });
  }
  fs.mkdirSync(DIR_RESULTADOS, { recursive: true });
  const archivo = path.join(DIR_RESULTADOS, `${nombre}-${testInfo.project.name}.png`);
  await objetivo.screenshot({ path: archivo, animations: 'disabled' });
  await testInfo.attach(`${nombre}-${testInfo.project.name}.png`, { path: archivo, contentType: 'image/png' });
}

function anotar(testInfo: TestInfo, tipo: string, datos: unknown) {
  testInfo.annotations.push({ type: tipo, description: JSON.stringify(datos) });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-145 - Textos largos en motivo de baja y de transferencia (RF-45, RF-48)', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_145_VIEWPORTS.`);
    expect(MOTIVO_BAJA.length, 'El motivo de baja de prueba debe superar 200 caracteres').toBeGreaterThan(200);
    expect(MOTIVO_TRANSFERENCIA.length, 'El motivo de transferencia de prueba debe superar 200 caracteres').toBeGreaterThan(200);
    await fijarTemaClaro(page);
    testInfo.annotations.push({ type: 'Datos simulados', description: 'El guardado (POST de baja y de transferencia) se responde con éxito simulado; los registros con motivo largo se agregan a las respuestas reales del historial y de la bitácora. No se registra ninguna baja ni transferencia.' });
  });

  test('1. Formulario "Registrar baja" con motivo >200 caracteres', async ({ page }, testInfo) => {
    await iniciarSesion(page, USER_EMAIL, USER_PASSWORD);
    const enviados = await simularGuardado(page);
    await abrirPestana(page, 'Eventos');
    await page.getByRole('button', { name: 'Baja', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Registrar baja' });
    await expect(dlg).toBeVisible();
    const tarjeta = dlg.locator('> div');
    const motivo = dlg.getByRole('textbox', { name: /Motivo de la baja/ });

    const antes = await medir(page, tarjeta);
    await capturaEvidencia(page, tarjeta, 'baja-formulario-antes', testInfo);
    await dlg.getByRole('combobox', { name: /Tipo de baja/ }).selectOption('muerte');
    await dlg.getByRole('spinbutton', { name: /Cantidad afectada/ }).fill('3');
    await motivo.fill(MOTIVO_BAJA);
    const despues = await medir(page, tarjeta);
    await capturaEvidencia(page, tarjeta, 'baja-formulario-despues', testInfo);
    anotar(testInfo, 'Formulario baja antes/después', { antes, despues, caracteres: (await motivo.inputValue()).length });

    expect.soft(await motivo.inputValue(), 'DEFECTO: El campo no debe recortar el texto (sin maxlength silencioso)').toBe(MOTIVO_BAJA);
    expect.soft(despues.contenedorDesborda, 'DEFECTO: El modal no debe desbordar horizontalmente con el motivo largo').toBeLessThanOrEqual(1);
    expect.soft(despues.anchoContenedor, 'DEFECTO: El modal no debe ensancharse con el motivo largo').toBe(antes.anchoContenedor);
    expect.soft(despues.paginaDesborda, 'DEFECTO: La página no debe tener overflow horizontal').toBeLessThanOrEqual(1);

    // Resumen de confirmación con el motivo largo
    await dlg.getByRole('button', { name: 'Registrar baja', exact: true }).click();
    await expect(dlg.getByRole('heading', { name: 'Confirma la baja' })).toBeVisible();
    expect(enviados.length, 'Mostrar el resumen no debe enviar la baja').toBe(0);
    await verificarResumen(page, dlg, tarjeta, MOTIVO_BAJA, antes, testInfo, 'baja');

    // Confirmar (simulado): el motivo completo viaja en el cuerpo
    await dlg.getByRole('button', { name: 'Confirmar baja', exact: true }).click();
    await expect.poll(() => enviados.length).toBe(1);
    expect(enviados[0].cuerpo.motivo_baja, 'Se envía el motivo completo').toBe(MOTIVO_BAJA);
  });

  test('2. Formulario "Transferencia interna" con motivo >200 caracteres', async ({ page }, testInfo) => {
    await iniciarSesion(page, USER_EMAIL, USER_PASSWORD);
    const enviados = await simularGuardado(page);
    await abrirPestana(page, 'Infraestructura');
    await page.getByRole('button', { name: /Transferir/ }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Transferencia interna' });
    await expect(dlg).toBeVisible();
    const destino = dlg.getByRole('combobox', { name: /Infraestructura destino/ });
    await expect(destino).toBeEnabled({ timeout: 20_000 });
    const tarjeta = dlg.locator('> div');
    const motivo = dlg.getByRole('textbox', { name: /Motivo de la transferencia/ });

    const antes = await medir(page, tarjeta);
    await capturaEvidencia(page, tarjeta, 'transferencia-formulario-antes', testInfo);
    await destino.selectOption(String(ID_DESTINO));
    await motivo.fill(MOTIVO_TRANSFERENCIA);
    const despues = await medir(page, tarjeta);
    await capturaEvidencia(page, tarjeta, 'transferencia-formulario-despues', testInfo);
    anotar(testInfo, 'Formulario transferencia antes/después', { antes, despues, caracteres: (await motivo.inputValue()).length });

    expect.soft(await motivo.inputValue(), 'DEFECTO: El campo no debe recortar el texto (sin maxlength silencioso)').toBe(MOTIVO_TRANSFERENCIA);
    expect.soft(despues.contenedorDesborda, 'DEFECTO: El modal no debe desbordar horizontalmente con el motivo largo').toBeLessThanOrEqual(1);
    expect.soft(despues.anchoContenedor, 'DEFECTO: El modal no debe ensancharse con el motivo largo').toBe(antes.anchoContenedor);
    expect.soft(despues.paginaDesborda, 'DEFECTO: La página no debe tener overflow horizontal').toBeLessThanOrEqual(1);

    // Resumen de confirmación con el motivo largo
    await dlg.getByRole('button', { name: 'Transferir', exact: true }).click();
    await expect(dlg.getByRole('heading', { name: 'Confirma la transferencia' })).toBeVisible();
    expect(enviados.length, 'Mostrar el resumen no debe enviar la transferencia').toBe(0);
    await verificarResumen(page, dlg, tarjeta, MOTIVO_TRANSFERENCIA, antes, testInfo, 'transferencia');

    // Confirmar (simulado): el motivo completo viaja en el cuerpo
    await dlg.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
    await expect.poll(() => enviados.length).toBe(1);
    expect(enviados[0].cuerpo.motivo_transferencia, 'Se envía el motivo completo').toBe(MOTIVO_TRANSFERENCIA);
    expect(enviados[0].cuerpo.infraestructura_origen_id).toBe(ID_ORIGEN);
  });

  test('3. Tabla del historial del activo con los motivos largos', async ({ page }, testInfo) => {
    await iniciarSesion(page, USER_EMAIL, USER_PASSWORD);
    let conLargos = false;
    await page.route(URL_HISTORIAL, async (r) => {
      if (!esApi(r.request().resourceType())) return r.continue();
      const real = await r.fetch();
      const cuerpo = await real.json();
      if (conLargos) cuerpo.registros = [...HISTORIAL_LARGOS, ...cuerpo.registros];
      return r.fulfill({ response: real, json: cuerpo });
    });

    await abrirPestana(page, 'Historial');
    const tabla = page.getByRole('table');
    await expect(tabla).toBeVisible();
    const contenedor = tabla.locator('xpath=..');
    const tarjeta = page.getByRole('heading', { name: 'Historial consolidado' }).locator('xpath=..');
    const antes = await medir(page, contenedor);
    await capturaEvidencia(page, tarjeta, 'historial-tabla-antes', testInfo);

    conLargos = true;
    await abrirPestana(page, 'Historial');
    const celdaBaja = tabla.getByRole('cell', { name: MOTIVO_BAJA });
    await expect(celdaBaja, 'El motivo de baja debe mostrarse en la tabla').toBeVisible();
    const despues = await medir(page, contenedor);
    await capturaEvidencia(page, tarjeta, 'historial-tabla-despues', testInfo);
    const texto = await presentacionTexto(celdaBaja);
    anotar(testInfo, 'Historial antes/después', { antes, despues, celda: texto });

    expect.soft(despues.paginaDesborda, 'DEFECTO: La página no debe tener overflow horizontal').toBeLessThanOrEqual(1);
    expect.soft(despues.contenedorDesborda - antes.contenedorDesborda, 'DEFECTO: La tabla no debe desbordar más por el motivo largo (sin overflow horizontal descontrolado)').toBeLessThanOrEqual(1);
    expect.soft(texto.envuelve || texto.trunca, 'DEFECTO: El motivo debe ajustarse en varias líneas o truncarse con "…"').toBe(true);
    expect.soft(texto.desbordaCelda, `DEFECTO: El token largo sin espacios (${TOKEN_LARGO.length} caracteres) no debe salirse de la celda`).toBeLessThanOrEqual(1);
  });

  test('4. Detalle en la bitácora de auditoría con los motivos largos', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Rol', description: 'La bitácora es exclusiva del Administrador.' });
    await iniciarSesion(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    let conLargos = false;
    await page.route(URL_BITACORA, async (r) => {
      if (!esApi(r.request().resourceType())) return r.continue();
      const real = await r.fetch();
      const cuerpo = await real.json();
      if (conLargos) cuerpo.registros = [...BITACORA_LARGOS, ...cuerpo.registros];
      return r.fulfill({ response: real, json: cuerpo });
    });

    const abrir = async () => {
      await page.goto('/activos-biologicos/auditoria');
      await expect(page.getByRole('heading', { name: 'Auditoría y trazabilidad', level: 1 })).toBeVisible({ timeout: 40_000 });
      await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });
    };
    await abrir();
    const tabla = page.getByRole('table');
    const contenedor = tabla.locator('xpath=..');
    const antes = await medir(page, contenedor);
    await capturaEvidencia(page, contenedor, 'bitacora-detalle-antes', testInfo);

    conLargos = true;
    await abrir();
    const celdaTransferencia = tabla.getByRole('cell', { name: MOTIVO_TRANSFERENCIA });
    await expect(celdaTransferencia, 'El motivo de transferencia debe mostrarse en la bitácora').toBeVisible();
    const despues = await medir(page, contenedor);
    await capturaEvidencia(page, contenedor, 'bitacora-detalle-despues', testInfo);
    const texto = await presentacionTexto(celdaTransferencia);
    anotar(testInfo, 'Bitácora antes/después', { antes, despues, celda: texto });

    expect.soft(despues.paginaDesborda, 'DEFECTO: La página no debe tener overflow horizontal').toBeLessThanOrEqual(1);
    expect.soft(despues.contenedorDesborda - antes.contenedorDesborda, 'DEFECTO: La tabla no debe desbordar más por el motivo largo (sin overflow horizontal descontrolado)').toBeLessThanOrEqual(1);
    expect.soft(texto.envuelve || texto.trunca, 'DEFECTO: El motivo debe ajustarse en varias líneas o truncarse con "…"').toBe(true);
    expect.soft(texto.desbordaCelda, `DEFECTO: El token largo sin espacios (${TOKEN_LARGO.length} caracteres) no debe salirse de la celda`).toBeLessThanOrEqual(1);
  });
});
