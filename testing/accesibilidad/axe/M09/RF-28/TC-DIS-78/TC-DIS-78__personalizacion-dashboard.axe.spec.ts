import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-78 — RF-28: Personalización del Dashboard
 * (⚠ crítico en el handoff — "reordenamiento operable por teclado, no solo
 * drag-and-drop con mouse")
 * Módulo 9 · Ruta: /configuracion → tab "Personalización" → sección
 * "Dashboard Personalizable"
 * Componente real: src/configuration/components/DashboardLayoutSection.tsx
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Corrección a la advertencia del handoff ─────────────────────────────────
 * El código NO usa drag-and-drop en absoluto — ni `draggable`, ni
 * `onDragStart`/`onDrop`, ni nada equivalente (confirmado con grep sobre todo
 * el archivo). El mecanismo real es clic-para-seleccionar-en-catálogo →
 * clic-para-colocar-en-celda-vacía, y AMBOS lados usan `<button type="button">`
 * reales (líneas ~351 para celdas de grilla, ~436 para ítems de catálogo).
 * Un `<button>` nativo es operable por teclado (Tab + Enter/Espacio) sin
 * trabajo adicional. La preocupación "crítica" del handoff sobre
 * reordenamiento solo-con-mouse NO se sostiene contra el código actual — el
 * test 2 de abajo lo demuestra ejecutando el flujo completo solo con teclado,
 * en vez de solo afirmarlo en un comentario.
 *
 * ── Hallazgos reales (más chicos que lo que se esperaba) ───────────────────
 *
 * 1. OBSERVACIÓN — cuando hay un widget seleccionado, el `aria-label` de las
 *    celdas vacías objetivo es `Colocar ${selectedKey}` (línea ~378), donde
 *    `selectedKey` es el identificador interno del widget (ej. "temp_galpon"),
 *    NO su nombre visible (`w.nombre`, ej. "Temperatura del galpón"). Un
 *    lector de pantalla anunciaría el slug interno, no un nombre legible.
 *    El test 3 de abajo lo confirma comparando el nombre visible elegido
 *    contra el aria-label real de la celda objetivo.
 *
 * 2. OBSERVACIÓN — `ConfirmModal` (líneas ~86-114, disparado por "Restaurar
 *    predeterminado") declara `role="dialog"` y `aria-modal="true"`
 *    correctamente, con `aria-labelledby` apuntando a su título. Pero no hay
 *    `onKeyDown` en todo el archivo (confirmado con grep) — no hay manejo de
 *    Escape para cerrar, y no hay evidencia de trampa de foco. La semántica
 *    declarada (aria-modal) promete un comportamiento que el código no
 *    confirma. El test 4 de abajo intenta cerrar con Escape; si el modal
 *    sigue visible después, confirma el hallazgo.
 *
 * 3. Confirmado como correcto, sin necesidad de test aparte: el componente
 *    compartido `Alert` (usado para "Widget seleccionado", "Límite
 *    alcanzado", "Guardado", errores) usa `role="alert" aria-live="assertive"`
 *    — todos los mensajes dinámicos de esta pantalla SÍ se anuncian.
 *
 * ── TODO ─────────────────────────────────────────────────────────────────
 * - TODO: el catálogo de widgets y sus nombres reales son datos del backend
 *   (`modulo9.widgets`, filtrado por rol) — no son texto estático de i18n, así
 *   que no se pueden hardcodear. Los tests usan `.first()` sobre lo que exista
 *   en el catálogo, sin asumir un widget específico.
 * - TODO: el selector del panel de catálogo (tests 2 y 3) usa un ascenso
 *   `xpath=../..` desde el texto "Catálogo de Widgets", basado en la
 *   estructura exacta del JSX leída en el código (2 niveles: texto → wrapper
 *   de header → panel exterior). Si esa estructura cambia, este selector
 *   necesita ajustarse.
 */

const ADMIN_EMAIL = 'adminplaywright@gmail.com';
const ADMIN_PASSWORD = 'pruebasadmin123#';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);
  // el JWT vive SOLO en memoria, nunca en localStorage — por eso después
  // del login nunca se usa page.goto() para navegar, eso recarga la
  // página y borra la sesión. Se navega por clic, como un usuario real.
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.getByRole('button', { name: 'Personalización', exact: true }).click();
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-78 — RF-28: Personalización del Dashboard (accesibilidad)', () => {
  test('vista inicial de Dashboard Personalizable no tiene violaciones', async ({ page }) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Dashboard Personalizable' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catálogo de Widgets' }).or(page.getByText('Catálogo de Widgets'))).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultados('axe-TC-DIS-78-vista-inicial.json', results);

    expect(results.violations).toEqual([]);
  });

  test('seleccionar y colocar un widget funciona completamente por teclado', async ({ page }) => {
    await loginComoAdmin(page);

    const panelCatalogo = page.getByText('Catálogo de Widgets', { exact: true }).locator('xpath=../..');
    const primerWidget = panelCatalogo.getByRole('button').first();

    // Selección por teclado: foco + Enter, no .click().
    await primerWidget.focus();
    await expect(primerWidget).toBeFocused();
    await page.keyboard.press('Enter');

    // Tras seleccionar, las celdas vacías cambian su aria-label a "Colocar ...".
    const celdaObjetivo = page.getByRole('button', { name: /^Colocar /i }).first();
    await expect(celdaObjetivo).toBeVisible();

    // Colocación por teclado: foco + Enter, no .click().
    await celdaObjetivo.focus();
    await expect(celdaObjetivo).toBeFocused();
    await page.keyboard.press('Enter');

    // Si funcionó, el catálogo debe reflejar el widget como ya colocado
    // (badge "✓") y debe aparecer la alerta de éxito al guardar, aunque este
    // test no guarda — solo confirma que la colocación en la grilla ocurrió
    // sin usar el mouse en ningún momento.
    await expect(page.getByRole('button', { name: /^Quitar /i }).first()).toBeVisible();
  });

  test('la celda objetivo anuncia el identificador interno, no el nombre visible — confirma hallazgo #1', async ({ page }) => {
    await loginComoAdmin(page);

    const panelCatalogo = page.getByText('Catálogo de Widgets', { exact: true }).locator('xpath=../..');
    const primerWidget = panelCatalogo.getByRole('button').first();

    const nombreVisible = (await primerWidget.textContent())?.trim() ?? '';
    await primerWidget.click();

    const celdaObjetivo = page.getByRole('button', { name: /^Colocar /i }).first();
    const ariaLabelCelda = (await celdaObjetivo.getAttribute('aria-label')) ?? '';

    // Debe FALLAR mientras el bug exista: el aria-label usa el key interno,
    // que no coincide con el nombre visible completo del widget.
    expect(ariaLabelCelda).toContain(nombreVisible);
  });

  test('el modal de "Restaurar predeterminado" no tiene violaciones y cierra con Escape', async ({ page }) => {
    await loginComoAdmin(page);

    await page.getByRole('button', { name: 'Restaurar predeterminado' }).click();

    const modal = page.getByRole('dialog', { name: 'Restaurar configuración predeterminada' });
    await expect(modal).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    guardarResultados('axe-TC-DIS-78-modal-restaurar.json', results);
    expect(results.violations).toEqual([]);

    // Debe FALLAR mientras el hallazgo #2 exista: sin onKeyDown, Escape no cierra el modal.
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
