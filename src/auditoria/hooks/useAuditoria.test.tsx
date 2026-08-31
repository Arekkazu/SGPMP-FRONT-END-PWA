import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditoriaApi } from '../api/auditoriaApi';
import type { ApiError } from '../../shared/api/errors';
import type { AuditoriaExportacion } from '../types';
import { useAuditoria } from './useAuditoria';

vi.mock('../api/auditoriaApi', () => ({
  auditoriaApi: {
    consultar: vi.fn(),
    tiposEvento: vi.fn(),
    exportar: vi.fn(),
    solicitarExportacion: vi.fn(),
    consultarExportacion: vi.fn(),
    descargarExportacion: vi.fn(),
  },
}));

const api = vi.mocked(auditoriaApi);

const CSV = '﻿ID,Usuario\r\n1,Ana\r\n';

function error(code: string): ApiError {
  return { code, message: code, status: 422 };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.consultar.mockResolvedValue({ total: 0, pagina: 1, tamano: 20, items: [] });
  api.tiposEvento.mockResolvedValue([
    { id_tipo_evento: 1, nombre: 'REGISTRO_USUARIO', categoria: 'AUTENTICACION' },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAuditoria', () => {
  it('carga el catálogo de tipos desde el backend en vez de tenerlo quemado', async () => {
    const { result } = renderHook(() => useAuditoria());

    await waitFor(() => expect(result.current.tiposEvento).toHaveLength(1));
    expect(result.current.tiposEvento[0].nombre).toBe('REGISTRO_USUARIO');
  });

  it('si el catálogo falla, la vista sigue funcionando sin él', async () => {
    api.tiposEvento.mockRejectedValue(error('BOOM'));
    const { result } = renderHook(() => useAuditoria());

    await waitFor(() => expect(api.tiposEvento).toHaveBeenCalled());
    expect(result.current.tiposEvento).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe('useAuditoria.exportarTodos', () => {
  it('exporta con una sola llamada conservando los filtros aplicados', async () => {
    api.exportar.mockResolvedValue({ csv: CSV, total: 75, exportados: 75, truncado: false });
    const { result } = renderHook(() => useAuditoria());

    act(() => result.current.actualizarFiltros({
      id_usuario: 7,
      tipo_evento: 1,
      fecha_desde: '2025-01-01T00:00',
    }));
    await waitFor(() => expect(result.current.filtros.id_usuario).toBe(7));

    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => { exportacion = await result.current.exportarTodos(); });

    expect(exportacion?.csv).toBe(CSV);
    expect(api.exportar).toHaveBeenCalledTimes(1);
    expect(api.exportar).toHaveBeenCalledWith(expect.objectContaining({
      id_usuario: 7,
      tipo_evento: 1,
      fecha_desde: '2025-01-01T00:00',
    }));
  });

  it('marca truncado cuando el backend exportó menos de los disponibles', async () => {
    api.exportar.mockResolvedValue({ csv: CSV, total: 12000, exportados: 10000, truncado: true });
    const { result } = renderHook(() => useAuditoria());

    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => { exportacion = await result.current.exportarTodos(); });

    expect(exportacion?.truncado).toBe(true);
    expect(exportacion?.exportados).toBe(10000);
  });

  it('cae a la cola asíncrona cuando el volumen supera el umbral', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.exportar.mockRejectedValue(error('EXPORTACION_REQUIERE_MODO_ASINCRONO'));
    api.solicitarExportacion.mockResolvedValue({
      id_cola: 9, estado: 'PENDIENTE', mensaje: 'encolada',
    });
    api.consultarExportacion
      .mockResolvedValueOnce({ id_cola: 9, estado: 'EN_PROCESO', intentos: 1, descargable: false })
      .mockResolvedValue({ id_cola: 9, estado: 'COMPLETADO', intentos: 1, descargable: true });
    api.descargarExportacion.mockResolvedValue({
      csv: CSV, total: 42000, exportados: 42000, truncado: false,
    });

    const { result } = renderHook(() => useAuditoria());
    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => {
      const promesa = result.current.exportarTodos();
      await vi.advanceTimersByTimeAsync(10_000);
      exportacion = await promesa;
    });

    expect(exportacion?.csv).toBe(CSV);
    expect(api.solicitarExportacion).toHaveBeenCalledTimes(1);
    expect(api.descargarExportacion).toHaveBeenCalledWith(9);
    expect(result.current.exportError).toBeNull();
  });

  it('reporta el error cuando el trabajo encolado termina fallido', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.exportar.mockRejectedValue(error('EXPORTACION_REQUIERE_MODO_ASINCRONO'));
    api.solicitarExportacion.mockResolvedValue({
      id_cola: 9, estado: 'PENDIENTE', mensaje: 'encolada',
    });
    api.consultarExportacion.mockResolvedValue({
      id_cola: 9, estado: 'FALLIDO', intentos: 3, error: 'se cayó la db', descargable: false,
    });

    const { result } = renderHook(() => useAuditoria());
    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => {
      const promesa = result.current.exportarTodos();
      await vi.advanceTimersByTimeAsync(10_000);
      exportacion = await promesa;
    });

    expect(exportacion).toBeNull();
    expect(result.current.exportError?.message).toBe('se cayó la db');
    expect(api.descargarExportacion).not.toHaveBeenCalled();
  });

  it('un error distinto no dispara la cola: se reporta tal cual', async () => {
    api.exportar.mockRejectedValue(error('INTEGRIDAD_AUDITORIA_VIOLADA'));
    const { result } = renderHook(() => useAuditoria());

    await act(async () => { await result.current.exportarTodos(); });

    expect(api.solicitarExportacion).not.toHaveBeenCalled();
    expect(result.current.exportError?.code).toBe('INTEGRIDAD_AUDITORIA_VIOLADA');
  });

  it('no lanza dos exportaciones a la vez', async () => {
    api.exportar.mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ csv: CSV, total: 1, exportados: 1, truncado: false }), 20))
    );
    const { result } = renderHook(() => useAuditoria());

    await act(async () => {
      const [primera, segunda] = await Promise.all([
        result.current.exportarTodos(),
        result.current.exportarTodos(),
      ]);
      expect(primera).not.toBeNull();
      expect(segunda).toBeNull();
    });

    expect(api.exportar).toHaveBeenCalledTimes(1);
  });
});
