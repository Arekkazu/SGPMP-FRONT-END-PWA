import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parametrosApi } from '../api/parametrosApi';
import { avisarExito } from '../../shared/hooks/useToast';
import { useParametrosGlobales } from './useParametrosGlobales';

vi.mock('../api/parametrosApi', () => ({ parametrosApi: { obtener: vi.fn(), crear: vi.fn(), actualizar: vi.fn() } }));
vi.mock('../../shared/hooks/useToast', () => ({ avisarExito: vi.fn() }));
const api = vi.mocked(parametrosApi);
const config = {
  id_configuracion_global: 7, frecuencia_muestreo: 5, heartbeat: 15,
  fecha_actualizacion: '2026-10-19T12:00:00Z', id_usuario: 3, es_activo: true,
};
const dto = { frecuencia_muestreo: 8, heartbeat: 20, fecha_actualizacion: config.fecha_actualizacion };

function pendiente<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => { vi.clearAllMocks(); api.obtener.mockResolvedValue(config); });

describe('useParametrosGlobales — peticiones y confirmación', () => {
  it('carga el snapshot sin emitir un guardado exitoso', async () => {
    const { result } = renderHook(() => useParametrosGlobales());
    expect(result.current.loading).toBe(true);
    await act(async () => { await result.current.cargar(); });
    expect(result.current.config).toEqual(config);
    expect(result.current.loading).toBe(false);
    expect(avisarExito).not.toHaveBeenCalled();
  });

  it('impide consultas duplicadas simultáneas', async () => {
    const consulta = pendiente<typeof config>();
    api.obtener.mockReturnValue(consulta.promise);
    const { result } = renderHook(() => useParametrosGlobales());
    await act(async () => {
      const carga = result.current.cargar();
      await result.current.cargar();
      consulta.resolve(config);
      await carga;
    });
    expect(api.obtener).toHaveBeenCalledTimes(1);
  });

  it('bloquea doble escritura incluso antes del siguiente render', async () => {
    const escritura = pendiente<typeof config>();
    api.actualizar.mockReturnValue(escritura.promise);
    const { result } = renderHook(() => useParametrosGlobales());
    await act(async () => {
      const primera = result.current.actualizar(7, dto);
      expect(await result.current.actualizar(7, dto)).toBe(false);
      escritura.resolve({ ...config, ...dto });
      expect(await primera).toBe(true);
    });
    expect(api.actualizar).toHaveBeenCalledTimes(1);
    expect(avisarExito).toHaveBeenCalledTimes(1);
  });

  it('una lectura antigua no pisa una escritura confirmada', async () => {
    const consulta = pendiente<typeof config>();
    api.obtener.mockReturnValue(consulta.promise);
    api.actualizar.mockResolvedValue({ ...config, ...dto });
    const { result } = renderHook(() => useParametrosGlobales());
    let carga!: Promise<void>;
    await act(async () => { carga = result.current.cargar(); });
    await act(async () => { await result.current.actualizar(7, dto); });
    await act(async () => { consulta.resolve(config); await carga; });
    expect(result.current.config?.frecuencia_muestreo).toBe(8);
    expect(result.current.loading).toBe(false);
  });

  it.each([0, 400, 403, 412, 500])('un error %i conserva el snapshot y no confirma éxito', async (status) => {
    const error = { code: 'RECHAZO', message: 'Rechazado', status };
    api.actualizar.mockRejectedValue(error);
    const { result } = renderHook(() => useParametrosGlobales());
    await act(async () => { await result.current.cargar(); });
    await act(async () => { expect(await result.current.actualizar(7, dto)).toBe(false); });
    expect(result.current.config).toEqual(config);
    expect(result.current.saveError).toEqual(error);
    expect(result.current.saving).toBe(false);
    expect(avisarExito).not.toHaveBeenCalled();
  });

  it('una recarga exitosa limpia el conflicto de edición anterior', async () => {
    api.actualizar.mockRejectedValue({ code: 'CONFLICTO_CONCURRENCIA', message: 'Conflicto', status: 412 });
    const { result } = renderHook(() => useParametrosGlobales());
    await act(async () => { await result.current.cargar(); await result.current.actualizar(7, dto); });
    api.obtener.mockResolvedValue({ ...config, heartbeat: 25 });
    await act(async () => { await result.current.cargar(); });
    expect(result.current.saveError).toBeNull();
    expect(result.current.config?.heartbeat).toBe(25);
  });

  it('solo confirma creación cuando el servidor responde', async () => {
    api.crear.mockResolvedValue(config);
    const { result } = renderHook(() => useParametrosGlobales());
    await act(async () => { expect(await result.current.crear({ frecuencia_muestreo: 5, heartbeat: 15 })).toBe(true); });
    expect(result.current.config).toEqual(config);
    expect(avisarExito).toHaveBeenCalledWith('registrado');
  });
});
