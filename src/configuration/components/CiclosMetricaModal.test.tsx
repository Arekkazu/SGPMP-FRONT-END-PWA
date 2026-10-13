/**
 * RF-43 E-04: configurar en qué ciclos productivos una métrica es producto.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CiclosMetricaModal } from './CiclosMetricaModal';
import { metricasApi } from '../api/especiesConfigApi';
import type { MetricaProduccionResponse } from '../types';

vi.mock('../api/especiesConfigApi', () => ({
  metricasApi: { ciclos: vi.fn(), asignarCiclos: vi.fn() },
}));
const api = vi.mocked(metricasApi);

const METRICA = { id_metrica_produccion: 17, nombre: 'alevines producidos' } as MetricaProduccionResponse;

beforeEach(() => {
  api.ciclos.mockReset().mockResolvedValue([
    { id_ciclo_productivo: 4, nombre: 'Ciclo completo cachama 2025-A', habilitada: true },
    { id_ciclo_productivo: 7, nombre: 'Engorde rápido', habilitada: false },
  ]);
  api.asignarCiclos.mockReset().mockResolvedValue([]);
});

describe('CiclosMetricaModal', () => {
  it('marca los ciclos habilitados y guarda el conjunto elegido', async () => {
    const onClose = vi.fn();
    render(<CiclosMetricaModal metrica={METRICA} onClose={onClose} />);

    const ciclo4 = await screen.findByRole('checkbox', { name: /cachama 2025-A/ });
    const ciclo7 = screen.getByRole('checkbox', { name: /Engorde rápido/ });
    expect(ciclo4).toBeChecked();
    expect(ciclo7).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();  // sin cambios

    await userEvent.click(ciclo4);
    await userEvent.click(ciclo7);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(api.asignarCiclos).toHaveBeenCalledWith(17, [7]);
    expect(onClose).toHaveBeenCalled();
  });

  it('sin ciclos en la especie lo explica y no deja guardar', async () => {
    api.ciclos.mockResolvedValue([]);
    render(<CiclosMetricaModal metrica={METRICA} onClose={vi.fn()} />);

    expect(await screen.findByText(/no tiene ciclos productivos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});
