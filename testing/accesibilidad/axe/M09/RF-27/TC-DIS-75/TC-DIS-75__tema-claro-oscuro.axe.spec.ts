import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
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
 * sesión o tras pulsar "Guardar tema" (lo que persiste en el backend).
 * ACTUALIZADO 2026-09-29: forzar el atributo por `page.evaluate()` no sirve —
 * al abrir Personalización la app re-aplica la preferencia guardada y lo pisa.
 * Los tests de contraste usan el botón del AppBar (`ponerTema`, al final del
 * archivo). Ese botón persiste en backend, así que su PATCH se intercepta con
 * `bloquearGuardadoTema` (la cuenta compartida no cambia) y el tema se restaura
 * en un `finally` como respaldo. Re-ejecución 2026-09-29: 0 color-contrast en
 * claro y oscuro, 3 viewports, con data-theme verificado antes y después de axe.
 * Una prueba FUNCIONAL de que "Guardar tema" persiste y aplica correctamente
 * es un caso aparte, fuera del alcance de este archivo.
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

test.describe('TC-DIS-75 — RF-27: Tema Claro/Oscuro (accesibilidad)', () => {
  test('sección Tema Visual (tema por defecto de la cuenta) no tiene violaciones', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    const headingTema = page.getByRole('heading', { name: 'Tema Visual' });
    await expect(headingTema).toBeVisible();
    // Acotado a la sección Tema Visual: "Mi preferencia" también aparece en la
    // sección Idioma (snapshot admin.dev, 2026-09-29) y getByText sin acotar
    // fallaba por strict mode antes de llegar al escaneo de axe. La sección es
    // el ancestro más cercano del heading que contiene ese texto.
    const seccionTema = headingTema.locator('xpath=ancestor::*[.//text()[contains(., "Mi preferencia")]][1]');
    await expect(seccionTema.getByText('Mi preferencia')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-75', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-75-vista-general.json', results);

    expect(results.violations).toEqual([]);
  });

  test('las 3 tarjetas de tema no exponen estado de selección — confirma hallazgo #1', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // .first() porque el panel "Mi preferencia" (personal) siempre renderiza
    // primero en el DOM, antes que el opcional "Tema global" (ver TODO).
    // Acotado a <main>: sin acotar, name 'Oscuro' (coincidencia parcial)
    // resolvía primero al botón "Cambiar a modo oscuro" del AppBar. Nombres
    // accesibles tomados del snapshot real (admin.dev, 2026-09-29):
    // "Claro Claro Interfaz con fondo blanco", "Oscuro Oscuro Interfaz…", etc.
    const main = page.getByRole('main');
    const claro = main.getByRole('button', { name: /^Claro / }).first();
    const oscuro = main.getByRole('button', { name: /^Oscuro / }).first();
    const automatico = main.getByRole('button', { name: /^Automático / }).first();

    for (const boton of [claro, oscuro, automatico]) {
      await expect(boton).toBeVisible();
      // Debe FALLAR mientras el bug exista: ninguna tarjeta tiene aria-pressed.
      const ariaPressed = await boton.getAttribute('aria-pressed');
      expect(ariaPressed).not.toBeNull();
    }
  });

  test('los subtítulos de panel no son encabezados semánticos — confirma hallazgo #2', async ({ page }, testInfo) => {
    await loginComoAdmin(page);

    // Debe FALLAR mientras el bug exista: "Mi preferencia" es un <div>, no un heading.
    await expect(page.getByRole('heading', { name: 'Mi preferencia' })).toBeVisible();
  });

  test('CRÍTICO — tema Claro forzado: sin violaciones de contraste', async ({ page }, testInfo) => {
    await bloquearGuardadoTema(page, testInfo);
    await loginComoAdmin(page);
    const temaOriginal = await ponerTema(page, 'light');
    try {
      const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
      // El escaneo solo vale si el tema siguió aplicado mientras axe corría.
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      guardarResultadoAxe('TC-DIS-75', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
      guardarResultados('axe-TC-DIS-75-tema-claro.json', results);

      const violacionesContraste = results.violations.filter((v) => v.id === 'color-contrast');
      expect(violacionesContraste).toEqual([]);
    } finally {
      await ponerTema(page, temaOriginal);
    }
  });

  test('CRÍTICO — tema Oscuro forzado: sin violaciones de contraste', async ({ page }, testInfo) => {
    await bloquearGuardadoTema(page, testInfo);
    await loginComoAdmin(page);
    const temaOriginal = await ponerTema(page, 'dark');
    try {
      const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
      // El escaneo solo vale si el tema siguió aplicado mientras axe corría.
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      guardarResultadoAxe('TC-DIS-75', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
      guardarResultados('axe-TC-DIS-75-tema-oscuro.json', results);

      const violacionesContraste = results.violations.filter((v) => v.id === 'color-contrast');
      expect(violacionesContraste).toEqual([]);
    } finally {
      await ponerTema(page, temaOriginal);
    }
  });
});

