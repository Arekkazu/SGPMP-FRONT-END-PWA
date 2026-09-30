import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';

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

test.describe('TC-DIS-63 — Accesibilidad: Configuración Remota IoT (RF-23)', () => {
  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado del panel de Configuración Remota + selector de dispositivo — sin violaciones axe A/AA', async ({ page }, testInfo) => {
    // DispSelector: cada dispositivo activo es un <button> con serial +
    // descripción + estado "Activo" (texto, no solo el punto verde) —
    // esto ya cumple 1.4.1 (no depender solo de color) según el código.
    await expect(page.getByText(/selecciona el dispositivo a configurar/i)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    // Documentar aquí, no solo aserción ciega: adjuntar el JSON completo en
    // resultados/axe-TC-DIS-63.json (paso aparte, ver README del proyecto).
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('formulario de configuración (frecuencia/intervalo) — sin violaciones axe A/AA', async ({ page }, testInfo) => {
    // Selecciona el primer dispositivo activo disponible (tarjeta-botón).
    // TODO: fijar un dispositivo de prueba determinístico por serial una
    // vez se confirme cuál existe en el seed del ambiente de QA.
    const primeraTarjeta = page.getByRole('button').filter({ hasText: /activo/i }).first();
    await primeraTarjeta.click();

    // Estos dos getByLabel deberían FALLAR con el código actual porque el
    // label no está asociado al input (ver nota de cabecera). Si Playwright
    // no encuentra el input por label, es la confirmación en vivo del
    // hallazgo — no cambiar a un selector por posición/CSS para "hacerlo
    // pasar": eso oculta el bug real en vez de documentarlo.
    const frecuencia = page.getByLabel(/frecuencia de captura/i);
    const intervalo = page.getByLabel(/intervalo de transmisión/i);

    await expect(frecuencia).toBeVisible();
    await expect(intervalo).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    guardarResultadoAxe('TC-DIS-63', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('error de validación (intervalo < frecuencia) — mensaje anunciado (role=alert) y sin violaciones', async ({ page }, testInfo) => {
    const primeraTarjeta = page.getByRole('button').filter({ hasText: /activo/i }).first();
    await primeraTarjeta.click();

    // Fuerza el error: intervalo_transmision debe ser >= frecuencia_captura
    // (regla real en ConfiguracionRemotaSection.tsx, validate() del form).
    await page.getByLabel(/frecuencia de captura/i).fill('20');
    await page.getByLabel(/intervalo de transmisión/i).fill('5');
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
