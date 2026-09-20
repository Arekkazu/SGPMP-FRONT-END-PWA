/**
 * #136 — el estado sin `perfil` (montado, sin loading ni error, antes de que
 * `cargar()` resuelva) renderizaba `return null`: la pantalla se quedaba sin
 * ningún encabezado "Mi Perfil" para lectores de pantalla mientras durara esa
 * ventana. Los estados de loading y error ya tenían el h1 (ver #497436b).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PerfilPage } from './PerfilPage';
import { usePerfil } from '../hooks/usePerfil';

vi.mock('../hooks/usePerfil');

const usePerfilMock = vi.mocked(usePerfil);

function mockUsePerfil(overrides: Partial<ReturnType<typeof usePerfil>> = {}) {
  usePerfilMock.mockReturnValue({
    perfil: null,
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    saveSuccess: false,
    pwError: null,
    pwSuccess: false,
    cargar: vi.fn(),
    editar: vi.fn(),
    cambiarContrasena: vi.fn(),
    ...overrides,
  } as ReturnType<typeof usePerfil>);
}

describe('PerfilPage — #136 encabezado "Mi Perfil" siempre presente', () => {
  it('muestra el encabezado antes de que `perfil` llegue (sin loading ni error)', () => {
    mockUsePerfil({ perfil: null, loading: false, error: null });

    render(<PerfilPage />);

    expect(screen.getByRole('heading', { name: /^mi perfil$/i })).toBeVisible();
  });

  it('muestra el encabezado durante la carga', () => {
    mockUsePerfil({ perfil: null, loading: true, error: null });

    render(<PerfilPage />);

    expect(screen.getByRole('heading', { name: /^mi perfil$/i })).toBeVisible();
  });

  it('muestra el encabezado cuando falla la carga', () => {
    mockUsePerfil({ perfil: null, loading: false, error: { code: 'HTTP_500', message: 'Error', status: 500 } });

    render(<PerfilPage />);

    expect(screen.getByRole('heading', { name: /^mi perfil$/i })).toBeVisible();
  });
});
