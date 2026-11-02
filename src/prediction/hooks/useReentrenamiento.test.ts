// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-12 RF-71: calibración por animal con su última inferencia y su versión vigente |
import { describe, expect, it } from 'vitest';
import { calibracionPorAnimal } from './useReentrenamiento';
import type { InferenciaMonitorResponse, VersionModeloResponse } from '../types';

const inf = (id: number, contexto: boolean, fecha: string) => ({
  id_activo_biologico: id, identificador_activo: `BOV-00${id}`, contexto_incompleto: contexto, fecha_inferencia: fecha, nombre_version: 'generica',
}) as InferenciaMonitorResponse;
const ver = (id: number, animal: number, estado: string, nombre: string) => ({
  id_version_modelo: id, id_activo_biologico: animal, estado_version: estado, nombre_version: nombre,
}) as VersionModeloResponse;

describe('calibracionPorAnimal', () => {
  it('una fila por animal, los que calibran primero, con la versión activa sobre la de prueba', () => {
    const filas = calibracionPorAnimal(
      [inf(4, false, '2026-11-02T10:00:00Z'), inf(4, true, '2026-11-02T09:00:00Z'), inf(5, true, '2026-11-02T10:00:00Z')],
      [ver(1, 4, 'SOMBRA', 'bov4-sombra'), ver(2, 4, 'ACTIVO', 'bov4-v2'), ver(3, 5, 'RECHAZADO', 'bov5-x')],
    );
    expect(filas.map((f) => [f.animal, f.calibrando, f.version])).toEqual([
      ['BOV-005', true, 'generica'],
      ['BOV-004', false, 'bov4-v2'],
    ]);
  });
});
