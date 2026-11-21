// TC-M08-G026 - RF-107 parte Playwright (CP-21 a CP-24): lo que jsdom no puede medir (recarga real al cerrar
// sesion, posicion de los avisos, forma del panel de historial e icono de sincronizacion con el modal critico).
// QA SGPMP - Evaluacion (ronda 1). Navegador real contra el frontend desplegado en TEST, cuenta Veterinario 97.
//
// Sin escrituras en TEST:
//   - Solo pasan al servidor los GET y la sesion (POST /sesiones/ una vez, POST /sesiones/refresh, DELETE /sesiones/).
//   - POST .../reportes (exportar historial sanitario) lo responde page.route: nunca llega al servidor.
//   - Cualquier otro metodo distinto de GET se aborta; si es de la API, la corrida es invalida (POST .../eventos/baja
//     incluido, aunque se pulsara "Confirmar baja" por error). POST /usuarios/me/fcm-token y hosts externos se abortan
//     y se anotan.
// Credenciales solo en memoria (QA_VET_EMAIL / QA_VET_PASSWORD, las pone el runner). Sin traza ni video.
//
// Reporte: JSON parcial propio en STAGING_DIR (parcial_playwright_TC-M08-G026[_reintentoN].json); el runner lo une
// con el parcial de Vitest. Cada checkpoint arranca en FALLA "No alcanzado".
import { test, expect, type Page, type Route, type Request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TC = 'TC-M08-G026';
const ACTIVO = 885;
const BASE = (process.env.QA_FRONT_URL ?? 'https://api.inmero.co/sigab-test/').replace(/\/?$/, '/');
const STAGING = process.env.STAGING_DIR ?? '';
const REINTENTO = Number(process.env.REINTENTO ?? '0');

type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; caso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }
const CPS: Checkpoint[] = [
  { paso: 'CP-21', caso: 'TC-M08-065 d',
    esperado: 'Al cerrar sesion con errores visibles y en cola, la cola y el historial se descartan: se llega a /login con un documento nuevo (el marcador puesto antes en window ya no existe) y no queda ningun aviso',
    fuente: 'RF-107 seccion 8.3 (la cola se descarta al cerrar sesion)' },
  { paso: 'CP-22', caso: 'TC-M08-066',
    esperado: 'Los banners de error y de exito se muestran en la parte superior de la pantalla, bajo el encabezado: borde superior del banner por debajo del AppBar y dentro del tercio superior de la ventana (1366x768)',
    fuente: 'RF-107 seccion 8.2 nivel 2 (parte superior, bajo el encabezado) y nivel 4 (parte superior); Salida (banner en la parte superior)' },
  { paso: 'CP-23', caso: 'TC-M08-065 c',
    esperado: 'El historial de la sesion se abre en un panel lateral: pegado a un borde lateral de la ventana y con al menos el 90 % de su alto',
    fuente: 'RF-107 seccion 8.3 (al hacer clic se abre un panel lateral con el historial completo)' },
  { paso: 'CP-24', caso: 'TC-M08-066 d',
    esperado: 'Con el paso "Confirma la baja" (modal critico bloqueante) abierto, el icono de sincronizacion sigue visible',
    fuente: 'RF-107 seccion 8.2 nivel 5 (nunca puede ser ocultado, incluido el modal critico); Postcondicion 4' },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));
const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const escrituras: Array<{ metodo: string; ruta: string; resultado: string }> = [];
const violaciones: string[] = [];

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso)!;
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}
function precondicion(nombre: string, ok: boolean, detalle: string): void {
  precondiciones.push({ nombre, ok, detalle });
  if (!ok) throw new Error(`Precondicion falsa: ${nombre} (${detalle})`);
}
function captura(page: Page, nombre: string): Promise<unknown> {
  if (!STAGING) return Promise.resolve();
  return page.screenshot({ path: join(STAGING, `captura_${TC}_${nombre}.png`), mask: [page.locator('.ds-appbar__right')] });
}

