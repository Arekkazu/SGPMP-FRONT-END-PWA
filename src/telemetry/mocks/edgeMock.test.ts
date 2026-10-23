// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-55: estado de la ventana de visión contra su presupuesto |
import { describe, expect, it } from 'vitest';
import { estadoVentana } from './edgeMock';

// Ventana de 300 s con presupuesto del 80 % = 240 s.
describe('estadoVentana', () => {
  it('dentro del presupuesto hasta 240 s', () => expect(estadoVentana(240)).toBe('DENTRO'));
  it('excedido pero a tiempo entre 241 y 300 s', () => expect(estadoVentana(262)).toBe('EXCEDIDO'));
  it('backpressure si pasa la ventana o no terminó', () => {
    expect(estadoVentana(301)).toBe('BACKPRESSURE');
    expect(estadoVentana(null)).toBe('BACKPRESSURE');
  });
});
