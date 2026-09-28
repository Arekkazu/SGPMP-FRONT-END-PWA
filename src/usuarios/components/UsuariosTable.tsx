import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye, Settings } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { varianteRol, varianteEstado } from '../../shared/lib/varianteBadge';
import type { UsuarioListadoResponse } from '../types';

interface Props {
  usuarios: UsuarioListadoResponse[];
  loading: boolean;
  onVerDetalle: (idUsuario: number) => void;
  onGestionar: (idUsuario: number, estadoActual: string) => void;
  puedeGestionar: boolean;
}

const TH_STYLE: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontSize: 'var(--fs-label-sm)',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

const CABECERAS = [
  { clave: 'usuariospage.usuarios', id: 'usuario' },
  { clave: 'usuariospage.correo', id: 'correo' },
  { clave: 'usuariospage.rol', id: 'rol' },
  { clave: 'usuariospage.estado', id: 'estado' },
  { clave: 'usuariostable.ultima_modificacion', id: 'ultima-modificacion' },
  { clave: 'usuariostable.acciones', id: 'acciones' },
];

function formatUltimaModificacion(fecha?: string): string {
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
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--s7) 0' }}>{t('usuariostable.no_se_encontraron_usuarios_con_los_filtros')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {CABECERAS.map(({ clave, id }) => (
              <th
                key={id}
                scope="col"
                id={`th-${id}`}
                style={TH_STYLE}
              >
                {t(clave)}
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
              <td headers="th-usuario" style={{ padding: 'var(--s3) var(--s4)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {u.nombre_usuario}
              </td>
              <td headers="th-correo" style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mono-md)' }}>
                {u.correo_electronico}
              </td>
              <td headers="th-rol" style={{ padding: 'var(--s3) var(--s4)' }}>
                <Badge variant={varianteRol(u.nombre_rol)}>{u.nombre_rol}</Badge>
              </td>
              <td headers="th-estado" style={{ padding: 'var(--s3) var(--s4)' }}>
                <Badge variant={varianteEstado(u.estado_cuenta)}>{u.estado_cuenta}</Badge>
              </td>
              <td headers="th-ultima-modificacion" style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)' }}>
                {formatUltimaModificacion(u.ultima_modificacion)}
              </td>
              <td headers="th-acciones" style={{ padding: 'var(--s3) var(--s4)' }}>
                <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVerDetalle(u.id_usuario)}
                    aria-label={t('usuariostable.ver_detalle_de', { nombre: u.nombre_usuario })}
                  >
                    <Eye size={16} aria-hidden />
                  </Button>
                  {puedeGestionar && u.estado_cuenta.toUpperCase() !== 'ELIMINADO' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGestionar(u.id_usuario, u.estado_cuenta)}
                      aria-label={t('usuariostable.gestionar_cuenta_de', { nombre: u.nombre_usuario })}
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
