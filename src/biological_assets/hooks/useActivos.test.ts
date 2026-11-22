// | Fecha      | Nombre           | Que se hizo                                   |
// |------------|------------------|-----------------------------------------------|
// | 2026-11-03 | Arekkazu         | RF-33: búsqueda de activos sobre todas las páginas |
/**
 * RF-33 — al buscar, el listado trae todas las páginas, no solo la visible:
 * "BOV-003-DEV" en la página 3 no aparecía buscando desde la página 1.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/activosTable', () => ({ cacheActivos: vi.fn(), getActivosCache: vi.fn() }));
vi.mock('../api/activosApi', () => ({
  activosApi: {
    listar: vi.fn(async ({ pagina = 1 }: { pagina?: number }) => ({
      registros: [{ id_activo_biologico: pagina, identificador: `A-${pagina}` }],
      pagina_actual: pagina,
      total_paginas: 3,
      total_registros: 3,
    })),
  },
}));

import { useActivos } from './useActivos';

describe('useActivos — cargar todas las páginas (RF-33)', () => {
  it('sin búsqueda trae solo la página pedida', async () => {
    const { result } = renderHook(() => useActivos());
    await act(() => result.current.cargar({ pagina: 2 }));
    expect(result.current.activos.map((a) => a.identificador)).toEqual(['A-2']);
    expect(result.current.paginacion.totalPaginas).toBe(3);
  });

  it('con búsqueda junta las 3 páginas y deja una sola', async () => {
    const { result } = renderHook(() => useActivos());
    await act(() => result.current.cargar({ pagina: 2 }, true));
    expect(result.current.activos.map((a) => a.identificador)).toEqual(['A-1', 'A-2', 'A-3']);
    expect(result.current.paginacion).toEqual({ pagina: 1, totalPaginas: 1, totalRegistros: 3 });
  });
});
