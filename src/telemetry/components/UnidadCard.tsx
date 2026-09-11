import React from 'react';
import { MapPin, Wifi, WifiOff, AlertOctagon, BellRing } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import { horaCaptura } from '../lib/sensorEscala';
import type { ResumenUnidadSchema } from '../types';

function tonoEstadoGeneral(estado: string): Tono {
  const up = estado.toUpperCase();
  if (up.includes('CRIT') || up.includes('ERROR') || up.includes('ROJO')) return 'error';
  if (up.includes('ADVERT') || up.includes('WARN') || up.includes('AMARILLO')) return 'warning';
  if (up.includes('NORMAL') || up.includes('OK') || up.includes('VERDE')) return 'success';
  return 'neutral';
}

function Contador({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontSize: '12px', color: 'var(--text-secondary)' }} title={etiqueta}>
      <span style={{ color }}>{icon}</span>
      <strong style={{ color: 'var(--text-primary)' }}>{valor}</strong>
    </span>
  );
}

export function UnidadCard({ unidad }: { unidad: ResumenUnidadSchema }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--s4)',
        flexWrap: 'wrap',
        padding: 'var(--s4) var(--s5)',
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', minWidth: 0 }}>
        <div style={{ color: 'var(--brand-500)' }}><MapPin size={18} aria-hidden /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {unidad.nombre_infraestructura}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {unidad.nombre_finca}
            {unidad.ultimo_dato_recibido && ` · último dato ${horaCaptura(unidad.ultimo_dato_recibido)}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <Contador icon={<Wifi size={14} aria-hidden />} valor={unidad.sensores_online} etiqueta="Sensores en línea" color="var(--sem-success)" />
        <Contador icon={<WifiOff size={14} aria-hidden />} valor={unidad.sensores_sin_senal} etiqueta="Sin señal" color="var(--text-muted)" />
        <Contador icon={<AlertOctagon size={14} aria-hidden />} valor={unidad.sensores_con_error} etiqueta="Con error / fuera de rango" color="var(--sem-error)" />
        {unidad.alertas_activas_count > 0 && (
          <Pill tono="error" icon={<BellRing size={12} aria-hidden />}>{unidad.alertas_activas_count} alerta(s)</Pill>
        )}
        <Pill tono={tonoEstadoGeneral(unidad.estado_general)}>{unidad.estado_general}</Pill>
      </div>
    </div>
  );
}
