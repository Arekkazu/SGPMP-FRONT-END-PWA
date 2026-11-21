// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-20 | Arekkazu | QA-M08 CU01 H-01 RF-103: el panel y la barra lateral muestran la misma finca |
import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useFincaActiva } from './useFincaActiva';

vi.mock('../api/http', () => ({
  http: {
    get: vi.fn().mockResolvedValue({
      data: { items: [{ id_finca: 1, nombre: 'Finca Prueba Alfa' }, { id_finca: 2, nombre: 'Finca Reportes' }] },
    }),
  },
}));

test('elegir una finca en el panel cambia la de la barra lateral', async () => {
  const panel = renderHook(() => useFincaActiva(7));
  const barra = renderHook(() => useFincaActiva(7));
  await waitFor(() => expect(barra.result.current.idFinca).toBe(1));

  act(() => panel.result.current.elegir(2));

  expect(barra.result.current.idFinca).toBe(2);
  expect(localStorage.getItem('sgpmp:dashboard:finca:7')).toBe('2');
});
