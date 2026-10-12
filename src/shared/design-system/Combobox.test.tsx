import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Combobox } from './Combobox';

const OPCIONES = [{ valor: 'Bovino (#1)' }, { valor: 'Cachama Blanca (#4)' }, { valor: 'Tilapia Roja (#6)' }];

function Campo() {
  const [valor, setValor] = useState('');
  return <Combobox id="c" label="Especie" opciones={OPCIONES} value={valor} onChange={setValor} />;
}

describe('Combobox', () => {
  it('la flecha despliega todas las opciones y el clic elige una', async () => {
    render(<Campo />);
    await userEvent.click(screen.getByRole('button', { name: /Especie/ }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.click(screen.getByRole('option', { name: 'Tilapia Roja (#6)' }));
    expect(screen.getByRole('combobox', { name: /Especie/ })).toHaveValue('Tilapia Roja (#6)');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('escribir filtra sin tildes y Enter elige la opción activa', async () => {
    render(<Campo />);
    const campo = screen.getByRole('combobox', { name: /Especie/ });
    await userEvent.type(campo, 'cachamá');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(campo).toHaveValue('Cachama Blanca (#4)');
  });

  it('conserva el texto libre aunque no coincida (ej. un ID)', async () => {
    render(<Campo />);
    const campo = screen.getByRole('combobox', { name: /Especie/ });
    await userEvent.type(campo, '99');
    expect(screen.getByText(/Sin coincidencias/)).toBeInTheDocument();
    expect(campo).toHaveValue('99');
  });
});
