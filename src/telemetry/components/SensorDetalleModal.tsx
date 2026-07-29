import React from 'react';
import { ModalShell } from './ModalShell';
import { SemaforoPill } from './SemaforoPill';
import { SeveridadBadge } from './SeveridadBadge';
import { Pill } from './Pill';
import { horaCaptura, sinReporte } from '../lib/sensorEscala';
import type { EstadoSensorSchema } from '../types';

interface Props {
  sensor: EstadoSensorSchema;
  onClose: () => void;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

export function SensorDetalleModal({ sensor, onClose }: Props) {
  return (
    <ModalShell title={`Detalle del sensor · ${sensor.nombre_sensor}`} onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {sensor.ultimo_valor ?? '—'}
        </span>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{sensor.ultima_unidad}</span>
        <span style={{ marginLeft: 'auto' }}><SemaforoPill estado={sensor.estado_semaforo} /></span>
      </div>

      <div>
        <Fila label="Variable medida">{sensor.tipo_variable}</Fila>
        <Fila label="Categoría">{sensor.categoria_variable}</Fila>
        <Fila label="Estado de calidad">{sensor.estado_calidad || '—'}</Fila>
        <Fila label="Estado de desviación">{sensor.estado_desviacion || '—'}</Fila>
        <Fila label="Conectividad">{sensor.estado_conectividad || '—'}</Fila>
        <Fila label="Batería">{sensor.nivel_bateria_pct != null ? `${sensor.nivel_bateria_pct}%` : '—'}</Fila>
        <Fila label="Señal LoRaWAN (RSSI)">{sensor.calidad_senal_rssi != null ? `${sensor.calidad_senal_rssi} dBm` : '—'}</Fila>
        <Fila label="SNR">{sensor.calidad_senal_snr != null ? `${sensor.calidad_senal_snr} dB` : '—'}</Fila>
        <Fila label="Tendencia">{sensor.tendencia ?? '—'}</Fila>
        <Fila label="Última lectura">{horaCaptura(sensor.ultimo_timestamp_captura)}</Fila>
        <Fila label="Sin reporte">{sinReporte(sensor.tiempo_sin_reporte_min)}</Fila>
        <Fila label="Unidad productiva">{sensor.nombre_infraestructura}</Fila>
        <Fila label="Finca">{sensor.nombre_finca}</Fila>
        <Fila label="Alerta activa asociada">
          {sensor.id_alerta != null ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}>
              <Pill tono="error">#{sensor.id_alerta}</Pill>
              {sensor.severidad_alerta && <SeveridadBadge severidad={sensor.severidad_alerta} />}
            </span>
          ) : '—'}
        </Fila>
        <Fila label="Dispositivo IoT">#{sensor.id_dispositivo_iot}</Fila>
      </div>
    </ModalShell>
  );
}
