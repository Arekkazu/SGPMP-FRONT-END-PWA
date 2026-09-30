import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-81 — RF-29: Configuración de Idioma del sistema
 * Módulo 9 · Ruta: /configuracion → tab "Personalización" → sección "Idioma"
 * Componente real: src/configuration/components/IdiomaSection.tsx
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Nota de origen ───────────────────────────────────────────────────────
 * `IdiomaSection.tsx` es estructuralmente casi un gemelo de
 * `TemaVisualSection.tsx` (RF-27, TC-DIS-75) — mismo patrón de tarjeta-botón,
 * mismo panel "Mi preferencia"/"<X> global". Los hallazgos 1-4 de abajo son
 * la misma familia de bugs ya documentada en TC-DIS-75, confirmados aquí de
 * forma independiente leyendo este componente en particular, no copiados sin
 * verificar.
 *
 * ── Hallazgos reales de accesibilidad ───────────────────────────────────────
 *
 * 1. VIOLACIÓN CONFIRMADA — ninguna de las 2 tarjetas de idioma (IdiomaCard,
 *    líneas ~63-112) expone `aria-pressed` ni `aria-checked`, a pesar de ser
 *    un grupo de selección única (Español / English). El único indicador de
 *    cuál está activa es visual (check + borde). WCAG 4.1.2, Nivel A. No lo
 *    detecta axe automático — el test 2 lo confirma con un assert directo.
 *
 * 2. OBSERVACIÓN — los títulos de panel "Mi preferencia" / "Idioma global"
 *    (línea ~156) son un <div> con estilo de encabezado, no un `<h3>` real.
 *    Se agrava aquí porque "Mi preferencia" es el MISMO texto literal que ya
 *    usa TemaVisualSection en la misma pestaña "Personalización" — sin
 *    encabezados reales que los distingan por jerarquía, un lector de
 *    pantalla que navegue por texto en vez de por encabezados puede confundir
 *    a cuál sección pertenece cada "Mi preferencia".
 *
 * 3. OBSERVACIÓN — la bandera de cada tarjeta usa `role="img" aria-label={label}`
 *    (línea ~85) junto a un <span> de texto visible con el mismo `label`.
 *    Nombre accesible del botón redundante, mismo patrón que TC-DIS-75.
 *
 * 4. OBSERVACIÓN — el ícono de check de la tarjeta seleccionada
 *    (`<Check size={12} color="#fff" />`, línea ~107) no lleva `aria-hidden`,
 *    misma inconsistencia ya vista en TC-DIS-75.
 *
 * 5. Confirmado como correcto — `aplicarLocale()` (shared/i18n/index.ts)
 *    SÍ actualiza `document.documentElement.lang` al cambiar de idioma, tanto
 *    al cargar sesión como tras guardar. WCAG 3.1.1 (Language of Page) se
 *    cumple. No hace falta test aparte para esto salvo verificación funcional.
 *
 * ── TODO / decisión de alcance ───────────────────────────────────────────
 * - TODO: `guardar()` en useIdioma.ts llama `aplicarLocale()` de inmediato
 *   tras un guardado exitoso — es decir, probar el guardado de verdad
 *   cambiaría el idioma persistido de ADMIN_EMAIL, la cuenta compartida de
 *   pruebas de todo el equipo. Este archivo NO ejecuta el guardado por eso;
 *   solo prueba la estructura de accesibilidad del selector, sin persistir
 *   nada. Una verificación funcional de que guardar aplica el idioma sin
 *   recargar es un caso aparte, fuera del alcance de este archivo.
 * - TODO: el panel "Idioma global" solo se renderiza si la cuenta tiene
 *   permiso sobre el recurso 27 (acción 3) — mismo TODO ya dejado en
 *   TC-DIS-75, sin confirmar si ADMIN_EMAIL lo tiene.
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
  await irAConfiguracion(page, /^(Personalización|Personalization)$/);
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

test.describe('TC-DIS-81 — RF-29: Configuración de Idioma del sistema (accesibilidad)', () => {
  test('sección Idioma no tiene violaciones de accesibilidad', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Español' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'English' }).first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-81', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-81-vista-general.json', results);

    expect(results.violations).toEqual([]);
  });

  test('las 2 tarjetas de idioma no exponen estado de selección — confirma hallazgo #1', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // .first() por si el panel "Idioma global" también renderiza con las
    // mismas 2 tarjetas (ver TODO de cabecera sobre el permiso del recurso 27).
    const espanol = page.getByRole('button', { name: 'Español' }).first();
    const english = page.getByRole('button', { name: 'English' }).first();

    for (const boton of [espanol, english]) {
      await expect(boton).toBeVisible();
      // Debe FALLAR mientras el bug exista: ninguna tarjeta tiene aria-pressed.
      const ariaPressed = await boton.getAttribute('aria-pressed');
      expect(ariaPressed).not.toBeNull();
    }
  });

  test('el subtítulo de panel no es un encabezado semántico — confirma hallazgo #2', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // Debe FALLAR mientras el bug exista: "Mi preferencia" es un <div>, no un heading.
    await expect(page.getByRole('heading', { name: 'Mi preferencia' })).toBeVisible();
  });
});
