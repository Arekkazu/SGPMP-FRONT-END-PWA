import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditoriaApi } from '../api/auditoriaApi';
import type {
  AuditoriaExportacion,
  AuditoriaItemResponse,
  AuditoriaPaginadaResponse,
  FiltrosAuditoria,
} from '../types';
import { useAuditoria } from './useAuditoria';

vi.mock('../api/auditoriaApi', () => ({
  auditoriaApi: { consultar: vi.fn() },
}));

const consultarMock = vi.mocked(auditoriaApi.consultar);

function evento(id: number): AuditoriaItemResponse {
  return {
    id_evento: id,
    tipo_evento: 1,
    fecha_evento: '2026-01-01T00:00:00Z',
    modulo: 'IDENTITY_ACCESS',
    resultado: 'EXITOSO',
    detalle: null,
    id_usuario: 7,
    categoria: 'AUTENTICACION',
    estado: 'ACTIVO',
    integridad_ok: true,
    integridad: 'INTEGRO',
  };
}

function pagina(filtros: FiltrosAuditoria, total: number): AuditoriaPaginadaResponse {
  const inicio = (filtros.pagina - 1) * filtros.tamano + 1;
  const fin = Math.min(inicio + filtros.tamano - 1, total);
  const items = inicio <= total
    ? Array.from({ length: fin - inicio + 1 }, (_, indice) => evento(inicio + indice))
    : [];

  return { total, pagina: filtros.pagina, tamano: filtros.tamano, items };
}

describe('useAuditoria.exportarTodos', () => {
  beforeEach(() => {
    consultarMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('consulta todas las páginas conservando los filtros aplicados', async () => {
    consultarMock.mockImplementation(async (filtros) => pagina(filtros, 75));
    const { result } = renderHook(() => useAuditoria());

    act(() => result.current.actualizarFiltros({
      id_usuario: 7,
      tipo_evento: 1,
      fecha_desde: '2025-01-01T00:00',
      fecha_hasta: '2026-01-01T00:00',
    }));
    await waitFor(() => expect(result.current.eventos).toHaveLength(20));
    consultarMock.mockClear();

    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => {
      exportacion = await result.current.exportarTodos();
    });

    expect(exportacion?.items).toHaveLength(75);
    expect(exportacion?.truncado).toBe(false);
    expect(consultarMock).toHaveBeenCalledTimes(2);
    expect(consultarMock).toHaveBeenNthCalledWith(1, {
      pagina: 1,
      tamano: 50,
      id_usuario: 7,
      tipo_evento: 1,
      fecha_desde: '2025-01-01T00:00',
      fecha_hasta: '2026-01-01T00:00',
    });
    expect(consultarMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      pagina: 2,
      tamano: 50,
      id_usuario: 7,
    }));
  });

  it('congela el conjunto y marca la exportación cuando alcanza el límite', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T12:00:00Z'));
    consultarMock.mockImplementation(async (filtros) => pagina(filtros, 120));
    const { result } = renderHook(() => useAuditoria());

    let exportacion: AuditoriaExportacion | null = null;
    await act(async () => {
      exportacion = await result.current.exportarTodos(100);
    });

    expect(exportacion?.items).toHaveLength(100);
    expect(exportacion?.total).toBe(120);
    expect(exportacion?.limite).toBe(100);
    expect(exportacion?.truncado).toBe(true);
    expect(consultarMock).toHaveBeenCalledTimes(2);
    expect(consultarMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pagina: 1,
      tamano: 50,
      fecha_hasta: '2026-08-27T12:00:00.000Z',
    }));
  });
});
