import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { PowerOff } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import type { TipoAreaResponse } from '../types';

interface Props {
  tipos: TipoAreaResponse[];
  loading: boolean;
  puedeDesactivar: boolean;
  onDesactivar: (tipo: TipoAreaResponse) => void;
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

export function TipoAreaTable({ tipos, loading, puedeDesactivar, onDesactivar }: Props) {
  const { t } = useT('configuration');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (tipos.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s6) 0', fontSize: '13px' }}>{t('tipoareatable.no_hay_tipos_de_area_registrados')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {['#', 'Nombre', 'Estado', 'Acciones'].map((h) => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tipos.map((tipo) => (
            <tr key={tipo.id_tipo_area} style={{ background: 'var(--surface-card)' }}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                #{tipo.id_tipo_area}
              </td>
              <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                {tipo.nombre}
              </td>
              <td style={TD}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)',
                  padding: '2px var(--s2)', borderRadius: 'var(--r-full)',
                  fontSize: '11px', fontWeight: 600,
                  background: tipo.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)',
                  color: tipo.es_activo ? 'var(--sem-success)' : 'var(--text-muted)',
                  border: `1px solid ${tipo.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tipo.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                  {tipo.es_activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style={TD}>
                {puedeDesactivar && tipo.es_activo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDesactivar(tipo)}
                    aria-label={`Desactivar ${tipo.nombre}`}
                  >
                    <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
