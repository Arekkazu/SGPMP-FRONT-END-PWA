// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-71: aviso de datos insuficientes para reentrenar el modelo individual |
/** RF-71: aviso por modelo individual según las retroalimentaciones nuevas (200 / 500). */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/modelosApi', () => ({
  modelosApi: {
    estadoReentrenamiento: vi.fn(async () => [
      { tipo_modelo: 'MODELO_ESPECIES_GRANDES', registros_nuevos: 37, desde: null, estado: 'INSUFICIENTE',
        faltan: 163, minimo_solicitud: 200, minimo_reentrenamiento: 500 },
      { tipo_modelo: 'MODELO_ESPECIES_MEDIANAS', registros_nuevos: 250, desde: null, estado: 'PUEDE_SOLICITARSE',
        faltan: 250, minimo_solicitud: 200, minimo_reentrenamiento: 500 },
    ]),
  },
}));

import { AvisoReentrenamiento } from './AvisoReentrenamiento';

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
});
