/**
 * TC-DIS-39 — Consistencia visual del listado y formulario del Catálogo de Especies
 * RF-15 · CU-01 Gestionar Catálogo de Especies · Rol: Administrador
 * Configuración → pestaña "Catálogo" (/configuracion)
 *
 * Cambio del RF (2026-10-05): el formulario incluye la lista desplegable de grupo de manejo
 * y el error nuevo al intentar cambiar el grupo de una especie con dependencias. En la
 * interfaz el grupo de manejo es el select "Familia de modelo de IA" (tipo_modelo).
 *
 * Baselines (página completa):
 *   - Listado con especies activas e inactivas, y detalle de una fila de cada estado.
 *   - Formulario crear especie (vacío) y con grupo de manejo elegido.
 *   - Formulario editar especie sin grupo y con grupo asignado (SIMULADO: en TEST ninguna
 *     especie tiene grupo de manejo).
 *   - Error al cambiar el grupo de una especie con dependencias (409 SIMULADO, error_code a
 *     confirmar con desarrollo).
 *   - Listado vacío por búsqueda sin resultados.
 *
 * Una baseline solo se guarda si la vista no tiene defectos: en las capturas con el modal
 * abierto, la tarjeta se mide contra el DS v2.0 (bottom sheet a ancho completo en xs/sm, máx.
 * 480px en md, máx. 560px en lg) y el texto con estilo propio del formulario debe usar la
 * escala tipográfica del DS (los componentes del DS se evalúan con su propio CSS); si algo
 * falla es DEFECTO y no se captura.
 *
 * Release 1.0.0-rc.40: los modales pasan a bottom sheet en móvil y los errores con `fields`
 * van debajo del campo (role="alert", aria-invalid), sin alerta general; baselines nuevas.
 *
 * Datos: el catálogo crece con cada prueba que registra especies, así que GET
 * /configuracion/especies se sirve con page.route desde especies.fixture.json (respuesta real
 * del 2026-10-05). El test "0" verifica contra el ambiente real que hay especies activas e
 * inactivas.
 *
 * PROTECCIÓN DE DATOS: todo POST/PATCH a /configuracion/especies se aborta o se responde con
 * el error simulado; ninguna especie se crea ni se modifica.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * El contador de notificaciones de la barra superior se enmascara (depende de la cuenta).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_39_VIEWPORTS=escritorio
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from './especies.fixture.json';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_39_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

type Especie = (typeof fixture.items)[number];

const URL_LISTADO = (url: URL) => url.pathname.endsWith('/configuracion/especies');
const URL_ESPECIES = (url: URL) => /\/configuracion\/especies(\/\d+(\/\w+)?)?$/.test(url.pathname);

// Especie con grupo de manejo asignado (SIMULADO sobre "Tilapia Roja" #1 del fixture)
const ID_CON_GRUPO = 1;
const GRUPO_ASIGNADO = 'MODELO_ACUICULTURA';
const GRUPO_NUEVO = 'MODELO_PORCINOS';

// 409 SIMULADO con el formato estándar del backend (error_code a confirmar con desarrollo)
const ERROR_DEPENDENCIAS = {
  error_code: 'ESPECIE_CON_DEPENDENCIAS',
  message: 'No se puede cambiar el grupo de manejo de "Tilapia Roja": tiene áreas, activos biológicos o modelos de IA asociados al grupo actual.',
  fields: [{ field: 'tipo_modelo', message: 'La especie tiene dependencias asociadas a su grupo de manejo actual.' }],
};

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

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

/** Escrituras: abortadas por defecto; con `error` se responde ese error simulado. */
async function protegerEspecies(page: Page) {
  let error: { status: number; cuerpo: unknown } | null = null;
  await page.route(URL_ESPECIES, (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return r.fallback();
    if (error) return r.fulfill({ status: error.status, contentType: 'application/json', body: JSON.stringify(error.cuerpo) });
    return r.abort();
  });
  return { simularError: (status: number, cuerpo: unknown) => { error = { status, cuerpo }; } };
}

