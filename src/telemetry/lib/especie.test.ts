// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | AJF-05 RF-59: la especie escrita se lleva al nombre exacto del catálogo |
import { describe, expect, it } from 'vitest';
import { resolverEspecie } from './especie';

const CATALOGO = ['Bovino', 'Ovino', 'Caprino', 'Búfalo', 'Tilapia roja'];

describe('resolverEspecie', () => {
  it.each([
    ['', ''],
    ['bovino', 'Bovino'],
    ['Bovinos', 'Bovino'], // el caso de DEV: el backend filtra por el nombre exacto
    ['bufalo', 'Búfalo'],
    ['tilapia', 'Tilapia roja'],
    ['ovino', 'Ovino'], // exacta antes que contenida en «Bovino»
  ])('«%s» → «%s»', (texto, esperado) => {
    expect(resolverEspecie(texto, CATALOGO)).toBe(esperado);
  });

  it('sin coincidencia o ambigua no resuelve', () => {
    expect(resolverEspecie('perro', CATALOGO)).toBeNull();
    expect(resolverEspecie('ino', CATALOGO)).toBeNull();
  });
});
