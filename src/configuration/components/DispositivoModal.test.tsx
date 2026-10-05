/**
 * RF-21 v2.0 (RFC-011): la categoría la da el tipo. Una cámara pide resolución,
 * fps y área de cobertura; un sensor no los muestra ni los envía.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DispositivoModal } from './DispositivoModal';
import type { InfraestructuraResponse } from '../types';

vi.mock('../api/iotApi', () => ({
  tiposDispositivoApi: {
    listar: () => Promise.resolve([
      { id_tipo_dispositivo: 1, nombre: 'GENERICO', categoria: 'SENSOR' },
      { id_tipo_dispositivo: 5, nombre: 'CAMARA_VISION', categoria: 'CAMARA' },
    ]),
  },
}));

const AREA = { id_infraestructura: 7, tipo_area: 'Galpón', nombre_infraestructura: 'Galpón 1', superficie: 100 } as InfraestructuraResponse;

async function abrir() {
  const onRegistrar = vi.fn().mockResolvedValue(true);
  render(<DispositivoModal area={AREA} edges={[]} saving={false} saveError={null} onClose={vi.fn()} onRegistrar={onRegistrar} />);
  await screen.findByText('CAMARA_VISION');
  fireEvent.change(screen.getByLabelText(/Serial/), { target: { value: 'CAM-01' } });
  fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Camara galpon' } });
  return onRegistrar;
}

describe('DispositivoModal — cámara (RFC-011)', () => {
  it('una cámara exige y envía sus atributos de visión', async () => {
    const onRegistrar = await abrir();
    fireEvent.change(screen.getByLabelText(/Tipo de dispositivo/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Resolución/), { target: { value: '1920x1080' } });
    fireEvent.change(screen.getByLabelText(/FPS/), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Área de cobertura/), { target: { value: '80' } });
    fireEvent.click(screen.getByText('Registrar dispositivo'));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled());
    expect(onRegistrar.mock.calls[0][0]).toMatchObject({ id_tipo_dispositivo: 5, resolucion: '1920x1080', fps: 25, area_cobertura_m2: 80 });
  });

  it('un sensor no muestra ni envía atributos de visión', async () => {
    const onRegistrar = await abrir();
    fireEvent.change(screen.getByLabelText(/Tipo de dispositivo/), { target: { value: '1' } });
    expect(screen.queryByLabelText(/Resolución/)).toBeNull();
    fireEvent.click(screen.getByText('Registrar dispositivo'));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled());
    expect(onRegistrar.mock.calls[0][0]).not.toHaveProperty('resolucion');
  });
});
