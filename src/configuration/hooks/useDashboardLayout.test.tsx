import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardLayoutApi } from '../api/personalizacionApi';
import type { ApiError } from '../../shared/api/errors';
import { useDashboardLayout } from './useDashboardLayout';

vi.mock('../api/personalizacionApi', () => ({
  dashboardLayoutApi: {
    obtener: vi.fn(),
    guardar: vi.fn(),
    restaurar: vi.fn(),
    catalogo: vi.fn(),
    datos: vi.fn(),
  },
}));

const api = vi.mocked(dashboardLayoutApi);

const LAYOUT = {
  id_dashboard_layout: 1,
  id_usuario: 7,
  grid: [
    {
      id_widget: 1, posicion_fila: 1, posicion_columna: 1,
      span_columnas: 1, visible: true, orden: 0,
    },
  ],
  active_widget: ['temp_galpon'],
  fecha_actualizacion: '2026-09-02T12:00:00Z',
  version_perfil: 3,
};

const CATALOGO = [
  { id_widget: 1, clave: 'temp_galpon', nombre: 'Temperatura Galpon', grupo: 'Ambiental', span_predeterminado: 1 as const },
  { id_widget: 6, clave: 'estado_iot', nombre: 'Estado Dispositivos IoT', grupo: 'IoT', span_predeterminado: 2 as const },
];

function error(code: string, status: number): ApiError {
  return { code, message: code, status };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.obtener.mockResolvedValue(LAYOUT);
  api.catalogo.mockResolvedValue(CATALOGO);
  api.datos.mockResolvedValue([]);
});

describe('useDashboardLayout', () => {
  it('carga el catálogo de widgets desde el backend en vez de tenerlo quemado', async () => {
    const { result } = renderHook(() => useDashboardLayout());

    await act(async () => { await result.current.cargar(); });

    await waitFor(() => expect(result.current.catalogo).toHaveLength(2));
    expect(api.catalogo).toHaveBeenCalledTimes(1);
    expect(result.current.catalogo.map((w) => w.clave)).toEqual(['temp_galpon', 'estado_iot']);
  });

  it('expone la version del perfil que devuelve el GET', async () => {
    const { result } = renderHook(() => useDashboardLayout());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.layout?.version_perfil).toBe(3);
  });

  it('deja el 409 de perfil modificado en saveError sin romper el layout cargado', async () => {
    api.guardar.mockRejectedValue(error('CONFLICTO_PERFIL_MODIFICADO', 409));
    const { result } = renderHook(() => useDashboardLayout());
    await act(async () => { await result.current.cargar(); });

    let ok = true;
    await act(async () => {
      ok = await result.current.guardar({
        layout_config: [], active_widget: [], version_perfil: 2,
      });
    });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('CONFLICTO_PERFIL_MODIFICADO');
    expect(result.current.layout).toEqual(LAYOUT);
  });

  it('deja el 400 del límite de widgets en saveError', async () => {
    api.guardar.mockRejectedValue(error('LIMITE_WIDGETS_ALCANZADO', 400));
    const { result } = renderHook(() => useDashboardLayout());

    await act(async () => {
      await result.current.guardar({ layout_config: [], active_widget: [] });
    });

    expect(result.current.saveError?.code).toBe('LIMITE_WIDGETS_ALCANZADO');
  });

  it('deja el 500 de restauración sin layout base en saveError', async () => {
    api.restaurar.mockRejectedValue(error('RESTAURACION_SIN_DEFAULT', 500));
    const { result } = renderHook(() => useDashboardLayout());

    let ok = true;
    await act(async () => { ok = await result.current.restaurar(); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('RESTAURACION_SIN_DEFAULT');
  });

  it('cargarDatos trae layout, catálogo y datos de los widgets en una sola pasada', async () => {
    api.datos.mockResolvedValue([
      {
        id_widget: 1, clave: 'temp_galpon', nombre: 'Temperatura Galpon',
        posicion_fila: 1, posicion_columna: 1, span_columnas: 1, orden: 0,
        sin_datos: true,
        mensaje: 'Sin datos disponibles para el sensor o periodo seleccionado.',
        datos: [],
      },
    ]);
    const { result } = renderHook(() => useDashboardLayout());

    await act(async () => { await result.current.cargarDatos(); });

    await waitFor(() => expect(result.current.datos).toHaveLength(1));
    // Un widget sin datos llega igual, para que conserve su lugar en la grilla.
    expect(result.current.datos[0].sin_datos).toBe(true);
    expect(result.current.datos[0].mensaje).toContain('Sin datos disponibles');
  });
});
