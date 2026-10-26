// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 N-02: el historial del modelo solo con sus cambios de estado |
import { describe, expect, it } from 'vitest';
import { transicionesDeEstado } from './transicionesModelo';
import type { EventoAuditoriaM04Response } from '../types';

const evento = (tipo_evento: string, fecha_evento: string, entidad_referencia = 'version_modelo') =>
  ({ id_evento: `${tipo_evento}-${fecha_evento}`, tipo_evento, fecha_evento, entidad_referencia }) as EventoAuditoriaM04Response;

describe('transicionesDeEstado (N-02)', () => {
  it('quita las consultas y el VERSION_APROBADA repetido, y ordena por fecha', () => {
    const resultado = transicionesDeEstado([
      evento('HISTORIAL_CONSULTADO', '2026-10-25T21:00:00Z'),
      evento('VERSION_ACTIVADA', '2026-10-24T10:00:00Z'),
      evento('VERSION_APROBADA', '2026-10-23T10:00:01Z'),
      evento('VERSION_APROBADA', '2026-10-23T10:00:00Z'),
      evento('VERSION_REGISTRADA', '2026-10-22T10:00:00Z'),
      evento('VERSION_APROBADA', '2026-10-22T11:00:00Z', 'despliegue_ota'),
    ]);

    expect(resultado.map((e) => e.tipo_evento)).toEqual(['VERSION_REGISTRADA', 'VERSION_APROBADA', 'VERSION_ACTIVADA']);
  });
});
