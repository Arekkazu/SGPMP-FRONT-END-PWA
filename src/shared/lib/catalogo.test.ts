// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-02 RF-57: el texto a medias se resuelve o se avisa, nunca se ignora |
import { describe, expect, it } from 'vitest';
import { resolverCatalogo } from './catalogo';

const ACTIVOS = [
  { id: 4, nombre: 'BOV-003' },
  { id: 5, nombre: 'BOV-004' },
  { id: 9, nombre: 'POR-Ñandú' },
];

describe('resolverCatalogo', () => {
  it('vacío no filtra', () => {
    expect(resolverCatalogo('  ', ACTIVOS)).toEqual({ estado: 'vacio' });
  });
  it('la opción elegida de la lista y el id suelto se resuelven', () => {
    expect(resolverCatalogo('BOV-003 (#4)', ACTIVOS)).toEqual({ estado: 'resuelto', id: 4, texto: 'BOV-003 (#4)' });
    expect(resolverCatalogo('#5', ACTIVOS)).toEqual({ estado: 'resuelto', id: 5, texto: 'BOV-004 (#5)' });
  });
  it('un código a medias que coincide con un solo activo lo elige, sin mayúsculas ni tildes', () => {
    expect(resolverCatalogo('bov-003', ACTIVOS)).toMatchObject({ estado: 'resuelto', id: 4 });
    expect(resolverCatalogo('nandu', ACTIVOS)).toMatchObject({ estado: 'resuelto', id: 9 });
  });
  it('ambiguo o sin coincidencias queda sin resolver', () => {
    expect(resolverCatalogo('bov', ACTIVOS)).toEqual({ estado: 'sin_resolver' });
    expect(resolverCatalogo('xyz', ACTIVOS)).toEqual({ estado: 'sin_resolver' });
  });
});
