/**
 * RF-25 — el contexto de interfaz pasa a usarse.
 *
 * `contextoApi.obtener()` y el tipo `ContextoInterfazResponse` existían con la forma
 * completa del RF y **no los llamaba nadie**: ni un hook, ni un componente, ni una
 * página. No había noción de finca activa, y `especies_configuradas` nunca se leía. La
 * única adaptación por rol era el bloqueo de navegación por permisos, anterior e
 * independiente de RF-25.
 *
 * Estas pruebas fijan los dos flujos alternos que el RF define sobre este contexto y la
 * regla de que un fallo de carga no puede dejar sin interfaz a un usuario autenticado.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contextoApi } from '../../configuration/api/personalizacionApi';
import type { ContextoInterfazResponse } from '../../configuration/types';
import { ContextoProvider } from './ContextoProvider';
import { useContexto } from './useContexto';

vi.mock('../../configuration/api/personalizacionApi', () => ({
  contextoApi: { obtener: vi.fn() },
}));

let tokenActual: string | null = 'jwt-de-prueba';
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ token: tokenActual }),
}));

const api = vi.mocked(contextoApi);

const CONTEXTO: ContextoInterfazResponse = {
  id_usuario: 2,
  nombre_completo: 'Laura Gomez Torres',
  id_rol: 2,
  nombre_rol: 'Productor',
  id_finca: 1,
  finca_activa: 'Finca Acuicola El Remanso',
  departamento: 'Huila',
  especies_configuradas: ['Cachama Blanca', 'Trucha Arcoiris'],
  modulos_autorizados: ['fincas', 'contexto_interfaz'],
  identidad_visual: {
    logo_path: '/uploads/logos/remanso.png',
    primary_color: '#1A6B3C',
    secondary_color: '#A8D5B5',
    org_display_name: 'Acuicola El Remanso',
  },
  accesibilidad: null,
};

function envoltorio({ children }: { children: React.ReactNode }) {
  return <ContextoProvider>{children}</ContextoProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenActual = 'jwt-de-prueba';
  api.obtener.mockResolvedValue(CONTEXTO);
});

describe('ContextoProvider', () => {
  it('consulta el contexto una sola vez al aparecer la sesion', async () => {
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.contexto).not.toBeNull());
    expect(api.obtener).toHaveBeenCalledTimes(1);
  });

  it('expone la finca activa y la marca institucional al resto de la aplicacion', async () => {
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.contexto).not.toBeNull());
    expect(result.current.contexto?.finca_activa).toBe('Finca Acuicola El Remanso');
    expect(result.current.contexto?.identidad_visual?.org_display_name).toBe('Acuicola El Remanso');
    expect(result.current.sinFinca).toBe(false);
    expect(result.current.sinEspecies).toBe(false);
  });

  it('usuario sin finca vinculada activa la vista de bienvenida', async () => {
    // Primer flujo alterno del RF: 200 con contexto vacio, no un error.
    api.obtener.mockResolvedValue({
      ...CONTEXTO,
      id_finca: null,
      finca_activa: null,
      departamento: null,
      especies_configuradas: [],
      identidad_visual: null,
    });
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.sinFinca).toBe(true));
    expect(result.current.sinEspecies).toBe(false);
  });

  it('finca sin especies configuradas se distingue de finca sin asignar', async () => {
    // Segundo flujo alterno: la finca existe, faltan especies y areas productivas.
    api.obtener.mockResolvedValue({ ...CONTEXTO, especies_configuradas: [] });
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.sinEspecies).toBe(true));
    expect(result.current.sinFinca).toBe(false);
  });

  it('un fallo de carga no afirma que el usuario no tenga finca', async () => {
    // Falla abierto: un 403 o un corte de red mostrando la bienvenida le diria a un
    // productor con finca que no la tiene.
    api.obtener.mockRejectedValue(new Error('sin red'));
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.contexto).toBeNull();
    expect(result.current.sinFinca).toBe(false);
    expect(result.current.sinEspecies).toBe(false);
  });

  it('sin sesion no se consulta el contexto', async () => {
    tokenActual = null;
    renderHook(() => useContexto(), { wrapper: envoltorio });

    await waitFor(() => expect(api.obtener).not.toHaveBeenCalled());
  });

  it('recargar vuelve a leer la marca tras guardarla', async () => {
    // Lo usa la pantalla de identidad visual: al guardar, el shell tiene que repintarse
    // con la variante accesible que el backend acaba de calcular.
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.contexto).not.toBeNull());

    await act(async () => { await result.current.recargar(); });

    expect(api.obtener).toHaveBeenCalledTimes(2);
  });
});
