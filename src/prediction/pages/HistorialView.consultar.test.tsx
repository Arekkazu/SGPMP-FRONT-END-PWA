// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-23 | Arekkazu | QA-M08 ronda 3 RF-106: «Consultar» consulta con los filtros elegidos |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../hooks/useHistorial', () => ({
  useHistorial: () => ({
    eventos: [], cursor: null, loading: false, loadingMas: false, error: null, fromCache: false,
    activos: [{ id_activo_biologico: 15, identificador: 'Lote 15', tipo: 'INDIVIDUAL', nombre_especie: 'Bovino', id_especie: 1 }],
    activosError: false, cargarActivos: vi.fn(), consultar, cargarMas: vi.fn(), limpiar: vi.fn(),
  }),
}));
vi.mock('../hooks/usePatologias', () => ({ usePatologias: () => ({ patologias: [], cargar: vi.fn() }) }));
vi.mock('../hooks/useRetroalimentacion', () => ({ useRetroalimentacion: () => ({}) }));

import { HistorialView } from './HistorialView';

describe('HistorialView · Consultar', () => {
  it('el botón consulta el activo elegido (antes recibía el evento del clic como filtros y no hacía nada)', () => {
    render(<HistorialView />);
    const campo = screen.getByRole('combobox', { name: /activo/i });
    fireEvent.change(campo, { target: { value: '#15' } });
    fireEvent.blur(campo);
    fireEvent.click(screen.getByRole('button', { name: /consultar/i }));
    expect(consultar).toHaveBeenCalledWith(15, expect.objectContaining({ fecha_inicio: expect.any(String) }));
  });
});
