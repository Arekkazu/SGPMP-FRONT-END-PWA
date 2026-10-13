/**
 * RF-43 (CU09): el producto se elige de las métricas habilitadas en la fase
 * activa; el envío lleva su id y su unidad, nunca un texto que haya que adivinar.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EventoProductivoForm } from './EventoProductivoForm';
import type { MetricaActivo } from '../types';

const ALEVINES: MetricaActivo = {
  id_metrica_produccion: 17, nombre: 'alevines producidos', tipo_medicion: 'CONTEO', unidad_medida: 'unidades',
  tipo_dato: 'ENTERO', valor_min: '1', valor_max: '100000', habilitada_en_fase: true,
};
const PESO_VIVO: MetricaActivo = {
  id_metrica_produccion: 15, nombre: 'peso vivo', tipo_medicion: 'PESO', unidad_medida: 'kg',
  tipo_dato: 'NUMERICO', valor_min: null, valor_max: null, habilitada_en_fase: true,
};
const TALLA_FUERA_DE_FASE: MetricaActivo = {
  id_metrica_produccion: 19, nombre: 'Talla prueba', tipo_medicion: 'LONGITUD', unidad_medida: 'cm',
  tipo_dato: 'NUMERICO', valor_min: null, valor_max: null, habilitada_en_fase: false,
};

function renderizar(metricas: MetricaActivo[], onConfirmar = vi.fn().mockResolvedValue(true)) {
  render(
    <EventoProductivoForm
      metricas={metricas} metricasLoading={false} metricasError={false} onReintentar={vi.fn()}
      saving={false} saveError={null} onClose={vi.fn()} onConfirmar={onConfirmar}
    />,
  );
  return onConfirmar;
}

describe('EventoProductivoForm', () => {
  it('ofrece solo los productos de la fase y envía su id y su unidad', async () => {
    const onConfirmar = renderizar([PESO_VIVO, ALEVINES, TALLA_FUERA_DE_FASE]);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('alev');
    expect(screen.queryByRole('option', { name: /Talla prueba/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /alevines producidos/ }));

    await userEvent.type(screen.getByRole('spinbutton', { name: /unidades/ }), '1200');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onConfirmar).toHaveBeenCalledWith(expect.objectContaining({
      id_metrica_produccion: 17, unidad_medida: 'unidades', cantidad_producida: 1200,
    }));
  });

  it('rechaza un producto escrito que no está en la lista', async () => {
    const onConfirmar = renderizar([PESO_VIVO, ALEVINES]);

    await userEvent.type(screen.getByRole('combobox'), 'Carne');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('con un solo producto en la fase lo deja elegido', () => {
    renderizar([ALEVINES, TALLA_FUERA_DE_FASE]);

    expect(screen.getByRole('combobox')).toHaveValue('alevines producidos');
    expect(screen.getByRole('spinbutton', { name: /unidades/ })).toBeEnabled();
  });

  it('respeta el tipo de dato entero de la métrica', async () => {
    const onConfirmar = renderizar([PESO_VIVO, ALEVINES]);

    // La flecha del campo muestra todas las opciones sin escribir nada.
    await userEvent.click(screen.getByRole('button', { name: /opciones/i }));
    await userEvent.click(screen.getByRole('option', { name: /alevines producidos/ }));
    await userEvent.type(screen.getByRole('spinbutton'), '2.5');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sin productos habilitados en la fase explica por qué en vez de mostrar el formulario', () => {
    renderizar([TALLA_FUERA_DE_FASE]);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/habilitado en el ciclo de la fase activa/)).toBeInTheDocument();
  });
});
