// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-20 | Arekkazu | QA-M08 CU01 H-01 RF-103: el panel y la barra lateral muestran la misma finca |
// | 2026-11-21 | destroyerban | INC-M08-381-G004 RF-103: finca activa con las fincas guardadas sin red |
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { useMisFincas } from './useMisFincas';
import { guardarFincas, leerFincasGuardadas } from '../../dashboard/db/dashboardContextoTable';
import { useFincaActiva } from './useFincaActiva';

vi.mock('./useMisFincas', () => ({ useMisFincas: vi.fn() }));
vi.mock('../../dashboard/db/dashboardContextoTable', () => ({ guardarFincas: vi.fn(), leerFincasGuardadas: vi.fn() }));

const misFincas = vi.mocked(useMisFincas);
const FINCAS = [
  { id_finca: 1, nombre: 'Finca Prueba Alfa', numero_id_tributaria: null, razon_social: null },
  { id_finca: 2, nombre: 'Finca Reportes', numero_id_tributaria: null, razon_social: null },
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

    await waitFor(() => expect(result.current.idFinca).toBe(1));
    expect(guardarFincas).toHaveBeenCalledWith(7, FINCAS);
    expect(leerFincasGuardadas).not.toHaveBeenCalled();
  });

  it('sin conexión usa las fincas guardadas y la última finca elegida', async () => {
    window.localStorage.setItem('sgpmp:dashboard:finca:7', '2');
    vi.mocked(leerFincasGuardadas).mockResolvedValue(FINCAS);
    misFincas.mockReturnValue({ fincas: [], cargando: false, error: true });
    const { result } = renderHook(() => useFincaActiva(7));

    await waitFor(() => expect(result.current.idFinca).toBe(2));
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

test('elegir una finca en el panel cambia la de la barra lateral', async () => {
  vi.resetAllMocks();
  window.localStorage.clear();
  vi.mocked(guardarFincas).mockResolvedValue();
  misFincas.mockReturnValue({ fincas: FINCAS, cargando: false, error: false });
  const panel = renderHook(() => useFincaActiva(7));
  const barra = renderHook(() => useFincaActiva(7));
  await waitFor(() => expect(barra.result.current.idFinca).toBe(1));

  act(() => panel.result.current.elegir(2));

  expect(barra.result.current.idFinca).toBe(2);
  expect(localStorage.getItem('sgpmp:dashboard:finca:7')).toBe('2');
});
