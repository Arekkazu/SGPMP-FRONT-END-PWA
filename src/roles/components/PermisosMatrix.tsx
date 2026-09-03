import React from 'react';
import { useT } from '../../shared/i18n/useT';
import type { RecursoResponse, AccionResponse, PermisoResponse } from '../types';

interface Props {
  recursos: RecursoResponse[];
  acciones: AccionResponse[];
  permisos: PermisoResponse[];
  onChange: (idRecurso: number, idAccion: number, checked: boolean) => void;
  readonly?: boolean;
}

export function PermisosMatrix({ recursos, acciones, permisos, onChange, readonly }: Props) {
  const { t } = useT('roles');
  const tienePermiso = (idRecurso: number, idAccion: number) =>
    permisos.some((p) => p.id_recurso === idRecurso && p.id_accion === idAccion);

  const getPermiso = (idRecurso: number, idAccion: number) =>
    permisos.find((p) => p.id_recurso === idRecurso && p.id_accion === idAccion);

  const esUltimoPermiso = permisos.length <= 1;

  const puedeDesmarcar = (idRecurso: number, idAccion: number) => {
    if (!tienePermiso(idRecurso, idAccion)) return true;
    return !esUltimoPermiso;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <th style={{ padding: 'var(--s2) var(--s3)', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 160 }}>{t('permisosmatrix.recurso')}</th>
            {acciones.map((a) => (
              <th key={a.id_accion} style={{ padding: 'var(--s2) var(--s3)', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {a.codigo}
                {a.descripcion && (
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>{a.descripcion}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recursos.map((r) => (
            <tr key={r.id_recurso} style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td style={{ padding: 'var(--s2) var(--s3)', color: 'var(--text-primary)', fontWeight: 500 }}>
                {r.nombre_recurso}
                {r.descripcion && (
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{r.descripcion}</span>
                )}
              </td>
              {acciones.map((a) => {
                const checked = tienePermiso(r.id_recurso, a.id_accion);
                const ejecutarBloqueado = a.codigo === 'E' && !r.es_proceso_especial;
                const deshabilitado = readonly || ejecutarBloqueado || (checked && !puedeDesmarcar(r.id_recurso, a.id_accion));
                const permiso = getPermiso(r.id_recurso, a.id_accion);

                return (
                  <td key={a.id_accion} style={{ padding: 'var(--s2) var(--s3)', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={deshabilitado}
                      aria-label={`${a.codigo} para ${r.nombre_recurso}`}
                      title={ejecutarBloqueado ? 'Acción Ejecutar solo disponible para procesos especiales' : deshabilitado && checked ? 'Mínimo un permiso requerido' : undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange(r.id_recurso, a.id_accion, true);
                        } else if (permiso) {
                          onChange(r.id_recurso, a.id_accion, false);
                        }
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        cursor: deshabilitado ? 'not-allowed' : 'pointer',
                        accentColor: 'var(--brand-500)',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
