/**
 * TC-DIS-192 — Verificar accesibilidad WCAG 2.1 AA de los mensajes de error del formulario de
 * Retroalimentación Clínica
 * RF-72 · CU-08 - Registrar Retroalimentación Clínica · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/historial → "Retroalimentar" — RetroalimentacionFormModal
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario (cuenta de Finca Prueba Alfa, datos semilla del 2026-10-22).
 *   - Un resultado INDIVIDUAL con retroalimentación previa del mismo usuario (E2) y otro con más de
 *     90 días (E9). Se buscan entre las inferencias REALES del activo #876.
 *
 * Criterio: 0 violaciones axe A/AA; 3.3.1 y 4.1.3: los errores E2 (retroalimentación duplicada),
 * E4 (diagnóstico clínico obligatorio faltante) y E9 (ventana de 90 días vencida, con la fecha
 * límite) se anuncian mediante aria-live / aria-describedby asociado al campo correspondiente.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * PROTECCIÓN DE DATOS: una retroalimentación es inmutable (NIC-41) y no se puede borrar. Ningún
 * POST llega al backend: el formulario se abre sobre la inferencia REAL que cumple la condición
 * (retroalimentada por el usuario / con más de 90 días) y el POST se responde en la prueba con el
 * error que define el RF-72 ("Datos simulados"):
 *   E2 → 409 RETROALIMENTACION_DUPLICADA, mensaje del RF;
 *   E9 → 422 FUERA_DE_VENTANA_TEMPORAL, mensaje del RF con N días, id y fecha límite reales.
 * E4 lo frena la validación del cliente antes de enviar.
 * Selector de activo: en TEST la lista `/activos-biologicos/?por_pagina=200` responde 307 → 404 y
 * la vista cae al campo numérico; la prueba escribe el ID o lo elige si la lista cargó.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_192_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-192';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_192_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ACTIVO_INDIVIDUAL = 876;
const DESDE = '2020-01-01';
const VENTANA_DIAS = 90;

interface Evento {
  tipo_evento: string;
  fecha_evento: string;
  id_resultado_inferencia?: string | null;
  id_usuario?: number | null;
  payload: Record<string, unknown> | null;
}

type ErrorSimulado = { status: number; json: { error_code: string; message: string } };

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión, datos reales y respuestas simuladas ──────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/**
 * Lecturas reales; guarda los eventos del historial. Ninguna escritura llega al backend: el POST de
 * retroalimentación se responde con `estado.error` (si está definido) o se aborta.
 */
async function interceptar(page: Page) {
  const estado = { eventos: [] as Evento[], cursor: null as string | null, error: null as ErrorSimulado | null, posts: [] as Record<string, unknown>[] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo === 'GET') {
      if (/\/prediccion\/historial\/\d+$/.test(p)) {
        const res = await route.fetch();
        const json = await res.json();
        estado.eventos = json.eventos ?? [];
        estado.cursor = json.cursor_siguiente ?? null;
        return route.fulfill({ response: res, json });
      }
      return route.fallback();
    }
    estado.posts.push(req.postDataJSON() ?? {});
    if (estado.error && metodo === 'POST' && /retroalimentacion/.test(p)) return route.fulfill({ status: estado.error.status, contentType: 'application/json', json: estado.error.json });
    return route.abort();
  });
  return estado;
}

async function consultarHistorial(page: Page, hasta?: string) {
  await page.goto(`${APP}/prediccion/historial`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/historial/i, { timeout: 60_000 });
  const campo = page.locator('#hist-activo');
  await campo.waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if ((await campo.evaluate((e) => e.tagName)) === 'SELECT') await campo.selectOption(String(ACTIVO_INDIVIDUAL));
  else await campo.fill(String(ACTIVO_INDIVIDUAL));
  await page.locator('#hist-desde').fill(DESDE);
  if (hasta) await page.locator('#hist-hasta').fill(hasta);
  await page.getByRole('button', { name: /consultar/i }).click();
  await expect(page.locator('main').getByRole('button', { name: /retroalimentar/i }).first()).toBeVisible({ timeout: 60_000 });
}

/** Inferencias reales que cumplen cada condición. */
function buscarCasos(eventos: Evento[]) {
  const retroalimentadas = new Set(eventos.filter((e) => e.tipo_evento === 'RETROALIMENTACION' && e.id_resultado_inferencia).map((e) => e.id_resultado_inferencia!));
  const inferencias = eventos.filter((e) => e.tipo_evento === 'INFERENCIA' && e.id_resultado_inferencia);
  const limite = Date.now() - VENTANA_DIAS * 86_400_000;
  return {
    duplicada: inferencias.find((e) => retroalimentadas.has(e.id_resultado_inferencia!)) ?? null,
    vencida: inferencias.find((e) => new Date(e.fecha_evento).getTime() < limite) ?? null,
    vigente: inferencias.find((e) => new Date(e.fecha_evento).getTime() >= limite && !retroalimentadas.has(e.id_resultado_inferencia!)) ?? null,
  };
}

