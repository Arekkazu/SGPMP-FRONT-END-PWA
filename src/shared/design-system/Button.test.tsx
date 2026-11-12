// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-12 | Arekkazu | TC-DIS-211/214/217 RF-75/76/78: el botón que carga conserva el foco y no repite el envío |
/**
 * QA M05 (2ª evaluación): tras un 409 el foco quedaba en <body> porque el botón
 * de guardar se deshabilitaba mientras enviaba.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button cargando', () => {
  it('conserva el foco y bloquea el clic hasta que termina', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Guardar</Button>);
    const boton = screen.getByRole('button', { name: 'Guardar' });
    boton.focus();

    rerender(<Button onClick={onClick} loading>Guardar</Button>);
    expect(boton).not.toHaveAttribute('disabled');
    expect(boton).toHaveAttribute('aria-disabled', 'true');
    expect(boton).toHaveFocus();
    fireEvent.click(boton);
    expect(onClick).not.toHaveBeenCalled();

    rerender(<Button onClick={onClick}>Guardar</Button>);
    expect(boton).toHaveFocus();
    fireEvent.click(boton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cargando no envía el formulario', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Button type="submit" loading>Guardar</Button></form>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
