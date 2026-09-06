import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { History } from 'lucide-react';
import { SemaforoPill } from './SemaforoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { horaCaptura } from '../lib/sensorEscala';
import type { LecturaHistoricaSchema } from '../types';

const COLS = ['Capturado', 'Sensor', 'Variable', 'Valor', 'Ajustado', 'Semáforo', 'Estado', 'Origen', 'Alerta'];

export function HistorialTable({ items, loading }: { items: LecturaHistoricaSchema[]; loading: boolean }) {
  const { t } = useT('telemetry');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 42, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        <History size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('historialtable.sin_lecturas_para_el_rango_y_filtros')}</p>
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
          {items.map((it) => (
            <tr key={it.id_telemetria} style={{ background: 'var(--surface-card)' }}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {it.timestamp_captura?.slice(0, 10)} {horaCaptura(it.timestamp_captura)}
              </td>
              <td style={{ ...TD, color: 'var(--text-primary)', fontSize: '12px' }}>{it.nombre_sensor}</td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{it.tipo_variable}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {it.valor != null ? `${it.valor} ${it.unidad_medida}` : '—'}
              </td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {it.valor_ajustado != null ? it.valor_ajustado : '—'}
              </td>
              <td style={TD}><SemaforoPill estado={it.estado_semaforo_historico} /></td>
              <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{it.estado_calidad}</td>
              <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{it.origen_dato}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: it.id_alerta != null ? 'var(--sem-error)' : 'var(--text-muted)' }}>
                {it.id_alerta != null ? `#${it.id_alerta}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
