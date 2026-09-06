import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Plus, Search } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { RolesTable } from '../components/RolesTable';
import { RolModal } from '../components/RolModal';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import type { RolConPermisosResponse, CrearRolDTO, EditarRolDTO, PermisoResponse } from '../types';

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; rol: RolConPermisosResponse }
  | { tipo: 'confirmar-eliminar'; rol: RolConPermisosResponse };

export function RolesPage() {
  const { t } = useT('roles');
  const puedeVer = usePermission(2, 2);
  const puedeCrear = usePermission(2, 1);
  const puedeEditar = usePermission(2, 3);
  const puedeEliminar = usePermission(2, 4);
  const online = useOnlineStatus();
  const { roles, recursos, acciones, loading, error, cargar, crearRol, editarRol, eliminarRol, asignarPermiso, retirarPermiso, limpiarError } = useRoles();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<import('../../shared/api/errors').ApiError | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (puedeVer) cargar();
  }, [puedeVer, cargar]);

  if (!puedeVer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>{t('rolespage.acceso_restringido')}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: 320 }}>{t('rolespage.la_gestion_de_roles_requiere_permiso_de')}</p>
      </div>
    );
  }

  const rolesFiltrados = busqueda.trim()
    ? roles.filter((r) => r.nombre_rol.toLowerCase().includes(busqueda.toLowerCase()))
    : roles;

  const handleSave = async (data: CrearRolDTO | { id: number; dto: EditarRolDTO; permisos: PermisoResponse[] }) => {
    setSaving(true);
    setSaveError(null);
    let ok = false;
    if ('permisos' in data && 'id' in data) {
      ok = await editarRol(data.id, data.dto);
    } else {
      ok = await crearRol(data as CrearRolDTO);
    }
    setSaving(false);
    if (ok) {
      setModal({ tipo: 'ninguno' });
      cargar();
    }
  };

  const handleAsignarPermiso = async (idRol: number, idRecurso: number, idAccion: number): Promise<boolean> => {
    return asignarPermiso(idRol, { id_recurso: idRecurso, id_accion: idAccion });
  };

  const handleRetirarPermiso = async (idRol: number, idPermiso: number): Promise<boolean> => {
    return retirarPermiso(idRol, idPermiso);
  };

  const handleEliminar = async (rol: RolConPermisosResponse) => {
    setEliminando(true);
    const ok = await eliminarRol(rol.id_rol);
    setEliminando(false);
    if (ok) setModal({ tipo: 'ninguno' });
  };

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 960, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('rolespage.gestion_de_roles_y_permisos')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('rolespage.roles_del_sistema_bajo_el_modelo_rbac')}</p>
        </div>
        {puedeCrear && online && (
          <Button variant="primary" size="md" onClick={() => setModal({ tipo: 'crear' })}>
            <Plus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('rolespage.crear_nuevo_rol')}</Button>
        )}
      </div>

      {/* Alert de seguridad crítica */}
      <Alert
        variant="warning"
        title={t('rolespage.modulo_de_seguridad_critica')}
        description="Los cambios de roles afectan a todos los usuarios asignados. Toda modificación queda registrada en el registro de auditoría. Los roles con usuarios asignados no pueden eliminarse; primero reasigna a los usuarios."
        style={{ marginBottom: 'var(--s5)' }}
      />

      {!online && (
        <Alert variant="warning" title={t('rolespage.sin_conexion')} description={t('rolespage.las_acciones_estan_deshabilitadas_en_modo')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {error && (
        <Alert variant="error" title={t('rolespage.error_al_cargar_roles')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 'var(--s5)', maxWidth: 320 }}>
        <Input
          label=""
          placeholder={t('rolespage.filtrar_por_nombre_de_rol')}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          leadingIcon={<Search size={14} aria-hidden />}
        />
      </div>

      {/* Card con tabla */}
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: 'var(--s4) var(--s5)', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('rolespage.listado_de_roles')}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 600,
            padding: '3px 9px', borderRadius: 'var(--r-full)', border: '1px solid var(--surface-border)',
            background: 'var(--surface-hover)', color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}>
            {loading ? '…' : `${rolesFiltrados.length} registro${rolesFiltrados.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <RolesTable
          roles={rolesFiltrados}
          loading={loading}
          puedeEditar={puedeEditar && online}
          puedeEliminar={puedeEliminar && online}
          onEditar={(rol) => setModal({ tipo: 'editar', rol })}
          onEliminar={(rol) => { limpiarError(); setModal({ tipo: 'confirmar-eliminar', rol }); }}
        />
      </div>

      {/* Modal crear/editar */}
      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <RolModal
          modo={modal.tipo}
          rol={modal.tipo === 'editar' ? modal.rol : undefined}
          recursos={recursos}
          acciones={acciones}
          error={saveError}
          saving={saving}
          onSave={handleSave}
          onAsignarPermiso={handleAsignarPermiso}
          onRetirarPermiso={handleRetirarPermiso}
          onClose={() => setModal({ tipo: 'ninguno' })}
        />
      )}

      {/* Modal confirmar eliminar */}
      {modal.tipo === 'confirmar-eliminar' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="eliminar-rol-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            padding: 'var(--s4)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal({ tipo: 'ninguno' }); }}
        >
          <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <h2 id="eliminar-rol-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--s3)', color: 'var(--text-primary)' }}>{t('rolespage.eliminar_rol')}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>{t('rolespage.confirmas_que_deseas_eliminar_el_rol')}<strong>{modal.rol.nombre_rol}</strong>{t('rolespage.esta_accion_no_se_puede_deshacer')}</p>
            {error && (
              <Alert variant="error" title={t('rolespage.no_se_pudo_eliminar_el_rol')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
            )}
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="md" onClick={() => setModal({ tipo: 'ninguno' })}>{t('rolespage.cancelar')}</Button>
              <Button variant="danger" size="md" loading={eliminando} onClick={() => handleEliminar(modal.rol)}>{t('rolespage.eliminar')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
