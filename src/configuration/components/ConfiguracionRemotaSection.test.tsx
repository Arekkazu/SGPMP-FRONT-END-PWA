/**
 * RF-23 v1.1 (RFC-011): una CAMARA se configura solo con fps (1–60); un SENSOR
 * con frecuencia de captura e intervalo de transmisión. El formulario muestra y
 * envía el juego de parámetros de la categoría del tipo del dispositivo.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DispositivoIotResponse } from '../types';
import { ConfiguracionRemotaSection } from './ConfiguracionRemotaSection';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

const CAMARA: DispositivoIotResponse = {
  id_dispositivo_iot: 7, serial: 'CAM-001', descripcion: 'Cámara corral', id_infraestructura: 10,
  id_tipo_dispositivo: 5, es_activo: true, fecha_creacion: '',
} as DispositivoIotResponse;
const SENSOR: DispositivoIotResponse = {
  ...CAMARA, id_dispositivo_iot: 8, serial: 'IOT-001', descripcion: 'Sensor estanque', id_tipo_dispositivo: 1,
};

vi.mock('../hooks/useDispositivosIot', () => ({
  useDispositivosIot: () => ({
    dispositivos: [CAMARA, SENSOR], loading: false, cargar: vi.fn(),
    esGatewayEdge: () => false,
    esCamara: (d: DispositivoIotResponse) => d.id_tipo_dispositivo === 5,
  }),
}));

const configurar = vi.fn(async () => true);
vi.mock('../hooks/useConfiguracionRemota', () => ({
  useConfiguracionRemota: () => ({
    historial: [], ultima: null, loading: false, saving: false, saveError: null, encolada: false, cancelada: false,
    cargar: vi.fn(), configurar, reintentar: vi.fn(), cancelar: vi.fn(),
  }),
}));

describe('ConfiguracionRemotaSection por categoría', () => {
  beforeEach(() => configurar.mockClear());

  it('una cámara solo pide fps y envía {fps}', async () => {
    render(<ConfiguracionRemotaSection />);
    fireEvent.click(screen.getByText('CAM-001'));

    expect(screen.queryByLabelText(/frecuencia de captura/i)).toBeNull();
    fireEvent.change(screen.getByLabelText(/fps/i), { target: { value: '20' } });
    fireEvent.submit(screen.getByLabelText(/fps/i).closest('form')!);

    await waitFor(() => expect(configurar).toHaveBeenCalledWith(7, { fps: 20 }));
  });

  it('una cámara no acepta fps fuera de 1–60', async () => {
    render(<ConfiguracionRemotaSection />);
    fireEvent.click(screen.getByText('CAM-001'));

    fireEvent.change(screen.getByLabelText(/fps/i), { target: { value: '61' } });
    fireEvent.submit(screen.getByLabelText(/fps/i).closest('form')!);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(configurar).not.toHaveBeenCalled();
  });

  it('un sensor sigue enviando frecuencia e intervalo, sin fps', async () => {
    render(<ConfiguracionRemotaSection />);
    fireEvent.click(screen.getByText('IOT-001'));

    expect(screen.queryByLabelText(/fps/i)).toBeNull();
    fireEvent.submit(screen.getByLabelText(/frecuencia de captura/i).closest('form')!);

    await waitFor(() => expect(configurar).toHaveBeenCalledWith(8, { frecuencia_captura: 5, intervalo_transmision: 15 }));
  });
});
