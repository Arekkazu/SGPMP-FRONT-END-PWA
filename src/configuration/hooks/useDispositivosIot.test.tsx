/**
 * RF-21 — Gateway Edge de los dispositivos IoT (N:1).
 *
 * Lo que vale la pena fijar en el cliente: desactivar un Edge refleja la cascada
 * del backend en sus dispositivos, y el Edge se reconoce por su tipo.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dispositivosApi, tiposDispositivoApi } from '../api/iotApi';
import type { DispositivoIotResponse } from '../types';
import { useDispositivosIot } from './useDispositivosIot';

vi.mock('../api/iotApi', () => ({
  dispositivosApi: { listar: vi.fn(), registrar: vi.fn(), desactivar: vi.fn(), asignarGateway: vi.fn() },
  tiposDispositivoApi: { listar: vi.fn() },
}));

const api = vi.mocked(dispositivosApi);
const tiposApi = vi.mocked(tiposDispositivoApi);
const GENERICO = 1;
const EDGE = 9;

function d(id: number, tipo: number, gateway: number | null = null, activo = true): DispositivoIotResponse {
  return {
    id_dispositivo_iot: id, serial: `S-${id}`, descripcion: 'x', id_infraestructura: 1,
    id_tipo_dispositivo: tipo, es_activo: activo, fecha_creacion: '2026-10-01', id_dispositivo_gateway: gateway,
  };
}

async function cargado() {
  api.listar.mockResolvedValue([d(40, EDGE), d(1, GENERICO, 40), d(2, GENERICO, 40), d(3, GENERICO)]);
  tiposApi.listar.mockResolvedValue([
    { id_tipo_dispositivo: GENERICO, nombre: 'GENERICO' },
    { id_tipo_dispositivo: EDGE, nombre: 'GATEWAY_EDGE' },
  ]);
  const hook = renderHook(() => useDispositivosIot());
  await act(async () => { await hook.result.current.cargar(); });
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDispositivosIot', () => {
  it('reconoce al Gateway Edge por su tipo', async () => {
    const { result } = await cargado();
    const [edge, nodo] = result.current.dispositivos;
    expect(result.current.esGatewayEdge(edge)).toBe(true);
    expect(result.current.esGatewayEdge(nodo)).toBe(false);
  });

  it('desactivar un Edge desactiva en la lista a los dispositivos que atiende', async () => {
    const { result } = await cargado();
    api.desactivar.mockResolvedValue(d(40, EDGE, null, false));

    await act(async () => { await result.current.desactivar(40); });

    const activo = Object.fromEntries(result.current.dispositivos.map((x) => [x.id_dispositivo_iot, x.es_activo]));
    expect(activo).toEqual({ 40: false, 1: false, 2: false, 3: true });
  });

  it('asignar un Edge actualiza el dispositivo con la respuesta del backend', async () => {
    const { result } = await cargado();
    api.asignarGateway.mockResolvedValue(d(3, GENERICO, 40));

    let ok = false;
    await act(async () => { ok = await result.current.asignarGateway(3, 40); });

    expect(ok).toBe(true);
    expect(api.asignarGateway).toHaveBeenCalledWith(3, 40);
    expect(result.current.dispositivos.find((x) => x.id_dispositivo_iot === 3)?.id_dispositivo_gateway).toBe(40);
  });

  it('un rechazo del backend deja el saveError sin tocar la lista', async () => {
    const { result } = await cargado();
    api.asignarGateway.mockRejectedValue({ code: 'GATEWAY_EDGE_OTRA_FINCA', message: 'otra finca', status: 422 });

    let ok = true;
    await act(async () => { ok = await result.current.asignarGateway(3, 99); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('GATEWAY_EDGE_OTRA_FINCA');
    expect(result.current.dispositivos.find((x) => x.id_dispositivo_iot === 3)?.id_dispositivo_gateway).toBeNull();
  });
});
