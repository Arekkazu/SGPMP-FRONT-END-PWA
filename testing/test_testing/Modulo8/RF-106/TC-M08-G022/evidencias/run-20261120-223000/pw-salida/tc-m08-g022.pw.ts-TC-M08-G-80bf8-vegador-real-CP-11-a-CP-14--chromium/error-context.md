# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g022.pw.ts >> TC-M08-G022 parte navegador real (CP-11 a CP-14)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G022\tc-m08-g022.pw.ts:313:1

# Error details

```
Error: Precondicion falsa: Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción (fechas=[2026-07-02T11:34:36.477+00:00, 2026-07-31T12:34:36.477+00:00, 2026-08-02T12:34:36.477+00:00])
```

# Test source

```ts
  1   | // | Fecha      | Nombre                  | Que se hizo |
  2   | // |------------|-------------------------|-------------|
  3   | // | 2026-11-20 | Juan Sebastian Gutierrez | TC-M08-G022 (TC-M08-054, 055 y 056; RF-106): parte Playwright (CP-11 a CP-14); datos reales del 885 en TEST y conflicto simulado con page.route |
  4   | // | 2026-11-20 | Juan Sebastian Gutierrez | v1.1: CP-14 decodifica la captura en una pestaña about:blank aparte (sin depender de la CSP de TEST) y exige además amarillos/no_blancos >= 0.2 |
  5   | //
  6   | // QA SGPMP - Evaluacion (ronda 1). Navegador real (Chromium) contra el frontend desplegado en TEST, cuenta Veterinario 97,
  7   | // activo 885. Parte A: datos reales del 885 (sin interceptar) para TVCO y pendientes. Parte B: conflicto simulado con
  8   | // page.route (solo lectura, no escribe en el servidor) para tooltip de conflicto y color del icono por pixeles.
  9   | //
  10  | // SOLO LECTURA:
  11  | //   - Solo pasan al servidor los GET y la sesion (POST /sesiones/ una vez, POST /sesiones/refresh, DELETE /sesiones/).
  12  | //   - Cualquier otro metodo se aborta; si es de la API, la corrida es invalida (precondicion falsa en afterAll).
  13  | //   - POST /usuarios/me/fcm-token y hosts de Google/Firebase se abortan y se anotan.
  14  | //   - No se pulsa "Exportar", "Registrar retroalimentacion" ni nada de otro modulo. Cambiar a "Agrupada" en Parte B es simulado.
  15  | // Credenciales solo en memoria (QA_VET_EMAIL / QA_VET_PASSWORD, las pone el runner). Sin traza ni video.
  16  | //
  17  | // Reporte: JSON parcial propio en STAGING_DIR (parcial_playwright_TC-M08-G022[_reintentoN].json); el runner lo une con el
  18  | // parcial de Vitest. Cada checkpoint arranca en FALLA "No alcanzado".
  19  | import { test, expect, type Page, type Route, type Request, type Response } from '@playwright/test';
  20  | import { mkdirSync, writeFileSync } from 'node:fs';
  21  | import { join } from 'node:path';
  22  | 
  23  | const TC = 'TC-M08-G022';
  24  | const ACTIVO = 885;
  25  | const BASE = (process.env.QA_FRONT_URL ?? 'https://api.inmero.co/sigab-test/').replace(/\/?$/, '/');
  26  | const STAGING = process.env.STAGING_DIR ?? '';
  27  | const REINTENTO = Number(process.env.REINTENTO ?? '0');
  28  | const HORA_MS = 3_600_000;
  29  | const DIA_MS = 24 * HORA_MS;
  30  | 
  31  | type Estado = 'OK' | 'FALLA';
  32  | interface Checkpoint { paso: string; caso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }
  33  | const CPS: Checkpoint[] = [
  34  |   { paso: 'CP-11', caso: 'TC-M08-054, 885 real',
  35  |     esperado: 'La TVCO de la respuesta coincide con la calculada con la regla del RF a partir de "predicciones" y "retroalimentaciones" de la misma respuesta (porcentaje, tvco_denominador, tasa_error y texto con el formato de CA-3), y la vista muestra ese texto',
  36  |     fuente: 'RF-106 Proceso 4; CA-3; Salida (tasa_error)' },
  37  |   { paso: 'CP-12', caso: 'TC-M08-056, 885 real',
  38  |     esperado: '"pendientes" contiene exactamente las predicciones sin valoración con más de 48 h, ordenadas por nivel_riesgo descendente y luego por fecha descendente, y la lista de la vista muestra los mismos ítems en ese orden, cada uno con "Registrar retroalimentación"',
  39  |     fuente: 'RF-106 Proceso 5; CA-9; CA-4' },
  40  |   { paso: 'CP-13', caso: 'TC-M08-055, navegador, conflicto simulado',
  41  |     esperado: 'Al pasar el ratón sobre una de las dos valoraciones en conflicto se muestran ambas: autor, valoración y fecha y hora de cada una ("QA Vet A → Correcta · <ts_A> / QA Vet B → Incorrecta · <ts_B>")',
  42  |     fuente: 'RF-106 Restricción 6 a (tooltip "[Vet A] → [valor_A] · [ts_A] / [Vet B] → [valor_B] · [ts_B]"); CA-8 (b)' },
  43  |   { paso: 'CP-14', caso: 'TC-M08-055, navegador, conflicto simulado',
  44  |     esperado: 'El ícono de conflicto de las dos valoraciones es un triángulo amarillo',
  45  |     fuente: 'RF-106 Restricción 6 a; CA-8 (a)' },
  46  | ].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));
  47  | 
  48  | const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
  49  | const observaciones: string[] = [];
  50  | const escrituras: Array<{ metodo: string; ruta: string; resultado: string }> = [];
  51  | const violaciones: string[] = [];
  52  | 
  53  | function anotar(paso: string, ok: boolean, obtenido: string): void {
  54  |   const cp = CPS.find((c) => c.paso === paso)!;
  55  |   cp.obtenido = obtenido;
  56  |   cp.estado = ok ? 'OK' : 'FALLA';
  57  | }
  58  | function precondicion(nombre: string, ok: boolean, detalle: string): void {
  59  |   precondiciones.push({ nombre, ok, detalle });
  60  |   if (!ok) {
  61  |     for (const c of CPS) { c.obtenido = `Precondición no cumplida (${nombre}): ${detalle}`; c.estado = 'FALLA'; }
> 62  |     throw new Error(`Precondicion falsa: ${nombre} (${detalle})`);
      |           ^ Error: Precondicion falsa: Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción (fechas=[2026-07-02T11:34:36.477+00:00, 2026-07-31T12:34:36.477+00:00, 2026-08-02T12:34:36.477+00:00])
  63  |   }
  64  | }
  65  | function captura(page: Page, nombre: string): Promise<unknown> {
  66  |   if (!STAGING) return Promise.resolve();
  67  |   return page.screenshot({
  68  |     path: join(STAGING, `captura_${TC}_${nombre}.png`),
  69  |     mask: [page.locator('.ds-appbar__right'), page.locator('.ds-sidebar__footer')],
  70  |   });
  71  | }
  72  | 
  73  | // ---------------------------------------------------------------------------------------------------------------
  74  | // Guardia de escrituras (sin ninguna accion simulada: esta parte no escribe nada)
  75  | // ---------------------------------------------------------------------------------------------------------------
  76  | let logins = 0;
  77  | async function guardia(route: Route, req: Request): Promise<void> {
  78  |   const metodo = req.method();
  79  |   if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return route.continue();
  80  |   const url = new URL(req.url());
  81  |   const ruta = url.pathname;
  82  |   if (/googleapis\.com|gstatic\.com|firebaseio\.com|firebase\.com/.test(url.hostname)) {
  83  |     escrituras.push({ metodo, ruta: `${url.hostname}${ruta}`, resultado: 'abortada (host externo)' });
  84  |     return route.abort();
  85  |   }
  86  |   if (metodo === 'POST' && /\/sesiones\/?$/.test(ruta)) {
  87  |     logins += 1;
  88  |     escrituras.push({ metodo, ruta, resultado: `al servidor (login ${logins})` });
  89  |     if (logins > 1) { violaciones.push(`segundo login (${ruta})`); return route.abort(); }
  90  |     return route.continue();
  91  |   }
  92  |   if ((metodo === 'POST' && /\/sesiones\/refresh\/?$/.test(ruta)) || (metodo === 'DELETE' && /\/sesiones\/?$/.test(ruta))) {
  93  |     escrituras.push({ metodo, ruta, resultado: 'al servidor (sesion)' });
  94  |     return route.continue();
  95  |   }
  96  |   if (metodo === 'POST' && /\/usuarios\/me\/fcm-token\/?$/.test(ruta)) {
  97  |     escrituras.push({ metodo, ruta, resultado: 'abortada (registro de push)' });
  98  |     return route.abort();
  99  |   }
  100 |   escrituras.push({ metodo, ruta, resultado: 'ABORTADA (no permitida)' });
  101 |   violaciones.push(`${metodo} ${ruta}`);
  102 |   return route.abort();
  103 | }
  104 | 
  105 | // ---------------------------------------------------------------------------------------------------------------
  106 | // Utilidades
  107 | // ---------------------------------------------------------------------------------------------------------------
  108 | type Marcador = Record<string, unknown> & { fecha: string };
  109 | interface Tvco {
  110 |   porcentaje: number | null;
  111 |   texto: string;
  112 |   tvco_denominador: number;
  113 |   tvco_excluidas_conflicto: number;
  114 |   excluidas_sin_retroalimentacion: number;
  115 |   tasa_error: number | null;
  116 | }
  117 | interface PendienteItem {
  118 |   id_resultado_inferencia: string;
  119 |   fecha_inferencia: string;
  120 |   nivel_riesgo: number | null;
  121 |   condicion: string;
  122 | }
  123 | interface Historial {
  124 |   predicciones: Marcador[];
  125 |   eventos_sanitarios: Marcador[];
  126 |   retroalimentaciones: Marcador[];
  127 |   grupos: Marcador[][];
  128 |   correspondencias: Array<Record<string, unknown>>;
  129 |   tvco: Tvco;
  130 |   pendientes: { total: number; pagina: number; por_pagina: number; items: PendienteItem[] };
  131 |   metadatos: {
  132 |     total_inferencias: number;
  133 |     total_eventos_sanitarios: number;
  134 |     total_retroalimentaciones: number;
  135 |     total_pendientes: number;
  136 |     total_conflictos: number;
  137 |   };
  138 | }
  139 | 
  140 | const norm = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  141 | const ms = (s: string) => new Date(s).getTime();
  142 | const iso = (s: string) => s.replace(/\.000Z$/, '+00:00').replace(/Z$/, '+00:00');
  143 | const corto = (v: unknown) => String(v ?? '').slice(0, 8);
  144 | const ICONOS_CONFLICTO = new Set(['⚠', '⚠️', '▲', '△']);
  145 | const NIVEL_LABEL: Record<number, string> = { 0: 'Sin riesgo', 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
  146 | 
  147 | function clase(m: Marcador): 'RETROALIMENTACION' | 'EVENTO_SANITARIO' | 'PREDICCION' {
  148 |   if ('id_evento' in m) return 'EVENTO_SANITARIO';
  149 |   if ('valoracion' in m) return 'RETROALIMENTACION';
  150 |   return 'PREDICCION';
  151 | }
  152 | function fechaBogota(s: string): string {
  153 |   return norm(new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }));
  154 | }
  155 | 
  156 | function calcularTvco(predicciones: Marcador[], retroalimentaciones: Marcador[]): Tvco {
  157 |   const valoraciones = new Map<string, Set<string>>();
  158 |   for (const r of retroalimentaciones) {
  159 |     const id = String(r.id_resultado_inferencia);
  160 |     if (!valoraciones.has(id)) valoraciones.set(id, new Set());
  161 |     valoraciones.get(id)!.add(String(r.valoracion));
  162 |   }
```