// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66: lo que ve la cámara del área |
// | 2026-11-02 | Arekkazu | RF-66: miniatura ampliable, conteo frente al inventario y aviso |
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(await screen.findByRole('button', { name: /ver la imagen completa/i })).toBeTruthy();
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

  it('la miniatura se abre completa y compara el conteo con el inventario', async () => {
    vi.spyOn(monitorApi, 'captura').mockResolvedValue({ ...CAPTURA, cantidad_registrada: 15, discrepancia_inventario: false });
    const { container } = render(<CapturaCamara idArea={7} />);
    fireEvent.click(await screen.findByRole('button', { name: /ver la imagen completa/i }));
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(screen.getByText(/la cámara ve ~6 de 15 registrados/i)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('avisa si las últimas ventanas se alejan del inventario', async () => {
    vi.spyOn(monitorApi, 'captura').mockResolvedValue({ ...CAPTURA, n_individuos: 3, cantidad_registrada: 15, discrepancia_inventario: true });
    render(<CapturaCamara idArea={7} />);
    expect((await screen.findByRole('status')).textContent).toMatch(/posible diferencia con el inventario.*~3.*15 registrados/i);
  });
});
