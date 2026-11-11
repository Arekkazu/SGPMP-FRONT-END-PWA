// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | INC-M06-297-G34-02 RF-86: un evento suspendido posterior a la última medición deja el activo pendiente |
import { describe, expect, it } from 'vitest';
import { porActivo } from './MedicionView';
import type { ActivoValorado, EventoPendiente, MedicionPeriodo } from '../types';

const activo = (id: number) => ({ id_activo_biologico: id, identificador: `QA-${id}`, valorado_por_costo: false }) as ActivoValorado;
const medida = (id: number, fecha: string) => ({
  id_activo_biologico: id, estado: 'COMPLETADO', fecha_medicion: fecha, tiene_valor_estimado: false,
  valor_razonable_anterior: '100', valor_razonable_actual: '120', variacion_total: '20',
  ganancia_perdida_transformacion: '20', ganancia_perdida_precio_mercado: '0',
}) as unknown as MedicionPeriodo;
const suspendido = (id: number, fecha: string) => ({
  id_activo_biologico: id, id_evento: 966, fecha_evento: fecha, motivo: 'Falta el precio de referencia vigente.',
}) as EventoPendiente;

describe('estado del activo en la medición del período', () => {
  it('un evento suspendido posterior a la última medición deja el activo pendiente', () => {
    const f = porActivo(activo(1), [medida(1, '2026-11-01T10:00:00Z')], [suspendido(1, '2026-11-08T08:00:00Z')]);
    expect(f.estado).toBe('MEDICION_PENDIENTE');
    expect(f.motivo).toBe('Falta el precio de referencia vigente.');
  });

  it('un evento suspendido anterior a la última medición no la invalida', () => {
    const f = porActivo(activo(1), [medida(1, '2026-11-08T10:00:00Z')], [suspendido(1, '2026-11-01T08:00:00Z')]);
    expect(f.estado).toBe('COMPLETADO');
  });

  it('el evento suspendido de otro activo no lo afecta', () => {
    expect(porActivo(activo(2), [medida(2, '2026-11-01T10:00:00Z')], [suspendido(1, '2026-11-08T08:00:00Z')]).estado).toBe('COMPLETADO');
  });

  it('sin mediciones, un evento suspendido también lo deja pendiente', () => {
    expect(porActivo(activo(1), [], [suspendido(1, '2026-11-08T08:00:00Z')]).estado).toBe('MEDICION_PENDIENTE');
  });
});
