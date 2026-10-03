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

import { sensorAreaApi, sensoresDispositivoApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import type { AsociarSensorAreaResponse, SensorResponse } from '../types';
import { useSensores } from './useSensores';

vi.mock('../api/iotApi', () => ({
  sensoresDispositivoApi: { listar: vi.fn(), registrar: vi.fn() },
  sensorAreaApi: { asociar: vi.fn(), listarAsociaciones: vi.fn() },
}));

const api = vi.mocked(sensoresDispositivoApi);
const areaApi = vi.mocked(sensorAreaApi);

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

describe('useSensores.asociar', () => {
  // #290: el wizard necesita la respuesta (no solo un booleano) para avisar qué
  // asociaciones sensor→activo cerró la reasignación.
  it('devuelve la respuesta del backend con las asociaciones superadas', async () => {
    const respuesta: AsociarSensorAreaResponse = {
      id_sensores_area_asociada: 2, id_sensor: 9, id_dispositivo_iot: 3, id_infraestructura: 20,
      punto_instalacion: 'Borde sur', tiene_estado: true, fecha_asociacion: '', fecha_finalizacion: null, id_usuario: 1,
      asociaciones_activo_superadas: [{ id_asociacion_activo_sensor: 14, id_activo_biologico: 279, tipo: 'ambiental' }],
    };
    areaApi.asociar.mockResolvedValue(respuesta);
    const { result } = renderHook(() => useSensores());

    let res: AsociarSensorAreaResponse | null = null;
    await act(async () => { res = await result.current.asociar(9, { id_dispositivo_iot: 3, id_infraestructura: 20, punto_instalacion: 'Borde sur', confirmar: true }); });

    expect(res).toEqual(respuesta);
    expect(result.current.saveError).toBeNull();
  });

  it('un rechazo devuelve null y deja el saveError', async () => {
    areaApi.asociar.mockRejectedValue(error('REASIGNACION_REQUIERE_CONFIRMACION', 409));
    const { result } = renderHook(() => useSensores());

    let res: AsociarSensorAreaResponse | null = null;
    await act(async () => { res = await result.current.asociar(9, { id_dispositivo_iot: 3, id_infraestructura: 20, punto_instalacion: 'Borde sur' }); });

    expect(res).toBeNull();
    expect(result.current.saveError?.code).toBe('REASIGNACION_REQUIERE_CONFIRMACION');
  });
});
