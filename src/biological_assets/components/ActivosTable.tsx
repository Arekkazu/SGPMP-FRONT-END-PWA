import React from 'react';
import { ChevronRight, Boxes, User } from 'lucide-react';
import { EstadoPill } from './EstadoPill';
import type { ActivoListItem } from '../types';

interface Props {
  activos: ActivoListItem[];
  loading: boolean;
  onAbrir: (id: number) => void;
}

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
};

export function ActivosTable({ activos, loading, onAbrir }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 48,
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-hover)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (activos.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          padding: 'var(--s8) var(--s4)',
          fontSize: '14px',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--r-lg)',
        }}
      >
        <Boxes size={32} aria-hidden style={{ opacity: 0.5, marginBottom: 'var(--s3)' }} />
        <p style={{ margin: 0 }}>No hay activos biológicos que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {['Identificador', 'Tipo', 'Especie', 'Estado', 'Infraestructura', ''].map((h, i) => (
              <th key={i} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activos.map((a) => (
            <tr
              key={a.id_activo_biologico}
              onClick={() => onAbrir(a.id_activo_biologico)}
              style={{ background: 'var(--surface-card)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
            >
              <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {a.identificador ?? (
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    #{a.id_activo_biologico}
                  </span>
                )}
              </td>
              <td style={TD}>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)',
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)',
                  }}
                >
                  {String(a.tipo) === 'POBLACIONAL'
                    ? <Boxes size={13} aria-hidden />
                    : <User size={13} aria-hidden />}
                  {String(a.tipo) === 'POBLACIONAL' ? 'Poblacional' : 'Individual'}
                </span>
              </td>
              <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {a.nombre_especie ?? `Especie #${a.id_especie}`}
              </td>
              <td style={TD}>
                <EstadoPill estado={a.nombre_estado} />
              </td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>
                {a.nombre_infraestructura ?? '—'}
              </td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}>
                <ChevronRight size={16} aria-hidden />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
