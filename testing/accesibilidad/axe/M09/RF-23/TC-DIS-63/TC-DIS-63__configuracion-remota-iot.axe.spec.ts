import { test, expect as expectBase, type Page, type Locator, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { guardarResultadoAxe } from '../../../_shared/axeReport';

// Red lenta: expect de 30 s en vez de los 5 s por defecto (mismo criterio que TC-DIS-64 visual).
const expect = expectBase.configure({ timeout: 30_000 });

/**
 * TC-DIS-63 — Verificar accesibilidad WCAG 2.1 AA del panel y formulario de
 * Configuración Remota de Dispositivos IoT
 *
 * RF-23 | CU-XX - Configurar dispositivo IoT de forma remota
 *
 * Fuente verificada en código real (no en prototipo):
 *   Arekkazu/SGPMP-FRONT-END-PWA @ dev
 *   src/configuration/components/ConfiguracionRemotaSection.tsx
 *   src/configuration/pages/ConfigurationPage.tsx (tab "iot", recurso 11)
 *   src/shared/design-system/Sidebar.tsx (label real "Configuración")
 *
 * Patrón de login/navegación copiado del script YA EXISTENTE y ejecutado
 * de TC-DIS-22 (rama test-access-tc-dis-22, RF-03) — mismo repo de pruebas,
 * misma convención que usa el resto del equipo. No es un patrón inventado.
 *
 * Ruta: /configuracion (pestaña "IoT")
 *
 * ⚠ HALLAZGO YA CONFIRMADO EN CÓDIGO (no es supuesto — se verificó que el
 * archivo no tiene NINGÚN `htmlFor` ni `id` en todo el componente):
 * Los <label> de "Frecuencia de captura" e "Intervalo de transmisión"
 * (líneas ~219 y ~247 de ConfiguracionRemotaSection.tsx) NO están asociados
 * programáticamente a sus <input> — no hay htmlFor/id ni aria-labelledby.
 * Esto debería disparar el rule "label" de axe-core (WCAG 1.3.1 / 4.1.2).
 * Se documenta como violación esperada; si el reporte de axe NO la marca,
 * revisar antes de reportar (falso negativo más probable que fix silencioso).
 *
 * NOTA QA: no se ha ejecutado contra el ambiente desplegado. Verificar
 * contra pantalla real antes de considerar este caso como ejecutado.
 * Credenciales confirmadas por Alex (líder de desarrollo) — misma cuenta
 * que ya usa TC-DIS-22 en el repo, rol Administrador:
 *   TEST_ADMIN_EMAIL=<TEST_ADMIN_EMAIL de testing/.env.test>
 * Sin confirmar todavía: si esta cuenta tiene permiso real (recurso 11,
 * acción 3) para el formulario de configuración remota — se asume que sí
 * por ser Administrador, pero eso solo lo confirma la primera ejecución.
 * PENDIENTE: serial de un dispositivo IoT de prueba fijo en el seed de
 * staging (preguntado a Alex, sin respuesta aún) — sin esto, el test
 * depende de "el primer dispositivo activo que aparezca".
 * Correr con: TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npx playwright test
 * axe/M09/RF-23/TC-DIS-63/
 *
 * ── Re-ejecución tras el cierre de #166 (2026-10-05) ─────────────────────────
 * - Ya hay dispositivos IoT activos en TEST. El spec nunca tuvo lógica de
 *   "saltar si no hay dispositivos"; los tests 2-3 fallaban por falta de datos.
 * - SEGURIDAD DE DATOS: los dispositivos son reales y compartidos. Toda escritura
 *   (no-GET) bajo /configuracion/dispositivos-iot/** se ABORTA con page.route
 *   (`bloquearEscriturasIot`): incluye POST .../{id}/configurar (envío de la
 *   configuración remota, src/configuration/api/iotApi.ts:68), reintentar,
 *   cancelar y credencial-mqtt. Nunca sale una configuración real.
 * - Las tarjetas de dispositivo se buscan DENTRO de la sección "Configuración
 *   Remota IoT" (`seccionRemota`, mismo criterio que el visual TC-DIS-64): sin
 *   acotar, `.first()` podía caer en el selector de "Asociación de Sensores".
 * - RF-21 v2.0: las cámaras (resolucion != null en el listado) se verifican con
 *   nombre accesible que incluya su serial.
 * - Red lenta: login con waitUntil 'commit' y caché HAR de /assets/** (no se
 *   versiona: testing/.gitignore). Nunca se cachea la API.
 * - 2026-10-06: los tests eligen dispositivos FIJOS por serial (sensor
 *   IOT-EST01-HLA-001, cámara CAM-QA-063-01), no "la primera tarjeta Activo".
 * - OBSERVACIÓN MANUAL (no violación): el nombre accesible de las tarjetas del
 *   selector empieza con el emoji 📡 sin aria-hidden (también en cámaras).
 */

// testing/.har-cache/assets.har (5 niveles desde la carpeta del TC; ignorado por testing/.gitignore).
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');

async function usarCacheAssets(contexto: BrowserContext) {
  const grabar = !fs.existsSync(HAR_ASSETS);
  await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: grabar, notFound: 'fallback' });
}

