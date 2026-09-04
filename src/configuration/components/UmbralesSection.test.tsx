/**
 * RF-17 — validación cruzada de umbrales ambientales (#1667).
 *
 * Antes no había ninguna validación de contigüidad/cobertura ni de rango físico en
 * el cliente, y el catálogo de variables era una lista hardcodeada con IDs que no
 * coinciden con `modulo9.variables_ambientales` real. Estas pruebas cubren el
 * camino feliz y los rechazos del lado del cliente contra el catálogo real servido
 * por `GET /configuracion/variables-ambientales`.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UmbralesSection } from './UmbralesSection';
import { umbralesApi, variablesAmbientalesApi } from '../api/especiesConfigApi';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

vi.mock('../api/especiesConfigApi', () => ({
  umbralesApi: {
    listar: vi.fn(),
    registrar: vi.fn(),
    editar: vi.fn(),
    desactivar: vi.fn(),
  },
  variablesAmbientalesApi: {
    listar: vi.fn(),
  },
}));

const umbrales = vi.mocked(umbralesApi);
const variablesApi = vi.mocked(variablesAmbientalesApi);

const PH: import('../types').VariableAmbientalCatalogo = {
  id_variable_ambiental: 2, nombre: 'pH del agua', unidad: 'pH',
  valor_fisico_min: 0, valor_fisico_max: 14,
};
const TEMPERATURA: import('../types').VariableAmbientalCatalogo = {
  id_variable_ambiental: 1, nombre: 'Temperatura del agua', unidad: '°C',
  valor_fisico_min: 0, valor_fisico_max: 45,
};

async function abrirModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /nuevo umbral/i }));
}

/** DOM order: valor_min, valor_max, normal_inf, normal_sup, precaucion_inf, precaucion_sup, critico_inf, critico_sup. */
async function llenarNiveles(
  user: ReturnType<typeof userEvent.setup>,
  valores: { min: number; max: number; normal: [number, number]; precaucion: [number, number]; critico: [number, number] }
) {
  const spins = screen.getAllByRole('spinbutton');
  const set = async (input: HTMLElement, valor: number) => {
    await user.clear(input);
    await user.type(input, String(valor));
  };
  await set(spins[0], valores.min);
  await set(spins[1], valores.max);
  await set(spins[2], valores.normal[0]);
  await set(spins[3], valores.normal[1]);
  await set(spins[4], valores.precaucion[0]);
  await set(spins[5], valores.precaucion[1]);
  await set(spins[6], valores.critico[0]);
  await set(spins[7], valores.critico[1]);
}

beforeEach(() => {
  umbrales.listar.mockReset().mockResolvedValue([]);
  umbrales.registrar.mockReset().mockResolvedValue({
    id_umbral_ambiental: 1, id_especie: 3, id_variable_ambiental: 2,
    unidad_medida: 'pH', valor_min: 0, valor_max: 14, es_activo: true,
    fecha_actualizacion: null,
    niveles: [
      { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
      { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
      { nivel: 'critico', limite_inferior: 0, limite_superior: 6 },
    ],
  });
  variablesApi.listar.mockReset().mockResolvedValue([TEMPERATURA, PH]);
});

describe('UmbralesSection — validación cruzada RF-17', () => {
  it('rechaza en el cliente niveles con un hueco y no llama a la API', async () => {
    const user = userEvent.setup();
    render(<UmbralesSection idEspecie={3} />);
    await abrirModal(user);
    await user.selectOptions(screen.getByLabelText(/variable ambiental/i), '2');

    // critico[0,5] normal[6,8] precaucion[8,14] — hueco entre 5 y 6
    await llenarNiveles(user, { min: 0, max: 14, normal: [6, 8], precaucion: [8, 14], critico: [0, 5] });
    await user.click(screen.getByRole('button', { name: /registrar umbral/i }));

    await waitFor(() => expect(screen.getByText(/error de validaci/i)).toBeInTheDocument());
    expect(umbrales.registrar).not.toHaveBeenCalled();
  });

  it('rechaza en el cliente un rango fuera del limite fisico de la variable', async () => {
    const user = userEvent.setup();
    render(<UmbralesSection idEspecie={3} />);
    await abrirModal(user);
    await user.selectOptions(screen.getByLabelText(/variable ambiental/i), '2'); // pH: [0,14]

    await llenarNiveles(user, { min: 0, max: 20, normal: [6, 8], precaucion: [8, 20], critico: [0, 6] });
    await user.click(screen.getByRole('button', { name: /registrar umbral/i }));

    await waitFor(() => expect(screen.getByText(/rango físico/i)).toBeInTheDocument());
    expect(umbrales.registrar).not.toHaveBeenCalled();
  });

  it('deshabilita el submit cuando la especie ya tiene un umbral activo para esa variable', async () => {
    umbrales.listar.mockResolvedValue([
      {
        id_umbral_ambiental: 9, id_especie: 3, id_variable_ambiental: 2,
        unidad_medida: 'pH', valor_min: 0, valor_max: 14, es_activo: true,
        fecha_actualizacion: null,
        niveles: [{ nivel: 'normal', limite_inferior: 0, limite_superior: 14 }],
      },
    ]);
    const user = userEvent.setup();
    render(<UmbralesSection idEspecie={3} />);
    await abrirModal(user);
    await user.selectOptions(screen.getByLabelText(/variable ambiental/i), '2');

    expect(await screen.findByText(/ya existe un umbral activo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar umbral/i })).toBeDisabled();
  });

  it('acepta un umbral valido y envia el payload esperado', async () => {
    const user = userEvent.setup();
    render(<UmbralesSection idEspecie={3} />);
    await abrirModal(user);
    await user.selectOptions(screen.getByLabelText(/variable ambiental/i), '2');

    await llenarNiveles(user, { min: 0, max: 14, normal: [6, 8], precaucion: [8, 14], critico: [0, 6] });
    await user.click(screen.getByRole('button', { name: /registrar umbral/i }));

    await waitFor(() => expect(umbrales.registrar).toHaveBeenCalledTimes(1));
    expect(umbrales.registrar).toHaveBeenCalledWith({
      id_especie: 3,
      id_variable_ambiental: 2,
      valor_min: 0,
      valor_max: 14,
      niveles: [
        { nivel: 'normal', limite_inferior: 6, limite_superior: 8 },
        { nivel: 'precaucion', limite_inferior: 8, limite_superior: 14 },
        { nivel: 'critico', limite_inferior: 0, limite_superior: 6 },
      ],
    });
  });
});