// ---------------------------------------------------------------------------------------------------------------
// Guardia de escrituras y respuesta simulada del exportar
// ---------------------------------------------------------------------------------------------------------------
let modoExportar: 'exito' | 'error' = 'error';
let exportados = 0;
let logins = 0;
const RESPUESTA_EXITO = {
  id_reporte: 'qa-g026-exito', tipo_reporte: 'REPORTE_HISTORICO_SANITARIO', titulo: 'Historial sanitario', formato: 'PDF',
  estado: 'GENERADO', filtros_aplicados: {}, numero_registros: 0, tamano_archivo_kb: null, checksum_sha256: null,
  mensaje: null, fecha_solicitud: null, fecha_generacion: null, fecha_expiracion: null, partes: [],
};
const RESPUESTA_ERROR = {
  error_code: 'QA_G026_SIMULADO', message: 'El servicio de reportes no está disponible en este momento. Intenta más tarde.',
  fields: [], timestamp: '2026-11-20T14:00:00Z',
};

async function guardia(route: Route, req: Request): Promise<void> {
  const metodo = req.method();
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return route.continue();
  const url = new URL(req.url());
  const ruta = url.pathname;
  if (/googleapis\.com|gstatic\.com|firebaseio\.com|firebase\.com/.test(url.hostname)) {
    escrituras.push({ metodo, ruta: `${url.hostname}${ruta}`, resultado: 'abortada (host externo)' });
    return route.abort();
  }
  if (metodo === 'POST' && /\/sesiones\/?$/.test(ruta)) {
    logins += 1;
    escrituras.push({ metodo, ruta, resultado: `al servidor (login ${logins})` });
    if (logins > 1) { violaciones.push(`segundo login (${ruta})`); return route.abort(); }
    return route.continue();
  }
  if ((metodo === 'POST' && /\/sesiones\/refresh\/?$/.test(ruta)) || (metodo === 'DELETE' && /\/sesiones\/?$/.test(ruta))) {
    escrituras.push({ metodo, ruta, resultado: 'al servidor (sesion)' });
    return route.continue();
  }
  if (metodo === 'POST' && /\/reportes\/?$/.test(ruta)) {
    exportados += 1;
    escrituras.push({ metodo, ruta, resultado: `simulada por page.route (${modoExportar})` });
    return modoExportar === 'exito'
      ? route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(RESPUESTA_EXITO) })
      : route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify(RESPUESTA_ERROR) });
  }
  if (metodo === 'POST' && /\/usuarios\/me\/fcm-token\/?$/.test(ruta)) {
    escrituras.push({ metodo, ruta, resultado: 'abortada (registro de push)' });
    return route.abort();
  }
  escrituras.push({ metodo, ruta, resultado: 'ABORTADA (no permitida)' });
  violaciones.push(`${metodo} ${ruta}`);
  return route.abort();
}

// ---------------------------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------------------------
const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
function hoyBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
type Caja = { x: number; y: number; w: number; h: number } | null;
async function caja(page: Page, selector: string): Promise<Caja> {
  const b = await page.locator(selector).first().boundingBox();
  return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null;
}

