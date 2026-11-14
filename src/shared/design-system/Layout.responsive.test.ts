// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-14 | Arekkazu | QA-M06: ninguna fila nueva de campos alineada abajo (la ayuda o el error desalinean los inputs) |
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Una rejilla escrita como `style={{ gridTemplateColumns: '1fr 1fr' }}` no
// puede llevar media query: se queda en dos columnas a cualquier ancho. En un
// telefono de 390px eso deja cada campo de formulario en ~147px dentro de un
// modal. Para eso estan `.ds-fg2` / `.ds-fg3` de Layout.css.
//
// El fallo es invisible en escritorio, asi que reaparece sola cada vez que
// alguien escribe una rejilla nueva. Este test lee el codigo fuente y la
// nombra.

const SRC = join(__dirname, '..', '..');

function archivosTsx(dir: string, extension = /\.tsx$/): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta, extension);
    return extension.test(ruta) && !ruta.includes('.test.') ? [ruta] : [];
  });
}

/**
 * La rejilla del editor de dashboard representa la grilla real del tablero
 * (4 columnas x 3 filas): colapsarla en movil mostraria una disposicion que
 * no es la que el usuario esta editando. Es la unica excepcion legitima.
 */
const EXCEPCIONES = new Set(['configuration/components/DashboardLayoutSection.tsx']);

/** `repeat(auto-fit|auto-fill, ...)` ya responde al ancho por si solo. */
const RESPONDE_SOLA = /auto-fit|auto-fill/;

describe('rejillas responsive', () => {
  it('ninguna rejilla multi-columna vive en un style inline', () => {
    const infractores: string[] = [];

    for (const ruta of archivosTsx(SRC)) {
      const rel = relative(SRC, ruta).replaceAll('\\', '/');
      if (EXCEPCIONES.has(rel)) continue;

      readFileSync(ruta, 'utf-8')
        .split('\n')
        .forEach((linea, i) => {
          const m = linea.match(/gridTemplateColumns:\s*'([^']*)'/);
          if (!m || RESPONDE_SOLA.test(m[1])) return;
          // Una sola pista de ancho ('1fr', '100%') no es multi-columna.
          if (m[1].trim().split(/\s+/).length < 2) return;
          infractores.push(`${rel}:${i + 1} -> '${m[1]}'`);
        });
    }

    expect(infractores, 'usa la clase .ds-fg2 / .ds-fg3 de Layout.css').toEqual([]);
  });
});

// Una fila de campos alineada abajo (`align-items: end`) se ve bien hasta que un
// campo trae ayuda o error debajo: ese campo se alarga y su input sube sobre los
// vecinos. Pasó en Suministros, Finanzas y Auditoría, cada vez en una fila nueva.
// La fila se alinea arriba y sus botones van en `.ds-campo-accion` (Input.css).
//
// Estas filas se revisaron el 2026-11-14 y no tienen campos con ayuda ni error
// debajo: encabezados (título a un lado, control al otro), pestañas, rótulos
// largos que partirían línea arriba, o filas hechas a mano con su propio ajuste.
// Si una gana un campo con ayuda o error, sale de aquí y pasa a alinearse arriba.
const FILAS_REVISADAS = new Set([
  'shared/design-system/Layout.css', // el modal se apoya abajo (bottom sheet), no es una fila de campos
  'accounting_integration/pages/ClientesView.tsx',
  'configuration/components/CiclosProductivosSection.tsx',
  'financial_valuation/pages/RevelacionesView.tsx',
  'prediction/components/DistribucionOtaFormModal.tsx',
  'prediction/components/HistorialFiltros.tsx',
  'prediction/components/MapaPropagacion.tsx',
  'prediction/pages/DistribucionOtaView.tsx',
  'prediction/pages/HistorialView.tsx',
  'supplies/components/Nic41Panel.tsx',
  'telemetry/components/DispositivosLista.tsx',
  'telemetry/pages/MonitoreoView.tsx',
]);

describe('filas de campos', () => {
  it('ninguna fila nueva se alinea abajo', () => {
    const abajo = /align-items:\s*(flex-)?end\b|alignItems:\s*['"](flex-)?end['"]/;
    const infractores: string[] = [];

    for (const ruta of archivosTsx(SRC, /\.(tsx|ts|css)$/)) {
      const rel = relative(SRC, ruta).replaceAll('\\', '/');
      if (FILAS_REVISADAS.has(rel)) continue;
      readFileSync(ruta, 'utf-8')
        .split('\n')
        .forEach((linea, i) => {
          if (abajo.test(linea)) infractores.push(`${rel}:${i + 1}`);
        });
    }

    expect(infractores, 'alinea la fila arriba y pon sus botones en .ds-campo-accion').toEqual([]);
  });
});
