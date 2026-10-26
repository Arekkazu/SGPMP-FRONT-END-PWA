// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-05/M3-06: historial sin pasos repetidos y umbral superado |
import { describe, expect, it } from 'vitest';
import { motivoLegible, sinPasosRepetidos, umbralDeAlerta } from './detalleAlerta';
import '../../shared/i18n';
import type { HistoricoEstadoAlertaSchema } from '../types';

const paso = (anterior: string, nuevo: string, extra: Partial<HistoricoEstadoAlertaSchema> = {}): HistoricoEstadoAlertaSchema => ({
  id_historico_estado_alerta: null, id_alerta: 43, estado_anterior: anterior, estado_nuevo: nuevo,
  fecha_cambio: '2026-10-22T04:26:00Z', id_usuario: null, motivo: null, ...extra,
});

describe('sinPasosRepetidos (M3-05)', () => {
  it('deja un solo "Activa → En atención" y conserva su nota y su autor', () => {
    const resultado = sinPasosRepetidos([
      paso('ACTIVA', 'ACTIVA'),
      paso('ACTIVA', 'EN_ATENCION'),
      paso('ACTIVA', 'EN_ATENCION', { motivo: 'QA nota', id_usuario: 137, nombre_usuario: 'Camila' }),
      paso('EN_ATENCION', 'RESUELTA'),
    ]);

    expect(resultado.map((p) => `${p.estado_anterior}>${p.estado_nuevo}`)).toEqual([
      'ACTIVA>ACTIVA', 'ACTIVA>EN_ATENCION', 'EN_ATENCION>RESUELTA',
    ]);
    expect(resultado[1]).toMatchObject({ motivo: 'QA nota', nombre_usuario: 'Camila' });
  });
});

describe('umbralDeAlerta (M3-06)', () => {
  it('da el rango normal del umbral RF-17 o, si no hay, la regla', () => {
    expect(umbralDeAlerta({ niveles_rf17: [
      { nivel: 'critico', limite_inferior: '30', limite_superior: '40' },
      { nivel: 'normal', limite_inferior: '22', limite_superior: '26' },
    ] })).toEqual({ rangoNormal: ['22', '26'] });
    expect(umbralDeAlerta({ regla: 'CA > 5.0 (CRITICA)' })).toEqual({ regla: 'CA > 5.0 (CRITICA)' });
    expect(umbralDeAlerta({})).toBeNull();
  });
});

describe('motivoLegible (T-19)', () => {
  it('convierte el motivo de alta del trigger en el origen legible y deja los demás', () => {
    expect(motivoLegible('Alerta creada · origen=BACKEND')).toBe('Servidor');
    expect(motivoLegible('Revisar aireación')).toBe('Revisar aireación');
    expect(motivoLegible(null)).toBeNull();
  });
});
