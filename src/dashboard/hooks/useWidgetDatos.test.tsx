// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: huella sin redibujar, fallo aislado, caché y push        |
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi, type DatosWidget } from '../api/dashboardApi';
import { db } from '../../shared/db/db';
import { EVENTO_PUSH, useWidgetDatos } from './useWidgetDatos';

vi.mock('../api/dashboardApi', () => ({ dashboardApi: { datos: vi.fn(), opciones: vi.fn() } }));
vi.mock('../../shared/db/db', () => ({ db: { dashboard_widgets: { put: vi.fn(), get: vi.fn() } } }));

const api = vi.mocked(dashboardApi);
const cache = vi.mocked(db.dashboard_widgets);

function respuesta(huella: string, hora = '2026-11-14T15:00:00Z'): DatosWidget {
  return { clave: 'semaforo_areas', estado: 'OK', mensaje: null, actualizado_en: hora, huella, alcance: 'todas',
    datos: { areas: [{ id_infraestructura: 1, nombre: 'Galpón 1', estado: 'VERDE' }] } };
}

describe('useWidgetDatos (RF-103)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cache.put.mockResolvedValue('');
  });

  it('con la misma huella no cambia el contenido, solo la hora', async () => {
    api.datos.mockResolvedValueOnce(respuesta('a')).mockResolvedValueOnce(respuesta('a', '2026-11-14T15:00:30Z'));
    const { result } = renderHook(() => useWidgetDatos('semaforo_areas', 3, 30, false, 7));
    await waitFor(() => expect(result.current.respuesta).not.toBeNull());
    const datosAntes = result.current.respuesta!.datos;

    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.respuesta!.actualizado_en).toBe('2026-11-14T15:00:30Z'));
    expect(result.current.respuesta!.datos).toBe(datosAntes);
    expect(api.datos).toHaveBeenCalledWith('semaforo_areas', 3);
  });

  it('si falla después de cargar, conserva lo último y avisa que no está disponible', async () => {
    api.datos.mockResolvedValueOnce(respuesta('a')).mockRejectedValueOnce({ status: 0, code: 'ECONNABORTED', message: 'timeout' });
    const { result } = renderHook(() => useWidgetDatos('semaforo_areas', 3, 30, false, 7));
    await waitFor(() => expect(result.current.respuesta).not.toBeNull());

    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.noDisponible).toBe(true));
    expect(result.current.respuesta!.huella).toBe('a');
  });

  it('sin conexión muestra la última respuesta guardada en el navegador', async () => {
    api.datos.mockRejectedValueOnce({ status: 0, code: 'NETWORK', message: 'sin red' });
    cache.get.mockResolvedValueOnce({ id: '7:3:semaforo_areas', respuesta: respuesta('guardada'), guardadoEn: 1 });
    const { result } = renderHook(() => useWidgetDatos('semaforo_areas', 3, 30, false, 7));
    await waitFor(() => expect(result.current.desdeCache).toBe(true));
    expect(result.current.respuesta!.huella).toBe('guardada');
    expect(cache.get).toHaveBeenCalledWith('7:3:semaforo_areas');
  });

  it('un rechazo definitivo (finca ajena) muestra su mensaje y no usa la caché', async () => {
    api.datos.mockRejectedValueOnce({ status: 403, code: 'FINCA_NO_AUTORIZADA', message: 'No tienes permisos para esta finca.' });
    const { result } = renderHook(() => useWidgetDatos('semaforo_areas', 9, 30, false, 7));
    await waitFor(() => expect(result.current.rechazo).toBe('No tienes permisos para esta finca.'));
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('un push de alerta lo pide en el acto si el widget reacciona a alertas', async () => {
    api.datos.mockResolvedValue(respuesta('a'));
    const { result } = renderHook(() => useWidgetDatos('semaforo_areas', 3, 30, true, 7));
    await waitFor(() => expect(result.current.respuesta).not.toBeNull());

    act(() => { window.dispatchEvent(new CustomEvent(EVENTO_PUSH, { detail: { tipo: 'ALERTA' } })); });
    await waitFor(() => expect(api.datos).toHaveBeenCalledTimes(2));
  });

  it('sin finca no pide nada a un widget que la necesita', async () => {
    renderHook(() => useWidgetDatos('semaforo_areas', null, 30, false, 7, false));
    await new Promise((r) => setTimeout(r, 10));
    expect(api.datos).not.toHaveBeenCalled();
  });
});
