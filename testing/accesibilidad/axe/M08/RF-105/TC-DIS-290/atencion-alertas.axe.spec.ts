// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-19 | Laura032005 | TC-DIS-290 RF-105: atención de alertas críticas con acción documentada y descarte de avisos |
/**
 * TC-DIS-290 — Verificar accesibilidad WCAG 2.1 AA de la atención de alertas CRITICA (acción documentada
 * mínima de 20 caracteres) y del descarte de INFORMATIVA y ADVERTENCIA [CRÍTICO]
 * RF-105 · CU-03 Gestionar notificaciones y alertas al usuario · Rol: Veterinario · Prioridad: Alta
 * Ruta: campana de la barra superior → bandeja → "Marcar como atendida" / "Descartar"
 *
 * Criterio: 0 violaciones axe A/AA en 3.3.2 (campo de acción con etiqueta, obligatorio y mínimo de 20
 * caracteres indicados); 3.3.1 (cada error en texto, asociado al campo y anunciado); 4.1.3 (resultado
 * anunciado); 2.1.1 (todo el flujo por teclado); 2.4.3 (foco tras atender o descartar). Una CRITICA no
 * se puede descartar (RF-105).
 *
 * Desbloqueado el 2026-11-19: la bandeja ya tiene "Marcar como atendida" y "Descartar" (commit 4283dd52 y
 * anteriores de M08). Atender y descartar NO llegan al backend: PATCH /notificaciones/{id}/atendida y
 * /descartada se responden en la prueba con la regla de RF-105 (mínimo 20 caracteres útiles) — "Datos
 * simulados" —. La bandeja se carga con las notificaciones de Datos_Semilla §9.1.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_290_VIEWPORTS=escritorio
 */
