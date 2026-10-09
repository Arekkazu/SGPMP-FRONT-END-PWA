import { test, expect as expectBase, type Page, type Locator, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import fs from 'fs';
import path from 'path';

// Red lenta: expect de 30 s por defecto (mismo criterio que TC-DIS-63). Las esperas sobre
// elementos que pueden NO existir (hallazgos) llevan 15 s explícitos para fallar rápido.
const expect = expectBase.configure({ timeout: 30_000 });
const RAPIDO = { timeout: 15_000 };

/**
 * TC-DIS-66 — RF-24: Calibración de Dispositivos IoT
 * Módulo 9 · Ruta: /configuracion → tab "IoT" → sección "Calibración de Sensores IoT"
 *
 * Metodología: leído directamente del código fuente real de
 * Arekkazu/SGPMP-FRONT-END-PWA @ dev (src/configuration/components/CalibracionSection.tsx,
 * src/configuration/pages/ConfigurationPage.tsx, src/shared/design-system/Input.tsx,
 * src/shared/design-system/Sidebar.tsx). NO se ejecuta todavía contra el ambiente de
 * QA — solo se construye el código, como acordó el equipo mientras se corrigen las
 * fallas transversales de M01.
 *
 * ── Hallazgos reales de accesibilidad (confirmados leyendo el código) ──────────
 *
 * 1. VIOLACIÓN ESPERADA — Campo "Valor de referencia" (input numérico). El <label>
 *    y el <input> son elementos hermanos dentro de un <div>, sin `htmlFor`/`id`.
 *    No hay asociación implícita (el input no está anidado dentro del label).
 *    El input solo lleva `aria-required="true"`, que no sustituye un nombre
 *    accesible.
 *    → Regla axe-core: `label`. WCAG 1.3.1 (Info and Relationships) y 4.1.2
 *      (Name, Role, Value), Nivel A.
 *
 * 2. VIOLACIÓN ESPERADA — Campo "Observaciones" (textarea). Mismo patrón exacto:
 *    <label> sin `htmlFor`, <textarea> sin `id`.
 *    → Regla axe-core: `label`. WCAG 1.3.1 / 4.1.2, Nivel A.
 *
 * 3. Contraste dentro del propio código: el campo "Fecha y hora de calibración"
 *    SÍ usa el componente reutilizable <Input label=.../> del design system
 *    (src/shared/design-system/Input.tsx), que resuelve `inputId` y asocia
 *    `htmlFor`/`id` correctamente. Confirma que 1 y 2 son una inconsistencia real
 *    — 2 de 3 controles del formulario usan HTML crudo en vez del componente
 *    accesible que ya existe en el proyecto — no un patrón intencional.
 *
 * 4. OBSERVACIÓN MANUAL (no necesariamente detectada por axe automático) — el
 *    stepper interno de 3 pasos (Dispositivo → Sensor → Registrar calibración)
 *    es un <div> puramente visual, sin `aria-current` ni ningún `role`. Contrasta
 *    con el tab bar principal de ConfigurationPage, que sí usa
 *    `aria-current={activeTab === tab.id ? 'page' : undefined}` en sus <button>.
 *    Un lector de pantalla no tiene forma de saber en qué paso del wizard está el
 *    usuario más allá del texto plano de cada paso.
 *    TODO: verificar manualmente con lector de pantalla si esto genera confusión
 *    real de navegación; no se marca como fallo duro de axe.
 *
 * 5. OBSERVACIÓN — la tabla "Historial de calibraciones" tiene <th> en su <thead>
 *    sin `scope="col"`. Mismo patrón ya documentado como hallazgo en M01. No es
 *    necesariamente una violación dura de axe en tablas simples, pero es mejora
 *    recomendada para robustez con lectores de pantalla.
 *
 * ── Notas de selectores ─────────────────────────────────────────────────────
 * El tab "IoT" es un <button type="button"> dentro de <nav aria-label=...>,
 * NO role="tab" — se usa getByRole('button', ...), no getByRole('tab', ...).
 * El ítem de sidebar "Configuración" también es <button>, texto visible
 * "Configuración" (namespace i18n `nav`, clave `modulos.configuracion`).
 *
 * ── TODO — no se puede saber sin ejecutar ──────────────────────────────────
 * - TODO: el wizard solo llega al paso 3 (formulario, donde viven los bugs 1 y 2)
 *   si existe al menos 1 dispositivo IoT activo con al menos 1 sensor activo
 *   asociado a un área productiva en el seed de staging. Este es el mismo
 *   pendiente de Alex (serial de dispositivo fijo en seed) que bloquea EJECUTAR
 *   RF-23/24/25, no construir el script. Los tests de abajo usan `.first()`
 *   sobre lo que exista, sin asumir un serial específico.
 * - TODO: confirmar contra la cuenta ADMIN_EMAIL real que `usePermission(12, 1)`
 *   efectivamente da permiso de calibrar (si no, se renderiza el Alert
 *   "Sin permiso" en vez del wizard, y estos tests fallarían por eso, no por
 *   bugs de accesibilidad).
 *
 * ── Re-ejecución en TEST (2026-10-06), misma infraestructura que TC-DIS-63 ─────
 * - SEGURIDAD DE DATOS: toda escritura (no-GET) bajo /configuracion/dispositivos-iot/**
 *   y /configuracion/sensores/** se ABORTA (`bloquearEscriturasIot`): incluye
 *   POST /configuracion/sensores/{id}/calibrar (calibrationApi, iotApi.ts:130).
 * - Dispositivo FIJO por serial (IOT-EST01-HLA-001, id 1, 3 sensores activos),
 *   no "la primera tarjeta": el orden cambia cuando alguien crea dispositivos.
 * - Login con waitUntil 'commit' + diagnóstico del POST, HAR de /assets/**,
 *   ruta relativa (baseURL del config). Esperas sobre posibles hallazgos: 15 s.
 * - Test 2 (paso 3) NO CUBIERTO: al cargar el historial del sensor la pantalla queda en
 *   blanco (#251). API: valor_referencia llega como string; CalibracionSection.tsx:187 usa
 *   `.toFixed(4)` sin conversión y no hay ErrorBoundary. Queda en test.fixme hasta el fix.
 * - OBSERVACIÓN: el título "Historial de calibraciones" está escrito en español fijo
 *   (CalibracionSection.tsx:169), no pasa por i18n.
 * - OBSERVACIÓN MANUAL (no violación): cada tarjeta de la lista de dispositivos de
 *   Calibración repite el texto fijo "Solo dispositivos activos son calibrables"
 *   (CalibracionSection.tsx:105) aunque la lista ya está filtrada a activos:
 *   repetitivo para lector de pantalla y confuso.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const SERIAL_DISPOSITIVO = process.env.TC_DIS_66_DISPOSITIVO ?? 'IOT-EST01-HLA-001';
// Sensor fijo de ese dispositivo con historial de calibraciones (2 filas en TEST, GET 2026-10-06).
const NOMBRE_SENSOR = process.env.TC_DIS_66_SENSOR ?? 'Sensor oxígeno disuelto estanque-01';
const reSerial = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// testing/.har-cache/assets.har (5 niveles desde la carpeta del TC; ignorado por testing/.gitignore).
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');

async function usarCacheAssets(contexto: BrowserContext) {
  const grabar = !fs.existsSync(HAR_ASSETS);
  await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: grabar, notFound: 'fallback' });
}

/** Aborta toda escritura sobre dispositivos IoT y sensores (calibrar incluido); deja pasar GET. */
async function bloquearEscriturasIot(page: Page, testInfo: { title: string; project: { name: string } }) {
  const bloqueadas: string[] = [];
  await page.route(/\/configuracion\/(dispositivos-iot|sensores)(\/.*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.continue();
    bloqueadas.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.abort('blockedbyclient');
  });
  page.on('close', () => {
    console.log(`[escrituras-iot-bloqueadas] ${testInfo.project.name} · ${testInfo.title}: ${bloqueadas.length}${bloqueadas.length ? ' → ' + bloqueadas.join(', ') : ''}`);
  });
}

async function loginComoAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  }
  // Diagnóstico del POST de login: status y cuerpo de la RESPUESTA (nunca el request,
  // que lleva la contraseña); el token de una respuesta exitosa se tapa.
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

  // 'commit' en vez de 'load': con red lenta el evento load pasa de 90 s.
  // Ruta relativa: el ambiente lo decide `use.baseURL` de playwright.config.ts.
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
  await irAConfiguracion(page, /^IoT$/);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
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

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-66 — RF-24: Calibración de Dispositivos IoT (accesibilidad)', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    await usarCacheAssets(context);
    await bloquearEscriturasIot(page, testInfo);
  });

  test('paso 1 del wizard (selección de dispositivo) no tiene violaciones de accesibilidad', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Calibración de Sensores IoT' })).toBeVisible();
    await expect(page.getByText('Selecciona el dispositivo que contiene el sensor a calibrar:')).toBeVisible();

    // OBSERVACIÓN MANUAL (no violación de axe), registrada en el resumen del test.
    testInfo.annotations.push({
      type: 'Observación manual (no violación)',
      description: 'Cada tarjeta de dispositivo en Calibración repite "Solo dispositivos activos son calibrables" (CalibracionSection.tsx:105) aunque la lista ya está filtrada a activos: repetitivo y confuso.',
    });

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-66', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-66-paso1.json', results);

    expect(results.violations).toEqual([]);
  });

  test('paso 3 del wizard (formulario de calibración) — confirma bugs de label en Valor de referencia y Observaciones', async ({ page }, testInfo) => {
    // 2026-10-08: verificado contra la API real (GET /configuracion/sensores/3/calibraciones)
    // que valor_referencia, ganancia y offset ya llegan como number (10.0, 8.5), no como texto.
    // Se destraba el fixme de #251 para confirmar en pantalla si la calibración ya no se cae.
    await loginComoAdmin(page);

    // Avanza con lo primero disponible en el seed, sin asumir un serial fijo
    // (ver TODO de cabecera). Si no hay dispositivos/sensores activos, este
    // test no podrá completarse hasta que se resuelva el pendiente de Alex.
    // Acotado a <main> + filtro por el texto fijo de cada tarjeta de DispSelector
    // ("Solo dispositivos activos son calibrables"): un selector sin acotar
    // (getByRole('button').filter({hasText:/./}).first()) resolvía al botón
    // "Cerrar sesión" del sidebar y cerraba la sesión de verdad en vez de
    // elegir un dispositivo.
    // 2026-10-06: dispositivo FIJO por serial (SERIAL_DISPOSITIVO) en vez de `.first()`:
    // el orden de la lista cambia cada vez que alguien crea un dispositivo en TEST.
    // Mismo tipo de selector (tarjeta en <main> con el texto fijo de Calibración).
    const dispositivo = page.getByRole('main')
      .getByRole('button', { name: reSerial(SERIAL_DISPOSITIVO) })
      .filter({ hasText: /calibrables/i });
    await dispositivo.click();

    // Acotado por hermandad DOM: SensorSelector renderiza el grid de tarjetas
    // como hermano del botón "Cambiar dispositivo", no hay otro texto fijo
    // propio de la tarjeta de sensor para filtrar por contenido.
    // 2026-10-06: sensor FIJO por nombre (en vez de `.first()`), elegido porque tiene
    // historial de calibraciones (2 filas en TEST): así el escaneo cubre la tabla.
    const estadosCalibraciones: string[] = [];
    page.on('response', (r) => {
      if (r.request().method() === 'GET' && /\/configuracion\/sensores\/\d+\/calibraciones/.test(new URL(r.url()).pathname)) {
        estadosCalibraciones.push(`${new URL(r.url()).pathname} → ${r.status()}`);
      }
    });
    const sensor = page.locator('button:has-text("Cambiar dispositivo") ~ div button').filter({ hasText: NOMBRE_SENSOR });
    await sensor.click();
    // Diagnóstico: nombre del sensor que quedó abierto (encabezado del formulario,
    // CalibracionSection.tsx ~242: <div>{sensor.nombre}</div> + "… · Dispositivo: {serial}").
    const nombreAbierto = await page.getByRole('main').getByText(new RegExp(`Dispositivo: ${SERIAL_DISPOSITIVO}`))
      .locator('xpath=preceding-sibling::div[1]').first().innerText({ timeout: 15_000 }).catch(() => '(no encontrado)');
    console.log(`[sensor-abierto] ${testInfo.project.name}: "${nombreAbierto}" (esperado "${NOMBRE_SENSOR}")`);

    // Opción (b), 2026-10-06: el formulario se da por abierto con su botón de envío
    // "Registrar calibración" (CalibracionSection.tsx ~325) y axe corre ANTES del expect
    // del heading. "Datos de calibración" es un <span> (línea ~263), no un heading: el
    // assert de abajo sigue fallando y documenta ese hallazgo (1.3.1).
    await expect(page.getByRole('button', { name: /registrar calibración/i })).toBeVisible();

    // Evidencia: status del GET del historial y tema en el momento del escaneo.
    const tablaHistorial = page.getByRole('main').locator('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Valor ref.' }) });
    console.log(`[historial] ${testInfo.project.name}: GET calibraciones = ${estadosCalibraciones.join(', ') || 'ninguno'} | data-theme=${await page.locator('html').getAttribute('data-theme')}`);

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-66', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-66-paso3.json', results);

    // Hallazgos manuales del header (4 y 5), medidos en el DOM real y registrados como
    // anotaciones (no son asserts): <th> sin scope en el historial y stepper sin aria-current.
    const seccionCalibracion = page.getByRole('main').locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Calibración de Sensores IoT' }) })
      .filter({ has: page.getByRole('button', { name: /registrar calibración/i }) })
      .last();
    const th = tablaHistorial.locator('th');
    const thSinScope = tablaHistorial.locator('th:not([scope])');
    const conAriaCurrent = seccionCalibracion.locator('[aria-current]');
    testInfo.annotations.push(
      { type: 'Hallazgo manual: th sin scope', description: `${await thSinScope.count()} de ${await th.count()} <th> del historial sin scope` },
      { type: 'Hallazgo manual: stepper sin aria-current', description: `${await conAriaCurrent.count()} elementos con aria-current dentro de la sección de Calibración (stepper de 3 pasos)` },
    );
    for (const a of testInfo.annotations.slice(-2)) console.log(`[manual] ${testInfo.project.name} · ${a.type}: ${a.description}`);

    // Si el sensor no tiene área asociada, el formulario igual se renderiza
    // (con el Alert "Sensor sin área asignada" y el botón de submit deshabilitado),
    // así que los campos deben seguir siendo alcanzables para esta verificación.
    await expect(page.getByRole('heading', { name: 'Datos de calibración' })).toBeVisible(RAPIDO);

    // Estos dos expects documentan explícitamente los hallazgos 1 y 2 del header:
    // HOY deben fallar porque el label no está asociado al control. Quedan así,
    // sin softening, para que la ejecución real confirme el bug documentado
    // en vez de ocultarlo con un selector más permisivo.
    await expect(page.getByLabel('Valor de referencia')).toBeVisible(RAPIDO);
    await expect(page.getByLabel('Observaciones')).toBeVisible(RAPIDO);

    // La regla axe `label` debe aparecer mientras el bug exista.
    const violacionesLabel = results.violations.filter((v) => v.id === 'label');
    expect(violacionesLabel).toEqual([]);
  });
});
