/**
 * QA M09 TC-DIS-38/49/52/55: el error de campo del backend debe quedar en su
 * input (aria-invalid + mensaje enlazado), no solo en la alerta general.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Input } from '../design-system/Input';
import type { ApiError } from '../api/errors';
import { useErroresDeServidor } from './useErroresDeServidor';

interface Valores { nombre: string; latitud: string }
const CAMPOS = ['nombre', 'latitud'] as const;

function Formulario({ error }: { error: ApiError }) {
  const { register, setError, formState: { errors } } = useForm<Valores>();
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);
  return (
    <form>
      {alertaGeneral && <p>alerta general</p>}
      <Input id="nombre" label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
      <Input id="latitud" label="Latitud" error={errors.latitud?.message} {...register('latitud')} />
    </form>
  );
}

const base = { code: 'VAL_ENTRADA', message: 'Errores de validacion', status: 400 };

describe('useErroresDeServidor', () => {
  it('marca cada input, incluido el anidado, y enfoca el primero', async () => {
    render(<Formulario error={{ ...base, fields: [
      { field: 'nombre', message: 'Nombre duplicado.' },
      { field: 'ubicacion.latitud', message: 'Fuera de rango.' },
    ] }} />);

    const latitud = await screen.findByLabelText('Latitud');
    expect(latitud).toHaveAttribute('aria-invalid', 'true');
    expect(latitud).toHaveAccessibleDescription('Fuera de rango.');
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    expect(screen.queryByText('alerta general')).toBeNull();
  });

  it('mantiene la alerta general si algún error no tiene input', async () => {
    render(<Formulario error={{ ...base, fields: [
      { field: 'nombre', message: 'Nombre duplicado.' },
      { field: '', message: 'La especie no admite ese modelo.' },
    ] }} />);

    expect(await screen.findByText('alerta general')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
  });
});
