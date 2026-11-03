// | Fecha      | Nombre       | Que se hizo                                           |
// |------------|--------------|-------------------------------------------------------|
// | 2026-10-23 | destroyerban | FE-08 RF-70: la OTA lista versiones APROBADO          |
/**
 * FE-08 (RF-70, RFC-015 C3): el formulario de distribución ofrece las versiones APROBADO
 * (se distribuyen y el Veterinario las activa después) y las ACTIVO (nodos nuevos, P-2).
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modelosApi } from '../api/modelosApi';
import { otaApi } from '../api/otaApi';
import type { VersionModeloResponse } from '../types';
import { useDistribucionOta } from './useDistribucionOta';

vi.mock('../api/modelosApi', () => ({ modelosApi: { listar: vi.fn() } }));
vi.mock('../api/otaApi', () => ({ otaApi: { listarDispositivosObjetivo: vi.fn() } }));

const version = (id: number, estado: VersionModeloResponse['estado_version']) =>
  ({ id_version_modelo: id, nombre_version: `v${id}`, tipo_modelo: 'MODELO_AVES', componente: 'DETECTOR',
     estado_version: estado }) as VersionModeloResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(otaApi.listarDispositivosObjetivo).mockResolvedValue([]);
  vi.mocked(modelosApi.listar).mockImplementation(async ({ estado } = {}) =>
    estado === 'APROBADO'
      ? { total: 1, items: [version(40, 'APROBADO')] }
      : { total: 1, items: [version(35, 'ACTIVO')] });
});

describe('useDistribucionOta — opciones del formulario', () => {
  it('pide las versiones APROBADO y ACTIVO y ofrece las dos, APROBADO primero', async () => {
    const { result } = renderHook(() => useDistribucionOta(true));
    await act(async () => { await result.current.cargarOpciones(); });

    expect(modelosApi.listar).toHaveBeenCalledWith({ estado: 'APROBADO', limit: 100 });
    expect(modelosApi.listar).toHaveBeenCalledWith({ estado: 'ACTIVO', limit: 100 });
    expect(modelosApi.listar).not.toHaveBeenCalledWith(expect.objectContaining({ estado: 'EN_VALIDACION' }));
    expect(result.current.versiones.map((v) => [v.id_version_modelo, v.estado_version]))
      .toEqual([[40, 'APROBADO'], [35, 'ACTIVO']]);
  });

  it('si falla una de las consultas, muestra el error y no deja opciones a medias', async () => {
    vi.mocked(modelosApi.listar).mockRejectedValueOnce({ status: 500, code: 'HTTP_500', message: 'Error' });
    const { result } = renderHook(() => useDistribucionOta(true));
    await act(async () => { await result.current.cargarOpciones(); });

    expect(result.current.opcionesError?.code).toBe('HTTP_500');
    expect(result.current.versiones).toEqual([]);
  });
});
