// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-11: el último dato muestra el día cuando no es de hoy + T-19 códigos legibles |
// | 2026-10-26 | Leandro | ISSUE-678 G87 RF-58: distinguir la referencia válida de la condición posterior del sensor. |
// | 2026-10-31 | Claude   | INC-M03-246-G88 RF-58: valor de la lectura actual cuando está fuera de rango |
import React from 'react';
import './ReferenciaValida.css';
import { useT } from '../../shared/i18n/useT';
import { BatteryMedium, SignalHigh, TrendingUp, TrendingDown, Minus, BellRing } from 'lucide-react';
import { Gauge } from '../../shared/design-system/Gauge';
import { EstadoSensorPills } from './EstadoLecturaPill';
import { semaforoToGauge, escalaNominal, momentoCaptura } from '../lib/sensorEscala';
import type { EstadoSensorSchema } from '../types';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

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
    <OptionCard
      onClick={() => onAbrir(sensor)}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', minWidth: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sensor.nombre_sensor}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{etiquetaCodigo(sensor.tipo_variable)}</div>
        </div>
        {sensor.id_alerta != null && (
          <BellRing size={14} aria-label={t('sensorcard.alerta_activa_asociada')} style={{ color: 'var(--sem-error)', flexShrink: 0 }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Gauge value={sensor.ultimo_valor} min={min} max={max} unit={sensor.ultima_unidad} status={status} size={120} />
      </div>

      {sensor.indicador_anomalia && sensor.es_valor_operativo && (
        <small className="sensor-referencia-valida">{t('estadolectura.ultima_lectura_valida')}</small>
      )}
      {/* G88 (RF-58): el semáforo se calcula con la lectura actual, aunque esté fuera de rango. */}
      {sensor.estado_calidad === 'FUERA_DE_RANGO' && sensor.valor_condicion_actual != null && (
        <small className="sensor-referencia-valida">
          {t('estadolectura.lectura_actual', { valor: Number(sensor.valor_condicion_actual), unidad: sensor.ultima_unidad ?? '' })}
        </small>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* FE-10 (RF-58 E7/R2/E2): GRIS sin umbral e indicador de anomalía. */}
        <EstadoSensorPills sensor={sensor} />
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
        {momentoCaptura(sensor.ultimo_timestamp_captura)}
        {sensor.dato_desactualizado && ' · desactualizado'}
      </div>
    </OptionCard>
  );
}
