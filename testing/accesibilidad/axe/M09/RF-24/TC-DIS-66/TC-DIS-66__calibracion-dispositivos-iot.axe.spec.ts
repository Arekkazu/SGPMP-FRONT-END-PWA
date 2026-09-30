import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import fs from 'fs';
import path from 'path';

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
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

async function loginComoAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  }
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { timeout: 90_000 });
  // Mitigación del reporte de Sara (hallazgo 2): navegar inmediatamente tras el
  // login invalidaba la sesión bajo automatización.
  await page.waitForLoadState('networkidle');
  await irAConfiguracion(page, /^IoT$/);
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
  test('paso 1 del wizard (selección de dispositivo) no tiene violaciones de accesibilidad', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Calibración de Sensores IoT' })).toBeVisible();
    await expect(page.getByText('Selecciona el dispositivo que contiene el sensor a calibrar:')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-66', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-66-paso1.json', results);

    expect(results.violations).toEqual([]);
  });

  test('paso 3 del wizard (formulario de calibración) — confirma bugs de label en Valor de referencia y Observaciones', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // Avanza con lo primero disponible en el seed, sin asumir un serial fijo
    // (ver TODO de cabecera). Si no hay dispositivos/sensores activos, este
    // test no podrá completarse hasta que se resuelva el pendiente de Alex.
    // Acotado a <main> + filtro por el texto fijo de cada tarjeta de DispSelector
    // ("Solo dispositivos activos son calibrables"): un selector sin acotar
    // (getByRole('button').filter({hasText:/./}).first()) resolvía al botón
    // "Cerrar sesión" del sidebar y cerraba la sesión de verdad en vez de
    // elegir un dispositivo.
    const primerDispositivo = page.getByRole('main').getByRole('button').filter({ hasText: /calibrables/i }).first();
    await primerDispositivo.click();

    // Acotado por hermandad DOM: SensorSelector renderiza el grid de tarjetas
    // como hermano del botón "Cambiar dispositivo", no hay otro texto fijo
    // propio de la tarjeta de sensor para filtrar por contenido.
    const primerSensor = page.locator('button:has-text("Cambiar dispositivo") ~ div button').first();
    await primerSensor.click();

    // Si el sensor no tiene área asociada, el formulario igual se renderiza
    // (con el Alert "Sensor sin área asignada" y el botón de submit deshabilitado),
    // así que los campos deben seguir siendo alcanzables para esta verificación.
    await expect(page.getByRole('heading', { name: 'Datos de calibración' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-66', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-66-paso3.json', results);

    // Estos dos expects documentan explícitamente los hallazgos 1 y 2 del header:
    // HOY deben fallar porque el label no está asociado al control. Quedan así,
    // sin softening, para que la ejecución real confirme el bug documentado
    // en vez de ocultarlo con un selector más permisivo.
    await expect(page.getByLabel('Valor de referencia')).toBeVisible();
    await expect(page.getByLabel('Observaciones')).toBeVisible();

    // La regla axe `label` debe aparecer mientras el bug exista.
    const violacionesLabel = results.violations.filter((v) => v.id === 'label');
    expect(violacionesLabel).toEqual([]);
  });
});
