/**
 * RF-23 / TC-M09-250/251 — credencial MQTT del Gateway Edge.
 *
 * Lo que vale la pena fijar: la contraseña solo existe en memoria hasta que se
 * descarta, y un fallo del broker se reporta sin inventar un estado.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { credencialMqttApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import { useCredencialMqtt } from './useCredencialMqtt';

vi.mock('../api/iotApi', () => ({
  credencialMqttApi: { consultar: vi.fn(), emitir: vi.fn(), revocar: vi.fn() },
}));

const api = vi.mocked(credencialMqttApi);

const CREDENCIAL = { usuario: 'EDGE-1', password: 'clave-de-una-vez', seriales: ['EDGE-1', 'ESP-2'] };

function error(code: string, status: number): ApiError {
  return { code, message: code, status };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCredencialMqtt', () => {
  it('emitir muestra la credencial una vez y descartarla la borra de memoria', async () => {
    api.emitir.mockResolvedValue(CREDENCIAL);
    const { result } = renderHook(() => useCredencialMqtt());

    let ok = false;
    await act(async () => { ok = await result.current.emitir(1); });

    expect(ok).toBe(true);
    expect(api.emitir).toHaveBeenCalledWith(1);
    expect(result.current.credencial?.password).toBe('clave-de-una-vez');
    // emitir/rotar desconecta al Edge hasta que use la clave nueva
    expect(result.current.estado).toEqual({
      emitida: true, habilitada: true, conectada: false, usuario: 'EDGE-1', seriales: ['EDGE-1', 'ESP-2'],
    });

    act(() => { result.current.descartarCredencial(); });
    expect(result.current.credencial).toBeNull();
  });

  it('cambiar de dispositivo descarta una credencial que todavía se mostraba', async () => {
    api.emitir.mockResolvedValue(CREDENCIAL);
    api.consultar.mockResolvedValue({ emitida: false, habilitada: false, conectada: false, usuario: null, seriales: [] });
    const { result } = renderHook(() => useCredencialMqtt());

    await act(async () => { await result.current.emitir(1); });
    await act(async () => { await result.current.cargar(3); });

    expect(result.current.credencial).toBeNull();
    expect(result.current.estado?.emitida).toBe(false);
  });

  it('si el broker no responde, emitir falla sin credencial ni estado inventado', async () => {
    api.emitir.mockRejectedValue(error('BROKER_MQTT_NO_DISPONIBLE', 503));
    const { result } = renderHook(() => useCredencialMqtt());

    let ok = true;
    await act(async () => { ok = await result.current.emitir(1); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('BROKER_MQTT_NO_DISPONIBLE');
    expect(result.current.credencial).toBeNull();
    expect(result.current.estado).toBeNull();
  });

  it('revocar deja la credencial como deshabilitada', async () => {
    api.consultar.mockResolvedValue({ emitida: true, habilitada: true, conectada: true, usuario: 'EDGE-1', seriales: ['EDGE-1'] });
    api.revocar.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCredencialMqtt());

    await act(async () => { await result.current.cargar(1); });
    await act(async () => { await result.current.revocar(1); });

    expect(api.revocar).toHaveBeenCalledWith(1);
    expect(result.current.estado).toMatchObject({ emitida: true, habilitada: false, conectada: false });
  });
});
