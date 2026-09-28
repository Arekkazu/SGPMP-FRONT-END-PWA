import fs from 'fs';
import path from 'path';
import { createHtmlReport } from 'axe-html-reporter';
import type { AxeResults, Result } from 'axe-core';

interface EntradaReporte {
  fecha: string;
  violaciones: Result[];
}

/**
 * Guarda el resultado de un escaneo de @axe-core/playwright en
 * <carpeta-del-TC>/resultados/axe-<TC-DIS-XX>.json, y regenera el reporte
 * HTML (axe-html-reporter) combinando las violaciones de todas las pruebas
 * registradas hasta ahora para ese TC en axe-<TC-DIS-XX>.html.
 *
 * Un mismo TC-DIS-XX suele correr axe varias veces dentro del mismo archivo
 * (estado inicial, estado de error, etc.); cada llamada agrega/actualiza su
 * entrada por nombre de prueba en el mismo JSON en vez de sobreescribirlo,
 * para no perder los resultados de las otras pruebas del archivo cuando se
 * corren en paralelo (fullyParallel: true en playwright.config.ts).
 */
export function guardarResultadoAxe(
  tcId: string,
  dirDelSpec: string,
  nombrePrueba: string,
  resultados: Pick<AxeResults, 'violations'>,
): void {
  const carpetaResultados = path.join(dirDelSpec, 'resultados');
  fs.mkdirSync(carpetaResultados, { recursive: true });
  const archivoJson = path.join(carpetaResultados, `axe-${tcId}.json`);

  let reporte: Record<string, EntradaReporte> = {};
  if (fs.existsSync(archivoJson)) {
    try {
      reporte = JSON.parse(fs.readFileSync(archivoJson, 'utf-8'));
    } catch {
      reporte = {};
    }
  }

  reporte[nombrePrueba] = {
    fecha: new Date().toISOString(),
    violaciones: resultados.violations,
  };

  fs.writeFileSync(archivoJson, JSON.stringify(reporte, null, 2), 'utf-8');

  const todasLasViolaciones = Object.values(reporte).flatMap((entrada) => entrada.violaciones);
  createHtmlReport({
    results: { violations: todasLasViolaciones },
    options: {
      outputDirPath: carpetaResultados,
      // Sin esto, axe-html-reporter siempre agrega un subdirectorio "artifacts"
      // (ver saveHtmlReport.js: `${outputDirPath}/${outputDir || 'artifacts'}`).
      outputDir: '.',
      reportFileName: `axe-${tcId}.html`,
    },
  });
}
