/**
 * Firefox deja escribir letras en type="number" y el campo entrega "": el
 * formulario de métricas guardaba el rango vacío. El Input rechaza la tecla.
 * (fireEvent devuelve false cuando el manejador hizo preventDefault.)
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

const tecla = (campo: HTMLElement, key: string, extra = {}) => fireEvent.keyDown(campo, { key, ...extra });

describe('Input type="number"', () => {
  it('decimal: rechaza letras y acepta dígitos, punto y signo', () => {
    render(<Input label="Decimal" type="number" step="any" />);
    const campo = screen.getByLabelText('Decimal');
    expect(campo).toHaveAttribute('inputmode', 'decimal');
    for (const k of ['a', 'e', ',', ' ']) expect(tecla(campo, k)).toBe(false);
    for (const k of ['7', '.', '-', 'Backspace', 'ArrowLeft', 'Tab']) expect(tecla(campo, k)).toBe(true);
    expect(tecla(campo, 'v', { ctrlKey: true })).toBe(true);
  });

  it('entero: también rechaza el punto', () => {
    render(<Input label="Entero" type="number" step={1} />);
    const campo = screen.getByLabelText('Entero');
    expect(campo).toHaveAttribute('inputmode', 'numeric');
    expect(tecla(campo, '.')).toBe(false);
    expect(tecla(campo, '3')).toBe(true);
  });

  it('rechaza pegar texto no numérico', () => {
    render(<Input label="Decimal" type="number" step="any" />);
    const campo = screen.getByLabelText('Decimal');
    expect(fireEvent.paste(campo, { clipboardData: { getData: () => 'abc' } })).toBe(false);
    expect(fireEvent.paste(campo, { clipboardData: { getData: () => '7.5' } })).toBe(true);
  });

  it('los campos de texto no se filtran', () => {
    render(<Input label="Texto" />);
    const campo = screen.getByLabelText('Texto');
    expect(campo).not.toHaveAttribute('inputmode');
    expect(tecla(campo, 'a')).toBe(true);
  });
});
