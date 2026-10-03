/**
 * #194 (RF-33 FA-07): al indicar la especie, el formulario muestra sus atributos
 * dinámicos y marca en su campo el error del backend `atributos_dinamicos.<nombre>`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const parametrosEspecie = vi.hoisted(() => vi.fn());
vi.mock('../api/activosApi', () => ({ activosApi: { parametrosEspecie } }));

import { RegistrarActivoForm } from './RegistrarActivoForm';

describe('RegistrarActivoForm — atributos dinámicos de la especie', () => {
  it('muestra el atributo obligatorio y le asocia el error del servidor', async () => {
    parametrosEspecie.mockResolvedValue([
      { nombre: 'Peso al nacer', tipo_dato: 'NUMERICO', es_obligatorio: true, unidad_medida: 'kg', valor_min: null, valor_max: null },
    ]);
    const props = { saving: false, onSubmit: vi.fn(), onCancel: vi.fn() };
    const { rerender } = render(<RegistrarActivoForm {...props} saveError={null} />);

    await userEvent.type(screen.getAllByRole('spinbutton')[0], '1');  // ID de especie
    const campo = await screen.findByLabelText(/Peso al nacer \(kg\)/, {}, { timeout: 2000 });
    expect(parametrosEspecie).toHaveBeenCalledWith(1, 'INDIVIDUAL');
    expect(campo).toHaveAttribute('aria-required', 'true');

    rerender(
      <RegistrarActivoForm
        {...props}
        saveError={{ code: 'ATRIBUTO_REQUERIDO', message: 'Es obligatorio.', field: 'atributos_dinamicos.Peso al nacer', status: 422 }}
      />
    );
    expect(await screen.findByLabelText(/Peso al nacer \(kg\)/)).toHaveAttribute('aria-invalid', 'true');
  });
});