/** GET del listado desde el fixture; `ajustar` permite simular cambios sobre una especie. */
async function servirCatalogo(page: Page, ajustar: (e: Especie) => Especie = (e) => e) {
  await page.route(URL_LISTADO, (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() !== 'GET') return r.fallback();
    const cuerpo = { ...fixture, items: fixture.items.map((e) => ajustar({ ...e })) };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
}

// Si un login falla, los demás tests se saltan: la cuenta admin se bloquea a los 5 intentos.
// Marca en archivo porque Playwright reinicia el worker tras cada test fallido.
const MARCA_LOGIN_FALLIDO = path.join(os.tmpdir(), 'tc-dis-39-login-fallido');

async function iniciarSesionAdmin(page: Page) {
  test.skip(fs.existsSync(MARCA_LOGIN_FALLIDO), 'Un login anterior falló: se omite para no bloquear la cuenta admin.');
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  } catch (e) {
    fs.writeFileSync(MARCA_LOGIN_FALLIDO, new Date().toISOString());
    throw e;
  }
}

/** Abre /configuracion (tab Catálogo por defecto) y espera a que la tabla termine de cargar. */
async function abrirCatalogoEspecies(page: Page) {
  const listado = page.waitForResponse((r) =>
    URL_LISTADO(new URL(r.url())) && r.request().method() === 'GET' && ['xhr', 'fetch'].includes(r.request().resourceType()), { timeout: 20_000 });
  await page.goto('/configuracion');
  const respuesta = await listado;

  await page.getByRole('button', { name: 'Catálogo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Catálogo de Especies' })).toBeVisible();
  // El contador "N activas · M inactivas" solo aparece cuando termina el skeleton
  await expect(page.getByText(/\d+ activas · \d+ inactivas/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return respuesta;
}

function filas(page: Page) {
  const todas = page.locator('table tbody tr');
  return {
    activa: todas.filter({ has: page.getByText('Activo', { exact: true }) }).first(),
    inactiva: todas.filter({ has: page.getByText('Inactivo', { exact: true }) }).first(),
  };
}

function grupoDeManejo(dialogo: Locator): Locator {
  return dialogo.getByRole('combobox', { name: 'Familia de modelo de IA', exact: true });
}

async function abrirEdicion(page: Page, nombre: string) {
  await page.getByRole('button', { name: `Editar ${nombre}`, exact: true }).first().click();
  const dialogo = page.getByRole('dialog', { name: `Editar especie — ${nombre}` });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(nombre);
  return dialogo;
}

// DS v2.0: escala tipográfica (todos los anchos)
const ESCALA = [11, 12, 14, 15, 16, 18, 19, 20, 24, 26, 28];

/** DEFECTO si la tarjeta del modal no respeta el breakpoint del DS v2.0. */
async function verificarBreakpoint(page: Page, dialogo: Locator) {
  const nombre = test.info().project.name;
  const viewport = page.viewportSize()!;
  const caja = (await dialogo.locator('> div').boundingBox())!;
  test.info().annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });
  if (viewport.width < 768) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px`).toBe(viewport.width);
    expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${nombre} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
  } else if (viewport.width < 1200) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, md) el modal debe medir máximo 480px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(480);
  } else {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px`).toBe(560);
  }
}

/** DEFECTO si algún texto con estilo propio del formulario usa un tamaño fuera de la escala del DS v2.0. */
async function verificarEscala(dialogo: Locator) {
  const fuera = await dialogo.locator('> div').evaluate((raiz, escala) => {
    const res: string[] = [];
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = (n.textContent ?? '').trim();
      const el = n.parentElement;
      // Componentes del DS (botón, alerta, campos) se evalúan con su propio CSS, no como estilo del módulo
      if (!texto || !el || el.closest('option, .ds-sr-only, .ds-btn, .ds-alert, .ds-field, style')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (!escala.includes(fs)) res.push(`"${texto.slice(0, 30)}" ${fs}px`);
    }
    return [...new Set(res)];
  }, ESCALA);
  expect.soft(fuera, `DEFECTO: texto del formulario fuera de la escala tipográfica del DS v2.0: ${fuera.join(' · ')}`).toEqual([]);
}

