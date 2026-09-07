import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-84 — RF-31: Creación de Plantilla de Configuración
 * Módulo 9 · Ruta: /configuracion → tab "Plantillas" → botón "Nueva plantilla"
 * Componente real: src/configuration/components/PlantillaModal.tsx
 * (compartido con el flujo de versionar una plantilla existente, fuera del
 * alcance de este RF — aquí solo se prueba el modo "crear").
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Aciertos confirmados en este componente ─────────────────────────────────
 * A diferencia de TemaCard/IdiomaCard (RF-27/RF-29), aquí el patrón de
 * selección SÍ está bien resuelto:
 * - Los toggles de categoría (líneas ~253-289) usan `role="checkbox"` +
 *   `aria-checked={checked}` + `aria-label={etiqueta}` — semántica correcta
 *   con estado expuesto, justo lo que le faltaba a las tarjetas de tema/idioma.
 * - El ícono decorativo de cada categoría (línea ~279) usa
 *   `role="img" aria-hidden` — evita el doble anuncio redundante visto en
 *   TemaCard/IdiomaCard (icono con aria-label duplicando el texto visible).
 * - "Nombre de la plantilla" y "Especie base" usan `<label htmlFor>` + `id`
 *   correctamente asociados.
 *
 * ── Hallazgo real — no es aislado de este componente ────────────────────────
 *
 * 1. VIOLACIÓN CONFIRMADA — el modal declara `role="dialog" aria-modal="true"
 *    aria-labelledby="plantilla-modal-title"` (línea ~138), pero no hay
 *    `onKeyDown`, `tabIndex`, `autoFocus` ni manejo de foco en todo el
 *    archivo (confirmado con grep — cero coincidencias). No hay Escape para
 *    cerrar y no hay evidencia de trampa de foco: la semántica declarada
 *    promete más de lo que el código cumple.
 *    Se verificó que esto NO es un problema aislado de este archivo: el
 *    mismo hueco existe en `ConfirmModal` de DashboardLayoutSection
 *    (TC-DIS-78) y en `ModalShell.tsx` — un componente casi-compartido
 *    duplicado idénticamente en 3 módulos distintos (telemetry,
 *    biological_assets, prediction), con la misma ausencia total de
 *    onKeyDown/tabIndex/autoFocus. Son 5 archivos confirmados con el mismo
 *    patrón; el repo tiene ~25 archivos con `role="dialog"` en total, no
 *    todos revisados — se documenta como patrón fuerte, no como certeza
 *    universal. Vale la pena reportarlo como hallazgo transversal, no
 *    corregirlo caso por caso.
 *
 * ── TODO ─────────────────────────────────────────────────────────────────
 * - TODO: el modal necesita al menos 1 especie activa con configuración real
 *   (ciclos, patologías, métricas o umbrales) para poder marcar categorías y
 *   habilitar "Crear plantilla" — depende del seed de staging. El test usa
 *   la primera especie disponible en el <select>, sin asumir un nombre.
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

test.describe('TC-DIS-84 — RF-31: Creación de Plantilla de Configuración (accesibilidad)', () => {
  test('modal "Nueva Plantilla de Configuración" no tiene violaciones de accesibilidad', async ({ page }) => {
    await loginComoAdmin(page);
    await page.getByRole('button', { name: 'Nueva plantilla' }).click();

    const modal = page.getByRole('dialog', { name: 'Nueva Plantilla de Configuración' });
    await expect(modal).toBeVisible();

    // Confirma que los campos clave están correctamente asociados.
    await expect(page.getByLabel('Nombre de la plantilla')).toBeVisible();
    await expect(page.getByLabel('Especie base')).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    guardarResultados('axe-TC-DIS-84-modal.json', results);

    expect(results.violations).toEqual([]);
  });

  test('los toggles de categoría exponen su estado correctamente (checkbox real)', async ({ page }) => {
    await loginComoAdmin(page);
    await page.getByRole('button', { name: 'Nueva plantilla' }).click();

    // Requiere al menos 1 especie activa en el seed (ver TODO de cabecera).
    await page.getByLabel('Especie base').selectOption({ index: 1 });

    // Confirma el acierto: role=checkbox real con aria-checked, no solo
    // apariencia visual como en TemaCard/IdiomaCard.
    const categoria = page.getByRole('checkbox', { name: 'Etapas del ciclo biológico' });
    await expect(categoria).toBeVisible();
    const ariaChecked = await categoria.getAttribute('aria-checked');
    expect(['true', 'false']).toContain(ariaChecked);
  });

  test('el modal NO cierra con Escape — confirma el hallazgo transversal #1', async ({ page }) => {
    await loginComoAdmin(page);
    await page.getByRole('button', { name: 'Nueva plantilla' }).click();

    const modal = page.getByRole('dialog', { name: 'Nueva Plantilla de Configuración' });
    await expect(modal).toBeVisible();

    // Debe FALLAR mientras el hallazgo exista: sin onKeyDown, Escape no cierra
    // el modal, a pesar de aria-modal="true".
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
