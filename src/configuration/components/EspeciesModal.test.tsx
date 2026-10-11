/**
 * #231 (RF-15): una especie que nunca se editó tiene `fecha_actualizacion` null.
 * Se envía tal cual; mandar la hora del cliente nunca coincide con la BD y el
 * backend respondía 412 en la primera edición.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EspeciesModal } from './EspeciesModal';
import type { EspecieResponse } from '../types';

const especie = (fecha_actualizacion: string | null): EspecieResponse => ({
  id_especie: 42, nombre: 'Equino', descripcion: null, es_activo: true,
  fecha_creacion: '2026-10-01T00:00:00Z', fecha_actualizacion,
});

async function guardar(e: EspecieResponse) {
  const onEditar = vi.fn().mockResolvedValue(true);
  render(<EspeciesModal especie={e} saving={false} saveError={null} onClose={vi.fn()} onRegistrar={vi.fn()} onEditar={onEditar} />);
  const botones = screen.getAllByRole('button');
  await userEvent.click(botones[botones.length - 1]);  // "Guardar cambios"
  return onEditar;
}

describe('EspeciesModal', () => {
  it('envía fecha_actualizacion null si la especie nunca se editó', async () => {
    const onEditar = await guardar(especie(null));
    expect(onEditar).toHaveBeenCalledWith(42, expect.objectContaining({ fecha_actualizacion: null }));
  });

  it('envía la fecha_actualizacion del último GET si ya se editó', async () => {
    const onEditar = await guardar(especie('2026-10-04T15:00:00Z'));
    expect(onEditar).toHaveBeenCalledWith(42, expect.objectContaining({ fecha_actualizacion: '2026-10-04T15:00:00Z' }));
  });
});
