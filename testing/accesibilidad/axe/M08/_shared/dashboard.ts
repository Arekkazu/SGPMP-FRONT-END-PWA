// | Fecha      | Nombre          | Que se hizo                                                                 |
// |------------|-----------------|-----------------------------------------------------------------------------|
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-277..281 RF-103: utilidades de las pruebas del dashboard operativo    |
/**
 * Utilidades de los specs de accesibilidad del dashboard operativo (RF-103, TC-DIS-277 a 281).
 *
 * Pantalla: /dashboard (src/dashboard). El layout sale de Configuración → Personalización
 * (GET /configuracion/personalizacion/dashboard y /dashboard/widgets) y cada widget pide sus datos a
 * GET /dashboard/widgets/{clave}?id_finca=… cada `frecuencia_actualizacion` segundos (mínimo 15).
 *
 * Cada caso revisa primero el dashboard real de la cuenta. Lo que el ambiente no garantiza (estados del
 * semáforo, un ciclo con cambios, una alerta crítica que llega por push, un módulo que no responde) se
 * simula respondiendo esos GET dentro de la prueba con la misma forma que devuelve el backend, y la
 * prueba lo anota como "Datos simulados". Ninguna escritura llega al backend (abrirSesionM08).
 */
import { expect, type Page } from '@playwright/test';
import { PREFIJO_API } from '../../_shared/sigabA11y';
import { simularGet } from '../../M06/_shared/finanzas';

