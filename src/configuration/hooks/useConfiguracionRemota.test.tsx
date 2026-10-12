/**
 * RF-23 — reintentar o cancelar una configuración remota PENDIENTE o NO_CONF.
 *
 * Lo que vale la pena fijar: el resultado del reintento se refleja (sigue
 * encolada si el dispositivo no está), cancelar avisa que ya se puede enviar
 * otra, y un 504 se reporta como error sin inventar un estado.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configuracionRemotaApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import type { ConfiguracionRemotaResponse } from '../types';
import { useConfiguracionRemota } from './useConfiguracionRemota';

vi.mock('../api/iotApi', () => ({
  configuracionRemotaApi: {
    listarConfiguraciones: vi.fn(), configurar: vi.fn(), reintentar: vi.fn(), cancelar: vi.fn(),
  },
}));

const api = vi.mocked(configuracionRemotaApi);

function config(estado: string): ConfiguracionRemotaResponse {
  return {
    id_configuracion_remota: 47, id_dispositivo_iot: 44, frecuencia_captura: 15, intervalo_transmision: 15,
    estado, id_usuario: 1, fecha_creacion: '2026-10-04T20:00:27Z', fecha_aplicacion: null, mensaje: null,
  } as ConfiguracionRemotaResponse;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useConfiguracionRemota — reintentar / cancelar', () => {
  it('reintentar con el dispositivo aún offline la deja encolada', async () => {
    api.reintentar.mockResolvedValue(config('PENDIENTE'));
    const { result } = renderHook(() => useConfiguracionRemota());

    let ok = false;
    await act(async () => { ok = await result.current.reintentar(44, 47); });

    expect(ok).toBe(true);
    expect(api.reintentar).toHaveBeenCalledWith(44, 47);
    expect(result.current.encolada).toBe(true);
    expect(result.current.cancelada).toBe(false);
  });

  it('cancelar avisa que ya se puede enviar otra', async () => {
    api.cancelar.mockResolvedValue(config('CANCELADA'));
    const { result } = renderHook(() => useConfiguracionRemota());

    await act(async () => { await result.current.cancelar(44, 47); });

    expect(api.cancelar).toHaveBeenCalledWith(44, 47);
    expect(result.current.cancelada).toBe(true);
    expect(result.current.encolada).toBe(false);
  });

  it('un reintento sin ACK (504) se reporta como error', async () => {
    const error: ApiError = { code: 'CONFIGURACION_NO_CONFIRMADA', message: 'Sin respuesta del hardware.', status: 504 };
    api.reintentar.mockRejectedValue(error);
    const { result } = renderHook(() => useConfiguracionRemota());

    let ok = true;
    await act(async () => { ok = await result.current.reintentar(44, 47); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('CONFIGURACION_NO_CONFIRMADA');
    expect(result.current.encolada).toBe(false);
  });
});
