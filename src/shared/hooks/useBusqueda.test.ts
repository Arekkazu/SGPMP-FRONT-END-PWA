import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusqueda } from './useBusqueda';

describe('useBusqueda (T-06)', () => {
  it('filtra sin distinguir mayúsculas ni tildes', () => {
    const items = ['Finca El Jardín', 'Camaronera Costa Azul', 'La Esperanza'];
    const { result } = renderHook(() => useBusqueda(items, (s) => s));
    act(() => result.current.setConsulta('jardin'));
    expect(result.current.filtrados).toEqual(['Finca El Jardín']);
  });
});
