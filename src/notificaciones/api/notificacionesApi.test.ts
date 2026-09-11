import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { notificacionesApi } from './notificacionesApi';
import type { NotificacionInternaResponse } from '../types';

vi.mock('../../shared/api/http', () => ({
  http: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(http.get);
const patchMock = vi.mocked(http.patch);
const postMock = vi.mocked(http.post);

const notificacion: NotificacionInternaResponse = {
  id_notificacion: 9,
  id_evento: 23,
  tipo_evento: 3,
  mensaje: 'Inicio de sesión exitoso.',
  fecha_envio: '2026-08-27T13:00:00Z',
  es_leido: false,
};

describe('notificacionesApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    postMock.mockReset();
  });

  it('consulta la bandeja con los filtros soportados por el backend', async () => {
    getMock.mockResolvedValue({
      data: {
        total: 1,
        no_leidas: 1,
        pagina: 1,
        tamano: 20,
        items: [notificacion],
      },
    } as never);

    await notificacionesApi.listar({ pagina: 1, tamano: 20, solo_no_leidas: true });

    expect(getMock).toHaveBeenCalledWith('/notificaciones', {
      params: { pagina: 1, tamano: 20, solo_no_leidas: true },
    });
  });

  it('usa los contratos reales para lectura y registro del token FCM', async () => {
    patchMock.mockResolvedValue({ data: { ...notificacion, es_leido: true } } as never);
    postMock.mockResolvedValue({ data: { message: 'Token registrado.' } } as never);

    const actualizada = await notificacionesApi.marcarComoLeida(9);
    await notificacionesApi.registrarTokenFcm({ token: 'fcm-token' });

    expect(actualizada.es_leido).toBe(true);
    expect(patchMock).toHaveBeenCalledWith('/notificaciones/9/leida');
    expect(postMock).toHaveBeenCalledWith('/usuarios/me/fcm-token', { token: 'fcm-token' });
  });
});
