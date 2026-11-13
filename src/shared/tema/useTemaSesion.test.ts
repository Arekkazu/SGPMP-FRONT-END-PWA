// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-12 | Arekkazu | TC-DIS-255/261 RF-27: la marca se repinta al cambiar de tema con el botón de la barra |
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const aplicarIdentidad = vi.fn();
vi.mock('../identidad/identidad', () => ({ aplicarIdentidad: (...a: unknown[]) => aplicarIdentidad(...a), limpiarIdentidad: vi.fn() }));
vi.mock('../contexto/useContexto', () => ({
  useContexto: () => ({ contexto: { identidad_visual: { color_primario: '#2e8634' }, accesibilidad: null } }),
}));
vi.mock('../../configuration/api/personalizacionApi', () => ({ temaVisualApi: { obtener: () => new Promise(() => {}) } }));

import { useTemaSesion } from './useTemaSesion';

describe('useTemaSesion', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('repinta la marca con la variante oscura cuando otro componente cambia data-theme', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    renderHook(() => useTemaSesion(null));
    aplicarIdentidad.mockClear();
    // El botón de la barra (useTheme.toggle) escribe el atributo sin pasar por este hook.
    await act(async () => { document.documentElement.setAttribute('data-theme', 'dark'); });
    expect(aplicarIdentidad).toHaveBeenLastCalledWith(expect.anything(), 'dark');
  });
});
