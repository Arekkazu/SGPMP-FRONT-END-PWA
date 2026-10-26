// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-03/N-03 RF-72: diagnósticos de la especie del activo |
import { describe, expect, it } from 'vitest';
import { diagnosticosPara } from './diagnosticos';
import type { PatologiaM04Response } from '../types';

const patologia = (nombre_patologia: string, especie_aplicable: string, variables: number, extra: Partial<PatologiaM04Response> = {}) => ({
  id_patologia: nombre_patologia.length, nombre_patologia, especie_aplicable, es_activo: true,
  variables_sensoricas_asociadas: Array.from({ length: variables }, (_, i) => ({ id_variable_ambiental: i, peso_evidencia: 1, es_variable_critica: false })),
  ...extra,
}) as PatologiaM04Response;

const CATALOGO = [
  patologia('Estrés térmico', 'TODAS', 3),
  patologia('Mastitis', '1', 2, { nombre_especie: 'Bovino' }),
  patologia('Vibriosis', '3', 2, { nombre_especie: 'Tilapia roja' }),
  patologia('Ich', 'TODAS', 0),                    // incumple RF-64: sin variables
  patologia('Vieja', '1', 2, { es_activo: false }),
];

describe('diagnosticosPara (M4-03, N-03)', () => {
  it('para un bovino deja las de bovinos y las de todas, sin las de peces ni las inválidas', () => {
    expect(diagnosticosPara(CATALOGO, { id: 1 }).map((p) => p.nombre_patologia)).toEqual(['Estrés térmico', 'Mastitis']);
  });

  it('con solo el nombre de la especie (vistas simuladas) filtra igual', () => {
    expect(diagnosticosPara(CATALOGO, { nombre: 'tilapia roja' }).map((p) => p.nombre_patologia)).toEqual(['Estrés térmico', 'Vibriosis']);
  });

  it('sin especie conocida no filtra por especie, pero sí quita las inválidas', () => {
    expect(diagnosticosPara(CATALOGO).map((p) => p.nombre_patologia)).toEqual(['Estrés térmico', 'Mastitis', 'Vibriosis']);
  });
});
