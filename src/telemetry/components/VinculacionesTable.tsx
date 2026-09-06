import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { ChevronRight, Link2 } from 'lucide-react';
import { EstadoVinculacionPill } from './EstadoVinculacionPill';
import { MecanismoPill } from './MecanismoPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { VinculacionLecturaSchema } from '../types';

const COLS = ['ID Vinc.', 'Lectura', 'Modelo manejo', 'Activo', 'Infra', 'Mecanismo', 'Estado', ''];

interface Props {
  items: VinculacionLecturaSchema[];
  loading: boolean;
  onAbrir: (v: VinculacionLecturaSchema) => void;
}

export function VinculacionesTable({ items, loading, onAbrir }: Props) {
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
        <Link2 size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>{t('vinculacionestable.no_hay_vinculaciones_que_coincidan_con_los')}</p>
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
          {items.map((v) => (
            <tr
              key={v.id_vinculacion_lectura}
              onClick={() => onAbrir(v)}
              style={{ background: 'var(--surface-card)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
            >
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>#{v.id_vinculacion_lectura}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>#{v.id_telemetria}</td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{v.modelo_manejo || '—'}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v.id_activo_biologico != null ? `#${v.id_activo_biologico}` : '—'}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '12px' }}>#{v.id_infraestructura}</td>
              <td style={TD}><MecanismoPill mecanismo={v.mecanismo_vinculacion} /></td>
              <td style={TD}><EstadoVinculacionPill estado={v.estado_vinculacion} /></td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
