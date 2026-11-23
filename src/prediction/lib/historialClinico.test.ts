// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-282..285 RF-106: relación con el evento sanitario, TVCO y grupos de menos de 1 hora |
import { describe, expect, it } from 'vitest';
import { agrupar, relacionar, tasaValidacion } from './historialClinico';
import type { EventoHistorialResponse } from '../types';

const inf = (n: number, fecha: string, retro?: string | string[]): EventoHistorialResponse => ({
  id_evento: `inf-${n}`, tipo_evento: 'INFERENCIA', id_activo_biologico: 1, fecha_evento: fecha, id_resultado_inferencia: `res-${n}`,
  payload: { nivel_riesgo: 1, ...(retro ? { retroalimentacion: retro } : {}) },
} as EventoHistorialResponse);
const san = (n: number, fecha: string, descripcion: string): EventoHistorialResponse => ({
  id_evento: `san-${n}`, tipo_evento: 'EVENTO_SANITARIO', id_activo_biologico: 1, fecha_evento: fecha, id_resultado_inferencia: null,
  payload: { descripcion },
} as EventoHistorialResponse);

describe('historial clínico (RF-106)', () => {
  const eventos = [
    inf(1, '2026-08-14T13:00:00Z', 'CORRECTO'), san(1, '2026-08-14T23:00:00Z', 'Mastitis clínica'),
    inf(2, '2026-09-02T13:00:00Z', 'PARCIAL'), san(2, '2026-09-02T13:40:00Z', 'Fiebre'),
    inf(3, '2026-09-20T13:00:00Z', 'INCORRECTO'), inf(4, '2026-10-05T13:00:00Z', 'SIN_EVENTO'),
    inf(5, '2026-10-18T13:00:00Z', ['CORRECTO', 'INCORRECTO']), inf(6, '2026-11-01T13:00:00Z'),
    { id_evento: 'ret-6', tipo_evento: 'RETROALIMENTACION', id_activo_biologico: 1, fecha_evento: '2026-11-02T13:00:00Z',
      id_resultado_inferencia: 'res-6', payload: { estado_retroalimentacion: 'CORRECTO', es_conflicto_retroalimentacion: false } } as EventoHistorialResponse,
    inf(7, '2026-11-12T13:00:00Z'),
  ];
  const r = relacionar(eventos);

  it('relaciona el evento sanitario con la inferencia anterior y dice cuánto después', () => {
    expect(r.get('inf-1')?.sanitario).toEqual({ descripcion: 'Mastitis clínica', minutos: 600 });
    expect(r.get('inf-2')?.sanitario?.minutos).toBe(40);
    expect(r.get('inf-3')?.sanitario).toBeNull();
  });

  it('toma la retroalimentación de la inferencia o de su evento y marca el conflicto', () => {
    expect(r.get('inf-5')?.conflicto).toBe(true);
    expect(r.get('inf-6')?.retros).toEqual(['CORRECTO']);
    expect(r.get('inf-7')?.retros).toEqual([]);
  });

  it('TVCO = correctas / retroalimentadas sin conflicto; sin retroalimentación no hay tasa', () => {
    expect(tasaValidacion(r.values())).toEqual({ tasa: 2 / 5, correctas: 2, validadas: 5, excluidas: 1, pendientes: 1 });
    expect(tasaValidacion([{ retros: [], conflicto: false, sanitario: null }]).tasa).toBeNull();
  });

  it('agrupa los eventos seguidos a menos de una hora', () => {
    expect(agrupar([...eventos].reverse()).map((g) => g.length)).toEqual([1, 1, 1, 1, 1, 1, 2, 1, 1]);
  });
});