/** Aborta toda escritura sobre dispositivos IoT; deja pasar solo GET. */
async function bloquearEscriturasIot(page: Page, testInfo: { title: string; project: { name: string } }) {
  const bloqueadas: string[] = [];
  await page.route(/\/configuracion\/dispositivos-iot(\/.*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.continue();
    bloqueadas.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.abort('blockedbyclient');
  });
  page.on('close', () => {
    console.log(`[escrituras-iot-bloqueadas] ${testInfo.project.name} · ${testInfo.title}: ${bloqueadas.length}${bloqueadas.length ? ' → ' + bloqueadas.join(', ') : ''}`);
  });
}

interface DispositivoListado { id_dispositivo_iot: number; serial: string; es_activo: boolean; resolucion: string | null }
const listadoPorPagina = new WeakMap<Page, DispositivoListado[]>();

/**
 * Dispositivos fijos por serial (no "la primera tarjeta Activo"): el orden del selector
 * cambia cada vez que alguien crea un dispositivo en TEST (el 06/10 la cámara nueva
 * pasó a ser la primera y los tests 2-3 la habrían elegido en vez de un sensor).
 * - SENSOR: IOT-EST01-HLA-001 (id 1, GENERICO/SENSOR, 3 sensores, dato semilla de TEST).
 * - CÁMARA: CAM-QA-063-01 (id 141, CAMARA_VISION 1920x1080, finca "QA DIS Santiago Accesibilidad").
 */
const SERIAL_SENSOR = process.env.TC_DIS_63_SENSOR ?? 'IOT-EST01-HLA-001';
const SERIAL_CAMARA = process.env.TC_DIS_63_CAMARA ?? 'CAM-QA-063-01';
const reSerial = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** Tarjeta del selector de Configuración Remota, por serial dentro de su nombre accesible. */
function tarjetaPorSerial(page: Page, serial: string): Locator {
  return seccionRemota(page).getByRole('button', { name: reSerial(serial) });
}

/** Sección "Configuración Remota IoT" dentro de la pestaña IoT (criterio de TC-DIS-64). */
function seccionRemota(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Configuración Remota IoT' }) })
    .filter({ hasText: /Selecciona el dispositivo a configurar/i })
    .last();
}

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

async function loginComoAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  }
  // Diagnóstico del POST de login (fallo "error inesperado" solo bajo automatización,
  // 2026-10-05): registra status y cuerpo de la RESPUESTA. Nunca el request (lleva la
  // contraseña); el token de una respuesta exitosa se tapa.
  page.on('response', async (r) => {
    if (r.request().method() !== 'POST' || !/\/sesiones\/?$/.test(new URL(r.url()).pathname)) return;
    const cuerpo = (await r.text().catch(() => '')).replace(/("(?:access_)?token"\s*:\s*")[^"]+/g, '$1[TAPADO]');
    console.log(`[login-diag] POST ${new URL(r.url()).pathname} → ${r.status()} ${r.statusText()} | ${cuerpo.slice(0, 500)}`);
  });
  page.on('requestfailed', (req) => {
    if (req.method() === 'POST' && /\/sesiones\/?$/.test(new URL(req.url()).pathname)) {
      console.log(`[login-diag] POST ${new URL(req.url()).pathname} FALLÓ EN RED: ${req.failure()?.errorText}`);
    }
  });

  // 'commit' en vez de 'load': con red lenta el evento load (fuentes, imágenes) pasa de 90 s.
  // Ruta relativa: el ambiente lo decide `use.baseURL` de playwright.config.ts (TEST o DEV).
  await page.goto('/login', { waitUntil: 'commit', timeout: 300_000 });
  const correo = page.getByLabel('Correo electrónico');
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { timeout: 300_000 });
  // Mitigación del reporte de Sara (hallazgo 2): navegar inmediatamente tras el
  // login invalidaba la sesión bajo automatización.
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

  // El listado real decide (la instrucción de la sección se pinta antes de que llegue).
  // La pestaña IoT pide /configuracion/dispositivos-iot varias veces (una por sección) y la
  // API responde { items: [...] }: se juntan TODAS las respuestas de la carga (array o
  // {items}) y se deduplican por id, para que la precondición mire el listado completo.
  const acumulado = new Map<number, DispositivoListado>();
  const pendientes: Promise<void>[] = [];
  const juntar = (r: import('@playwright/test').Response) => {
    if (r.request().method() !== 'GET' || !new URL(r.url()).pathname.endsWith('/configuracion/dispositivos-iot')) return;
    pendientes.push((async () => {
      const cuerpo = await r.json().catch(() => null);
      const items: DispositivoListado[] = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.items ?? []);
      for (const d of items) acumulado.set(d.id_dispositivo_iot, d);
    })());
  };
  page.on('response', juntar);
  const primerListado = page.waitForResponse(
    (r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/configuracion/dispositivos-iot'),
    { timeout: 120_000 },
  );
  await irAConfiguracion(page, /^IoT$/);
  await primerListado;
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  page.off('response', juntar);
  await Promise.all(pendientes);
  listadoPorPagina.set(page, [...acumulado.values()]);
  console.log(`[listado] ${acumulado.size} dispositivos de ${pendientes.length} respuesta(s) GET`);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Configuración Remota IoT' })).toBeVisible();
}

