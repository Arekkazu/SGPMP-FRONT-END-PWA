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

function archivosTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta);
    return ruta.endsWith('.tsx') ? [ruta] : [];
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
