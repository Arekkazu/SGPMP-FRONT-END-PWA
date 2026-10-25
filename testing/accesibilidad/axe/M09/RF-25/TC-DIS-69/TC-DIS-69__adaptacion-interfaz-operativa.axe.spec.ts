import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
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
 * ── Re-ejecución 2026-10-09: cuentas confirmadas para los 3 estados ────────
 * - Estado (c) "finca con especies": TEST_PRODUCTOR_EMAIL (Ana Ramirez, id_finca 57
 *   "Finca QA Juan Esteban") responde 200 con especies_configuradas pobladas — dashboard
 *   operativo normal, sin ninguno de los dos estados alternos.
 * - Estado (b) "finca sin especies": TEST_FINCA_SIN_ESPECIES_EMAIL (hongos@gmail.com,
 *   "Finca Hongos") responde 204 en /configuracion/interfaz/contexto — confirmado por
 *   curl directo contra la API. Antes de esta reejecución no había cuenta confirmada
 *   para este estado y el test quedaba `test.skip`; ahora está implementado.
 * - Estado (a) "sin finca": la cuenta TEST_ADMIN_EMAIL (admin.dev@gmail.com), que
 *   el código de ContextoProvider.tsx sigue documentando como "sin finca activa
 *   propia", respondía 204 en la reejecución anterior — el mismo código que el
 *   estado (b), no el 200 con id_finca=null que este TC asumía como determinístico
 *   para el Administrador. Lo mismo ocurría con TEST_CONTADOR_EMAIL
 *   (contador@pecuaria.co, `fincas: []` en /usuarios/me): también 204, no 200.
 *   Se reportó como issue de backend #312; Alex confirmó que ninguna de esas dos
 *   cuentas sin especies/áreas corresponde al estado (a) genuino, y que el campo
 *   `fincas` de /usuarios/me está hardcodeado (no refleja el vínculo real) — no
 *   hizo falta ningún cambio de backend para #312, el bug estaba en no tener una
 *   cuenta sin NINGÚN vínculo a finca para probar.
 *   RESUELTO 2026-10-09 con una tercera cuenta, TEST_SIN_FINCA_EMAIL
 *   (cm09175.qa@sgpmp-test.com): confirmado por curl directo que
 *   GET /configuracion/interfaz/contexto responde 200 con `id_finca: null`,
 *   `finca_activa: null` y `especies_configuradas: []` — el estado (a) genuino,
 *   distinto del 204 de las otras dos cuentas. El test ya no está bloqueado.
 * - Copy del dashboard operativo: el encabezado "Bienvenido…" que medía el estado
 *   (c) ya no existe — DashboardPage.tsx saluda con "Hola, {nombre}" (sin relación
 *   con RF-25). Se actualiza el assert a ese texto.
 */

const PRODUCTOR_EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PRODUCTOR_PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const SIN_ESPECIES_EMAIL = process.env.TEST_FINCA_SIN_ESPECIES_EMAIL ?? '';
const SIN_ESPECIES_PASSWORD = process.env.TEST_FINCA_SIN_ESPECIES_PASSWORD ?? '';
const SIN_FINCA_EMAIL = process.env.TEST_SIN_FINCA_EMAIL ?? '';
const SIN_FINCA_PASSWORD = process.env.TEST_SIN_FINCA_PASSWORD ?? '';

async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { timeout: 90_000 });
  // Mitigación del reporte de Sara (hallazgo 2): navegar inmediatamente tras el
  // login invalidaba la sesión bajo automatización.
  await page.waitForLoadState('networkidle');
}

function guardarResultados(nombre: string, contenido: unknown) {
  const outDir = path.join(__dirname, 'resultados');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, nombre), JSON.stringify(contenido, null, 2));
}

test.describe('TC-DIS-69 — RF-25: Adaptación de Interfaz Operativa (accesibilidad)', () => {
  test('Rol con Finca Hongos (sin especies) ve el estado vacío "Finca sin configuración", sin violaciones', async ({ page }, testInfo) => {
    expect(SIN_ESPECIES_EMAIL, 'Falta TEST_FINCA_SIN_ESPECIES_EMAIL en testing/.env.test').not.toBe('');
    expect(SIN_ESPECIES_PASSWORD, 'Falta TEST_FINCA_SIN_ESPECIES_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesion(page, SIN_ESPECIES_EMAIL, SIN_ESPECIES_PASSWORD);

    // Estado (b): la finca existe (Finca Hongos) pero no tiene especies configuradas;
    // el backend lo señala con 204 en /configuracion/interfaz/contexto.
    await expect(page.getByRole('heading', { name: 'Finca sin configuración' })).toBeVisible();
    await expect(
      page.getByText('Para visualizar los indicadores de monitoreo, primero debe configurar las especies y áreas productivas en el módulo de Configuración.')
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-69', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-69-sin-especies.json', results);

    expect(results.violations).toEqual([]);
  });

  test('Productor (finca con especies configuradas) ve el dashboard operativo normal, sin violaciones', async ({ page }, testInfo) => {
    expect(PRODUCTOR_EMAIL, 'Falta TEST_PRODUCTOR_EMAIL en testing/.env.test').not.toBe('');
    expect(PRODUCTOR_PASSWORD, 'Falta TEST_PRODUCTOR_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesion(page, PRODUCTOR_EMAIL, PRODUCTOR_PASSWORD);

    // Dashboard operativo normal: ni la bienvenida "sin finca" (estado a) ni el
    // aviso "Finca sin configuración" (estado b) deben aparecer. El saludo
    // "Bienvenido…" ya no existe en DashboardPage.tsx; ahora es "Hola, {nombre}".
    await expect(page.getByRole('heading', { name: /^Hola/ })).toBeVisible();
    await expect(page.getByText('Finca QA Juan Esteban', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bienvenido al sistema' })).toHaveCount(0);
    await expect(page.getByText('Finca sin configuración')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-69', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-69-productor.json', results);

    expect(results.violations).toEqual([]);
  });

  test('Cuenta sin finca vinculada ve la bienvenida de "sin finca", sin violaciones', async ({ page }, testInfo) => {
    expect(SIN_FINCA_EMAIL, 'Falta TEST_SIN_FINCA_EMAIL en testing/.env.test').not.toBe('');
    expect(SIN_FINCA_PASSWORD, 'Falta TEST_SIN_FINCA_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesion(page, SIN_FINCA_EMAIL, SIN_FINCA_PASSWORD);

    // Estado (a): sin ninguna finca vinculada; el backend lo señala con 200 e
    // id_finca=null en /configuracion/interfaz/contexto (confirmado por curl).
    await expect(page.getByRole('heading', { name: 'Bienvenido al sistema' })).toBeVisible();
    await expect(
      page.getByText('Actualmente no tiene una unidad productiva asignada. Por favor, contacte al administrador para vincular su cuenta a una finca.')
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir a mi perfil' })).toBeVisible();
    await expect(page.getByText('Finca sin configuración')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    guardarResultadoAxe('TC-DIS-69', __dirname, `${testInfo.project.name} · ${testInfo.title}`, results);
    guardarResultados('axe-TC-DIS-69-sin-finca.json', results);

    expect(results.violations).toEqual([]);
  });
});