/** Abre el formulario de la inferencia `objetivo` (el botón "Retroalimentar" de su evento en la línea de tiempo). */
async function abrirFormularioDe(page: Page, eventos: Evento[], objetivo: Evento): Promise<Locator> {
  // La línea de tiempo pinta los eventos en el orden recibido; el botón solo existe en los que tienen id de resultado
  const conBoton = eventos.filter((e) => e.id_resultado_inferencia);
  const indice = conBoton.indexOf(objetivo);
  expect(indice, 'El evento objetivo tiene botón "Retroalimentar"').toBeGreaterThanOrEqual(0);
  await page.locator('main').getByRole('button', { name: /retroalimentar/i }).nth(indice).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: /retroalimentaci[oó]n cl[ií]nica/i })).toBeVisible({ timeout: 15_000 });
  await expect(dialogo, 'El formulario abierto corresponde a la inferencia objetivo').toContainText(objetivo.id_resultado_inferencia!);
  return dialogo;
}

/** Cómo llega el error a la tecnología de asistencia: región viva y asociación a un campo. */
async function anuncioDe(error: Locator) {
  return error.evaluate((el) => {
    let n: Element | null = el;
    let viva: string | null = null;
    while (n && !viva) {
      const live = n.getAttribute('aria-live');
      const rol = n.getAttribute('role');
      if (live && live !== 'off') viva = `aria-live="${live}"`;
      else if (rol && ['alert', 'status'].includes(rol)) viva = `role="${rol}"`;
      n = n.parentElement;
    }
    const ids = [el.id, ...[...el.querySelectorAll('[id]')].map((x) => x.id)].filter(Boolean);
    const asociado = ids.some((id) => document.querySelector(`[aria-describedby~="${id}"], [aria-errormessage="${id}"]`));
    return { viva, asociado, texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim() };
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  // Sin hover accidental sobre el formulario (el modal móvil sube bajo el puntero)
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);
  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });
  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

