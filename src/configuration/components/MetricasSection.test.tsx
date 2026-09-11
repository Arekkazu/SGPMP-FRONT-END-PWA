/**
 * RF-16 — coherencia unidad_medida ↔ tipo_medicion en métricas productivas (#1666).
 *
 * `unidad_medida` era un `<Input>` de texto libre sin relación con `tipo_medicion`,
 * a pesar de que el backend ya rechaza combinaciones incoherentes (kg para VOLUMEN,
 * litros para PESO, etc.) con 422 `UNIDAD_MEDIDA_INCOHERENTE`. Mismo patrón que
 * `UNIDADES_POR_MEDICION` en `EventoCrecimientoForm`: el tipo filtra un select en
 * vez de dejar el campo abierto a cualquier texto.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricasSection } from './MetricasSection';
import { metricasApi } from '../api/especiesConfigApi';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

vi.mock('../api/especiesConfigApi', () => ({
  metricasApi: {
    listar: vi.fn(),
    registrar: vi.fn(),
    editar: vi.fn(),
    desactivar: vi.fn(),
  },
}));

const metricas = vi.mocked(metricasApi);

async function abrirModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /nueva métrica/i }));
}

beforeEach(() => {
  metricas.listar.mockReset().mockResolvedValue([]);
  metricas.registrar.mockReset().mockResolvedValue({
    id_metrica_produccion: 1, nombre: 'Peso promedio', unidad_medida: 'kg',
    tipo_medicion: 'PESO', aplica_a_tipo_activo: 'AMBOS', id_especie: 3,
    es_activo: true, fecha_actualizacion: null,
  });
});

describe('MetricasSection — RF-16 coherencia unidad↔tipo_medición', () => {
  it('PESO ofrece solo kg/g/lb como unidad', async () => {
    const user = userEvent.setup();
    render(<MetricasSection idEspecie={3} />);
    await abrirModal(user);

    const unidadSelect = screen.getByLabelText(/unidad de medida/i) as HTMLSelectElement;
    const opciones = Array.from(unidadSelect.options).map((o) => o.value).filter(Boolean);
    expect(opciones).toEqual(['kg', 'g', 'lb']);
  });

  it('cambiar a VOLUMEN cambia las unidades ofrecidas (incluye la abreviatura "l")', async () => {
    const user = userEvent.setup();
    render(<MetricasSection idEspecie={3} />);
    await abrirModal(user);

    await user.selectOptions(screen.getByLabelText(/tipo de medición/i), 'VOLUMEN');

    const unidadSelect = screen.getByLabelText(/unidad de medida/i) as HTMLSelectElement;
    const opciones = Array.from(unidadSelect.options).map((o) => o.value).filter(Boolean);
    expect(opciones).toEqual(['litros', 'l', 'ml']);
  });

  it('OTRO vuelve a mostrar un campo de texto libre', async () => {
    const user = userEvent.setup();
    render(<MetricasSection idEspecie={3} />);
    await abrirModal(user);

    await user.selectOptions(screen.getByLabelText(/tipo de medición/i), 'OTRO');

    const campo = screen.getByLabelText(/unidad de medida/i);
    expect(campo.tagName).toBe('INPUT');
    await user.type(campo, 'lo-que-sea');
    expect(campo).toHaveValue('lo-que-sea');
  });

  it('envía el payload esperado con una combinación coherente', async () => {
    const user = userEvent.setup();
    render(<MetricasSection idEspecie={3} />);
    await abrirModal(user);

    await user.type(screen.getByLabelText(/nombre/i), 'Peso promedio');
    await user.selectOptions(screen.getByLabelText(/unidad de medida/i), 'kg');
    await user.click(screen.getByRole('button', { name: /registrar métrica/i }));

    await waitFor(() => expect(metricas.registrar).toHaveBeenCalledTimes(1));
    expect(metricas.registrar).toHaveBeenCalledWith({
      id_especie: 3,
      nombre: 'Peso promedio',
      unidad_medida: 'kg',
      tipo_medicion: 'PESO',
      aplica_a_tipo_activo: 'AMBOS',
    });
  });
});
