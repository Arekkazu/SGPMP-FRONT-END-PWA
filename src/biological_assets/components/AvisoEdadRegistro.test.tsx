// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
/** FE-07 (RF-33 1.4, RFC-014): la advertencia de edad del 201 se ve al abrir el detalle. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AvisoEdadRegistro } from './AvisoEdadRegistro';

const MENSAJE = 'La edad del activo (7601 días) alcanza o supera la esperanza de vida de la especie (3650 días).';

describe('AvisoEdadRegistro', () => {
  it('muestra la advertencia que deja el registro', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/activos-biologicos/9', state: { advertenciaEdad: MENSAJE } }]}>
        <AvisoEdadRegistro />
      </MemoryRouter>,
    );
    expect(screen.getByText(MENSAJE)).toBeInTheDocument();
  });

  it('sin advertencia no muestra nada', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/activos-biologicos/9']}><AvisoEdadRegistro /></MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
