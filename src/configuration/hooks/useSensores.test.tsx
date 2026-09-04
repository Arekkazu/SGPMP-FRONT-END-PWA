/**
 * RF-21 — registrar sensores bajo un dispositivo IoT.
 *
 * `sensoresDispositivoApi.registrar` ya existia en la capa de API pero ningun hook lo
 * exponia: la UI no tenia forma de invocarlo. Esta prueba cubre la accion `registrar`
 * agregada a `useSensores`, unico punto con logica de bifurcacion (feliz/error) que
 * vale la pena testear unitariamente.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sensoresDispositivoApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import type { SensorResponse } from '../types';
import { useSensores } from './useSensores';

vi.mock('../api/iotApi', () => ({
  sensoresDispositivoApi: { listar: vi.fn(), registrar: vi.fn() },
  sensorAreaApi: { asociar: vi.fn(), listarAsociaciones: vi.fn() },
}));

const api = vi.mocked(sensoresDispositivoApi);

const NUEVO_SENSOR: SensorResponse = {
  id_sensores: 9,
  nombre: 'Sensor pH estanque norte',
  id_dispositivo_iot: 3,
  es_activo: true,
  categoria: 'PH',
};

function error(code: string, status: number): ApiError {
  return { code, message: code, status };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSensores.registrar', () => {
  it('agrega el sensor devuelto por el backend a la lista', async () => {
    api.registrar.mockResolvedValue(NUEVO_SENSOR);
    const { result } = renderHook(() => useSensores());

    let ok = false;
    await act(async () => { ok = await result.current.registrar(3, { nombre: 'Sensor pH estanque norte', categoria: 'PH' }); });

    expect(ok).toBe(true);
    expect(api.registrar).toHaveBeenCalledWith(3, { nombre: 'Sensor pH estanque norte', categoria: 'PH' });
    expect(result.current.sensores).toContainEqual(NUEVO_SENSOR);
    expect(result.current.saveError).toBeNull();
  });

  it('un registro rechazado deja el saveError sin tocar la lista', async () => {
    api.registrar.mockRejectedValue(error('VAL_ENTRADA', 400));
    const { result } = renderHook(() => useSensores());

    let ok = true;
    await act(async () => { ok = await result.current.registrar(3, { nombre: '' }); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('VAL_ENTRADA');
    expect(result.current.sensores).toEqual([]);
  });
});
