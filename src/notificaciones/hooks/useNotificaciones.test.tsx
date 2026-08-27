import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificacionesApi } from '../api/notificacionesApi';
import {
  actualizarLecturaCache,
  obtenerNotificacionesCache,
  reemplazarNotificacionesCache,
} from '../db/notificacionesTable';
import type { NotificacionInternaResponse } from '../types';
import { useNotificaciones } from './useNotificaciones';

vi.mock('../api/notificacionesApi', () => ({
  notificacionesApi: {
    listar: vi.fn(),
    marcarComoLeida: vi.fn(),
  },
}));

vi.mock('../db/notificacionesTable', () => ({
  actualizarLecturaCache: vi.fn(),
  guardarNotificacionesCache: vi.fn(),
  obtenerNotificacionesCache: vi.fn(),
  reemplazarNotificacionesCache: vi.fn(),
}));

const listarMock = vi.mocked(notificacionesApi.listar);
const marcarMock = vi.mocked(notificacionesApi.marcarComoLeida);
const cacheLecturaMock = vi.mocked(actualizarLecturaCache);
const obtenerCacheMock = vi.mocked(obtenerNotificacionesCache);
const reemplazarCacheMock = vi.mocked(reemplazarNotificacionesCache);

const pendiente: NotificacionInternaResponse = {
  id_notificacion: 7,
  id_evento: 31,
  tipo_evento: 9,
  mensaje: 'Tu perfil fue actualizado.',
  fecha_envio: '2026-08-27T14:30:00Z',
  es_leido: false,
};

describe('useNotificaciones', () => {
  beforeEach(() => {
    listarMock.mockReset();
    marcarMock.mockReset();
    cacheLecturaMock.mockReset();
    obtenerCacheMock.mockReset();
    reemplazarCacheMock.mockReset();
    reemplazarCacheMock.mockResolvedValue();
    cacheLecturaMock.mockResolvedValue();
  });

  it('usa el contador global del backend y confirma la lectura', async () => {
    listarMock.mockResolvedValue({
      total: 12,
      no_leidas: 5,
      pagina: 1,
      tamano: 20,
      items: [pendiente],
    });
    marcarMock.mockResolvedValue({ ...pendiente, es_leido: true });

    const { result } = renderHook(() => useNotificaciones(4));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.noLeidas).toBe(5);
    expect(reemplazarCacheMock).toHaveBeenCalledWith(4, [pendiente]);

    await act(async () => {
      expect(await result.current.marcarComoLeida(7)).toBe(true);
    });

    expect(result.current.notificaciones[0].es_leido).toBe(true);
    expect(result.current.noLeidas).toBe(4);
    expect(cacheLecturaMock).toHaveBeenCalledWith(4, { ...pendiente, es_leido: true });
  });

  it('revierte la lectura optimista cuando el backend falla', async () => {
    listarMock.mockResolvedValue({
      total: 1,
      no_leidas: 1,
      pagina: 1,
      tamano: 20,
      items: [pendiente],
    });
    marcarMock.mockRejectedValue({
      code: 'HTTP_500',
      message: 'No fue posible actualizar.',
      status: 500,
    });

    const { result } = renderHook(() => useNotificaciones(4));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(await result.current.marcarComoLeida(7)).toBe(false);
    });

    expect(result.current.notificaciones[0].es_leido).toBe(false);
    expect(result.current.noLeidas).toBe(1);
    expect(result.current.error?.message).toBe('No fue posible actualizar.');
  });

  it('recupera la bandeja del usuario desde Dexie cuando no hay red', async () => {
    listarMock.mockRejectedValue({
      code: 'NETWORK_ERROR',
      message: 'Sin conexión.',
      status: 0,
    });
    obtenerCacheMock.mockResolvedValue([pendiente]);

    const { result } = renderHook(() => useNotificaciones(15));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fromCache).toBe(true);
    expect(result.current.notificaciones).toEqual([pendiente]);
    expect(obtenerCacheMock).toHaveBeenCalledWith(15);
  });
});
