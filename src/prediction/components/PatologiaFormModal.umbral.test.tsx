// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-64/RF-17: aviso de variables sin umbral para la especie, sin bloquear |
/** RF-64/RF-17: cada variable dice si la especie tiene umbral y el aviso no impide registrar. */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/catalogosApi', () => ({
  catalogosApi: {
    // Especie 1: solo temperatura corporal (13). Especie 2: temperatura y FC (13, 14).
    variablesConUmbral: vi.fn(async (id: number) => (id === 1 ? [13] : [13, 14])),
  },
}));

import { PatologiaFormModal } from './PatologiaFormModal';

const VARIABLES = [
  { id: 13, nombre: 'Temperatura Corporal', unidad: '°C' },
  { id: 14, nombre: 'Frecuencia Cardiaca', unidad: 'bpm' },
  { id: 16, nombre: 'Actividad/Movimiento', unidad: 'm/s²' },
];
const ESPECIES = [{ valor: '1', nombre: 'Bovino' }, { valor: '2', nombre: 'Equino' }];

function renderModal() {
  const onSubmit = vi.fn();
  render(
    <PatologiaFormModal catalogoVariables={VARIABLES} especies={ESPECIES} mode="crear" inicial={null}
      saving={false} saveError={null} online onSubmit={onSubmit} onClose={() => {}} />,
  );
  return onSubmit;
}

describe('PatologiaFormModal: umbrales RF-17 de las variables', () => {
  it('con «Todas las especies» indica en cuántas especies hay umbral', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('button', { name: /Temperatura Corporal.*con umbral/ })).toBeTruthy());
    expect(screen.getByRole('button', { name: /Frecuencia Cardiaca.*umbral en 1\/2/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Actividad\/Movimiento.*sin umbral/ })).toBeTruthy();
  });

  it('avisa las variables elegidas sin umbral y aun así registra', async () => {
    const onSubmit = renderModal();
    fireEvent.change(screen.getByLabelText(/Especie aplicable/i), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Frecuencia Cardiaca.*sin umbral/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Temperatura Corporal/ }));
    fireEvent.click(screen.getByRole('button', { name: /Frecuencia Cardiaca/ }));
    fireEvent.click(screen.getByRole('button', { name: /Actividad\/Movimiento/ }));
    expect(screen.getByText('Sin umbral configurado')).toBeTruthy();
    expect(screen.getByText(/Frecuencia Cardiaca, Actividad\/Movimiento no tienen umbral/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Nombre de la patología/i), { target: { value: 'Septicemia' } });
    fireEvent.change(screen.getByLabelText(/Descripción clínica/i), { target: { value: 'x'.repeat(60) } });
    fireEvent.click(screen.getByText('Registrar'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ especie: '1', variables: [13, 14, 16] }));
  });
});