type Tema = 'light' | 'dark';

/**
 * Cambia el tema con la acción real de usuario (botón del AppBar) y devuelve el tema
 * que había antes, para restaurarlo al final del test.
 *
 * Antes se forzaba con `setAttribute('data-theme', …)`, pero al abrir Personalización
 * `useTemaVisual` vuelve a aplicar la preferencia guardada y pisaba el atributo: axe
 * llegó a escanear en claro un test "oscuro" (traza de la re-ejecución 2026-09-29).
 *
 * OJO: el botón del AppBar PERSISTE la preferencia en el backend
 * (`useTheme.toggle` → `temaVisualApi.guardar`). Los tests de contraste bloquean ese
 * guardado con `bloquearGuardadoTema` para no tocar la cuenta compartida; el `finally`
 * que restaura el tema queda solo como respaldo.
 *
 * Antes de leer el tema actual se espera a que la sección Tema Visual termine de cargar
 * ("Guardar tema" visible + networkidle): esa carga re-aplica la preferencia guardada y,
 * si llega después del clic, revierte el tema (fallo de la ejecución del 2026-09-29).
 */
async function ponerTema(page: Page, objetivo: Tema): Promise<Tema> {
  const html = page.locator('html');
  await expect(page.getByRole('main').getByRole('button', { name: 'Guardar tema', exact: true }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  const actual: Tema = (await html.getAttribute('data-theme')) === 'dark' ? 'dark' : 'light';
  if (actual !== objetivo) {
    const nombre = objetivo === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    await page.getByRole('banner').getByRole('button', { name: nombre, exact: true }).click();
  }
  await expect(html).toHaveAttribute('data-theme', objetivo);
  // Que no quede red pendiente y el tema se mantenga (sin re-aplicación posterior).
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await expect(html).toHaveAttribute('data-theme', objetivo);
  return actual;
}

/**
 * Intercepta SOLO el guardado de la preferencia personal de tema
 * (`PATCH /configuracion/personalizacion/tema`, `temaVisualApi.guardar` en
 * src/configuration/api/personalizacionApi.ts) y responde 200 sin llegar al backend.
 * La lectura (GET) y el tema global (`/tema/global`) pasan intactos. El toggle del
 * AppBar ignora la respuesta (`void guardar().catch(() => {})`), así que el cambio
 * visual es el real de la app.
 */
async function bloquearGuardadoTema(page: Page, testInfo: { title: string; project: { name: string } }) {
  let bloqueados = 0;
  await page.route(/\/configuracion\/personalizacion\/tema(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    bloqueados++;
    const dto = route.request().postDataJSON() ?? {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dto) });
  });
  page.on('close', () => {
    console.log(`[guardado-tema-bloqueado] ${testInfo.project.name} · ${testInfo.title}: ${bloqueados} PATCH interceptados`);
  });
}
