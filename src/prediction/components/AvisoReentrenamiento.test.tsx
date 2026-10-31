// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-71: aviso de datos insuficientes para reentrenar el modelo individual |
// | 2026-10-31 | Arekkazu | RF-71/RF-73: botón para solicitar el reentrenamiento |
/** RF-71: aviso por modelo individual según las retroalimentaciones nuevas (200 / 500). */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/modelosApi', () => ({
  modelosApi: {
    estadoReentrenamiento: vi.fn(async () => [
      { tipo_modelo: 'MODELO_ESPECIES_GRANDES', registros_nuevos: 37, desde: null, estado: 'INSUFICIENTE',
        faltan: 163, minimo_solicitud: 200, minimo_reentrenamiento: 500 },
      { tipo_modelo: 'MODELO_ESPECIES_MEDIANAS', registros_nuevos: 250, desde: null, estado: 'PUEDE_SOLICITARSE',
        faltan: 250, minimo_solicitud: 200, minimo_reentrenamiento: 500 },
    ]),
    solicitarReentrenamiento: vi.fn(async () => ({ id_evento: 'e-1', estado: {} })),
  },
}));

import { AvisoReentrenamiento } from './AvisoReentrenamiento';
import { modelosApi } from '../api/modelosApi';

describe('AvisoReentrenamiento (RF-71)', () => {
  it('avisa que faltan datos y cuándo ya se puede solicitar', async () => {
    render(<AvisoReentrenamiento online />);
    expect(await screen.findByText('Especies grandes: no hay datos suficientes para reentrenar')).toBeTruthy();
    expect(screen.getByText(/Faltan 163 para poder solicitar el reentrenamiento \(desde 200\)/)).toBeTruthy();
    expect(screen.getByText('Especies medianas: ya se puede solicitar el reentrenamiento')).toBeTruthy();
  });

  it('sin conexión no consulta ni muestra nada', () => {
    const { container } = render(<AvisoReentrenamiento online={false} />);
    expect(container.textContent).toBe('');
  });

  it('sin permiso E no ofrece solicitar', async () => {
    render(<AvisoReentrenamiento online />);
    await screen.findByText('Especies medianas: ya se puede solicitar el reentrenamiento');
    expect(screen.queryByText('Solicitar reentrenamiento')).toBeNull();
  });

  it('solicita solo donde alcanza el mínimo y lo confirma', async () => {
    render(<AvisoReentrenamiento online puedeSolicitar />);
    const [boton] = await screen.findAllByText('Solicitar reentrenamiento');
    expect(screen.getAllByText('Solicitar reentrenamiento')).toHaveLength(1);  // grandes está INSUFICIENTE
    fireEvent.click(boton);
    expect(await screen.findByText(/Solicitud registrada en la bitácora de M04 con 250/)).toBeTruthy();
    expect(modelosApi.solicitarReentrenamiento).toHaveBeenCalledWith('MODELO_ESPECIES_MEDIANAS');
    expect(screen.queryByText('Solicitar reentrenamiento')).toBeNull();
  });
});