/** Elige CORRECTO y envía; el POST lo responde la prueba con `error`. */
async function enviarConError(page: Page, dialogo: Locator, estado: { error: ErrorSimulado | null }, error: ErrorSimulado) {
  estado.error = error;
  await dialogo.getByRole('radio', { name: /^correcto/i }).click();
  await dialogo.getByRole('button', { name: /registrar evaluaci[oó]n/i }).click();
  const alerta = dialogo.getByRole('alert').filter({ hasText: /\S/ }).first();
  await expect(alerta, 'El error del backend aparece en el formulario').toBeVisible({ timeout: 15_000 });
  return alerta;
}

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-192 — Mensajes de error del formulario de Retroalimentación Clínica', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_192_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesion(page);
  });

  test('a. [3.3.1 / 4.1.3] E2: retroalimentación duplicada del mismo usuario', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await consultarHistorial(page);
    const { duplicada } = buscarCasos(estado.eventos);
    testInfo.annotations.push({ type: 'Inferencia ya retroalimentada (real)', description: duplicada ? `${duplicada.id_resultado_inferencia} · ${duplicada.fecha_evento}` : '(ninguna)' });
    expect(duplicada, 'BLOQUEO: ninguna inferencia de #876 tiene retroalimentación previa visible en el historial').not.toBeNull();
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST de retroalimentación respondido con 409 RETROALIMENTACION_DUPLICADA (mensaje del RF-72); no llega al backend.' });

    const dialogo = await abrirFormularioDe(page, estado.eventos, duplicada!);
    const alerta = await enviarConError(page, dialogo, estado, {
      status: 409,
      json: { error_code: 'RETROALIMENTACION_DUPLICADA', message: 'Ya existe una retroalimentación registrada por este usuario para este resultado.' },
    });
    const anuncio = await anuncioDe(alerta);
    testInfo.annotations.push({ type: 'Anuncio de E2', description: JSON.stringify(anuncio) });
    expect.soft(anuncio.viva, '4.1.3: E2 se anuncia con una región viva (role="alert" / aria-live)').not.toBeNull();
    expect.soft(anuncio.texto, '3.3.1: E2 dice que ya existe una retroalimentación del usuario').toMatch(/ya existe una retroalimentaci[oó]n/i);
    await escanear(page, 'error-e2', testInfo);
  });

  test('b. [3.3.1 / 4.1.3] E9: ventana de 90 días vencida, con la fecha límite', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    // Solo eventos de hace más de 90 días: así llegan en la primera página (la siguiente responde 500 en TEST, ver TC-DIS-188)
    const hasta = new Date(Date.now() - (VENTANA_DIAS + 1) * 86_400_000).toISOString().slice(0, 10);
    await consultarHistorial(page, hasta);
    const { vencida } = buscarCasos(estado.eventos);
    testInfo.annotations.push({ type: 'Inferencia con más de 90 días (real)', description: vencida ? `${vencida.id_resultado_inferencia} · ${vencida.fecha_evento}` : '(ninguna)' });
    const fechas = estado.eventos.map((e) => e.fecha_evento).sort();
    testInfo.annotations.push({ type: 'Primera página del historial', description: `${estado.eventos.length} eventos del ${fechas[0]?.slice(0, 10)} al ${fechas[fechas.length - 1]?.slice(0, 10)} · cursor a la página siguiente: ${estado.cursor ? 'sí' : 'no'}` });
    expect(vencida, `BLOQUEO: el activo #876 no tiene inferencias de hace más de ${VENTANA_DIAS} días (consulta hasta ${hasta})`).not.toBeNull();

    const fechaLimite = new Date(new Date(vencida!.fecha_evento).getTime() + VENTANA_DIAS * 86_400_000).toISOString().slice(0, 10);
    testInfo.annotations.push({ type: 'Datos simulados', description: `POST respondido con 422 FUERA_DE_VENTANA_TEMPORAL (mensaje del RF-72 con fecha límite ${fechaLimite}); no llega al backend.` });
    const dialogo = await abrirFormularioDe(page, estado.eventos, vencida!);
    // ¿El formulario avisa de la ventana vencida antes de enviar?
    const avisoPrevio = (await dialogo.innerText()).match(/ventana|vencid|90 d[ií]as|plazo/i)?.[0] ?? null;
    testInfo.annotations.push({ type: 'Aviso antes de enviar', description: avisoPrevio ?? '(ninguno: el formulario se abre como si la inferencia estuviera vigente)' });

    const alerta = await enviarConError(page, dialogo, estado, {
      status: 422,
      json: {
        error_code: 'FUERA_DE_VENTANA_TEMPORAL',
        message: `La retroalimentación no puede registrarse. Han transcurrido más de ${VENTANA_DIAS} días desde el resultado de inferencia ${vencida!.id_resultado_inferencia}. La ventana válida para este resultado venció el ${fechaLimite}. Contacte al administrador si requiere registrar retroalimentación fuera de este plazo.`,
      },
    });
    const anuncio = await anuncioDe(alerta);
    testInfo.annotations.push({ type: 'Anuncio de E9', description: JSON.stringify(anuncio) });
    expect.soft(anuncio.viva, '4.1.3: E9 se anuncia con una región viva (role="alert" / aria-live)').not.toBeNull();
    expect.soft(anuncio.texto, '3.3.1: E9 incluye la fecha límite de la ventana').toContain(fechaLimite);
    await escanear(page, 'error-e9', testInfo);
  });

  test('c. [3.3.1 / 4.1.3] E4: PARCIAL sin diagnóstico real', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await consultarHistorial(page);
    const { vigente } = buscarCasos(estado.eventos);
    expect(vigente, 'Precondición: una inferencia vigente sin retroalimentación').not.toBeNull();
    const dialogo = await abrirFormularioDe(page, estado.eventos, vigente!);
    await dialogo.getByRole('radio', { name: /^parcial/i }).click();
    await dialogo.getByRole('button', { name: /registrar evaluaci[oó]n/i }).click();
    const error = dialogo.getByRole('alert').filter({ hasText: /diagn[oó]stico/i }).first();
    await expect(error, 'E4 aparece al enviar PARCIAL sin diagnóstico').toBeVisible({ timeout: 10_000 });
    const anuncio = await anuncioDe(error);
    testInfo.annotations.push({ type: 'Anuncio de E4', description: JSON.stringify(anuncio) });
    expect.soft(anuncio.viva, '4.1.3: E4 se anuncia con una región viva').not.toBeNull();
    expect.soft(anuncio.asociado, 'DEFECTO 3.3.1: el error E4 no está asociado al campo de diagnóstico (ni aria-describedby ni aria-errormessage); las patologías no tienen un control común al cual asociarlo').toBe(true);
    expect.soft(anuncio.texto, 'DEFECTO: el texto de E4 no es el del RF-72 ("El diagnóstico clínico es obligatorio para este tipo de retroalimentación.")').toMatch(/el diagn[oó]stico cl[ií]nico es obligatorio/i);
    expect(estado.posts, 'La validación del cliente frena el envío').toEqual([]);
    await escanear(page, 'error-e4', testInfo);
  });
});
