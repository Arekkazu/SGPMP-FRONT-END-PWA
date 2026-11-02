// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66/RF-68: últimas de cada animal o lote (por_activo) para que ninguno desaparezca |
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { monitorApi } from '../api/monitorApi';
import { useInferencias, useRiesgoContagio } from './useMonitor';

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
});
