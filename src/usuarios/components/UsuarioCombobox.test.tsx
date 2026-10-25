import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UsuarioCombobox, idDeUsuario } from './UsuarioCombobox';

const listar = vi.fn();
vi.mock('../api/usuariosApi', () => ({ usuariosApi: { listar: (...a: unknown[]) => listar(...a) } }));

describe('idDeUsuario', () => {
  it('acepta el ID escrito tal cual, como el campo anterior', () => {
    expect(idDeUsuario('42')).toBe(42);
    expect(idDeUsuario(' 42 ')).toBe(42);
  });
  it('acepta la sugerencia elegida «Nombre (#id)»', () => {
    expect(idDeUsuario('Ana Ruiz (#7)')).toBe(7);
  });
  it('vacío es sin filtro y un nombre suelto no se adivina', () => {
    expect(idDeUsuario('')).toBeUndefined();
    expect(idDeUsuario('Ana')).toBeNull();
  });
});

describe('UsuarioCombobox', () => {
  it('busca por nombre en el servidor y deja elegir la sugerencia', async () => {
    listar.mockResolvedValue({ items: [{ id_usuario: 7, nombre_usuario: 'Ana Ruiz', correo_electronico: 'ana@x.co' }] });
    function Campo() {
      const [v, setV] = useState('');
      return <UsuarioCombobox id="u" label="Usuario" value={v} onChange={setV} />;
    }
    render(<Campo />);
    await userEvent.type(screen.getByRole('combobox', { name: /Usuario/ }), 'ana');

    await userEvent.click(await screen.findByRole('option', { name: /Ana Ruiz \(#7\)/ }));
    expect(listar).toHaveBeenLastCalledWith({ nombre: 'ana', pagina: 1, tamano: 20 });
    expect(screen.getByRole('combobox', { name: /Usuario/ })).toHaveValue('Ana Ruiz (#7)');
  });
});