import type { Route } from '@playwright/test';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { PREFIJO_API, anotar, desviacion, escanear, estaEnRegionViva } from '../../../_shared/sigabA11y';
import {
  NOTIFICACIONES_VET, abrirBandeja, abrirSesionM08, anunciosDurante, bandeja, describirFocoDialogo, errorApi, focoVisible, irA,
  quitarSimulaciones, simularNotificaciones, type NotificacionSimulada,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-290';
const VIEWPORTS = (process.env.TC_DIS_290_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['atender-critica', 'atender-errores', 'descartar'];

const MENSAJE_CORTO = 'Describe en al menos 20 caracteres qué hiciste para atender la alerta.';

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/**
 * Responde atender y descartar como lo haría el backend (RF-105): una crítica necesita al menos 20 caracteres
 * útiles (sin contar espacios ni un mismo carácter repetido) y no se puede descartar. Actualiza `lista`.
 */
async function simularCierres(page: Page, lista: NotificacionSimulada[]) {
  await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/notificaciones\/\d+\/(atendida|descartada)$/.test(u.pathname), async (route: Route) => {
    const req = route.request();
    if (req.method() !== 'PATCH') return route.fallback();
    const [, id, accion] = /\/notificaciones\/(\d+)\/(atendida|descartada)$/.exec(new URL(req.url()).pathname)!;
    const n = lista.find((x) => x.id_notificacion === Number(id));
    if (!n) return route.fulfill({ status: 404, json: errorApi('NOTIFICACION_NO_ENCONTRADA', 'La notificación ya no existe.') });
    if (accion === 'descartada') {
      if (n.nivel === 'CRITICA') return route.fulfill({ status: 422, json: errorApi('CRITICA_NO_DESCARTABLE', 'Una alerta crítica no se puede descartar: márcala como atendida.') });
      n.estado = 'DESCARTADA';
      return route.fulfill({ status: 200, json: n });
    }
    const texto = String((req.postDataJSON() as { accion_documentada?: string | null } | null)?.accion_documentada ?? '');
    const util = texto.replace(/\s+/g, '');
    if (n.nivel === 'CRITICA' && (util.length < 20 || /^(.)\1*$/.test(util))) {
      return route.fulfill({ status: 422, json: errorApi('ACCION_DOCUMENTADA_INSUFICIENTE', MENSAJE_CORTO, 'accion_documentada') });
    }
    n.estado = 'ATENDIDA';
    n.accion_documentada = texto;
    return route.fulfill({ status: 200, json: n });
  });
}

test.describe('TC-DIS-290 — Atención de alertas críticas y descarte de avisos', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_290_VIEWPORTS.`);
  });
  test.afterEach(async () => {
    if (!page) return;
    if (await bandeja(page).isVisible().catch(() => false)) await page.keyboard.press('Escape');
    await quitarSimulaciones(page);
  });

  /** Bandeja con una copia fresca de las notificaciones y atender/descartar simulados. */
  async function prepararBandeja() {
    const lista = NOTIFICACIONES_VET.map((n) => ({ ...n }));
    await simularNotificaciones(page, lista);
    await simularCierres(page, lista);
    await irA(page, 'dashboard');
    return { lista, b: await abrirBandeja(page) };
  }

  const articulo = (texto: RegExp) => bandeja(page).locator('article').filter({ hasText: texto }).first();

  test('a. [3.3.2 / 2.1.1] Alerta crítica: no se puede descartar y el campo de acción indica obligatorio y mínimo (Datos simulados)', async ({}, testInfo) => {
    await prepararBandeja();
    anotar(testInfo, 'Datos simulados', 'Bandeja del Veterinario (§9.1); atender y descartar se responden en la prueba.');
    const critica = articulo(/Temperatura fuera de rango/);
    await expect(critica, 'No aparece la alerta crítica de temperatura').toBeVisible();
    expect.soft(await critica.getByRole('button', { name: 'Descartar' }).count(), 'RF-105: una alerta crítica ofrece "Descartar"').toBe(0);
    const marcar = critica.getByRole('button', { name: 'Marcar como atendida' });
    await marcar.focus();
    expect.soft(await focoVisible(page), '2.4.7: "Marcar como atendida" no muestra el foco').toBe(true);
    await page.keyboard.press('Enter');
    const campo = critica.getByRole('textbox');
    await expect(campo, '2.1.1: "Marcar como atendida" con teclado no muestra el campo de la acción').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'atender-critica', testInfo, LH);
    const info = await campo.evaluate((c) => ({
      etiqueta: (c as HTMLTextAreaElement).labels?.[0]?.textContent?.trim() ?? '', requerido: c.getAttribute('aria-required') === 'true' || (c as HTMLTextAreaElement).required,
      foco: document.activeElement === c,
    }));
    anotar(testInfo, 'Campo de la acción', JSON.stringify(info));
    expect.soft(info.etiqueta, '3.3.2: el campo no tiene etiqueta').not.toBe('');
    expect.soft(info.etiqueta, '3.3.2: la etiqueta no indica el mínimo de 20 caracteres').toMatch(/20 caracteres/);
    desviacion(info.requerido, '3.3.2: el campo obligatorio no lleva aria-required (solo lo dice el texto de la etiqueta)');
    desviacion(info.foco, '2.4.3: al abrir "Marcar como atendida" el foco no pasa al campo de la acción');
  });

  test('b. [3.3.1 / 4.1.3] Acción vacía, corta, solo espacios o repetida: cada error se anuncia y queda asociado al campo (Datos simulados)', async ({}, testInfo) => {
    await prepararBandeja();
    const critica = articulo(/Temperatura fuera de rango/);
    await critica.getByRole('button', { name: 'Marcar como atendida' }).click();
    const campo = critica.getByRole('textbox');
    const confirmar = critica.getByRole('button', { name: 'Confirmar' });
    const intentos: [string, string][] = [['vacía', ''], ['corta', 'ok'], ['20 espacios', ' '.repeat(20)], ['repetida', 'a'.repeat(25)]];
    let primero = true;
    for (const [nombre, valor] of intentos) {
      await campo.fill(valor);
      await confirmar.focus();
      const anuncios = anunciosDurante(page, 2500);
      await page.keyboard.press('Enter');
      const vistos = await anuncios;
      const estado = await campo.evaluate((c) => {
        const ids = (c.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        return { invalido: c.getAttribute('aria-invalid') === 'true', descripcion: ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim() };
      });
      if (primero) { await escanear(page, TC_ID, __dirname, 'atender-errores', testInfo, LH); primero = false; }
      anotar(testInfo, `Acción ${nombre}`, `${JSON.stringify(estado)} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
      expect.soft(estado.invalido, `3.3.1: con la acción ${nombre} el campo no queda marcado como inválido`).toBe(true);
      expect.soft(estado.descripcion, `3.3.1: con la acción ${nombre} el error no queda asociado al campo (aria-describedby)`).toMatch(/20 caracteres/);
      expect.soft(vistos.some((a) => /20 caracteres/.test(a)), `4.1.3: con la acción ${nombre} el error no se anuncia`).toBe(true);
      expect.soft(estado.descripcion, 'regla de textos visibles: el error muestra el código interno o el HTTP').not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b422\b/);
    }
  });

  test('c. [4.1.3 / 2.4.3 / 2.1.1] Atender con una acción válida y descartar una advertencia y una informativa con teclado (Datos simulados)', async ({}, testInfo) => {
    const { b } = await prepararBandeja();
    const critica = articulo(/Temperatura fuera de rango/);
    await critica.getByRole('button', { name: 'Marcar como atendida' }).click();
    await critica.getByRole('textbox').fill('Se abrió la ventilación del corral y la temperatura bajó a 28 °C.');
    await critica.getByRole('button', { name: 'Confirmar' }).focus();
    let anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    let vistos = await anuncios;
    let foco = await describirFocoDialogo(page);
    const sigue = await articulo(/Temperatura fuera de rango/).count();
    anotar(testInfo, 'Atender la crítica', `sigue en el panel: ${sigue > 0} · foco: ${foco} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(sigue, 'La alerta atendida sigue en el panel principal').toBe(0);
    desviacion(vistos.some((a) => /atendid/i.test(a)), '4.1.3: atender la alerta no anuncia el resultado');
    desviacion(foco.includes('(diálogo)') && !/^body/.test(foco), `2.4.3: tras atender, la notificación desaparece y el foco se pierde (queda en ${foco})`);

    for (const [nivel, texto] of [['advertencia', /Precio de mercado/], ['informativa', /Reporte listo/]] as const) {
      const descartar = articulo(texto).getByRole('button', { name: 'Descartar' });
      await expect.soft(descartar, `No hay "Descartar" en la ${nivel}`).toBeVisible();
      if (!(await descartar.count())) continue;
      await descartar.focus();
      anuncios = anunciosDurante(page, 3000);
      await page.keyboard.press('Enter');
      vistos = await anuncios;
      foco = await describirFocoDialogo(page);
      if (nivel === 'advertencia') await escanear(page, TC_ID, __dirname, 'descartar', testInfo, LH);
      anotar(testInfo, `Descartar la ${nivel}`, `foco: ${foco} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
      desviacion(vistos.some((a) => /descartad/i.test(a)), `4.1.3: descartar la ${nivel} no anuncia el resultado`);
      desviacion(foco.includes('(diálogo)') && !/^body/.test(foco), `2.4.3: tras descartar la ${nivel}, el foco se pierde (queda en ${foco})`);
    }
    // El contador de la bandeja refleja lo cerrado.
    const resumen = (await b.locator('header p').first().innerText()).trim();
    anotar(testInfo, 'Resumen tras cerrar tres notificaciones', resumen);
    desviacion(await estaEnRegionViva(b.locator('header p').first()), '4.1.3: el contador de la bandeja no está en una región viva');
  });
});
