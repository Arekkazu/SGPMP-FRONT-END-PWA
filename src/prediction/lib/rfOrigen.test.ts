// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-73: RF de origen a partir del tipo de evento |
import { describe, expect, it } from 'vitest';
import { rfDeEvento } from './rfOrigen';

describe('rfDeEvento', () => {
  it('asigna cada evento conocido del backend a su RF', () => {
    expect(rfDeEvento('CATALOGO_PATOLOGIA_AGREGADA')).toBe('RF-64');
    expect(rfDeEvento('CONFIGURACION_MOTOR_CAMBIADA')).toBe('RF-65');
    expect(rfDeEvento('HISTORIAL_CONSULTADO')).toBe('RF-67');
    expect(rfDeEvento('VERSION_ACTIVADA')).toBe('RF-69');
    expect(rfDeEvento('HASH_INVALIDO_DETECTADO')).toBe('RF-69');
    expect(rfDeEvento('CONFLICTO_RETROALIMENTACION')).toBe('RF-72');
    expect(rfDeEvento('EXPORTACION_GENERADA')).toBe('RF-73');
  });
  it('un tipo desconocido no se inventa RF', () => {
    expect(rfDeEvento('ALGO_NUEVO')).toBeNull();
  });
});
