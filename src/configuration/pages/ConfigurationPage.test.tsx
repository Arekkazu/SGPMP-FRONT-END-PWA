/**
 * #53 (RF-15) — el catálogo de especies debe ofrecer búsqueda por nombre y
 * paginación. Antes se renderizaba como una lista plana completa.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogoTab } from './ConfigurationPage';
import { useEspecies } from '../hooks/useEspecies';
import type { EspecieResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useEspecies');

const useEspeciesMock = vi.mocked(useEspecies);

function especie(id: number): EspecieResponse {
  return {
    id_especie: id,
    nombre: `Especie ${id}`,
    descripcion: null,
    es_activo: true,
    fecha_creacion: '',
    fecha_actualizacion: null,
  };
}

function mockEspecies(especies: EspecieResponse[]) {
  useEspeciesMock.mockReturnValue({
    especies,
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    fromCache: false,
    cargar: vi.fn(),
    registrar: vi.fn(),
    editar: vi.fn(),
    desactivar: vi.fn(),
    reactivar: vi.fn(),
  } as ReturnType<typeof useEspecies>);
}

describe('CatalogoTab — búsqueda y paginación (RF-15)', () => {
  beforeEach(() => {
    mockEspecies(Array.from({ length: 55 }, (_, i) => especie(i + 1)));
  });

  it('pagina el catálogo a 50 filas y permite avanzar a la siguiente página', async () => {
    const user = userEvent.setup();
    render(<CatalogoTab />);

    expect(await screen.findByText('Especie 1')).toBeInTheDocument();
    expect(screen.queryByText('Especie 51')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(await screen.findByText('Especie 51')).toBeInTheDocument();
    expect(screen.queryByText('Especie 1')).not.toBeInTheDocument();
  });

  it('filtra por nombre y vuelve a la primera página de resultados', async () => {
    const user = userEvent.setup();
    render(<CatalogoTab />);
    await screen.findByText('Especie 1');

    await user.type(screen.getByRole('textbox', { name: /buscar especies/i }), 'Especie 52');

    await waitFor(() => expect(screen.getByText('Especie 52')).toBeInTheDocument());
    expect(screen.queryByText('Especie 1')).not.toBeInTheDocument();
  });

  it('muestra un mensaje distinto cuando la búsqueda no encuentra coincidencias', async () => {
    const user = userEvent.setup();
    render(<CatalogoTab />);
    await screen.findByText('Especie 1');

    await user.type(screen.getByRole('textbox', { name: /buscar especies/i }), 'no-existe');

    expect(await screen.findByText(/ninguna especie coincide/i)).toBeInTheDocument();
  });
});
