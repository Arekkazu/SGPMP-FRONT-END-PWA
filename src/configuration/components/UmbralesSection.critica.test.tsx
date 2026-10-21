// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-20 | Arekkazu | FE-09 RF-17: interruptor es_critica solo para quien puede editar umbrales |
/**
 * FE-09 (RFC-016 B.7): el Administrador marca una variable ambiental como crítica.
 * Sin permiso de edición el estado se ve, pero no se puede cambiar.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UmbralesSection } from './UmbralesSection';
import { umbralesApi, variablesAmbientalesApi } from '../api/especiesConfigApi';

const permisos = vi.hoisted(() => ({ editar: true }));
vi.mock('../../shared/rbac/usePermission', () => ({
  usePermission: (_recurso: number, accion: number) => (accion === 3 ? permisos.editar : true),
}));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../api/especiesConfigApi', () => ({
  umbralesApi: { listar: vi.fn(), registrar: vi.fn(), editar: vi.fn(), desactivar: vi.fn() },
  variablesAmbientalesApi: { listar: vi.fn(), marcarCritica: vi.fn() },
}));

const api = vi.mocked(variablesAmbientalesApi);
const AMONIACO = { id_variable_ambiental: 7, nombre: 'Amoniaco', unidad: 'ppm', valor_fisico_min: 0, valor_fisico_max: 100, es_critica: false };

beforeEach(() => {
  vi.mocked(umbralesApi).listar.mockResolvedValue([]);
  api.listar.mockResolvedValue([AMONIACO]);
  api.marcarCritica.mockReset();
  permisos.editar = true;
});

describe('UmbralesSection — variables críticas (RFC-016 B.7)', () => {
  it('quien puede editar umbrales marca la variable como crítica', async () => {
    api.marcarCritica.mockResolvedValue({ ...AMONIACO, es_critica: true });
    render(<UmbralesSection idEspecie={1} />);
    const interruptor = await screen.findByRole('switch', { name: /Amoniaco/ });
    expect(interruptor.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(interruptor);

    expect(api.marcarCritica).toHaveBeenCalledWith(7, true);
    await waitFor(() => expect(screen.getByRole('switch', { name: /Amoniaco/ }).getAttribute('aria-checked')).toBe('true'));
  });

  it('sin permiso de edición solo se ve el estado', async () => {
    permisos.editar = false;
    render(<UmbralesSection idEspecie={1} />);
    expect(await screen.findByText('No crítica')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('si el backend rechaza el cambio, el estado no cambia y se muestra el error', async () => {
    api.marcarCritica.mockRejectedValue({ status: 403, code: 'ACCESO_DENEGADO', message: 'Acceso denegado.' });
    render(<UmbralesSection idEspecie={1} />);
    await userEvent.click(await screen.findByRole('switch', { name: /Amoniaco/ }));
    expect(await screen.findByText('Acceso denegado.')).toBeTruthy();
    expect(screen.getByRole('switch', { name: /Amoniaco/ }).getAttribute('aria-checked')).toBe('false');
  });
});
