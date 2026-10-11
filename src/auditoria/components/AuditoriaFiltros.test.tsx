import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuditoriaFiltros } from './AuditoriaFiltros';

vi.mock('../../usuarios/api/usuariosApi', () => ({ usuariosApi: { listar: vi.fn().mockResolvedValue({ items: [] }) } }));

const TIPOS = [{ id_tipo_evento: 3, nombre: 'LOGIN_EXITOSO' }];

describe('AuditoriaFiltros', () => {
  it('el ID escrito en «Usuario» sigue filtrando por id_usuario', async () => {
    const onBuscar = vi.fn();
    render(<AuditoriaFiltros onBuscar={onBuscar} onReset={() => {}} tiposEvento={TIPOS as never} />);
    await userEvent.type(screen.getByRole('combobox', { name: /Usuario/ }), '42{Enter}');

    expect(onBuscar).toHaveBeenCalledWith(expect.objectContaining({ id_usuario: 42 }));
  });

  it('un nombre que no se eligió de la lista no busca y lo explica', async () => {
    const onBuscar = vi.fn();
    render(<AuditoriaFiltros onBuscar={onBuscar} onReset={() => {}} tiposEvento={TIPOS as never} />);
    await userEvent.type(screen.getByRole('combobox', { name: /Usuario/ }), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(onBuscar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Elige un usuario de la lista/);
  });

  it('el selector de tipo conserva su rol para las pruebas de QA (TC-DIS-29)', () => {
    render(<AuditoriaFiltros onBuscar={vi.fn()} onReset={() => {}} tiposEvento={TIPOS as never} />);
    expect(screen.getByRole('combobox', { name: /tipo/i }).tagName).toBe('SELECT');
  });
});
