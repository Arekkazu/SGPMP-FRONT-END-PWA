/**
 * RF-31 — el modal debe enviar la configuración real de la especie.
 *
 * Regresión del `buildSnapshot()` anterior, que mandaba
 * `{ ciclos: true, patologias: true, ... }`. Además de no ser configuración,
 * esas claves ni siquiera están en la lista blanca del backend, así que la
 * creación fallaba con 400 (`Claves no reconocidas en params_snapshot`).
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlantillaModal } from './PlantillaModal';
import { capturarConfiguracionEspecie } from '../api/especiesConfigApi';

vi.mock('../hooks/useEspecies', () => ({
  useEspecies: () => ({
    especies: [
      { id_especie: 3, nombre: 'Tilapia', es_activo: true },
      { id_especie: 8, nombre: 'Trucha (inactiva)', es_activo: false },
    ],
    cargar: vi.fn(),
  }),
}));

vi.mock('../api/especiesConfigApi', () => ({
  capturarConfiguracionEspecie: vi.fn(),
}));

const capturarMock = vi.mocked(capturarConfiguracionEspecie);

const CONFIG_TILAPIA = {
  ciclos_biologicos: [{ nombre: 'Alevín', duracion_dias: 30, descripcion: null }],
  patologias: [{ nombre: 'Estreptococosis', descripcion: null, es_activo: true }],
  metricas_produccion: [] as never[],
  umbrales_ambientales: [
    {
      id_variable_ambiental: 1, unidad_medida: '°C',
      valor_min: '22', valor_max: '30',
      niveles: [{ nivel: 'normal' as const, limite_inferior: '22', limite_superior: '30' }],
    },
  ],
};

function renderModal(onRegistrar = vi.fn().mockResolvedValue(true)) {
  render(
    <PlantillaModal
      saving={false}
      saveError={null}
      onClose={vi.fn()}
      onRegistrar={onRegistrar}
    />,
  );
  return onRegistrar;
}

async function elegirTilapia(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/especie base/i), '3');
  await waitFor(() => expect(capturarMock).toHaveBeenCalledWith(3));
}

beforeEach(() => {
  capturarMock.mockReset();
  capturarMock.mockResolvedValue(CONFIG_TILAPIA as never);
});

describe('PlantillaModal', () => {
  it('no lee configuración hasta que se elige una especie', () => {
    renderModal();
    expect(capturarMock).not.toHaveBeenCalled();
    expect(screen.getByText(/selecciona una especie para ver/i)).toBeInTheDocument();
  });

  it('envía los parámetros reales de la especie, no banderas booleanas', async () => {
    const user = userEvent.setup();
    const onRegistrar = renderModal();

    await user.type(screen.getByLabelText(/nombre de la plantilla/i), 'Tilapia estándar');
    await elegirTilapia(user);
    await user.click(await screen.findByRole('button', { name: /crear plantilla/i }));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalledTimes(1));
    expect(onRegistrar).toHaveBeenCalledWith({
      template_name: 'Tilapia estándar',
      id_especie: 3,
      params_snapshot: {
        ciclos_biologicos: CONFIG_TILAPIA.ciclos_biologicos,
        patologias: CONFIG_TILAPIA.patologias,
        umbrales_ambientales: CONFIG_TILAPIA.umbrales_ambientales,
      },
    });
  });

  it('omite del snapshot la categoría que la especie no tiene configurada', async () => {
    const user = userEvent.setup();
    const onRegistrar = renderModal();

    await user.type(screen.getByLabelText(/nombre de la plantilla/i), 'Tilapia estándar');
    await elegirTilapia(user);
    await user.click(await screen.findByRole('button', { name: /crear plantilla/i }));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled());
    const dto = onRegistrar.mock.calls[0][0];
    expect(dto.params_snapshot).not.toHaveProperty('metricas_produccion');
  });

  it('deja fuera la categoría que el usuario desmarca', async () => {
    const user = userEvent.setup();
    const onRegistrar = renderModal();

    await user.type(screen.getByLabelText(/nombre de la plantilla/i), 'Solo ciclos');
    await elegirTilapia(user);
    await user.click(await screen.findByRole('checkbox', { name: /catálogo de patologías/i }));
    await user.click(await screen.findByRole('checkbox', { name: /umbrales ambientales/i }));
    await user.click(screen.getByRole('button', { name: /crear plantilla/i }));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled());
    expect(Object.keys(onRegistrar.mock.calls[0][0].params_snapshot)).toEqual(['ciclos_biologicos']);
  });

  it('no deja crear una plantilla vacía: sin parámetros no hay envío (RF-31, FA 400)', async () => {
    const user = userEvent.setup();
    capturarMock.mockResolvedValue({
      ciclos_biologicos: [], patologias: [],
      metricas_produccion: [], umbrales_ambientales: [],
    } as never);
    const onRegistrar = renderModal();

    await user.type(screen.getByLabelText(/nombre de la plantilla/i), 'Vacía');
    await elegirTilapia(user);

    expect(await screen.findByRole('button', { name: /crear plantilla/i })).toBeDisabled();
    expect(screen.getByText(/selecciona al menos un parámetro/i)).toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('avisa si no puede leer la configuración en vez de enviar un snapshot a medias', async () => {
    const user = userEvent.setup();
    capturarMock.mockRejectedValue(new Error('500'));
    const onRegistrar = renderModal();

    await elegirTilapia(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo leer la configuración/i);
    expect(screen.getByRole('button', { name: /crear plantilla/i })).toBeDisabled();
    expect(onRegistrar).not.toHaveBeenCalled();
  });
});
