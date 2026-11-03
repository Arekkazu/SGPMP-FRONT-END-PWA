// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: titular del área y sensores sin datos |
import { describe, expect, it } from 'vitest';
import { porGravedad, sinDatos, titularArea } from './enVivo';
import type { EstadoSensorSchema } from '../types';

const sensor = (id: number, estado_semaforo: string, extra: Partial<EstadoSensorSchema> = {}) =>
  ({ id_sensor: id, estado_semaforo, ultimo_valor: 7, ultimo_timestamp_captura: '2026-10-29T10:00:00Z', ...extra }) as EstadoSensorSchema;

describe('En vivo (prototipo 13.4)', () => {
  it('ordena rojo, amarillo, gris y verde', () => {
    const orden = [sensor(1, 'VERDE'), sensor(2, 'GRIS'), sensor(3, 'ROJO'), sensor(4, 'AMARILLO')].sort(porGravedad);
    expect(orden.map((s) => s.id_sensor)).toEqual([3, 4, 2, 1]);
  });

  it('GRIS sin umbral no es "sin datos": el sensor reporta (RF-58 E7)', () => {
    expect(sinDatos(sensor(1, 'GRIS', { sin_umbral: true }))).toBe(false);
    expect(sinDatos(sensor(2, 'GRIS'))).toBe(true);
    expect(sinDatos(sensor(3, 'VERDE', { ultimo_valor: null }))).toBe(true);
  });

  it('el titular es el peor sensor con datos', () => {
    const t = titularArea([sensor(1, 'VERDE'), sensor(2, 'AMARILLO'), sensor(3, 'GRIS'), sensor(4, 'ROJO')]);
    expect(t).toEqual({ tipo: 'problema', sensor: expect.objectContaining({ id_sensor: 4 }) });
  });

  it('todo en verde o sin umbral: en rango', () => {
    expect(titularArea([sensor(1, 'VERDE'), sensor(2, 'GRIS', { sin_umbral: true })])).toEqual({ tipo: 'en_rango' });
  });

  it('sin datos en todos: dice desde cuándo', () => {
    const t = titularArea([
      sensor(1, 'GRIS', { ultimo_timestamp_captura: '2026-10-15T08:00:00Z' }),
      sensor(2, 'GRIS', { ultimo_timestamp_captura: '2026-10-16T08:00:00Z' }),
    ]);
    expect(t).toEqual({ tipo: 'sin_datos', desde: '2026-10-16T08:00:00Z' });
  });

  it('sin sensores', () => {
    expect(titularArea([])).toEqual({ tipo: 'sin_sensores' });
  });
});
