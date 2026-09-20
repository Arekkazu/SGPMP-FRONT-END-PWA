/**
 * #135 (parte 1) — `useToast` existía sin ningún consumidor: al confirmar una
 * acción en "Gestionar cuenta" con Enter, el modal se cerraba y la tabla se
 * refrescaba sin ningún role="status"/"alert" que anunciara el resultado a un
 * lector de pantalla. Este test fija que la confirmación exitosa se anuncia.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosPage } from './UsuariosPage';
import { useUsuarios } from '../hooks/useUsuarios';
import { useUsuarioDetalle } from '../hooks/useUsuarioDetalle';
import type { UsuarioListadoResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useUsuarios');
vi.mock('../hooks/useUsuarioDetalle');

const useUsuariosMock = vi.mocked(useUsuarios);
const useUsuarioDetalleMock = vi.mocked(useUsuarioDetalle);

const USUARIO: UsuarioListadoResponse = {
  id_usuario: 1,
  nombre_usuario: 'Diana Rincón',
  correo_electronico: 'diana@test.co',
  nombre_rol: 'Productor',
  estado_cuenta: 'ACTIVO',
};

describe('UsuariosPage — #135 confirmación accesible de "Gestionar cuenta"', () => {
  const cargar = vi.fn();
  const gestionar = vi.fn();

  beforeEach(() => {
    cargar.mockClear();
    gestionar.mockClear().mockResolvedValue(true);

    useUsuariosMock.mockReturnValue({
      usuarios: [USUARIO],
      total: 1,
      loading: false,
      error: null,
      filtros: { pagina: 1, tamano: 20 },
      fromCache: false,
      cargar,
      actualizarFiltros: vi.fn(),
    } as ReturnType<typeof useUsuarios>);

    useUsuarioDetalleMock.mockReturnValue({
      detalle: null,
      loading: false,
      saving: false,
      error: null,
      saveError: null,
      cargar: vi.fn(),
      editar: vi.fn(),
      gestionar,
      asignarFincas: vi.fn(),
    } as ReturnType<typeof useUsuarioDetalle>);
  });

  it('anuncia con role="alert" el resultado al confirmar una acción de gestión de cuenta', async () => {
    const user = userEvent.setup();
    render(<UsuariosPage />);

    await user.click(screen.getByRole('button', { name: /gestionar cuenta de diana rincón/i }));
    await user.click(screen.getByRole('button', { name: /inactivar/i }));
    await user.type(screen.getByLabelText(/motivo/i), 'Solicitud del usuario');
    await user.click(screen.getByRole('button', { name: /confirmar inactivar/i }));

    await waitFor(() => expect(gestionar).toHaveBeenCalledWith(
      USUARIO.id_usuario,
      expect.objectContaining({ accion_cuenta: 'inactivar' })
    ));

    const anuncio = await screen.findByRole('alert');
    expect(anuncio).toHaveTextContent(/inactivar/i);
    expect(anuncio).toHaveTextContent(/diana rincón/i);
    expect(cargar).toHaveBeenCalled();
  });
});
