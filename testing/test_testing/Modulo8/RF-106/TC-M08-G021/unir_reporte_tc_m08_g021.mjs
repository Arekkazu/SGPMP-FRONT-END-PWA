// TC-M08-G021 - Une los JSON parciales de Vitest (CP-01 a CP-09) y Playwright (CP-10 a CP-17) en el reporte del caso.
// Copia de unir_reporte_tc_m08_g026.mjs: solo cambian TC y la descripcion de las herramientas.
// Uso: node unir_reporte_tc_m08_g021.mjs <staging> <reintento>
// Solo lee los parciales y escribe resultado_TC-M08-G026[_reintentoN].json en el mismo staging. No recalcula ningun
// estado: copia los checkpoints tal como los dejo cada parte y suma el resumen.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TC = 'TC-M08-G021';
const [staging, reintentoTxt] = process.argv.slice(2);
if (!staging) { console.error('Falta el staging'); process.exit(2); }
const reintento = Number(reintentoTxt ?? '0');
const sufijo = reintento > 0 ? `_reintento${reintento}` : '';

function leer(parte) {
  const ruta = join(staging, `parcial_${parte}_${TC}${sufijo}.json`);
  if (!existsSync(ruta)) return { ausente: ruta };
  return JSON.parse(readFileSync(ruta, 'utf8'));
}
const vitest = leer('vitest');
const playwright = leer('playwright');
const faltan = [vitest, playwright].filter((p) => p.ausente).map((p) => p.ausente);
if (faltan.length) { console.error(`Faltan parciales: ${faltan.join(', ')}`); process.exit(3); }

const checkpoints = [...vitest.checkpoints, ...playwright.checkpoints];
const ok = checkpoints.filter((c) => c.estado === 'OK').length;
const falla = checkpoints.length - ok;
const reporte = {
  tc: TC,
  reintento,
  run_id: vitest.run_id,
  fecha: new Date().toISOString(),
  herramientas: 'Vitest (jsdom, respuestas simuladas) + Playwright (Chromium contra TEST, Veterinario 97, activo 885, solo lectura)',
  summary: { total: checkpoints.length, ok, falla, veredicto: falla === 0 ? 'Aprobado' : 'Rechazado' },
  partes: {
    vitest: { run_id: vitest.run_id, reintento: vitest.reintento, summary: vitest.summary },
    playwright: { run_id: playwright.run_id, reintento: playwright.reintento, summary: playwright.summary, ambiente: playwright.ambiente },
  },
  precondiciones: [
    ...vitest.precondiciones.map((p) => ({ ...p, parte: 'vitest' })),
    ...playwright.precondiciones.map((p) => ({ ...p, parte: 'playwright' })),
  ],
  checkpoints,
  observaciones: [...vitest.observaciones, ...playwright.observaciones],
  retirados: [...(vitest.retirados ?? []), ...(playwright.retirados ?? [])],
  escrituras_playwright: playwright.escrituras ?? [],
};
writeFileSync(join(staging, `resultado_${TC}${sufijo}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
console.log(`Reporte unido: ${checkpoints.length} checkpoints, ${ok} OK, ${falla} FALLA`);
