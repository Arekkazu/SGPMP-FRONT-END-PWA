// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #69 RF-33: pruebas del catálogo activo y su error de carga         |
/**
 * #69 (RF-33): el registro de activos valida especie e infraestructura contra
 * estos catálogos, así que solo deben traer lo activo y avisar si no cargan.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCatalogoRegistro } from './useCatalogoRegistro';
import { especiesApi } from '../../configuration/api/especiesApi';
import { fincasApi, infraestructurasApi } from '../../configuration/api/fincasApi';

vi.mock('../../configuration/api/especiesApi', () => ({ especiesApi: { listar: vi.fn() } }));
vi.mock('../../configuration/api/fincasApi', () => ({
  fincasApi: { listar: vi.fn() },
  infraestructurasApi: { listarPorFinca: vi.fn() },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const especie = (id: number, nombre: string, es_activo = true) => ({ id_especie: id, nombre, es_activo }) as any;
const area = (id: number, es_activo = true) => ({ id_infraestructura: id, nombre_infraestructura: `A${id}`, es_activo }) as any;

describe('useCatalogoRegistro (#69)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(especiesApi.listar).mockResolvedValue([especie(2, 'Porcino'), especie(1, 'Bovino'), especie(3, 'Ovino', false)]);
    vi.mocked(fincasApi.listar).mockResolvedValue([{ id_finca: 15, nombre: 'Norte' } as any]);
    vi.mocked(infraestructurasApi.listarPorFinca).mockResolvedValue([area(16), area(17, false)]);
  });

  it('pide solo lo activo al módulo de configuración y descarta lo inactivo', async () => {
    const { result } = renderHook(() => useCatalogoRegistro());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(especiesApi.listar).toHaveBeenCalledWith(true);
    expect(fincasApi.listar).toHaveBeenCalledWith(true);
    expect(result.current.especies.map((e) => e.nombre)).toEqual(['Bovino', 'Porcino']);

    await act(() => result.current.cargarInfraestructuras(15));
    expect(infraestructurasApi.listarPorFinca).toHaveBeenCalledWith(15, true);
    expect(result.current.infraestructuras.map((i) => i.id_infraestructura)).toEqual([16]);
  });

  it('si el catálogo no carga lo informa y reintentar lo vuelve a pedir', async () => {
    vi.mocked(especiesApi.listar).mockRejectedValueOnce({ status: 500 });
    const { result } = renderHook(() => useCatalogoRegistro());
    await waitFor(() => expect(result.current.errorCatalogo).toBe(true));

    act(() => result.current.reintentarCatalogo());
    await waitFor(() => expect(result.current.errorCatalogo).toBe(false));
    await waitFor(() => expect(result.current.especies).toHaveLength(2));
    expect(especiesApi.listar).toHaveBeenCalledTimes(2);
  });

  it('si las infraestructuras de la finca no cargan lo informa', async () => {
    vi.mocked(infraestructurasApi.listarPorFinca).mockRejectedValueOnce({ status: 500 });
    const { result } = renderHook(() => useCatalogoRegistro());
    await act(() => result.current.cargarInfraestructuras(15));
    expect(result.current.errorInfra).toBe(true);
    expect(result.current.infraestructuras).toEqual([]);
  });
});
