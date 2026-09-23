/**
 * #136 — el estado sin `perfil` (montado, sin loading ni error, antes de que
 * `cargar()` resuelva) renderizaba `return null`: la pantalla se quedaba sin
 * ningún encabezado "Mi Perfil" para lectores de pantalla mientras durara esa
 * ventana. Los estados de loading y error ya tenían el h1 (ver #497436b).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PerfilPage } from './PerfilPage';
import { usePerfil } from '../hooks/usePerfil';
import type { PerfilResponse } from '../types';

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

const PERFIL: PerfilResponse = {
  id_usuario: 1,
  nombre: 'Ana',
  apellidos: 'Gomez',
  correo_electronico: 'ana@example.com',
  tipo_identificacion: 'CC',
  numero_identificacion: '1234567890',
  fecha_nacimiento: '1990-01-01',
  fecha_registro: '2026-01-01',
  nombre_rol: 'Productor',
  estado_cuenta: 'Activo',
  genero: 'F',
  version: 1,
};

describe('PerfilPage — editar perfil y cambiar contraseña se abren como modal', () => {
  it.each([
    [/editar perfil/i, /editar datos personales/i],
    [/cambiar contraseña/i, /cambiar contraseña/i],
  ])('el boton %s abre un dialogo encima de la pagina y Escape lo cierra', async (boton, titulo) => {
    mockUsePerfil({ perfil: PERFIL });
    const user = userEvent.setup();
    render(<PerfilPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: boton }));

    expect(screen.getByRole('dialog', { name: titulo })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el boton cerrar del modal lo cierra', async () => {
    mockUsePerfil({ perfil: PERFIL });
    const user = userEvent.setup();
    render(<PerfilPage />);

    await user.click(screen.getByRole('button', { name: /editar perfil/i }));
    await user.click(screen.getByRole('button', { name: /^cerrar$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