async function dentroDelViewport(page: Page, loc: Locator): Promise<boolean> {
  const box = await loc.boundingBox().catch(() => null);
  const vp = page.viewportSize();
  return !!box && !!vp && box.x >= -1 && box.x + box.width <= vp.width + 1;
}

// El JWT vive solo en memoria: tras el login NO se usa page.goto() (recarga y
// borra la sesión); se navega por el sidebar como un usuario real.
// El ítem del sidebar es un <Link> (rol link, no button). En móvil/tablet el
// sidebar está fuera del viewport hasta abrir el menú lateral.
async function irAConfiguracion(page: Page, pestana?: RegExp) {
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral|toggle side menu/i });
  const linkConfig = page.getByRole('link', { name: /^(configuración|settings)$/i });
  await linkConfig.waitFor({ state: 'attached', timeout: 30_000 });

  if (await linkConfig.getAttribute('aria-disabled') === 'true') {
    throw new Error(
      `BLOQUEO DE AMBIENTE (no es hallazgo de accesibilidad): la cuenta ${ADMIN_EMAIL} ` +
      'no tiene permiso sobre Configuración — el ítem del sidebar sale bloqueado.',
    );
  }
  for (let intento = 0; intento < 5 && !(await dentroDelViewport(page, linkConfig)); intento++) {
    if (await menuToggle.isVisible().catch(() => false)) await menuToggle.click();
    await page.waitForTimeout(400);
  }
  await linkConfig.click();
  await page.waitForURL(/configuracion/);
  if (pestana) {
    const boton = page.getByRole('button', { name: pestana });
    await boton.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
      throw new Error(
        `BLOQUEO DE AMBIENTE: la pestaña ${pestana} no aparece — la cuenta ${ADMIN_EMAIL} ` +
        'no tiene permiso de lectura sobre ese recurso.',
      );
    });
    await boton.click();
  }
}

