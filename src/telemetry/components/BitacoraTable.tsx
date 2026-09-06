import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ClipboardList } from 'lucide-react';
import { SeveridadLogPill } from './SeveridadLogPill';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { horaCaptura } from '../lib/sensorEscala';
import type { EventoAuditoriaIotSchema } from '../types';

const COLS = ['Fecha', 'Tipo de evento', 'Módulo', 'Entidad', 'Usuario', 'Resultado', 'Severidad', 'Clasif.', 'Hash'];

function tonoResultado(r: string): Tono {
  const up = r.toUpperCase();
  if (up === 'EXITOSO') return 'success';
  if (up === 'FALLIDO' || up === 'RECHAZADO') return 'error';
  if (up === 'PARCIAL') return 'warning';
  return 'neutral';
}

function clasif(c: string): { label: string; tono: Tono } {
  const up = c.toUpperCase();
  if (up.includes('NIC')) return { label: 'NIC 41', tono: 'info' };
  if (up.includes('TECNIC')) return { label: 'Técnico', tono: 'neutral' };
  return { label: c, tono: 'neutral' };
}

interface Props {
  items: EventoAuditoriaIotSchema[];
  loading: boolean;
  onAbrir: (item: EventoAuditoriaIotSchema) => void;
}

export function BitacoraTable({ items, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <ClipboardList size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('bitacoratable.sin_eventos_de_auditoria_para_los_filtros')}</p>
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((ev) => {
            const cl = clasif(ev.clasificacion_registro);
            return (
              <tr
                key={ev.id_evento}
                onClick={() => onAbrir(ev)}
                style={{ background: 'var(--surface-card)', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
              >
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {ev.fecha_hora?.slice(0, 10)} {horaCaptura(ev.fecha_hora)}
                </td>
                <td style={{ ...TD, color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>{ev.tipo_evento}</td>
                <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{ev.modulo}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {ev.entidad_afectada_tipo ? `${ev.entidad_afectada_tipo}${ev.entidad_afectada_id ? ` #${ev.entidad_afectada_id}` : ''}` : '—'}
                </td>
                <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{ev.nombre_usuario ?? (ev.id_usuario != null ? `#${ev.id_usuario}` : '—')}</td>
                <td style={TD}><Pill tono={tonoResultado(ev.resultado)}>{ev.resultado}</Pill></td>
                <td style={TD}><SeveridadLogPill severidad={ev.severidad_log} /></td>
                <td style={TD}><Pill tono={cl.tono}>{cl.label}</Pill></td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }} title={ev.hash_integridad}>
                  {ev.hash_integridad ? `${ev.hash_integridad.slice(0, 10)}…` : '—'}
                  {ev.registro_incompleto && <div style={{ color: 'var(--sem-warning)' }}>incompleto</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
