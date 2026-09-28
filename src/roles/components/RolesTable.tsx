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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {([
              ['nombre_del_rol', 'nombre-del-rol'],
              ['descripcion', 'descripcion'],
              ['permisos', 'permisos'],
              ['usuarios', 'usuarios'],
              ['acciones', 'acciones'],
            ] as const).map(([clave, id]) => (
              <th
                key={id}
                scope="col"
                id={`th-${id}`}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  textAlign: 'left',
                  fontSize: 'var(--fs-label-sm)',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(`rolestable.${clave}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => {
            const tieneUsuarios = (r.count_usuarios ?? 0) > 0;
            const puedeEliminarEste = puedeEliminar && !r.es_protegido && !tieneUsuarios;
            const tooltipEliminar = r.es_protegido
              ? t('rolestable.rol_protegido_por_el_sistema')
              : tieneUsuarios
              ? t('rolestable.no_se_puede_eliminar_usuarios_vinculados', { count: r.count_usuarios })
              : undefined;

            return (
              <tr key={r.id_rol} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td headers="th-nombre-del-rol" style={{ padding: 'var(--s3) var(--s4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.nombre_rol}</span>
                    {r.es_protegido && (
                      <Badge variant="pendiente">{t('rolestable.protegido')}</Badge>
                    )}
                  </div>
                </td>
                <td headers="th-descripcion" style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>
                  {r.descripcion ?? '—'}
                </td>
                <td headers="th-permisos" style={{ padding: 'var(--s3) var(--s4)' }}>
                  <Badge variant="inactivo">{t('rolestable.n_permisos', { count: r.permisos.length })}</Badge>
                </td>
                <td headers="th-usuarios" style={{ padding: 'var(--s3) var(--s4)' }}>
                  {r.count_usuarios !== undefined ? (
                    <Badge variant={tieneUsuarios ? 'activo' : 'inactivo'}>
                      {t('rolestable.n_usuarios', { count: r.count_usuarios })}
                    </Badge>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>—</span>
                  )}
                </td>
                <td headers="th-acciones" style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                    {puedeEditar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditar(r)}
                        disabled={r.es_protegido}
                        aria-label={t('rolestable.editar_rol', { nombre: r.nombre_rol })}
                        title={r.es_protegido ? t('rolestable.el_rol_administrador_no_puede_modificarse') : undefined}
                      >
                        <Edit2 size={13} aria-hidden style={{ marginRight: 4 }} />{t('rolestable.editar')}</Button>
                    )}
                    {puedeEliminar && (
                      <Button
                        variant={puedeEliminarEste ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={puedeEliminarEste ? () => onEliminar(r) : undefined}
                        disabled={!puedeEliminarEste}
                        aria-label={t('rolestable.eliminar_rol', { nombre: r.nombre_rol })}
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