test.describe('TC-DIS-63 — Accesibilidad: Configuración Remota IoT (RF-23)', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    await usarCacheAssets(context);
    await bloquearEscriturasIot(page, testInfo);
    await loginComoAdmin(page);
  });

  test('listado del panel de Configuración Remota + selector de dispositivo — sin violaciones axe A/AA', async ({ page }, testInfo) => {
    // DispSelector: cada dispositivo activo es un <button> con serial +
    // descripción + estado "Activo" (texto, no solo el punto verde) —
    // esto ya cumple 1.4.1 (no depender solo de color) según el código.
    await expect(page.getByText(/selecciona el dispositivo a configurar/i)).toBeVisible();

    // OBSERVACIÓN MANUAL (no es violación de axe), 2026-10-06: el nombre accesible de cada
    // tarjeta empieza con el emoji 📡 (<span> sin aria-hidden en DispSelector), p. ej.
    // "📡 CAM-QA-063-01 Cámara QA Santiago TC-DIS-63 Activo". Un lector de pantalla lo anuncia
    // ("antena satelital"), también en las cámaras. Se registra en el resumen del test.
    testInfo.annotations.push({
      type: 'Observación manual (no violación)',
      description: 'El nombre accesible de las tarjetas del selector empieza con el emoji 📡 sin aria-hidden (también en cámaras).',
    });

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    // Documentar aquí, no solo aserción ciega: adjuntar el JSON completo en
    // resultados/axe-TC-DIS-63.json (paso aparte, ver README del proyecto).
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('cámara CAM-QA-063-01 seleccionada (RF-21 v2.0) — formulario visible y sin violaciones axe A/AA', async ({ page }, testInfo) => {
    // Cámara de prueba de TEST (SERIAL_CAMARA, ver constantes arriba).
    const camara = (listadoPorPagina.get(page) ?? []).find((d) => d.serial === SERIAL_CAMARA);
    expect(camara, `Precondición: ${SERIAL_CAMARA} debe venir en el listado real`).toBeTruthy();
    expect(camara?.es_activo && camara?.resolucion != null, `Precondición: ${SERIAL_CAMARA} activa y con resolucion`).toBe(true);

    const tarjeta = tarjetaPorSerial(page, SERIAL_CAMARA);
    await expect(tarjeta).toBeVisible();
    // La tarjeta debe identificar al dispositivo por su serial en el nombre accesible (4.1.2).
    await expect.soft(tarjeta, `La tarjeta de ${SERIAL_CAMARA} debe tener nombre accesible con su serial`)
      .toHaveAccessibleName(new RegExp(SERIAL_CAMARA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await tarjeta.click();

    // Formulario abierto con la cámara seleccionada (sin depender de los labels: ver test siguiente).
    await expect(page.getByRole('button', { name: /enviar configuración/i })).toBeVisible();
    await expect(page.getByRole('main').getByText(SERIAL_CAMARA).first()).toBeVisible();

    // Pendiente confirmación de Camila del criterio RF-23: hoy Configuración Remota no tiene
    // panel específico de cámara (verificado a mano y en ConfiguracionRemotaSection.tsx, en
    // test y en dev); la cámara muestra solo frecuencia de captura e intervalo de transmisión.
    // Se deja documentado como soft: si aparece un panel de cámara, este assert lo avisa.
    // Acotado a la sección con el formulario abierto. No se busca la palabra "cámara": aparece en
    // la descripción del dispositivo ("Cámara QA Santiago TC-DIS-63"), que no es un panel.
    const seccionConFormulario = page
      .getByRole('main')
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Configuración Remota IoT' }) })
      .filter({ has: page.getByRole('button', { name: /enviar configuración/i }) })
      .last();
    const panelCamara = seccionConFormulario.getByText(/resoluci[oó]n|fps|video|stream|lente|zoom/i);
    await expect.soft(panelCamara, 'No hay panel específico de cámara en Configuración Remota (pendiente confirmación de Camila del criterio RF-23)')
      .toHaveCount(0);

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('formulario de configuración (frecuencia/intervalo) — sin violaciones axe A/AA', async ({ page }, testInfo) => {
    // Sensor fijo por serial (SERIAL_SENSOR), no "la primera tarjeta Activo": el orden del
    // selector cambia cada vez que alguien crea un dispositivo en TEST (ver constantes).
    const tarjetaSensor = tarjetaPorSerial(page, SERIAL_SENSOR);
    await tarjetaSensor.click();

    // Opción (b), decidida 2026-10-05: el escaneo de axe corre ANTES de los
    // getByLabel, para que la regla "label" se evalúe sobre el formulario abierto
    // aunque los asserts de abajo fallen. El formulario se da por abierto con su
    // botón de envío (no depende de los labels). Los asserts no cambian.
    await expect(page.getByRole('button', { name: /enviar configuración/i })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    // Estos dos getByLabel deberían FALLAR con el código actual porque el
    // label no está asociado al input (ver nota de cabecera). Si Playwright
    // no encuentra el input por label, es la confirmación en vivo del
    // hallazgo — no cambiar a un selector por posición/CSS para "hacerlo
    // pasar": eso oculta el bug real en vez de documentarlo.
    const frecuencia = page.getByLabel(/frecuencia de captura/i);
    const intervalo = page.getByLabel(/intervalo de transmisión/i);

    await expect(frecuencia).toBeVisible();
    await expect(intervalo).toBeVisible();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('error de validación (intervalo < frecuencia) — mensaje anunciado (role=alert) y sin violaciones', async ({ page }, testInfo) => {
    // "Enviar configuración" se pulsa de verdad: el POST .../configurar queda
    // abortado por bloquearEscriturasIot (ver cabecera), nunca llega al dispositivo.
    // Sensor fijo por serial (SERIAL_SENSOR), no "la primera tarjeta Activo" (ver constantes).
    const tarjetaSensor = tarjetaPorSerial(page, SERIAL_SENSOR);
    await tarjetaSensor.click();

    // Fuerza el error: intervalo_transmision debe ser >= frecuencia_captura
    // (regla real en ConfiguracionRemotaSection.tsx, validate() del form).
    // timeout de 15 s en el fill: mientras el label siga sin asociar, getByLabel no encuentra
    // el campo y sin este límite el test esperaba los 600 s completos (06/10/2026).
    await page.getByLabel(/frecuencia de captura/i).fill('20', { timeout: 15_000 });
    await page.getByLabel(/intervalo de transmisión/i).fill('5', { timeout: 15_000 });
    await page.getByRole('button', { name: /enviar configuración/i }).click();

    // El componente renderiza el error con role="alert" — confirmar que el
    // texto real coincide (viene de i18n, revisar es-CO/configuration.json
    // si esto falla por copy distinto al esperado).
    await expect(page.getByRole('alert')).toContainText(/mayor o igual a la frecuencia/i);

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