test.afterAll(() => {
  if (violaciones.length) precondiciones.push({ nombre: 'Ninguna escritura no permitida hacia TEST', ok: false, detalle: violaciones.join('; ') });
  else precondiciones.push({ nombre: 'Ninguna escritura no permitida hacia TEST', ok: true, detalle: `${escrituras.length} peticiones distintas de GET, todas permitidas o simuladas` });
  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const reporte = {
    tc: TC, parte: 'playwright', reintento: REINTENTO, run_id: process.env.RUN_ID ?? '', fecha: new Date().toISOString(),
    ambiente: BASE,
    summary: { total: CPS.length, ok, falla: CPS.length - ok, veredicto: ok === CPS.length ? 'Aprobado' : 'Rechazado' },
    precondiciones, checkpoints: CPS, observaciones, retirados: [] as Array<{ paso: string; motivo: string }>, escrituras,
  };
  if (!STAGING) return;
  mkdirSync(STAGING, { recursive: true });
  writeFileSync(join(STAGING, `parcial_playwright_${TC}${REINTENTO > 0 ? `_reintento${REINTENTO}` : ''}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
});

// ---------------------------------------------------------------------------------------------------------------
// Recorrido unico (un solo login)
// ---------------------------------------------------------------------------------------------------------------
test('TC-M08-G026 parte navegador real (CP-21 a CP-24)', async ({ page }) => {
  test.setTimeout(300_000);
  const correo = process.env.QA_VET_EMAIL ?? '';
  const clave = process.env.QA_VET_PASSWORD ?? '';
  precondicion('Credenciales del Veterinario en memoria', correo.length > 3 && clave.length > 3, 'QA_VET_EMAIL / QA_VET_PASSWORD presentes');

  const scripts: Array<{ nombre: string; cuerpo: string }> = [];
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    try { scripts.push({ nombre: new URL(r.url()).pathname.split('/').pop() ?? '', cuerpo: await r.text() }); } catch { /* recurso sin cuerpo */ }
  });
  await page.route('**/*', guardia);

  // -- Login (una sola vez; un fallo no se reintenta)
  await page.goto(`${BASE}login`);
  await page.locator('input[autocomplete="email"]').fill(correo);
  await page.locator('input[autocomplete="current-password"]').fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30_000 }).catch(() => undefined);
  precondicion('Login del Veterinario 97 (una sola vez)', !page.url().endsWith('/login'), `URL tras el login: ${new URL(page.url()).pathname}`);
  await expect(page.locator('.ds-sync')).toBeVisible({ timeout: 30_000 });

  // -- Paso 1: modal critico de la baja del 885 (sin confirmar) -> CP-24
  await page.goto(`${BASE}activos-biologicos/${ACTIVO}`);
  await page.getByRole('button', { name: 'Eventos', exact: true }).click();
  const botonBaja = page.getByRole('button', { name: 'Baja', exact: true });
  await expect(botonBaja).toBeVisible({ timeout: 30_000 }).catch(() => undefined);
  precondicion(`El activo ${ACTIVO} ofrece "Baja" al Veterinario (estado ACTIVO y permiso de crear eventos)`,
    await botonBaja.isVisible() && await botonBaja.isEnabled(), `boton Baja visible=${await botonBaja.isVisible()}`);
  await botonBaja.click();
  const formBaja = page.getByRole('dialog', { name: 'Registrar baja' });
  await expect(formBaja).toBeVisible();
  await formBaja.getByLabel('Tipo de baja').selectOption('perdida');
  await formBaja.getByLabel('Fecha de baja').fill(hoyBogota());
  await formBaja.getByLabel('Motivo de la baja').fill('QA TC-M08-G026: verificacion del icono de sincronizacion con el modal abierto. No se confirma.');
  const cantidad = formBaja.getByLabel('Cantidad afectada');
  if (await cantidad.count()) observaciones.push('El 885 es un lote: la cantidad afectada se deja vacia (baja total en el resumen, no se confirma).');
  await formBaja.getByRole('button', { name: 'Registrar baja' }).click();
  await expect(formBaja.getByText('Confirma la baja')).toBeVisible({ timeout: 10_000 });
  await expect(formBaja.getByRole('button', { name: 'Confirmar baja' })).toBeVisible();

  const icono = page.locator('.ds-sync');
  const visible = await icono.isVisible();
  const cajaIcono = await caja(page, '.ds-sync');
  const tapado = await page.evaluate(() => {
    const el = document.querySelector('.ds-sync') as HTMLElement | null;
    if (!el) return { encima: '(sin icono)', propio: false, inerte: false };
    const r = el.getBoundingClientRect();
    const arriba = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement | null;
    const desc = (n: HTMLElement | null) => (n ? `<${n.tagName.toLowerCase()}${n.className ? ` class="${String(n.className)}"` : ''}>` : '(nada)');
    return { encima: desc(arriba), propio: !!arriba && el.contains(arriba), inerte: !!el.closest('[inert]') };
  });
  await captura(page, 'CP-24_confirma_baja');
  anotar('CP-24', visible, `Paso "Confirma la baja" abierto; icono .ds-sync visible=${visible}, caja=${JSON.stringify(cajaIcono)}, texto "${norm(await icono.textContent())}"`);
  if (cajaIcono) await page.mouse.click(cajaIcono.x + cajaIcono.w / 2, cajaIcono.y + cajaIcono.h / 2);
  const panelSync = await page.getByRole('dialog', { name: 'Sincronización de datos' }).isVisible();
  const sigueConfirmacion = await formBaja.getByText('Confirma la baja').isVisible();
  observaciones.push(`OBS-1 (066 d, navegador real): con el paso "Confirma la baja" abierto, el elemento en el centro del icono es ${tapado.encima} (${tapado.propio ? 'el propio icono' : 'no es el icono: lo cubre el overlay del modal'}); icono dentro de [inert]: ${tapado.inerte ? 'si' : 'no'}; un clic en su centro ${panelSync ? 'abre' : 'no abre'} el panel de sincronizacion; el paso de confirmacion ${sigueConfirmacion ? 'sigue abierto' : 'se cerro'}.`);
  await formBaja.getByRole('button', { name: 'Volver' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Registrar baja' })).toBeHidden({ timeout: 5_000 }).catch(() => undefined);

  // -- Paso 2: historial predictivo del 885 y exportaciones simuladas
  const respOpciones = page.waitForResponse((r) => /\/reportes\/opciones\/activo/.test(r.url()) && r.request().method() === 'GET', { timeout: 30_000 });
  await page.goto(`${BASE}prediccion/historial-predictivo`);
  const opciones = (await (await respOpciones).json()) as Array<{ valor: number; etiqueta: string }>;
  const opcion = opciones.find((o) => Number(o.valor) === ACTIVO);
  precondicion(`El activo ${ACTIVO} figura entre los animales o lotes del Veterinario`, !!opcion, `${opciones.length} opciones`);
  const respHistorial = page.waitForResponse((r) => new RegExp(`/historial-predictivo/${ACTIVO}(\\?|$)`).test(r.url()), { timeout: 30_000 });
  const combo = page.getByRole('combobox', { name: 'Animal o lote' });
  await combo.fill(opcion!.etiqueta);
  const opcionLista = page.getByRole('option', { name: opcion!.etiqueta, exact: true });
  if (await opcionLista.count()) await opcionLista.first().click();
  const estadoHistorial = (await respHistorial).status();
  precondicion(`GET /historial-predictivo/${ACTIVO} responde 200`, estadoHistorial === 200, `HTTP ${estadoHistorial}`);
  const exportar = page.getByRole('button', { name: /Exportar historial sanitario/ });
  await expect(exportar).toBeEnabled({ timeout: 30_000 });

  // Control: un exito real que expira solo (estado en el historial, ver OBS-10)
  modoExportar = 'exito';
  await exportar.click();
  const exito = page.locator('.ds-toasts .ds-alert--success');
  await expect(exito).toBeVisible({ timeout: 10_000 });
  const cajaExito = await caja(page, '.ds-toasts .ds-alert--success');
  await expect(exito).toBeHidden({ timeout: 8_000 });

  // Seis errores simulados (sin idOperacion: cada uno es un aviso nuevo)
  modoExportar = 'error';
  const viewport = page.viewportSize()!;
  let cajaError: Caja = null;
  let cajaAppBar: Caja = null;
  for (let i = 1; i <= 6; i += 1) {
    const antes = exportados;
    await expect(exportar).toBeEnabled({ timeout: 15_000 });
    await exportar.click();
    await expect.poll(() => exportados, { timeout: 10_000 }).toBe(antes + 1);
    await expect(exportar).toBeEnabled({ timeout: 15_000 });
    if (i === 1) {
      await expect(page.locator('.ds-toasts .ds-alert--error').first()).toBeVisible();
      cajaError = await caja(page, '.ds-toasts .ds-alert--error');
      cajaAppBar = await caja(page, '.ds-appbar');
      await captura(page, 'CP-22_banner_error');
    }
  }
  const saturacion = page.locator('.ds-toasts__saturacion');
  await expect(saturacion).toBeVisible({ timeout: 10_000 });
  const textoSaturacion = norm(await saturacion.textContent());
  const finAppBar = cajaAppBar ? cajaAppBar.y + cajaAppBar.h : 0;
  const arriba = (c: Caja) => !!c && c.y >= finAppBar - 2 && c.y <= viewport.height / 3;
  anotar('CP-22', arriba(cajaError) && arriba(cajaExito),
    `Ventana ${viewport.width}x${viewport.height}; AppBar termina en y=${finAppBar}; banner de error en ${JSON.stringify(cajaError)}; banner de exito en ${JSON.stringify(cajaExito)}; tercio superior hasta y=${Math.round(viewport.height / 3)}`);

  // -- Paso 3: historial de la sesion -> CP-23
  await saturacion.click();
  const dialogo = page.getByRole('dialog', { name: 'Avisos de esta sesión' });
  await expect(dialogo).toBeVisible();
  const cajaPanel = await caja(page, '[role="dialog"][aria-modal="true"] .ds-modal__panel');
  const lateral = !!cajaPanel && (cajaPanel.x <= 2 || cajaPanel.x + cajaPanel.w >= viewport.width - 2) && cajaPanel.h >= viewport.height * 0.9;
  await captura(page, 'CP-23_historial');
  anotar('CP-23', lateral, `Panel "Avisos de esta sesión" en ${JSON.stringify(cajaPanel)} dentro de una ventana ${viewport.width}x${viewport.height} (lateral = toca x=0 o x=${viewport.width} y alto >= ${Math.round(viewport.height * 0.9)})`);
  const filas = (await dialogo.locator('.ds-toasts__historial li').allTextContents()).map(norm);
  const filaExito = filas.find((f) => f.includes('El historial sanitario se descargó'));
  observaciones.push(`OBS-10 (control en navegador real del criterio R-2 de Vitest): el exito que expiro solo figura en el historial como ${filaExito ? `"${filaExito}"` : '(ausente)'}. Aviso de saturacion: "${textoSaturacion}". Filas del historial: ${filas.length}.`);
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden({ timeout: 5_000 });

  // -- Paso 4: cerrar sesion con la cola llena -> CP-21
  const antesLogout = { errores: await page.locator('.ds-toasts .ds-alert--error').count(), saturacion: await saturacion.isVisible() };
  await page.evaluate((id) => { (window as unknown as Record<string, string>).__qaG026 = id; }, process.env.RUN_ID ?? 'qa');
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
  await page.waitForURL((u) => u.pathname.endsWith('/login'), { timeout: 30_000 }).catch(() => undefined);
  // React Router puede llegar a /login dentro de la misma pagina antes de que location.replace la recargue: se
  // espera hasta 15 s a que desaparezca el marcador (documento nuevo). Si nunca recarga, el marcador sigue y
  // CP-21 queda en FALLA con ese dato.
  const limite = Date.now() + 15_000;
  while (Date.now() < limite) {
    const sigue = await page.evaluate(() => '__qaG026' in window).catch(() => true);
    if (!sigue) break;
    await page.waitForTimeout(250);
  }
  await page.waitForLoadState('load');
  await page.waitForTimeout(1_000);
  const tras = await page.evaluate(() => ({
    marcador: (window as unknown as Record<string, unknown>).__qaG026 ?? null,
    avisos: document.querySelectorAll('.ds-toasts .ds-alert').length,
    saturacion: document.querySelectorAll('.ds-toasts__saturacion').length,
    navegacion: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? '?',
  }));
  const enLogin = new URL(page.url()).pathname.endsWith('/login');
  anotar('CP-21', enLogin && tras.marcador === null && tras.avisos === 0 && tras.saturacion === 0,
    `Antes de cerrar sesion: ${antesLogout.errores} banners de error y aviso de saturacion ${antesLogout.saturacion ? 'visible' : 'ausente'}. Despues: ruta ${new URL(page.url()).pathname}, marcador ${tras.marcador === null ? 'ausente (documento nuevo)' : 'PRESENTE'}, navegacion "${tras.navegacion}", ${tras.avisos} avisos, ${tras.saturacion} avisos de saturacion`);

  // -- Precondicion de despliegue (#693) con los scripts que cargo la app
  const todo = scripts.map((s) => s.cuerpo).join('\n');
  const index = scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n));
  precondicion('El frontend desplegado tiene la entrega #693 (ds-toasts__saturacion, ds-sync, "Toca aquí para ver todas")',
    todo.includes('ds-toasts__saturacion') && todo.includes('ds-sync') && todo.includes('Toca aquí para ver todas'),
    `bundle: ${[...new Set(index)].join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  // La pagina final (login) no se deja abierta: si el test termina en FALLA, Playwright guarda un error-context.md con
  // la instantanea de la pagina, y asi queda en blanco.
  await page.goto('about:blank');
  observaciones.push(`Despliegue: bundle ${[...new Set(index)].join(', ') || '(no identificado)'} en ${BASE}.`);

  expect(violaciones, violaciones.join('; ')).toEqual([]);
  expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
});
