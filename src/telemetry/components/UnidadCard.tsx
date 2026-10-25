// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22/M3-11: plurales, contadores con texto, semáforo legible y día del último dato |
import React from 'react';
import { MapPin, Wifi, WifiOff, AlertOctagon, BellRing } from 'lucide-react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Pill } from './Pill';
import { SemaforoPill } from './SemaforoPill';
import { momentoCaptura } from '../lib/sensorEscala';
import type { ResumenUnidadSchema } from '../types';

/** M3-11: el número va con su texto ("3 en línea"); antes solo había ícono y un `title`. */
function Contador({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontSize: '12px', color: 'var(--text-secondary)' }}>
      <span style={{ color, display: 'inline-flex' }}>{icon}</span>
      <strong style={{ color: 'var(--text-primary)' }}>{formatearNumero(valor)}</strong>
      {etiqueta}
    </span>
  );
}

export function UnidadCard({ unidad }: { unidad: ResumenUnidadSchema }) {
  const { t } = useT('telemetry');
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
            {unidad.ultimo_dato_recibido && ` · último dato ${momentoCaptura(unidad.ultimo_dato_recibido)}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <Contador icon={<Wifi size={14} aria-hidden />} valor={unidad.sensores_online} etiqueta="en línea" color="var(--sem-success)" />
        <Contador icon={<WifiOff size={14} aria-hidden />} valor={unidad.sensores_sin_senal} etiqueta="sin señal" color="var(--text-muted)" />
        <Contador icon={<AlertOctagon size={14} aria-hidden />} valor={unidad.sensores_con_error} etiqueta="con error o fuera de rango" color="var(--sem-error)" />
        {unidad.alertas_activas_count > 0 && (
          <Pill tono="error" icon={<BellRing size={12} aria-hidden />}>{t('conteo.alertas_activas', { count: unidad.alertas_activas_count, n: formatearNumero(unidad.alertas_activas_count) })}</Pill>
        )}
        <SemaforoPill estado={unidad.estado_general} />
      </div>
    </div>
  );
}
