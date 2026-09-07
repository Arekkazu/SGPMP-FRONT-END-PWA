import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-75 — RF-27: Tema Claro/Oscuro (⚠ crítico — contraste exigido en AMBOS temas)
 * Módulo 9 · Ruta: /configuracion → tab "Personalización" → sección "Tema Visual"
 * Componentes reales: src/configuration/components/TemaVisualSection.tsx,
 * src/shared/tema/tema.ts, src/shared/tema/useTemaSesion.ts
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Cómo se aplica el tema (clave para poder probar contraste en ambos) ────
 * `aplicarTema()` en shared/tema/tema.ts escribe el tema directo en el DOM con
 * `document.documentElement.setAttribute('data-theme', 'light' | 'dark')` (y lo
 * espeja en localStorage). No existe un mecanismo de "vista previa en sesión"
 * como el de Identidad Visual (RF-26) — la UI solo llama a esto al cargar la
 * sesión o tras pulsar "Guardar tema" (lo que persiste en el backend). Para
 * probar CONTRASTE en ambos temas sin escribir la preferencia real de la
 * cuenta de pruebas, los tests de abajo fuerzan el atributo directo por
 * `page.evaluate()` — mismo mecanismo que usa la propia app, sin pasar por
 * guardar/backend. Una prueba FUNCIONAL de que "Guardar tema" persiste y
 * aplica correctamente es un caso aparte, fuera del alcance de este archivo.
 *
 * ── Hallazgos reales de accesibilidad ───────────────────────────────────────
 *
 * 1. VIOLACIÓN CONFIRMADA — ninguna de las 3 tarjetas de tema (TemaCard,
 *    líneas ~66-128) expone `aria-pressed`, `aria-checked` ni ningún estado
 *    equivalente, a pesar de que son un grupo de selección única (Claro /
 *    Oscuro / Automático). El único indicador de cuál está activa es visual
 *    (check + borde de color). WCAG 4.1.2 (Name, Role, Value), Nivel A. No lo
 *    detecta un escaneo automático de axe (no puede inferir que el grupo de
 *    botones representa una selección). El test de abajo lo confirma con un
 *    assert directo sobre el atributo, no con `results.violations`.
 *
 * 2. OBSERVACIÓN — los títulos de panel "Mi preferencia" / "Tema global"
 *    (TemaPanel, línea ~170) son un <div> con estilo de encabezado, no un
 *    elemento `<h3>` real. La sección padre SÍ usa `<h2>` correctamente
 *    (línea ~230, "Tema Visual"), pero estos subtítulos rompen la navegación
 *    por encabezados de un lector de pantalla dentro de la sección.
 *
 * 3. OBSERVACIÓN — el emoji de cada tarjeta usa `role="img" aria-label={label}`
 *    (línea ~105) junto a un <span> de texto visible con el mismo `label`
 *    justo al lado. Produce un nombre accesible del botón redundante (algo
 *    como "Claro, Claro, Interfaz con fondo blanco"). No es un fallo duro,
 *    pero es ruido evitable para quien usa lector de pantalla.
 *
 * 4. OBSERVACIÓN — inconsistencia con el resto del código: el ícono de check
 *    que marca la tarjeta seleccionada (`<Check size={12} color="#fff" />`,
 *    línea ~123) NO lleva `aria-hidden`, a diferencia del mismo ícono en el
 *    Stepper de CalibracionSection (TC-DIS-66), que sí lo lleva. Riesgo de
 *    que algún lector de pantalla lo exponga como gráfico sin nombre.
 *
 * 5. CRÍTICO DEL RF — contraste en AMBOS temas. Se prueba forzando
 *    `data-theme` a 'light' y a 'dark' (ver nota de metodología arriba) y
 *    corriendo axe con foco en la regla `color-contrast` en cada uno.
 *
 * ── TODO ─────────────────────────────────────────────────────────────────
 * - TODO: el panel "Tema global" solo se renderiza si la cuenta tiene permiso
 *   sobre el recurso 27 (accion 3); no confirmado si ADMIN_EMAIL lo tiene.
 *   Los tests de abajo solo cubren el panel "Mi preferencia" (personal), que
 *   siempre debe existir para cualquier cuenta autenticada.
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

test.describe('TC-DIS-75 — RF-27: Tema Claro/Oscuro (accesibilidad)', () => {
  test('sección Tema Visual (tema por defecto de la cuenta) no tiene violaciones', async ({ page }) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Tema Visual' })).toBeVisible();
    await expect(page.getByText('Mi preferencia')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultados('axe-TC-DIS-75-vista-general.json', results);

    expect(results.violations).toEqual([]);
  });

  test('las 3 tarjetas de tema no exponen estado de selección — confirma hallazgo #1', async ({ page }) => {
    await loginComoAdmin(page);

    // .first() porque el panel "Mi preferencia" (personal) siempre renderiza
    // primero en el DOM, antes que el opcional "Tema global" (ver TODO).
    const claro = page.getByRole('button', { name: 'Claro' }).first();
    const oscuro = page.getByRole('button', { name: 'Oscuro' }).first();
    const automatico = page.getByRole('button', { name: 'Automático' }).first();

    for (const boton of [claro, oscuro, automatico]) {
      await expect(boton).toBeVisible();
      // Debe FALLAR mientras el bug exista: ninguna tarjeta tiene aria-pressed.
      const ariaPressed = await boton.getAttribute('aria-pressed');
      expect(ariaPressed).not.toBeNull();
    }
  });

  test('los subtítulos de panel no son encabezados semánticos — confirma hallazgo #2', async ({ page }) => {
    await loginComoAdmin(page);

    // Debe FALLAR mientras el bug exista: "Mi preferencia" es un <div>, no un heading.
    await expect(page.getByRole('heading', { name: 'Mi preferencia' })).toBeVisible();
  });

  test('CRÍTICO — tema Claro forzado: sin violaciones de contraste', async ({ page }) => {
    await loginComoAdmin(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    guardarResultados('axe-TC-DIS-75-tema-claro.json', results);

    const violacionesContraste = results.violations.filter((v) => v.id === 'color-contrast');
    expect(violacionesContraste).toEqual([]);
  });

  test('CRÍTICO — tema Oscuro forzado: sin violaciones de contraste', async ({ page }) => {
    await loginComoAdmin(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    guardarResultados('axe-TC-DIS-75-tema-oscuro.json', results);

    const violacionesContraste = results.violations.filter((v) => v.id === 'color-contrast');
    expect(violacionesContraste).toEqual([]);
  });
});
