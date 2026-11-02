// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-110: crear, editar y quitar relaciones entre áreas |
// | 2026-11-02 | Arekkazu | RF-110: relacionar tocando dos áreas en el grafo |
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TopologiaSanitaria } from './TopologiaSanitaria';
import type { InfraestructuraResponse } from '../types';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

const api = vi.hoisted(() => ({
  listarAristas: vi.fn(),
  registrar: vi.fn().mockResolvedValue({}),
  editar: vi.fn().mockResolvedValue({}),
  desactivar: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../api/topologiaApi', async (original) => ({ ...(await original<object>()), topologiaApi: api }));

const area = (id: number, nombre: string) => ({ id_infraestructura: id, nombre_infraestructura: nombre, tipo_area: 'Potrero', es_activo: true }) as InfraestructuraResponse;
const AREAS = [area(2, 'Potrero 1'), area(3, 'Corral 1'), area(4, 'Potrero 2')];

describe('TopologiaSanitaria (RF-110)', () => {
  it('declara una relación nueva con lo elegido en el formulario', async () => {
    api.listarAristas.mockResolvedValue([]);
    render(<TopologiaSanitaria idFinca={1} areas={AREAS} />);
    fireEvent.click(await screen.findByRole('button', { name: /nueva relación/i }));
    fireEvent.change(screen.getByLabelText(/desde el área/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/hacia el área/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/por dónde pasa/i), { target: { value: 'AGUA' } });
    fireEvent.change(screen.getByLabelText(/intensidad/i), { target: { value: '0.6' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(api.registrar).toHaveBeenCalledWith(2, 3, {
      via: 'AGUA', direccion: 'DIRIGIDA', intensidad: 0.6, factor_barrera: 1, descripcion: null,
    }));
  });

  it('tocar dos áreas en el grafo abre el formulario con las dos ya elegidas', async () => {
    api.listarAristas.mockResolvedValue([]);
    api.registrar.mockClear();
    render(<TopologiaSanitaria idFinca={1} areas={AREAS} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Potrero 1: elegir/i }));
    expect(screen.getByText(/desde «Potrero 1»/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Corral 1: relacionar/i }));
    expect((screen.getByLabelText(/desde el área/i) as HTMLSelectElement).value).toBe('2');
    expect((screen.getByLabelText(/hacia el área/i) as HTMLSelectElement).value).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(api.registrar).toHaveBeenCalledWith(2, 3, expect.objectContaining({ via: 'PROXIMIDAD', intensidad: 0.5 })));
  });

  it('edita la intensidad de una relación y también la puede quitar', async () => {
    api.listarAristas.mockResolvedValue([{ id: 7, origen: 2, destino: 4, via: 'PROXIMIDAD', bidireccional: true, peso: 0.4, intensidad: 0.4, barrera: 1, descripcion: null }]);
    render(<TopologiaSanitaria idFinca={1} areas={AREAS} />);
    fireEvent.click(await screen.findByRole('button', { name: /editar la relación/i }));
    fireEvent.change(screen.getByLabelText(/intensidad/i), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(api.editar).toHaveBeenCalledWith(7, expect.objectContaining({ intensidad: 0.5, direccion: 'BIDIRECCIONAL' })));

    fireEvent.click(await screen.findByRole('button', { name: /editar la relación/i }));
    fireEvent.click(screen.getByRole('button', { name: /quitar relación/i }));
    await waitFor(() => expect(api.desactivar).toHaveBeenCalledWith(7));
  });
});
