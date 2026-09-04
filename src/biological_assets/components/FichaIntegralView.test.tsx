/**
 * RF-47 — el error de `useFichaIntegral` se descartaba en silencio.
 *
 * Antes, `ActivoDetallePage` no leia `error` del hook y `FichaIntegralView`
 * no lo aceptaba como prop: si la carga de la ficha fallaba, el usuario solo
 * veia "No hay ficha disponible" sin ninguna pista de que hubo un fallo de
 * red o del backend. El componente ahora debe mostrar una alerta con el
 * mensaje del error quando este se propaga.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FichaIntegralView } from './FichaIntegralView';
import type { ApiError } from '../../shared/api/errors';

const ERROR: ApiError = { code: 'ERROR_INTERNO', message: 'No se pudo calcular la ficha integral.', status: 500 };

describe('FichaIntegralView — propagación de error (RF-47)', () => {
  it('muestra una alerta con el mensaje del error cuando no hay ficha', () => {
    render(<FichaIntegralView ficha={null} loading={false} error={ERROR} />);

    expect(screen.getByText(ERROR.message)).toBeInTheDocument();
    expect(screen.queryByText(/no hay ficha disponible/i)).toBeNull();
  });

  it('sin error y sin ficha, muestra el estado vacío de siempre', () => {
    render(<FichaIntegralView ficha={null} loading={false} error={null} />);

    expect(screen.getByText(/no hay ficha disponible/i)).toBeInTheDocument();
  });
});
