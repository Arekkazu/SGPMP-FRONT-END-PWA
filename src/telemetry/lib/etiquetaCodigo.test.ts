// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-19/T-22: códigos legibles y valores con 2 decimales |
import { describe, expect, it } from 'vitest';
import '../../shared/i18n';
import { etiquetaCodigo } from './etiquetaCodigo';
import { valorConUnidad } from './sensorEscala';

describe('etiquetaCodigo (T-19)', () => {
  it('usa el catálogo y, si no hay entrada, humaniza', () => {
    expect(etiquetaCodigo('TIEMPO_REAL')).toBe('Tiempo real');
    expect(etiquetaCodigo('OTRO_CODIGO_NUEVO')).toBe('Otro codigo nuevo');
    expect(etiquetaCodigo(null)).toBe('—');
  });

  it('describe los eventos post-commit de la bitácora', () => {
    expect(etiquetaCodigo('POSTCOMMIT_RF62_FALLIDO')).toBe('Falló el proceso de evaluación de calidad');
    expect(etiquetaCodigo('POSTCOMMIT_HEARTBEAT_ALERTAS_COMPLETADO')).toBe('Proceso de alertas por heartbeat completado');
  });
});

describe('valorConUnidad (T-22)', () => {
  it('máximo 2 decimales con el separador del idioma', () => {
    expect(valorConUnidad('11.8300', 'mg/L')).toBe('11,83 mg/L');
    expect(valorConUnidad(26.5, '°C')).toBe('26,5 °C');
    expect(valorConUnidad(null, '°C')).toBe('—');
  });
});
