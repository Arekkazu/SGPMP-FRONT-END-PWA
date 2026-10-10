/**
 * TC-DIS-131: tras un error de filtro (p. ej. 422 por rango de fechas inválido)
 * la tabla no debe seguir mostrando la consulta anterior como si fuera el
 * resultado del filtro que falló.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHistorial } from './useHistorial';
import { consultasApi } from '../api/consultasApi';

vi.mock('../api/consultasApi', () => ({
  consultasApi: { historial: vi.fn() },
}));

const historialMock = vi.mocked(consultasApi.historial);

describe('useHistorial', () => {
  it('vacía registros y paginación cuando la consulta falla', async () => {
    historialMock.mockResolvedValueOnce({
      registros: [{ categoria: 'ESTADO' }],
      pagina_actual: 2,
      total_paginas: 3,
      total_registros: 41,
    } as never);
    historialMock.mockRejectedValueOnce({ status: 422, message: 'Rango de fechas inválido.' });

    const { result } = renderHook(() => useHistorial(7));
    await act(() => result.current.cargar());
    expect(result.current.registros).toHaveLength(1);

    await act(() => result.current.cargar({ fecha_inicio: '2026-10-09', fecha_fin: '2026-01-01' }));
    expect(result.current.error?.status).toBe(422);
    expect(result.current.registros).toEqual([]);
    expect(result.current.paginacion).toEqual({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  });
});
