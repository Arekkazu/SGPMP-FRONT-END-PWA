// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66: lo que ve la cámara del área |
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CapturaCamara, REFRESCO_MS } from './CapturaCamara';
import { monitorApi } from '../api/monitorApi';

const CAPTURA = { id_dispositivo_iot: 8, fecha: '2026-11-02T14:31:20Z', n_individuos: 6, imagen: 'data:image/jpeg;base64,/9j/' };

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('CapturaCamara (RF-66)', () => {
  it('muestra la última captura con sus animales y la vuelve a pedir cada ventana', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const captura = vi.spyOn(monitorApi, 'captura').mockResolvedValue(CAPTURA);
    render(<CapturaCamara idArea={7} />);
    expect(await screen.findByRole('img', { name: /6 animales detectados/i })).toBeTruthy();
    expect(captura).toHaveBeenCalledWith(7, undefined);
    await act(async () => { vi.advanceTimersByTime(REFRESCO_MS); });
    expect(captura).toHaveBeenCalledTimes(2);
  });

  it('un área sin cámara no muestra nada', async () => {
    vi.spyOn(monitorApi, 'captura').mockRejectedValue({ code: 'AREA_SIN_CAMARA', message: 'x', status: 404 });
    const { container } = render(<CapturaCamara idArea={2} />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('la de una ventana vieja avisa que ya no está y no se refresca', async () => {
    const captura = vi.spyOn(monitorApi, 'captura').mockRejectedValue({ code: 'CAPTURA_NO_DISPONIBLE', message: 'x', status: 404 });
    render(<CapturaCamara idArea={7} ventanaFin="2026-11-02T10:00:00Z" />);
    expect(await screen.findByText(/ya no está disponible/i)).toBeTruthy();
    expect(captura).toHaveBeenCalledWith(7, '2026-11-02T10:00:00Z');
  });
});
