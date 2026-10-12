/**
 * RF-16 — ciclos biológicos: QA no podía editar ninguna etapa (412 falso), una
 * etapa inactiva quedaba sin salida y la lista no tenía buscador ni paginación.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CiclosSection } from './CiclosSection';
import { useCiclosBiologicos } from '../hooks/useCiclosBiologicos';
import type { CicloBiologicoResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useCiclosBiologicos');

const useCiclosMock = vi.mocked(useCiclosBiologicos);

function ciclo(id: number, extra: Partial<CicloBiologicoResponse> = {}): CicloBiologicoResponse {
  return {
    id_ciclo_biologico: id, nombre: `Fase ${id}`, descripcion: null, duracion_dias: 10,
    id_especie: 3, es_activo: true, fecha_actualizacion: null, ...extra,
  };
}

function mockCiclos(ciclos: CicloBiologicoResponse[]) {
  const acciones = {
    cargar: vi.fn(), registrar: vi.fn(), editar: vi.fn().mockResolvedValue(true),
    desactivar: vi.fn(), reactivar: vi.fn().mockResolvedValue(true), limpiarSaveError: vi.fn(),
  };
  useCiclosMock.mockReturnValue({
    ciclos, loading: false, saving: false, error: null, saveError: null, fromCache: false, ...acciones,
  } as ReturnType<typeof useCiclosBiologicos>);
  return acciones;
}

describe('CiclosSection (RF-16)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('edita una etapa nunca editada enviando fecha_actualizacion null', async () => {
    const { editar } = mockCiclos([ciclo(9)]);
    render(<CiclosSection idEspecie={3} />);

    await userEvent.click(screen.getByRole('button', { name: 'Editar Fase 9' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(editar).toHaveBeenCalledWith(9, expect.objectContaining({ fecha_actualizacion: null }));
  });

  it('una etapa inactiva no ofrece editar y se puede reactivar con confirmación', async () => {
    const { reactivar } = mockCiclos([ciclo(14, { es_activo: false })]);
    render(<CiclosSection idEspecie={3} />);

    expect(screen.queryByRole('button', { name: 'Editar Fase 14' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Fase 14$/ }));
    await userEvent.click(screen.getAllByRole('button', { name: /reactivar|reactivate/i }).at(-1)!);

    expect(reactivar).toHaveBeenCalledWith(14);
  });

  it('busca por nombre y pagina de 15 en 15', async () => {
    mockCiclos(Array.from({ length: 25 }, (_, i) => ciclo(i + 1)));
    render(<CiclosSection idEspecie={3} />);

    expect(screen.getByText('Fase 15')).toBeTruthy();
    expect(screen.queryByText('Fase 16')).toBeNull();

    await userEvent.type(screen.getByRole('searchbox'), 'fase 25');
    expect(screen.getByText('Fase 25')).toBeTruthy();
    expect(screen.queryByText('Fase 1')).toBeNull();
  });
});
