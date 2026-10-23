// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60: cadena canónica de heartbeat y detección de visión |
import { describe, expect, it } from 'vitest';
import { cadenaCanonicaValida, evaluarDeteccion, umbralSinSenal, CAMARAS, PARAMETROS_CATEGORIA } from './camarasMock';

describe('parámetros de heartbeat por categoría', () => {
  it('umbral_sin_senal = max(heartbeat, muestreo) + margen', () => {
    expect(umbralSinSenal(PARAMETROS_CATEGORIA.CAMARA)).toBe(450);
  });
  it('rechaza un heartbeat mayor que la mitad del muestreo', () => {
    expect(cadenaCanonicaValida({ hb: 400, freq: 600, margen: 300 })).toBe(false);
    expect(cadenaCanonicaValida(PARAMETROS_CATEGORIA.NODO_AMBIENTAL)).toBe(true);
  });
});

describe('evaluarDeteccion', () => {
  it('sin ventanas es SIN_SEÑAL (fallo de dispositivo)', () => {
    expect(evaluarDeteccion([]).resultado).toBe('SIN_SEÑAL');
  });
  it('3 ventanas seguidas bajo 0.30 es SIN_DETECCION_VALIDA', () => {
    expect(evaluarDeteccion(CAMARAS[1].ventanas)).toEqual({ resultado: 'SIN_DETECCION_VALIDA', consecutivas: 3 });
  });
  it('solo cuenta las consecutivas al final', () => {
    const v = [{ ventana: 'a', cobertura: 0.1, individuos: 1 }, { ventana: 'b', cobertura: 0.9, individuos: 9 }, { ventana: 'c', cobertura: 0.1, individuos: 1 }];
    expect(evaluarDeteccion(v)).toEqual({ resultado: 'DETECCION_VALIDA', consecutivas: 1 });
  });
});
