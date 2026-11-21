// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: finca activa con las fincas guardadas sin red |
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMisFincas } from '../../shared/fincas/useMisFincas';
import { guardarFincas, leerFincasGuardadas } from '../db/dashboardContextoTable';
import { useFincaActiva } from './useFincaActiva';

vi.mock('../../shared/fincas/useMisFincas', () => ({ useMisFincas: vi.fn() }));
vi.mock('../db/dashboardContextoTable', () => ({ guardarFincas: vi.fn(), leerFincasGuardadas: vi.fn() }));

const misFincas = vi.mocked(useMisFincas);
const FINCAS = [
  { id_finca: 494, nombre: 'La Esperanza', numero_id_tributaria: null, razon_social: null },
  { id_finca: 495, nombre: 'El Recreo', numero_id_tributaria: null, razon_social: null },
];

describe('useFincaActiva (INC-M08-381-G004)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    vi.mocked(guardarFincas).mockResolvedValue();
  });

  it('con conexión usa las fincas del servidor y las guarda para después', async () => {
    misFincas.mockReturnValue({ fincas: FINCAS, cargando: false, error: false });
    const { result } = renderHook(() => useFincaActiva(7));

    await waitFor(() => expect(result.current.idFinca).toBe(494));
    expect(guardarFincas).toHaveBeenCalledWith(7, FINCAS);
    expect(leerFincasGuardadas).not.toHaveBeenCalled();
  });

  it('sin conexión usa las fincas guardadas y la última finca elegida', async () => {
    window.localStorage.setItem('sgpmp:dashboard:finca:7', '495');
    vi.mocked(leerFincasGuardadas).mockResolvedValue(FINCAS);
    misFincas.mockReturnValue({ fincas: [], cargando: false, error: true });
    const { result } = renderHook(() => useFincaActiva(7));

    await waitFor(() => expect(result.current.idFinca).toBe(495));
    expect(result.current.fincas).toEqual(FINCAS);
    expect(guardarFincas).not.toHaveBeenCalled();
  });

  it('sin conexión y sin nada guardado queda sin finca, sin quedarse cargando', async () => {
    vi.mocked(leerFincasGuardadas).mockResolvedValue(null);
    misFincas.mockReturnValue({ fincas: [], cargando: false, error: true });
    const { result } = renderHook(() => useFincaActiva(7));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.idFinca).toBeNull();
  });
});