/** Abre el dashboard y espera el saludo y el fin de la carga del layout. */
export async function irDashboard(page: Page) {
  await page.goto('dashboard', { waitUntil: 'commit', timeout: 120_000 });
  const h1 = page.getByRole('heading', { level: 1, name: /^Hola/ });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(h1.or(login).first()).toBeVisible({ timeout: 120_000 });
  if (await login.isVisible()) throw new Error('BLOQUEO DE AMBIENTE: sesión perdida tras goto (dashboard)');
  await expect(page.locator('.dashboard-grid[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Cada widget carga por su cuenta: se espera a que ninguno siga ocupado.
  await expect(page.locator('main article[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
}

/** Widgets visibles del dashboard: nombre (aria-label), encabezado, pie de estado y enlaces. */
export function leerWidgets(page: Page) {
  return page.locator('main article').evaluateAll((arts) => arts.map((a) => ({
    nombre: a.getAttribute('aria-label') ?? '',
    encabezado: a.querySelector('h2, h3')?.textContent?.trim() ?? '',
    estado: (a.querySelector('footer [role="status"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    aviso: (a.querySelector(':scope > div [role="status"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    enlaces: [...a.querySelectorAll('a, button')].map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim()),
    texto: ((a as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
  })));
}

// ── Anuncios del lector de pantalla ─────────────────────────────────────────

export interface Anuncio { t: number; region: string; politica: string; texto: string }

/**
 * Registra con un MutationObserver cada cambio de texto dentro de una región viva (aria-live, status,
 * alert, log) y cada región viva nueva con texto: es lo que un lector de pantalla anunciaría. Se instala
 * una vez por página; `leerAnuncios` devuelve lo registrado desde `marca`.
 */
export async function observarAnuncios(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __anuncios?: unknown[]; __obsAnuncios?: MutationObserver };
    w.__obsAnuncios?.disconnect();
    w.__anuncios = [];
    const SEL = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]';
    const ultimo = new WeakMap<Element, string>();
    const registrar = (region: Element) => {
      const texto = (region.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!texto || ultimo.get(region) === texto) return;
      ultimo.set(region, texto);
      const rol = region.getAttribute('role') ?? '';
      const politica = region.getAttribute('aria-live') ?? (rol === 'alert' ? 'assertive' : 'polite');
      const widget = region.closest('article')?.getAttribute('aria-label') ?? '';
      (w.__anuncios as unknown[]).push({ t: Date.now(), region: `${widget ? `${widget} › ` : ''}${rol || 'live'}`, politica, texto: texto.slice(0, 140) });
    };
    document.querySelectorAll(SEL).forEach((r) => ultimo.set(r, (r.textContent ?? '').replace(/\s+/g, ' ').trim()));
    w.__obsAnuncios = new MutationObserver((muts) => {
      const tocadas = new Set<Element>();
      for (const m of muts) {
        const nodo = m.target.nodeType === 1 ? (m.target as Element) : m.target.parentElement;
        const region = nodo?.closest(SEL);
        if (region) tocadas.add(region);
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const e = n as Element;
          if (e.matches(SEL)) tocadas.add(e);
          e.querySelectorAll(SEL).forEach((r) => tocadas.add(r));
        });
      }
      tocadas.forEach(registrar);
    });
    w.__obsAnuncios.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}

export async function marcaAnuncios(page: Page): Promise<number> {
  return page.evaluate(() => ((window as unknown as { __anuncios?: unknown[] }).__anuncios ?? []).length);
}

export async function leerAnuncios(page: Page, desde = 0): Promise<Anuncio[]> {
  return page.evaluate((d) => (((window as unknown as { __anuncios?: Anuncio[] }).__anuncios ?? []) as Anuncio[]).slice(d), desde);
}

export const resumirAnuncios = (a: Anuncio[]) => a.map((x) => `[${x.politica}] ${x.region}: ${x.texto}`).join(' ¦ ') || '(ninguno)';

/** Regiones vivas presentes en <main>: dónde están y qué abarcan (1.3.1 del caso 277). */
export function regionesDelDashboard(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll('main [aria-live]:not([aria-live="off"]), main [role="status"], main [role="alert"], main [role="log"]')]
    .map((e) => ({
      rol: e.getAttribute('role') ?? '', live: e.getAttribute('aria-live') ?? '', atomic: e.getAttribute('aria-atomic') ?? '',
      widget: e.closest('article')?.getAttribute('aria-label') ?? '(fuera de los widgets)',
      abarcaWidgets: e.querySelectorAll('article').length,
      texto: (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
    })));
}

/** Simula la llegada de un push (App.tsx publica `sgpmp:push` con los datos del mensaje). */
export async function publicarPush(page: Page, datos: Record<string, string> = {}) {
  await page.evaluate((d) => window.dispatchEvent(new CustomEvent('sgpmp:push', { detail: d })), datos);
}

// ── Tablero simulado ─────────────────────────────────────────────────────────

export interface WidgetSimulado {
  id: number;
  clave: string;
  nombre: string;
  visual: string;
  span?: 1 | 2;
  reaccionaAlertas?: boolean;
  requiereFinca?: boolean;
}

export const FINCAS_SIMULADAS = [
  { id_finca: 97001, nombre: 'Finca El Rosal', numero_id_tributaria: null, razon_social: null },
  { id_finca: 97002, nombre: 'Finca La Esperanza', numero_id_tributaria: null, razon_social: null },
];

/**
 * Responde layout, catálogo y datos de los widgets. `datos(clave, idFinca)` devuelve el cuerpo de
 * DatosWidget o `null` para que ese widget no responda (la petición se aborta: «Datos no disponibles»).
 * La huella se calcula del contenido: si los datos no cambian, la app no redibuja (RNF-05).
 */
export async function simularTablero(
  page: Page,
  widgets: WidgetSimulado[],
  datos: (clave: string, idFinca: number | null) => { estado?: 'OK' | 'SIN_DATOS' | 'ERROR'; mensaje?: string | null; datos: Record<string, unknown> } | null,
  opciones: { frecuencia?: number; fincas?: typeof FINCAS_SIMULADAS; criticas?: () => number } = {},
) {
  const layout = {
    id_dashboard_layout: 97000, id_usuario: 0, fecha_actualizacion: null, version_perfil: null,
    frecuencia_actualizacion: opciones.frecuencia ?? 30,
    active_widget: widgets.map((w) => w.clave),
    grid: widgets.map((w, i) => ({ id_widget: w.id, posicion_fila: Math.floor(i / 2), posicion_columna: (i % 2) * 2, span_columnas: w.span ?? 2, visible: true, orden: i })),
  };
  const catalogo = widgets.map((w) => ({
    id_widget: w.id, clave: w.clave, nombre: w.nombre, grupo: 'Operación', span_predeterminado: w.span ?? 2, visual: w.visual,
    opciones: [], requiere_finca: w.requiereFinca ?? true, reacciona_a_alertas: w.reaccionaAlertas ?? false,
  }));
  await simularGet(page, /^\/configuracion\/personalizacion\/dashboard$/, layout);
  await simularGet(page, /^\/configuracion\/personalizacion\/dashboard\/widgets$/, catalogo);
  if (opciones.fincas) await simularGet(page, /^\/usuarios\/me\/fincas$/, { items: opciones.fincas });
  if (opciones.criticas) {
    const criticas = opciones.criticas;
    await simularGet(page, /^\/notificaciones$/, () => ({ items: [], total: 0, pagina: 1, tamano: 1, total_paginas: 0, no_leidas: criticas(), criticas_pendientes: criticas() }));
  }
  await page.route((u) => u.pathname.startsWith(`${PREFIJO_API}/dashboard/widgets/`) && !u.pathname.endsWith('/opciones'), (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const u = new URL(route.request().url());
    const clave = decodeURIComponent(u.pathname.split('/').pop() ?? '');
    const idFinca = u.searchParams.get('id_finca') ? Number(u.searchParams.get('id_finca')) : null;
    const r = datos(clave, idFinca);
    if (r === null) return route.abort('timedout');
    const cuerpo = JSON.stringify(r.datos);
    let h = 0;
    for (let i = 0; i < cuerpo.length; i++) h = (h * 31 + cuerpo.charCodeAt(i)) | 0;
    return route.fulfill({ status: 200, contentType: 'application/json', json: {
      clave, estado: r.estado ?? 'OK', mensaje: r.mensaje ?? null, actualizado_en: new Date().toISOString(),
      huella: `sim-${h}`, alcance: 'seleccion', datos: r.datos,
    } });
  });
}

// Datos simulados con la forma que dibuja src/dashboard/components/visuales.tsx.
export const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

export const SEMAFORO_ROSAL = {
  areas: [
    { id_infraestructura: 1, nombre: 'Galpón 1', estado: 'VERDE', alertas: 0, criticas: 0 },
    { id_infraestructura: 2, nombre: 'Galpón 2', estado: 'AMARILLO', alertas: 2, criticas: 0 },
    { id_infraestructura: 3, nombre: 'Corral de ordeño', estado: 'ROJO', alertas: 3, criticas: 1 },
    { id_infraestructura: 4, nombre: 'Estanque 1', estado: 'SIN_DATOS', alertas: 0, criticas: 0 },
  ],
};

export const lecturaTemperatura = (valor: number) => ({
  lecturas: [{ id_sensor: 501, variable: 'Temperatura', valor, unidad: '°C', area: 'Galpón 2', sensor: 'IOT-M08-01', semaforo: valor >= 30 ? 'AMARILLO' : 'VERDE', desactualizado: false }],
});

export const INVENTARIO = {
  especies: [
    { especie: 'Bovino', activos: 18, en_tratamiento: 3, bajas: 1 },
    { especie: 'Porcino', activos: 9, en_tratamiento: 1, bajas: 2 },
  ],
};

export const DISTRIBUCION_RIESGO = {
  especies: [
    { especie: 'Bovino', normal: 14, moderado: 5, alto: 3 },
    { especie: 'Porcino', normal: 8, moderado: 3, alto: 1 },
  ],
};

export const VALOR_INVENTARIO = { valor_total: 182_500_000, activos: 27, vista: 'POR_METODO', valor_razonable: 150_000_000, valor_costo: 32_500_000 };

export const ESTADO_IOT = {
  total: 9,
  conteo: { ACTIVO: 4, BUFFER_ACTIVO: 1, 'SIN_SEÑAL': 2, INACTIVO: 1, EN_MANTENIMIENTO: 1 },
  items: [
    { serial: 'IOT-M08-03', area: 'Galpón 2', estado: 'SIN_SEÑAL', fecha_ultimo_contacto: hace(25) },
    { serial: 'IOT-M08-05', area: 'Estanque 1', estado: 'SIN_SEÑAL', fecha_ultimo_contacto: null },
  ],
};
