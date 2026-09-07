import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-87 — RF-32: Aplicación de Plantilla y resumen antes/después
 * Módulo 9 · Ruta: /configuracion → tab "Plantillas" → botón "Aplicar plantilla"
 * (por fila) → wizard de 4 pasos
 * Componente real: src/configuration/components/AplicarPlantillaWizard.tsx
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Hallazgos reales de accesibilidad ───────────────────────────────────────
 *
 * 1. VIOLACIÓN CONFIRMADA — el paso 2 del wizard ("Aplicando plantilla…",
 *    líneas ~258-264), que se muestra justo DESPUÉS de que el usuario confirma
 *    una acción explícitamente marcada como irreversible en el paso anterior,
 *    es texto plano sin `role="status"` ni `aria-live`. Un usuario de lector
 *    de pantalla que acaba de confirmar no recibe ningún anuncio de que la
 *    operación está en curso — tendría que re-explorar la pantalla para
 *    enterarse. Contraste: el Alert final de éxito en el paso 3 SÍ se anuncia
 *    bien, porque usa el componente `Alert` compartido (`role="alert"
 *    aria-live="assertive"`) — el hueco es específicamente el paso
 *    intermedio de carga, no el resultado.
 *
 * 2. VIOLACIÓN — mismo patrón sistémico ya confirmado en TC-DIS-78 y
 *    TC-DIS-84: `role="dialog" aria-modal="true" aria-labelledby=
 *    "wizard-modal-title"` (línea ~152) sin `onKeyDown`, `tabIndex` ni
 *    `autoFocus` en todo el archivo (confirmado con grep). Van 6 archivos
 *    distintos del repo con el mismo hueco de modal.
 *
 * 3. OBSERVACIÓN — el Stepper de 4 pasos (líneas ~14-48) no expone
 *    `aria-current` ni ningún rol, mismo patrón ya visto en el Stepper de
 *    3 pasos de CalibracionSection (TC-DIS-66, hallazgo #4). Refuerza que es
 *    un patrón repetido en más de un wizard del proyecto, no un caso único.
 *
 * 4. OBSERVACIÓN — el ícono de check "completado" del stepper (línea ~34) no
 *    lleva `aria-hidden`, mismo patrón recurrente visto en TemaCard/IdiomaCard
 *    y otros componentes ya revisados.
 *
 * 5. OBSERVACIÓN — los `<th>` de la tabla de diferencias (DiffTable, líneas
 *    ~90-94, "Parámetro/Antes/Después") no llevan `scope="col"`, mismo patrón
 *    menor ya visto en TC-DIS-66.
 *
 * ── Decisión de alcance — por qué NO se ejecuta la aplicación real ─────────
 * A diferencia de RF-27/RF-29 (donde evitar el guardado era una precaución
 * sobre una acción evitable), aquí "aplicar la plantilla" ES la
 * funcionalidad central del RF — pero también es una escritura real e
 * IRREVERSIBLE contra el backend de staging: sobrescribe los parámetros de
 * configuración de la especie destino elegida. No hay forma de confirmar
 * desde el código si el seed de staging tiene una especie de prueba
 * desechable para esto, o si el único conjunto de especies disponible es
 * compartido con el resto del equipo. Por eso el test 4 de abajo queda en
 * `test.skip` en vez de ejecutar la aplicación real — el hallazgo #1 ya
 * quedó confirmado por lectura de código (líneas ~258-264, sin
 * role="status"/aria-live), no hace falta ejecutarlo en vivo para saber que
 * falta. Antes de activar ese test, confirmar con el equipo qué especie de
 * prueba es segura de usar.
 *
 * ── TODO ─────────────────────────────────────────────────────────────────
 * - TODO: el botón "Aplicar plantilla" vive por fila en la tabla de
 *   plantillas (RF-30, fuera de este caso) — requiere que ya exista al menos
 *   1 plantilla registrada en el seed. Los tests usan `.first()` sobre lo que
 *   exista, sin asumir un nombre de plantilla específico.
 * - TODO: el botón "Aplicar plantilla" también depende de
 *   `usePermission(28, 5)` (acción "Ejecutar") — no confirmado si
 *   ADMIN_EMAIL lo tiene.
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
  await page.getByRole('button', { name: 'Plantillas', exact: true }).click();
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-87 — RF-32: Aplicación de Plantilla (accesibilidad)', () => {
  test('paso 1 del wizard (selección de especie destino) no tiene violaciones', async ({ page }) => {
    await loginComoAdmin(page);

    // Requiere al menos 1 plantilla registrada en el seed (ver TODO de cabecera).
    await page.getByRole('button', { name: 'Aplicar plantilla' }).first().click();

    const modal = page.getByRole('dialog', { name: 'Aplicar Plantilla' });
    await expect(modal).toBeVisible();
    await expect(page.getByText('Selecciona la especie destino')).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    guardarResultados('axe-TC-DIS-87-paso1-especie.json', results);

    expect(results.violations).toEqual([]);
  });

  test('paso 2 del wizard (previsualización) no tiene violaciones y advierte irreversibilidad', async ({ page }) => {
    await loginComoAdmin(page);
    await page.getByRole('button', { name: 'Aplicar plantilla' }).first().click();

    // Requiere al menos 1 especie activa en el seed.
    const primeraEspecie = page.getByRole('button', { name: /./ }).last();
    await primeraEspecie.click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByText('Previsualización')).toBeVisible();
    await expect(page.getByText('Esta acción es irreversible')).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    guardarResultados('axe-TC-DIS-87-paso2-previsualizacion.json', results);

    expect(results.violations).toEqual([]);
  });

  test('el modal NO cierra con Escape — confirma hallazgo #2 (sistémico)', async ({ page }) => {
    await loginComoAdmin(page);
    await page.getByRole('button', { name: 'Aplicar plantilla' }).first().click();

    const modal = page.getByRole('dialog', { name: 'Aplicar Plantilla' });
    await expect(modal).toBeVisible();

    // Debe FALLAR mientras el hallazgo exista.
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  // No se ejecuta: aplicar de verdad escribe permanentemente sobre la especie
  // destino en staging (ver "Decisión de alcance" en la cabecera). El
  // hallazgo #1 (paso "Aplicando..." sin role="status"/aria-live) ya está
  // confirmado por lectura de código — activar esto solo si el equipo
  // confirma una especie de prueba desechable para usar aquí.
  test.skip('el paso "Aplicando..." se anuncia a lectores de pantalla — confirma hallazgo #1', async ({ page }) => {
    // Pendiente: especie de prueba desechable confirmada por el equipo.
  });
});
