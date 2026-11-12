// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-213: accesibilidad del aviso de retiro y del estado EN_TRATAMIENTO |
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-213: irA() esperaba un h1 fijo en la ficha del activo, que en realidad es dinámico (identificador); se navega sin exigir ese título |
// | 2026-11-11 | Laura032005 | M05 RF-76 TC-DIS-213: E11 verificado con BOV-115-TIL (1628), ya EN_TRATAMIENTO por Ivermectina, que preparó el DBA |
/**
 * TC-DIS-213 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la notificación de inicio de período de
 * retiro y del estado EN_TRATAMIENTO del activo
 * RF-76 · CU-01 Registrar Suministros (Aplicación de Medicamentos) · Rol: Veterinario
 * Suministros → Medicamentos (/suministros/medicamentos) para la columna "Fin del retiro";
 * Activos Biológicos → ficha del activo (/activos-biologicos/:id) para EstadoPill.
 *
 * Criterio (hoja M05): verificación manual de 4.1.3 (la confirmación del registro, la
 * notificación de inicio del período de retiro y el mensaje E11 se anuncian mediante aria-live
 * sin mover el foco); 0 violaciones axe A/AA en 1.4.1 (el estado EN_TRATAMIENTO y la
 * fecha_fin_retiro vigente se comunican con badge y etiqueta textual, no solo con color); 1.4.3
 * (contraste ≥ 4.5:1 del badge).
 *
 * Nota de la hoja: el cambio de estado a EN_TRATAMIENTO lo ejecuta RF-44 (biological_assets),
 * no RF-76. Si ese flujo no deja un activo en EN_TRATAMIENTO en el ambiente, el paso 3 se
 * reporta como dependencia bloqueada, no como fallo de RF-76.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-213';
const RUTA = 'suministros/medicamentos';
const TITULO = 'Aplicación de medicamentos';
const PASOS_LIGHTHOUSE = ['tabla-en-retiro'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Periodo de retiro y estado EN_TRATAMIENTO (RF-76)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Confirmación del registro - aviso de retiro anunciado por toast, no solo por color (4.1.3 / 1.4.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso)');
    anotar(testInfo, 'Confirmación (MedicamentosView)', 'El mensaje de confirmación lo redacta el backend y se muestra con pushToast(\'success\', t(\'medicamento.registrado\'), r.mensaje) — se delega en ToastHost; se verifica que el host de toasts use una región con role="status"/aria-live.');
    const toastHost = page.locator('[role="status"], [aria-live]').filter({ hasText: /./ });
    desviacion(await toastHost.count() >= 0, 'no se pudo forzar un registro real sin un activo de prueba con ciclo abierto en el ambiente; se documenta el mecanismo (pushToast) sin poder capturar el anuncio en vivo');
  });

  test('2. "Fin del retiro" en la tabla - fecha_fin_retiro vigente con etiqueta textual, no solo color (1.4.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const encabezado = main(page).locator('table thead th', { hasText: 'Fin del retiro' });
    precondicion(await encabezado.count() > 0, 'no hay tabla de aplicaciones visible para inspeccionar la columna "Fin del retiro"');
    if (await encabezado.count() === 0) return;

    const enRetiro = main(page).locator('table tbody tr', { hasText: /En retiro hasta/ });
    const n = await enRetiro.count();
    anotar(testInfo, 'Aplicaciones en retiro vigente', String(n));
    precondicion(n > 0, 'ninguna aplicación visible tiene un período de retiro vigente (fecha_fin_retiro ≥ hoy)');
    if (n > 0) {
      // No se asume la posición de la columna (difiere según el tipo de activo): se busca el
      // texto "En retiro hasta" dentro de la fila, donde sea que la celda lo muestre.
      const celda = enRetiro.first().getByText(/En retiro hasta/);
      await expect.soft(celda, '1.4.1: "En retiro hasta" debe ser texto, no solo un color de advertencia').toBeVisible();
    }

    await escanear(page, TC_ID, __dirname, 'tabla-en-retiro', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Estado EN_TRATAMIENTO en la ficha del activo - badge con ícono y texto, no solo color (1.4.1 / 1.4.3, dependencia de RF-44)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    // BOV-115-TIL (id 1628) ya está EN_TRATAMIENTO por Ivermectina (dato real del DBA): se abre
    // su ficha directamente, en vez de depender de cuál activo aparezca primero en la tabla.
    const id = '1628';
    // ActivoHeader pinta el h1 con el identificador del activo (dinámico), no un título fijo:
    // irA() no sirve aquí porque exige un h1 exacto conocido de antemano.
    await page.goto(`activos-biologicos/${id}`, { waitUntil: 'commit', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    const pill = page.getByText('En tratamiento', { exact: true });
    // El detalle del activo se resuelve de forma asíncrona tras networkidle: se espera a que el
    // badge aparezca (o a que el timeout confirme que de verdad no está) en vez de decidir con
    // el primer count() inmediato, que puede ganarle a la carga real.
    await pill.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    const enTratamiento = await pill.count() > 0;
    anotar(testInfo, 'Estado del activo consultado (BOV-115-TIL)', enTratamiento ? 'EN_TRATAMIENTO' : 'otro estado (no es un fallo de RF-76: depende de RF-44)');
    precondicion(enTratamiento, 'BOV-115-TIL (1628) no aparece EN_TRATAMIENTO en este momento; el dato del DBA pudo haber cambiado');
    if (enTratamiento) {
      await expect.soft(pill, '1.4.1: el estado debe leerse como texto').toBeVisible();
      // EstadoPill envuelve ícono + etiqueta en el mismo <span>: el ícono es descendiente
      // directo del elemento que coincide con el texto exacto, no de un ancestro.
      const icono = pill.locator('svg');
      await expect.soft(icono, '1.4.1: el badge EN_TRATAMIENTO debe llevar también un ícono, no solo texto').toHaveCount(1);
    }
  });

  test('4. E11 - tratamientos simultáneos sobre BOV-115-TIL (id 1628, ya EN_TRATAMIENTO por Ivermectina)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso)');
    await btn.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();

    const selectorActivo = dialogo.getByRole('combobox', { name: 'Activo biológico' });
    await selectorActivo.fill('1628');
    await selectorActivo.blur();
    await dialogo.locator('#medicamento-nombre').fill('Complejo B');
    await dialogo.locator('#medicamento-via').selectOption('INTRAMUSCULAR');
    await dialogo.locator('#medicamento-fecha').fill('2026-11-11');
    await dialogo.locator('#medicamento-hora').fill('10:00');
    await dialogo.locator('#medicamento-dosis').fill('5');
    await dialogo.locator('#medicamento-unidad').fill('ml');
    await dialogo.locator('#medicamento-costo').fill('5000');
    await dialogo.locator('#medicamento-vet').fill('Carlos Ramírez');
    await dialogo.locator('#medicamento-motivo').fill('Segundo tratamiento simultáneo (E11)');
    await dialogo.getByRole('button', { name: 'Guardar registro', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const alerta = dialogo.getByRole('alert');
    const siguioAbierto = await dialogo.isVisible().catch(() => false);
    const toastHost = page.locator('[role="status"], [aria-live]').filter({ hasText: /./ });
    const mensajeToast = await toastHost.count() > 0 ? await toastHost.first().innerText() : null;
    anotar(
      testInfo,
      'E11 - resultado del envío',
      siguioAbierto
        ? `diálogo sigue abierto; alerta: ${await alerta.count() > 0 ? await alerta.innerText() : 'ninguna'}`
        : `el diálogo se cerró; toast: ${mensajeToast ?? 'ninguno capturado'}`,
    );
    if (!siguioAbierto) {
      expect.soft(mensajeToast, '4.1.3 (E11): el mensaje de retiro extendido/tratamiento simultáneo debe anunciarse por una región viva (role=status/aria-live), no solo visualmente').not.toBeNull();
    } else if (await alerta.count() > 0) {
      await expect.soft(alerta, '4.1.3 (E11): si el servidor rechaza el segundo tratamiento, debe anunciarse').toBeVisible();
    }
  });
});
