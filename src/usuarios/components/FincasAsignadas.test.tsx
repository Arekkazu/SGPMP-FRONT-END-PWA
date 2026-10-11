import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FincasAsignadas } from './FincasAsignadas';
import type { FincaResponse } from '../../configuration/types';

const finca = (id_finca: number, nombre: string) =>
  ({ id_finca, nombre, ubicacion: { municipio: 'Neiva' } }) as unknown as FincaResponse;
const FINCAS = [finca(1, 'Camaronera Costa Azul'), finca(2, 'PRUEBA FINCA'), finca(3, 'La Esperanza')];

function Campo({ iniciales = [] as number[] }) {
  const [ids, setIds] = useState(new Set(iniciales));
  return <FincasAsignadas fincas={FINCAS} seleccionadas={ids} onChange={setIds} cargando={false} />;
}

describe('FincasAsignadas', () => {
  it('elegir una sugerencia la agrega y la saca de las sugerencias', async () => {
    render(<Campo />);
    await userEvent.type(screen.getByRole('combobox', { name: /Agregar finca/ }), 'esper');
    await userEvent.click(screen.getByRole('option', { name: /La Esperanza \(#3\)/ }));

    expect(screen.getByRole('list', { name: /Fincas asignadas/ })).toHaveTextContent('La Esperanza');
    expect(screen.getByText('1 finca asignada')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Agregar finca/ })).toHaveValue('');
  });

  it('escribir el ID y Enter agrega la finca sin enviar el formulario', async () => {
    let enviado = false;
    render(<form onSubmit={(e) => { e.preventDefault(); enviado = true; }}><Campo /></form>);
    await userEvent.type(screen.getByRole('combobox', { name: /Agregar finca/ }), '2{Enter}');

    expect(screen.getByRole('list', { name: /Fincas asignadas/ })).toHaveTextContent('PRUEBA FINCA');
    expect(enviado).toBe(false);
  });

  it('un texto que no es finca ni ID muestra el error', async () => {
    render(<Campo />);
    await userEvent.type(screen.getByRole('combobox', { name: /Agregar finca/ }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Elige una finca de la lista o escribe su ID/);
    expect(screen.getByText(/no tiene fincas asignadas/)).toBeInTheDocument();
  });

  it('quitar una finca la saca de la lista', async () => {
    render(<Campo iniciales={[1, 2]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Camaronera Costa Azul' }));

    expect(screen.getByRole('list', { name: /Fincas asignadas/ })).not.toHaveTextContent('Camaronera');
    expect(screen.getByText('1 finca asignada')).toBeInTheDocument();
  });
});
