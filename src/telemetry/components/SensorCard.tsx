import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { BatteryMedium, SignalHigh, TrendingUp, TrendingDown, Minus, BellRing } from 'lucide-react';
import { Gauge } from '../../shared/design-system/Gauge';
import { SemaforoPill } from './SemaforoPill';
import { semaforoToGauge, escalaNominal, horaCaptura } from '../lib/sensorEscala';
import type { EstadoSensorSchema } from '../types';

interface Props {
  sensor: EstadoSensorSchema;
  onAbrir: (sensor: EstadoSensorSchema) => void;
}

function Tendencia({ tendencia }: { tendencia: string | null }) {
  const { t } = useT('telemetry');
  const up = (tendencia ?? '').toUpperCase();
  if (up.includes('SUB') || up.includes('ASC') || up === 'UP') {
    return <TrendingUp size={14} aria-label={t('sensorcard.tendencia_al_alza')} style={{ color: 'var(--sem-warning)' }} />;
  }
  if (up.includes('BAJ') || up.includes('DESC') || up === 'DOWN') {
    return <TrendingDown size={14} aria-label={t('sensorcard.tendencia_a_la_baja')} style={{ color: 'var(--sem-info)' }} />;
  }
  return <Minus size={14} aria-label={t('sensorcard.tendencia_estable')} style={{ color: 'var(--text-muted)' }} />;
}

export function SensorCard({ sensor, onAbrir }: Props) {
  const { t } = useT('telemetry');
  const { min, max } = escalaNominal(sensor.tipo_variable);
  const status = semaforoToGauge(sensor.estado_semaforo);

  return (
    <button
      type="button"
      onClick={() => onAbrir(sensor)}
      style={{
        textAlign: 'left',
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s4)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
        minWidth: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand-400)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--surface-border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sensor.nombre_sensor}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sensor.tipo_variable}</div>
        </div>
        {sensor.id_alerta != null && (
          <BellRing size={14} aria-label={t('sensorcard.alerta_activa_asociada')} style={{ color: 'var(--sem-error)', flexShrink: 0 }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Gauge value={sensor.ultimo_valor} min={min} max={max} unit={sensor.ultima_unidad} status={status} size={120} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SemaforoPill estado={sensor.estado_semaforo} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', gap: 'var(--s2)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)' }}>
          <BatteryMedium size={13} aria-hidden />
          {sensor.nivel_bateria_pct != null ? `${sensor.nivel_bateria_pct}%` : '—'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)' }} title="Señal LoRaWAN (RSSI)">
          <SignalHigh size={13} aria-hidden />
          {sensor.calidad_senal_rssi != null ? `${sensor.calidad_senal_rssi} dBm` : '—'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)' }}>
          <Tendencia tendencia={sensor.tendencia} />
        </span>
      </div>

      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center' }}>
        {horaCaptura(sensor.ultimo_timestamp_captura)}
        {sensor.dato_desactualizado && ' · desactualizado'}
      </div>
    </button>
  );
}
