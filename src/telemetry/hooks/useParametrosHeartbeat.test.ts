// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-04 RF-60: sin permiso de alertas técnicas no se piden parámetros ni ventanas |
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispositivosApi } from '../api/dispositivosApi';
import { useParametrosHeartbeat, useVentanasVision } from './useParametrosHeartbeat';

afterEach(() => vi.restoreAllMocks());

describe('useParametrosHeartbeat / useVentanasVision', () => {
  it('sin permiso no consulta', () => {
    const p = vi.spyOn(dispositivosApi, 'parametrosHeartbeat').mockResolvedValue([]);
    const v = vi.spyOn(dispositivosApi, 'ventanasVision');
    renderHook(() => useParametrosHeartbeat(false));
    renderHook(() => useVentanasVision(5, false));
    expect(p).not.toHaveBeenCalled();
    expect(v).not.toHaveBeenCalled();
  });

  it('con permiso y un dispositivo elegido, pide sus ventanas', async () => {
    const v = vi.spyOn(dispositivosApi, 'ventanasVision').mockResolvedValue({
      id_dispositivo_iot: 5, es_camara: true, ventanas: [], ventanas_consecutivas: 3, cobertura_minima: 0.3,
      duracion_seg: 60, consecutivas_bajo_minimo: 0, resultado: 'SIN_VENTANAS',
    });
    const { result } = renderHook(() => useVentanasVision(5, true));
    await waitFor(() => expect(result.current.ventanas?.resultado).toBe('SIN_VENTANAS'));
    expect(v).toHaveBeenCalledWith(5);
  });
});
