import { describe, expect, it } from 'vitest';
import { sonPermisosIguales } from './compararPermisos';
import type { PermisoUsuario } from './AuthContext';

const A: PermisoUsuario = { id_recurso: 8, id_accion: 2 };
const B: PermisoUsuario = { id_recurso: 20, id_accion: 1 };

describe('sonPermisosIguales', () => {
  it('es true para el mismo conjunto en distinto orden', () => {
    expect(sonPermisosIguales([A, B], [B, A])).toBe(true);
  });

  it('es false si a alguna lista le falta un permiso', () => {
    expect(sonPermisosIguales([A, B], [A])).toBe(false);
  });

  it('es false si cambio la accion sobre el mismo recurso', () => {
    const bModificado: PermisoUsuario = { id_recurso: B.id_recurso, id_accion: 3 };
    expect(sonPermisosIguales([A, B], [A, bModificado])).toBe(false);
  });

  it('trata null como igual solo a null', () => {
    expect(sonPermisosIguales(null, null)).toBe(true);
    expect(sonPermisosIguales(null, [A])).toBe(false);
    expect(sonPermisosIguales([A], null)).toBe(false);
  });
});
