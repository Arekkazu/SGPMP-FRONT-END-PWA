import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { alActivarConTeclado } from './teclado';

const tecla = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;

describe('alActivarConTeclado', () => {
  it('Enter y Espacio ejecutan la accion; otra tecla no', () => {
    const accion = vi.fn();
    const handler = alActivarConTeclado(accion);
    handler(tecla('Enter'));
    handler(tecla(' '));
    handler(tecla('Tab'));
    expect(accion).toHaveBeenCalledTimes(2);
  });
});
