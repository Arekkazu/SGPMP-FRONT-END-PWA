// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 N-02: el historial del modelo solo con sus cambios de estado |
// | 2026-10-29 | Arekkazu | QA-M04-27-10 CU05 H-09 RF-69: las notas no aparecen como Aprobada |
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

  it('una nota guardada como VERSION_APROBADA no es una transición (CU05 H-09)', () => {
    const nota = { ...evento('VERSION_APROBADA', '2026-10-26T22:02:00Z'), payload_evento: { accion: 'NOTAS_REGISTRADAS', estado_version: 'RECHAZADO' } } as EventoAuditoriaM04Response;
    const resultado = transicionesDeEstado([evento('VERSION_RECHAZADA', '2026-10-21T10:00:00Z'), nota, evento('NOTAS_REGISTRADAS', '2026-10-29T10:00:00Z')]);
    expect(resultado.map((e) => e.tipo_evento)).toEqual(['VERSION_RECHAZADA']);
  });
});
