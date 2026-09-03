import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye, Settings } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import type { UsuarioListadoResponse } from '../types';

interface Props {
  usuarios: UsuarioListadoResponse[];
  loading: boolean;
  onVerDetalle: (idUsuario: number) => void;
  onGestionar: (idUsuario: number, estadoActual: string) => void;
  puedeGestionar: boolean;
}

function estadoVariant(estado: string): 'activo' | 'inactivo' | 'bloqueado' | 'pendiente' | 'eliminado' {
  const map: Record<string, 'activo' | 'inactivo' | 'bloqueado' | 'pendiente' | 'eliminado'> = {
    ACTIVO: 'activo',
    INACTIVO: 'inactivo',
    BLOQUEADO: 'bloqueado',
    PENDIENTE: 'pendiente',
    ELIMINADO: 'eliminado',
  };
  return map[estado.toUpperCase()] ?? 'inactivo';
}

function formatUltimoAcceso(fecha?: string): string {
  if (!fecha) return '—';
  try {
    return formatearFechaHora(fecha, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return fecha;
  }
}

export function UsuariosTable({ usuarios, loading, onVerDetalle, onGestionar, puedeGestionar }: Props) {
  const { t } = useT('usuarios');
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

  if (usuarios.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0' }}>{t('usuariostable.no_se_encontraron_usuarios_con_los_filtros')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {['Usuario', 'Correo electrónico', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
              <th
                key={h}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  textAlign: 'left',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr
              key={u.correo_electronico}
              style={{ borderBottom: '1px solid var(--surface-border)' }}
            >
              <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {u.nombre_usuario}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                {u.correo_electronico}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)' }}>
                <Badge variant={u.nombre_rol.toLowerCase() as any}>{u.nombre_rol}</Badge>
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)' }}>
                <Badge variant={estadoVariant(u.estado_cuenta)}>{u.estado_cuenta}</Badge>
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {formatUltimoAcceso(u.ultimo_acceso)}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)' }}>
                <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVerDetalle(u.id_usuario)}
                    aria-label={`Ver detalle de ${u.nombre_usuario}`}
                  >
                    <Eye size={16} aria-hidden />
                  </Button>
                  {puedeGestionar && u.estado_cuenta.toUpperCase() !== 'ELIMINADO' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGestionar(u.id_usuario, u.estado_cuenta)}
                      aria-label={`Gestionar cuenta de ${u.nombre_usuario}`}
                    >
                      <Settings size={16} aria-hidden />
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
