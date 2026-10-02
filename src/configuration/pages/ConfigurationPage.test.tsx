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
import type { SyncOperation } from '../../shared/db/db';

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

function mockEspecies(
  especies: EspecieResponse[],
  extra: Partial<ReturnType<typeof useEspecies>> = {},
) {
  useEspeciesMock.mockReturnValue({
    especies,
    loading: false,
    saving: false,
    error: null,
    saveError: null,
    fromCache: false,
    conflictos: [],
    cargar: vi.fn(),
    registrar: vi.fn(),
    editar: vi.fn(),
    desactivar: vi.fn(),
    reactivar: vi.fn(),
    resolverConflicto: vi.fn(),
    ...extra,
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

// #450 (RF-15): FA "Error de sincronización en modo offline" y visibilidad de la especie recién creada.
describe('CatalogoTab — conflicto de sincronización offline (#450, RF-15)', () => {
  function conflicto(status: number, error: string): SyncOperation {
    return {
      id: 7, modulo: 'config_especies', accion: 'crear',
      payload: { tempId: -1, dto: { nombre: 'Bovino' } }, intentos: 1, creadoEn: 1,
      conflicto: true, status, error,
    };
  }

  it('un 409 al crear muestra el texto del RF-15 con el nombre de la especie', async () => {
    mockEspecies([especie(1)], { conflictos: [conflicto(409, 'La especie ya se encuentra registrada.')] });
    render(<CatalogoTab />);

    expect(await screen.findByText(
      "Fallo de sincronización. La especie creada en modo offline 'Bovino' ya existe en el servidor. Por favor, resuelva el conflicto manualmente.",
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
  });

  it('otro rechazo 4xx muestra el mensaje que devolvió el backend', async () => {
    mockEspecies([especie(1)], { conflictos: [conflicto(400, 'El nombre de la especie solo puede contener letras.')] });
    render(<CatalogoTab />);

    expect(await screen.findByText('El nombre de la especie solo puede contener letras.')).toBeInTheDocument();
  });

  it('al registrar una especie vuelve a la página 1, donde queda la fila nueva', async () => {
    const user = userEvent.setup();
    mockEspecies(Array.from({ length: 55 }, (_, i) => especie(i + 1)), {
      registrar: vi.fn().mockResolvedValue(true),
    });
    render(<CatalogoTab />);
    await user.click(await screen.findByRole('button', { name: /siguiente/i }));
    expect(await screen.findByText('Especie 51')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nueva especie/i }));
    await user.type(screen.getByRole('textbox', { name: /^nombre/i }), 'Caprino');
    await user.click(screen.getByRole('button', { name: 'Registrar especie' }));

    expect(await screen.findByText('Especie 1')).toBeInTheDocument();
    expect(screen.queryByText('Especie 51')).not.toBeInTheDocument();
  });
});
