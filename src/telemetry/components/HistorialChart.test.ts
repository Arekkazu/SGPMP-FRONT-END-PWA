// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-26 | Arekkazu | INC-M03-193-G121 RF-59: la línea se corta en los vacíos temporales (CA-13) |
import { describe, expect, it } from 'vitest';
import { buildChart } from './HistorialChart';
import type { LecturaHistoricaSchema, VacioTemporalSchema } from '../types';

const lectura = (ts: string, valor: number, tipo_variable = 'Temperatura Ambiental') =>
  ({ id_sensor: 7, tipo_variable, valor, timestamp_captura: ts }) as LecturaHistoricaSchema;

describe('buildChart (RF-59 CA-13)', () => {
  it('abre un tramo nuevo tras cada vacío y no une sus extremos', () => {
    const items = [lectura('2026-10-20T10:00:00Z', 20), lectura('2026-10-20T10:05:00Z', 21), lectura('2026-10-20T14:00:00Z', 25)];
    const vacios = [{ sensor_id: 7, tipo_variable: 'Temperatura Ambiental', desde: '2026-10-20T10:05:00Z', hasta: '2026-10-20T14:00:00Z', duracion_min: 235, frecuencia_esperada_min: 5 }] as VacioTemporalSchema[];
    const { data, series } = buildChart(items, vacios);
    expect(series.map((s) => s.dataKey)).toEqual(['Temperatura Ambiental#0', 'Temperatura Ambiental#1']);
    expect(series[1]).toMatchObject({ indiceColor: 0, ocultarEnLeyenda: true });
    expect(data[1]['Temperatura Ambiental#0']).toBe(21);
    expect(data[2]['Temperatura Ambiental#0']).toBeUndefined();
    expect(data[2]['Temperatura Ambiental#1']).toBe(25);
  });

  it('sin vacíos hay una serie por variable', () => {
    const { series } = buildChart([lectura('2026-10-20T10:00:00Z', 20), lectura('2026-10-20T10:00:00Z', 80, 'Humedad Relativa')]);
    expect(series.map((s) => [s.name, s.indiceColor])).toEqual([['Temperatura Ambiental', 0], ['Humedad Relativa', 1]]);
  });
});
