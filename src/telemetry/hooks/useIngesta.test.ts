// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-07 RF-53: el monitor de ingesta pagina en el backend |
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ingestaApi } from '../api/ingestaApi';
import { useIngesta } from './useIngesta';

afterEach(() => vi.restoreAllMocks());

describe('useIngesta', () => {
  it('pide 50 por página con los filtros y calcula las páginas con el total', async () => {
    const listar = vi.spyOn(ingestaApi, 'listar').mockResolvedValue({ items: [], total: 120, pagina: 2, por_pagina: 50, desde: '', hasta: '' });
    const { result } = renderHook(() => useIngesta());
    await act(async () => { await result.current.cargar({ estado_calidad: 'FUERA_DE_RANGO' }, 2); });
    expect(listar).toHaveBeenCalledWith({ estado_calidad: 'FUERA_DE_RANGO', pagina: 2, por_pagina: 50 });
    expect(result.current.paginacion).toEqual({ pagina: 2, totalRegistros: 120, totalPaginas: 3 });
  });

  it('un error deja la lista vacía y el error para mostrarlo', async () => {
    vi.spyOn(ingestaApi, 'listar').mockRejectedValue({ status: 403, code: 'X', message: 'sin permiso' });
    const { result } = renderHook(() => useIngesta());
    await act(async () => { await result.current.cargar({}); });
    expect(result.current.error?.status).toBe(403);
    expect(result.current.items).toEqual([]);
  });
});
