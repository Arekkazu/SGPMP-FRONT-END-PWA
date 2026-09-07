import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * TC-DIS-69 — RF-25: Adaptación de Interfaz Operativa (ejecutar por los 3 roles)
 * Módulo 9 · Componente real: src/shared/contexto/ContextoProvider.tsx
 * Consumido en: src/App.tsx (AppShell), solo para la ruta /dashboard
 * (RUTAS_CON_BLOQUEO_SIN_FINCA = ['/dashboard']).
 *
 * Metodología: leído directamente de Arekkazu/SGPMP-FRONT-END-PWA @ dev. NO se
 * ejecuta todavía contra el ambiente de QA.
 *
 * ── Lo que el código confirma sobre "los 3 roles" ──────────────────────────
 * La adaptación de RF-25 en /dashboard depende de datos de la cuenta
 * (`contexto.id_finca` y `contexto.especies_configuradas`), no del nombre del
 * rol en sí. Hay exactamente 3 estados posibles:
 *   (a) sin finca vinculada       → <BienvenidaSinFinca />
 *   (b) finca sin especies        → <SinEspeciesEmptyState />
 *   (c) finca con especies        → dashboard operativo normal
 * El resto de rutas privadas (configuración, usuarios, roles, auditoría) NO
 * dependen de esto — el comentario del propio App.tsx lo dice explícitamente
 * (`operativa` solo es true para /dashboard).
 *
 * El Administrador (cuenta ADMIN_EMAIL) tiene `id_finca` SIEMPRE null — así lo
 * documenta un comentario del propio ContextoProvider.tsx ("Un Administrador
 * ... no tiene finca activa propia"). Esto hace el estado (a) determinístico:
 * no depende de ningún dato de seed, se puede construir y ejecutar ya con la
 * cuenta de pruebas existente.
 *
 * ── Hallazgos reales de accesibilidad ───────────────────────────────────────
 *
 * 1. OBSERVACIÓN — tanto BienvenidaSinFinca.tsx como SinEspeciesEmptyState.tsx
 *    envuelven un bloque completo (h1 + párrafo + Link) en `role="status"`.
 *    `role="status"` implica `aria-live="polite"` — pensado para anuncios
 *    transitorios (ej. "guardado con éxito"), no para reemplazar todo el
 *    contenido de una ruta con un bloque que además contiene un elemento
 *    interactivo (el Link). Uso atípico del rol; no es necesariamente un fallo
 *    duro de axe, pero vale verificación manual de cómo lo anuncian los
 *    lectores de pantalla reales.
 *
 * 2. OBSERVACIÓN — no hay manejo de foco en el cambio de contenido. Cuando
 *    `AppShell` reemplaza `children` por estas vistas (App.tsx líneas
 *    ~200-206), ningún efecto mueve el foco al nuevo `<h1>`. Un usuario de
 *    teclado o lector de pantalla que navega a /dashboard puede no notar que
 *    el contenido cambió respecto al dashboard operativo normal.
 *    TODO: verificar manualmente con lector de pantalla real.
 *
 * 3. Dato colateral, no es hallazgo de accesibilidad: DashboardPage.tsx tiene
 *    su propio bloque <Alert> para `sinEspecies` (líneas ~46-53) que parece
 *    inalcanzable — AppShell ya reemplaza todo `children` por
 *    <SinEspeciesEmptyState /> antes de que DashboardPage llegue a renderizar
 *    con `sinEspecies=true`. Se documenta solo para que quien ejecute no se
 *    confunda pensando que ese Alert es el que se debe evaluar.
 *
 * ── TODO — bloqueante para completar (no para lo del Administrador) ────────
 * - TODO: falta confirmar qué cuentas/roles concretos corresponden a los
 *   estados (b) "finca sin especies" y (c) "finca con especies" — no tengo
 *   credenciales para ninguna cuenta distinta de ADMIN_EMAIL. Preguntar a
 *   Alex/Camila: ¿"los 3 roles" de la tabla son 3 roles RBAC con nombre propio,
 *   o 3 cuentas de prueba con distinto estado de finca/especies? Los tests de
 *   esos 2 estados quedan como `test.skip` abajo hasta tener esa respuesta.
 */

const ADMIN_EMAIL = 'adminplaywright@gmail.com';
const ADMIN_PASSWORD = 'pruebasadmin123#';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);
  // el JWT vive SOLO en memoria, nunca en localStorage — el login ya deja al
  // usuario en /dashboard, que es justo la ruta que este caso necesita
  // evaluar, así que no hace falta navegar más.
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-69 — RF-25: Adaptación de Interfaz Operativa (accesibilidad)', () => {
  test('Administrador (sin finca vinculada) ve la bienvenida de "sin finca", sin violaciones', async ({ page }) => {
    await loginComoAdmin(page);

    // El Administrador siempre tiene id_finca = null → este estado es
    // determinístico con la cuenta de pruebas existente, sin depender de seed.
    await expect(page.getByRole('heading', { name: 'Bienvenido al sistema' })).toBeVisible();
    await expect(
      page.getByText('Actualmente no tiene una unidad productiva asignada. Por favor, contacte al administrador para vincular su cuenta a una finca.')
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir a mi perfil' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultados('axe-TC-DIS-69-administrador.json', results);

    expect(results.violations).toEqual([]);
  });

  // TODO: requiere una cuenta de prueba con finca vinculada pero sin especies
  // configuradas. Sin credenciales confirmadas todavía — ver TODO de cabecera.
  test.skip('rol con finca sin especies ve el estado vacío "Finca sin configuración", sin violaciones', async ({ page }) => {
    // Pendiente: credenciales de la cuenta + confirmar nombre del rol.
  });

  // TODO: requiere una cuenta de prueba con finca y especies configuradas
  // (dashboard operativo normal, sin ninguno de los dos estados alternos).
  test.skip('rol con finca y especies configuradas ve el dashboard operativo normal, sin violaciones', async ({ page }) => {
    // Pendiente: credenciales de la cuenta + confirmar nombre del rol.
  });
});
