// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-72: bandeja de inferencias por evaluar (antes datos de ejemplo) |
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBandejaRetroalimentacion } from './useBandejaRetroalimentacion';

const bandeja = vi.fn();
vi.mock('../api/retroApi', () => ({ retroApi: { bandeja: (...a: unknown[]) => bandeja(...a) } }));

const RESPUESTA = { items: [], total: 0, pagina: 2, por_pagina: 25, ventana_dias: 90, indicadores: { pendientes: 1, evaluadas: 2, vencidas: 3 } };

describe('useBandejaRetroalimentacion', () => {
  it('carga con los filtros y, tras registrar, recarga la misma página y filtros', async () => {
    bandeja.mockResolvedValue(RESPUESTA);
    const { result } = renderHook(() => useBandejaRetroalimentacion());
    await act(() => result.current.cargar({ estado_evaluacion: 'PENDIENTE', nivel_riesgo: 3 }, 2));
    expect(result.current.datos?.indicadores.vencidas).toBe(3);
    await act(() => result.current.recargar());
    expect(bandeja).toHaveBeenLastCalledWith({ estado_evaluacion: 'PENDIENTE', nivel_riesgo: 3 }, 2, 25);
  });

  it('un error queda en error, sin datos inventados', async () => {
    bandeja.mockRejectedValue({ status: 403, code: 'ACCESO_DENEGADO', message: 'Acceso denegado' });
    const { result } = renderHook(() => useBandejaRetroalimentacion());
    await act(() => result.current.cargar({}, 1));
    expect(result.current.error?.status).toBe(403);
    expect(result.current.datos).toBeNull();
  });
});
