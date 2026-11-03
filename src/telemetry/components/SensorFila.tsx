// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: sensor en rango o sin datos como fila compacta |
import React from 'react';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { EstadoSensorPills } from './EstadoLecturaPill';
import { momentoCaptura, valorConUnidad } from '../lib/sensorEscala';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import type { EstadoSensorSchema } from '../types';

/**
 * Prototipo 13.4: el medidor se reserva para lo que está fuera o cerca del límite;
 * lo que va bien se lee en una línea. Abre el mismo detalle que la tarjeta.
 */
export function SensorFila({ sensor, onAbrir }: { sensor: EstadoSensorSchema; onAbrir: (s: EstadoSensorSchema) => void }) {
  return (
    <OptionCard
      onClick={() => onAbrir(sensor)}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', padding: 'var(--s2) var(--s4)', borderRadius: 'var(--r-md)' }}
    >
      <span style={{ flex: '1 1 180px', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sensor.nombre_sensor}
        </span>
        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
          {etiquetaCodigo(sensor.tipo_variable)} · {momentoCaptura(sensor.ultimo_timestamp_captura)}
        </span>
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {valorConUnidad(sensor.ultimo_valor, sensor.ultima_unidad)}
      </span>
      <EstadoSensorPills sensor={sensor} />
    </OptionCard>
  );
}
