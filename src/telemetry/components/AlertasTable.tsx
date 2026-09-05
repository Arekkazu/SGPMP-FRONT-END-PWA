import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronRight, BellRing } from 'lucide-react';
import { SeveridadBadge } from './SeveridadBadge';
import { EstadoAlertaPill } from './EstadoAlertaPill';
import { OrigenPill } from './OrigenPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { horaCaptura } from '../lib/sensorEscala';
import type { AlertaSchema } from '../types';

interface Props {
  alertas: AlertaSchema[];
  loading: boolean;
  onAbrir: (id: number) => void;
}

const COLS = ['Tipo de alerta', 'Variable', 'Valor', 'Severidad', 'Reglas', 'Origen', 'Estado', 'Generada', ''];

export function AlertasTable({ alertas, loading, onAbrir }: Props) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 46, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <BellRing size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('alertastable.no_hay_alertas_que_coincidan_con_los_filtros')}</p>
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
          {alertas.map((a) => (
            <tr
              key={a.id_alerta}
              onClick={() => onAbrir(a.id_alerta)}
              style={{ background: 'var(--surface-card)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
            >
              <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{a.tipo_alerta}</td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{a.tipo_variable}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {a.valor != null ? `${a.valor}${a.unidad ? ` ${a.unidad}` : ''}` : '—'}
              </td>
              <td style={TD}><SeveridadBadge severidad={a.severidad} /></td>
              <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {Array.isArray(a.reglas_activas) ? a.reglas_activas.length : 0}
              </td>
              <td style={TD}><OrigenPill origen={a.origen_evento} /></td>
              <td style={TD}><EstadoAlertaPill estado={a.estado_alerta} /></td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {a.fecha_generacion?.slice(0, 10)} {horaCaptura(a.fecha_generacion)}
              </td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
