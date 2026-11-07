// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-05 RF-59: cada combinación de la tabla se puede armar y ninguna otra |
import { describe, expect, it } from 'vitest';
import {
  COMBINACIONES_VALIDAS, combinacionValida, companerosPosibles, filtroPermitido, type FiltroHistorial,
} from './combinacionesHistorial';

const TODOS: FiltroHistorial[] = [
  'tipo_variable', 'categoria_variable', 'id_unidad_productiva', 'especie',
  'estado_dato', 'origen_dato', 'sensor_id', 'id_activo_biologico',
];

/** Todos los subconjuntos de los 8 filtros (256). */
function subconjuntos(): Set<FiltroHistorial>[] {
  const out: Set<FiltroHistorial>[] = [];
  for (let m = 0; m < 1 << TODOS.length; m++) out.push(new Set(TODOS.filter((_, i) => m & (1 << i))));
  return out;
}

const clave = (s: Iterable<string>) => [...s].sort().join('+');

describe('combinaciones de filtros del historial (regla 12 de RF-59)', () => {
  it('cada combinación de la tabla es válida y se puede armar filtro por filtro, en cualquier orden', () => {
    for (const combo of COMBINACIONES_VALIDAS) {
      expect(combinacionValida(new Set(combo))).toBe(true);
      // Elegir en orden directo e inverso: cada paso debe estar permitido.
      for (const orden of [combo, [...combo].reverse()]) {
        const elegidos = new Set<FiltroHistorial>();
        for (const f of orden) {
          expect(filtroPermitido(f, elegidos)).toBe(true);
          elegidos.add(f);
        }
      }
    }
  });

  it('ningún otro conjunto de filtros es válido', () => {
    const validas = new Set(COMBINACIONES_VALIDAS.map(clave));
    for (const s of subconjuntos()) expect(combinacionValida(s)).toBe(validas.has(clave(s)));
  });

  it('nunca deja llegar a una combinación que no está en la tabla ni en camino a una', () => {
    for (const s of subconjuntos()) {
      if (!COMBINACIONES_VALIDAS.some((c) => [...s].every((f) => c.includes(f)))) continue;
      for (const f of TODOS) {
        if (!filtroPermitido(f, s)) continue;
        const siguiente = new Set([...s, f]);
        expect(COMBINACIONES_VALIDAS.some((c) => [...siguiente].every((x) => c.includes(x)))).toBe(true);
      }
    }
  });

  it('estado del dato solo admite sensor; en pantalla no deja combinarlo con nada', () => {
    const elegidos = new Set<FiltroHistorial>(['estado_dato']);
    expect(companerosPosibles(elegidos, TODOS)).toEqual(['sensor_id']);
    expect(companerosPosibles(elegidos, ['tipo_variable', 'especie', 'origen_dato'])).toEqual([]);
  });

  it('variable admite área o especie', () => {
    expect(companerosPosibles(new Set(['tipo_variable']), TODOS)).toEqual(['id_unidad_productiva', 'especie']);
  });
});
