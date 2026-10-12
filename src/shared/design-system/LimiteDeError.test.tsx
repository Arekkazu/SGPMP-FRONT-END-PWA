/**
 * #251: un error al renderizar una pagina (ej. .toFixed sobre un texto del
 * backend) no debe desmontar la app entera, solo esa seccion.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LimiteDeError } from './LimiteDeError';

function PaginaRota(): React.ReactElement {
  throw new TypeError('c.valor_referencia.toFixed is not a function');
}

describe('LimiteDeError', () => {
  it('muestra el aviso en la seccion y conserva lo que esta afuera', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <nav>Menú</nav>
        <LimiteDeError><PaginaRota /></LimiteDeError>
      </>,
    );

    expect(screen.getByText('No se pudo mostrar esta sección')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByText('Menú')).toBeInTheDocument();
  });
});
