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
  fecha_creacion: '2026-10-01T00:00:00Z', fecha_actualizacion, grupo_manejo: 'ESPECIES_GRANDES',
});

function registrarModal() {
  const onRegistrar = vi.fn().mockResolvedValue(true);
  render(<EspeciesModal especie={null} saving={false} saveError={null} onClose={vi.fn()} onRegistrar={onRegistrar} onEditar={vi.fn()} />);
  return onRegistrar;
}

async function enviar() {
  const botones = screen.getAllByRole('button');
  await userEvent.click(botones[botones.length - 1]);
}

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

  // RF-15 v1.1: el grupo de manejo es obligatorio y viaja como grupo_manejo.
  it('no registra sin grupo de manejo', async () => {
    const onRegistrar = registrarModal();
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Tilapia Roja');
    await enviar();
    expect(onRegistrar).not.toHaveBeenCalled();
    expect(screen.getByText('El grupo de manejo es obligatorio.')).toBeTruthy();
  });

  it('registra con el grupo de manejo elegido', async () => {
    const onRegistrar = registrarModal();
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Tilapia Roja');
    await userEvent.selectOptions(screen.getByLabelText(/Grupo de manejo/), 'ACUICULTURA');
    await enviar();
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Tilapia Roja', grupo_manejo: 'ACUICULTURA' }));
  });

  it('una especie previa sin grupo debe clasificarse antes de guardar', async () => {
    const onEditar = await guardar({ ...especie(null), grupo_manejo: null });
    expect(onEditar).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText(/Grupo de manejo/), 'ACUICULTURA');
    await enviar();
    expect(onEditar).toHaveBeenCalledWith(42, expect.objectContaining({ grupo_manejo: 'ACUICULTURA' }));
  });
});