/** Captura la página completa; con un modal abierto, antes se verifica. Sin baseline si hay defectos. */
async function capturar(page: Page, nombre: string, dialogo?: Locator) {
  if (dialogo) {
    await verificarBreakpoint(page, dialogo);
    await verificarEscala(dialogo);
  }
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  // Sin foco ni hover: el cursor queda donde se hizo el último clic
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  // El contador de notificaciones depende de la cuenta (compartida), no del diseño
  await expect(page).toHaveScreenshot(nombre, { ...OPCIONES_CAPTURA, mask: [page.locator('.ds-appbar__notif-badge')] });
}

test.describe('TC-DIS-39 - Consistencia visual - Catálogo de Especies (RF-15)', () => {
  // Modo por defecto: un caso con defectos no impide evaluar los demás. Si el login falla, la
  // marca MARCA_LOGIN_FALLIDO hace que los siguientes se omitan (la cuenta admin se bloquea a los 5).
  test.describe.configure({ timeout: 120_000 });
  test.beforeAll(() => fs.rmSync(MARCA_LOGIN_FALLIDO, { force: true }));

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_39_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await protegerEspecies(page);
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el catálogo real tiene especies activas e inactivas', async ({ page }, testInfo) => {
    const r = await abrirCatalogoEspecies(page);
    const { items } = await r.json();
    const activas = items.filter((e: Especie) => e.es_activo).length;
    testInfo.annotations.push({ type: 'Catálogo real', description: `${items.length} especies · ${activas} activas · ${items.length - activas} inactivas` });
    expect(activas, 'Precondición: se requiere al menos una especie activa').toBeGreaterThan(0);
    expect(items.length - activas, 'Precondición: se requiere al menos una especie inactiva').toBeGreaterThan(0);
  });

  test.describe('con catálogo fijado', () => {
    test.beforeEach(async ({}, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Catálogo servido desde especies.fixture.json (respuesta real del 2026-10-05).' });
    });

    test('1-2. Listado con especies activas e inactivas', async ({ page }) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      const { activa, inactiva } = filas(page);
      await expect(activa).toBeVisible();
      await expect(inactiva).toBeVisible();

      await capturar(page, 'catalogo-listado.png');
      // Detalle del estado: etiqueta + punto indicador + acción disponible (Desactivar / Reactivar)
      await expect(activa).toHaveScreenshot('catalogo-fila-activa.png', { animations: 'disabled' });
      await expect(inactiva).toHaveScreenshot('catalogo-fila-inactiva.png', { animations: 'disabled' });
    });

    test('3a. Formulario crear especie', async ({ page }) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      await page.getByRole('button', { name: 'Nueva especie' }).click();
      const dialogo = page.getByRole('dialog', { name: 'Nueva especie' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
      await expect(grupoDeManejo(dialogo)).toHaveValue('');
      await capturar(page, 'catalogo-form-crear.png', dialogo);
    });

    test('3a. Formulario crear especie con grupo de manejo elegido', async ({ page }) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      await page.getByRole('button', { name: 'Nueva especie' }).click();
      const dialogo = page.getByRole('dialog', { name: 'Nueva especie' });
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Codorniz');
      await grupoDeManejo(dialogo).selectOption('MODELO_AVES');
      await expect(grupoDeManejo(dialogo)).toHaveValue('MODELO_AVES');
      await capturar(page, 'catalogo-form-crear-grupo.png', dialogo);
    });

    test('3b. Formulario editar especie', async ({ page }) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      const nombre = fixture.items.find((e) => e.es_activo)!.nombre;
      const dialogo = await abrirEdicion(page, nombre);
      await expect(grupoDeManejo(dialogo)).toHaveValue('');
      await capturar(page, 'catalogo-form-editar.png', dialogo);
    });

    test('3b. Formulario editar especie con grupo de manejo asignado (simulado)', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos simulados', description: `"Tilapia Roja" #${ID_CON_GRUPO} servida con tipo_modelo ${GRUPO_ASIGNADO}: en TEST ninguna especie tiene grupo de manejo.` });
      await servirCatalogo(page, (e) => (e.id_especie === ID_CON_GRUPO ? { ...e, tipo_modelo: GRUPO_ASIGNADO } : e));
      await abrirCatalogoEspecies(page);
      const dialogo = await abrirEdicion(page, 'Tilapia Roja');
      await expect(grupoDeManejo(dialogo), 'El grupo asignado se precarga').toHaveValue(GRUPO_ASIGNADO);
      await capturar(page, 'catalogo-form-editar-grupo.png', dialogo);
    });

    test('3c. Error al cambiar el grupo de una especie con dependencias (simulado)', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos simulados', description: `"Tilapia Roja" con grupo ${GRUPO_ASIGNADO}; el PATCH a ${GRUPO_NUEVO} se responde con 409 ESPECIE_CON_DEPENDENCIAS (error_code a confirmar con desarrollo). La especie no se modifica.` });
      const { simularError } = await protegerEspecies(page);
      simularError(409, ERROR_DEPENDENCIAS);
      await servirCatalogo(page, (e) => (e.id_especie === ID_CON_GRUPO ? { ...e, tipo_modelo: GRUPO_ASIGNADO } : e));
      await abrirCatalogoEspecies(page);
      const dialogo = await abrirEdicion(page, 'Tilapia Roja');
      await grupoDeManejo(dialogo).selectOption(GRUPO_NUEVO);
      await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      // Error con field tipo_modelo: va debajo del select, sin alerta general (rc.40)
      await expect(dialogo.getByRole('alert').filter({ hasText: ERROR_DEPENDENCIAS.fields[0].message })).toBeVisible();
      await expect(grupoDeManejo(dialogo)).toHaveAttribute('aria-invalid', 'true');
      await expect(dialogo, 'El diálogo sigue abierto tras el error').toBeVisible();
      await capturar(page, 'catalogo-error-dependencias.png', dialogo);
    });

    test('4. Listado vacío por filtro sin resultados', async ({ page }) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      await page.getByRole('textbox', { name: 'Buscar especies por nombre' }).fill('zzz sin resultados tc dis 39');
      await expect(page.getByText('Ninguna especie coincide con la búsqueda.', { exact: true })).toBeVisible();
      await expect(page.getByText('0 registros', { exact: true })).toBeVisible();
      await expect(page.locator('table tbody tr')).toHaveCount(0);
      await capturar(page, 'catalogo-listado-vacio.png');
    });

    test('5. Modal del formulario según el breakpoint del sistema de diseño', async ({ page }, testInfo) => {
      await servirCatalogo(page);
      await abrirCatalogoEspecies(page);
      await page.getByRole('button', { name: 'Nueva especie' }).click();
      const dialogo = page.getByRole('dialog', { name: 'Nueva especie' });
      await expect(dialogo).toBeVisible();

      const viewport = page.viewportSize()!;
      const caja = (await dialogo.locator('> div').boundingBox())!;
      testInfo.annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });

      // DS v2.0 (CLAUDE.md, Grid y breakpoints): bottom sheet a ancho completo en xs/sm, max 480px en md, max 560px en lg
      if (viewport.width < 768) {
        expect.soft(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
        expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${testInfo.project.name} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
      } else if (viewport.width < 1200) {
        expect(caja.width, `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, md) el modal debe medir máximo 480px`).toBeLessThanOrEqual(480);
      } else {
        expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px (se queda en el máximo de md)`).toBe(560);
      }
    });
  });
});
