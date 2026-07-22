import React from 'react';
import { Pencil, PowerOff, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import type { EspecieResponse } from '../types';

interface Props {
  especies: EspecieResponse[];
  loading: boolean;
  puedeEditar: boolean;
  puedeDesactivar: boolean;
  onEditar: (especie: EspecieResponse) => void;
  onDesactivar: (especie: EspecieResponse) => void;
  onReactivar: (especie: EspecieResponse) => void;
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

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

export function EspeciesTable({
  especies,
  loading,
  puedeEditar,
  puedeDesactivar,
  onEditar,
  onDesactivar,
  onReactivar,
}: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 5 }).map((_, i) => (
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

  if (especies.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
        No hay especies registradas.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {['#', 'Nombre', 'Descripción', 'Estado', 'Actualizado', 'Acciones'].map((h) => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {especies.map((e) => (
            <tr key={e.id_especie} style={{ background: 'var(--surface-card)' }}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                #{e.id_especie}
              </td>
              <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {e.nombre}
              </td>
              <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px', maxWidth: 260 }}>
                <span
                  style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={e.descripcion ?? undefined}
                >
                  {e.descripcion ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}
                </span>
              </td>
              <td style={TD}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--s1)',
                    padding: '2px var(--s2)',
                    borderRadius: 'var(--r-full)',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: e.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)',
                    color: e.es_activo ? 'var(--sem-success)' : 'var(--text-muted)',
                    border: `1px solid ${e.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: e.es_activo ? 'var(--sem-success)' : 'var(--text-muted)',
                    }}
                  />
                  {e.es_activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {formatFecha(e.fecha_actualizacion)}
              </td>
              <td style={TD}>
                <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                  {puedeEditar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditar(e)}
                      aria-label={`Editar ${e.nombre}`}
                    >
                      <Pencil size={15} aria-hidden />
                    </Button>
                  )}
                  {puedeDesactivar && e.es_activo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDesactivar(e)}
                      aria-label={`Desactivar ${e.nombre}`}
                    >
                      <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                    </Button>
                  )}
                  {puedeDesactivar && !e.es_activo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReactivar(e)}
                      aria-label={`Reactivar ${e.nombre}`}
                    >
                      <RefreshCw size={15} aria-hidden style={{ color: 'var(--sem-success)' }} />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
