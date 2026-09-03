import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import type { RolConPermisosResponse } from '../types';

interface Props {
  roles: RolConPermisosResponse[];
  loading: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  onEditar: (rol: RolConPermisosResponse) => void;
  onEliminar: (rol: RolConPermisosResponse) => void;
}

export function RolesTable({ roles, loading, puedeEditar, puedeEliminar, onEditar, onEliminar }: Props) {
  const { t } = useT('roles');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0' }}>{t('rolestable.no_hay_roles_configurados')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {['Nombre del rol', 'Descripción', 'Permisos', 'Usuarios', 'Acciones'].map((h) => (
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
          {roles.map((r) => {
            const tieneUsuarios = (r.count_usuarios ?? 0) > 0;
            const puedeEliminarEste = puedeEliminar && !r.es_protegido && !tieneUsuarios;
            const tooltipEliminar = r.es_protegido
              ? 'El rol Administrador es un objeto protegido por el sistema.'
              : tieneUsuarios
              ? `No se puede eliminar: existen ${r.count_usuarios} usuario${r.count_usuarios !== 1 ? 's' : ''} vinculados.`
              : undefined;

            return (
              <tr key={r.id_rol} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.nombre_rol}</span>
                    {r.es_protegido && (
                      <Badge variant="pendiente">{t('rolestable.protegido')}</Badge>
                    )}
                  </div>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  {r.descripcion ?? '—'}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <Badge variant="inactivo">{r.permisos.length} permiso{r.permisos.length !== 1 ? 's' : ''}</Badge>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  {r.count_usuarios !== undefined ? (
                    <Badge variant={tieneUsuarios ? 'activo' : 'inactivo'}>
                      {r.count_usuarios} usuario{r.count_usuarios !== 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                    {puedeEditar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditar(r)}
                        disabled={r.es_protegido}
                        aria-label={`Editar ${r.nombre_rol}`}
                        title={r.es_protegido ? 'El rol Administrador no puede modificarse.' : undefined}
                      >
                        <Edit2 size={13} aria-hidden style={{ marginRight: 4 }} />{t('rolestable.editar')}</Button>
                    )}
                    {puedeEliminar && (
                      <Button
                        variant={puedeEliminarEste ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={puedeEliminarEste ? () => onEliminar(r) : undefined}
                        disabled={!puedeEliminarEste}
                        aria-label={`Eliminar ${r.nombre_rol}`}
                        title={tooltipEliminar}
                      >
                        <Trash2 size={13} aria-hidden style={{ marginRight: 4 }} />{t('rolestable.eliminar')}</Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
