// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66/RF-68: últimas de cada animal o lote (por_activo) para que ninguno desaparezca |
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: el monitor paginado calcula las páginas con el total del backend |
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { monitorApi } from '../api/monitorApi';
import { useInferencias, useMonitorPaginado, useRiesgoContagio } from './useMonitor';

afterEach(() => vi.restoreAllMocks());

describe('useMonitor', () => {
  it('Estado sanitario pide las últimas de cada animal; el Monitor, las más recientes', async () => {
    const inferencias = vi.spyOn(monitorApi, 'inferencias').mockResolvedValue([]);
    const { result } = renderHook(() => useInferencias(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(inferencias).toHaveBeenCalledWith({ por_activo: 30 });

    renderHook(() => useInferencias());
    await waitFor(() => expect(inferencias).toHaveBeenCalledTimes(2));
    expect(inferencias).toHaveBeenLastCalledWith();
  });

  it('el contagio pide los últimos de cada lote', async () => {
    const contagio = vi.spyOn(monitorApi, 'riesgoContagio').mockResolvedValue([]);
    const { result } = renderHook(() => useRiesgoContagio());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(contagio).toHaveBeenCalledWith({ por_activo: 30 });
  });

  it('el monitor paginado pide 25 por página y calcula las páginas con el total (AJF-10)', async () => {
    const pag = vi.spyOn(monitorApi, 'inferenciasPaginadas').mockResolvedValue({
      items: [], total: 60, pagina: 2, por_pagina: 25,
      indicadores: { total: 60, en_riesgo: 4, con_alerta: 1, animales_distintos: 3 },
    });
    const { result } = renderHook(() => useMonitorPaginado());
    await act(async () => { await result.current.cargar({ id_activo_biologico: 4 }, 2); });
    expect(pag).toHaveBeenCalledWith({ id_activo_biologico: 4, pagina: 2, por_pagina: 25 });
    expect(result.current.paginacion).toEqual({ pagina: 2, total: 60, totalPaginas: 3 });
    expect(result.current.indicadores?.en_riesgo).toBe(4);
  });
});
