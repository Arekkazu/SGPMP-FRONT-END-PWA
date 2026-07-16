import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { PermisosMatrix } from './PermisosMatrix';
import type { RolConPermisosResponse, RecursoResponse, AccionResponse, PermisoResponse, CrearRolDTO, EditarRolDTO } from '../types';

interface Props {
  modo: 'crear' | 'editar';
  rol?: RolConPermisosResponse;
  recursos: RecursoResponse[];
  acciones: AccionResponse[];
  error: import('../../shared/api/errors').ApiError | null;
  saving: boolean;
  onSave: (dto: CrearRolDTO | { id: number; dto: EditarRolDTO; permisos: PermisoResponse[] }) => void;
  onAsignarPermiso: (idRol: number, idRecurso: number, idAccion: number) => Promise<boolean>;
  onRetirarPermiso: (idRol: number, idPermiso: number) => Promise<boolean>;
  onClose: () => void;
}

interface FormFields {
  nombre_rol: string;
  descripcion: string;
}

export function RolModal({ modo, rol, recursos, acciones, error, saving, onSave, onAsignarPermiso, onRetirarPermiso, onClose }: Props) {
  const [permisos, setPermisos] = useState<PermisoResponse[]>(rol?.permisos ?? []);
  const { register, handleSubmit, formState: { errors } } = useForm<FormFields>({
    mode: 'onBlur',
    defaultValues: { nombre_rol: rol?.nombre_rol ?? '', descripcion: rol?.descripcion ?? '' },
  });

  useEffect(() => {
    setPermisos(rol?.permisos ?? []);
  }, [rol]);

  const handlePermisoChange = async (idRecurso: number, idAccion: number, checked: boolean) => {
    if (modo === 'editar' && rol) {
      if (checked) {
        const ok = await onAsignarPermiso(rol.id_rol, idRecurso, idAccion);
        if (ok) {
          setPermisos((prev) => [
            ...prev,
            { id_permiso: Date.now(), id_recurso: idRecurso, id_accion: idAccion, nombre: '', es_activo: true },
          ]);
        }
      } else {
        const permiso = permisos.find((p) => p.id_recurso === idRecurso && p.id_accion === idAccion);
        if (permiso) {
          const ok = await onRetirarPermiso(rol.id_rol, permiso.id_permiso);
          if (ok) {
            setPermisos((prev) => prev.filter((p) => p.id_permiso !== permiso.id_permiso));
          }
        }
      }
    } else {
      if (checked) {
        setPermisos((prev) => [
          ...prev,
          { id_permiso: Date.now(), id_recurso: idRecurso, id_accion: idAccion, nombre: '', es_activo: true },
        ]);
      } else {
        setPermisos((prev) => prev.filter((p) => !(p.id_recurso === idRecurso && p.id_accion === idAccion)));
      }
    }
  };

  const onSubmit = (data: FormFields) => {
    if (modo === 'crear') {
      const dto: CrearRolDTO = {
        nombre_rol: data.nombre_rol,
        descripcion: data.descripcion || undefined,
        permisos: permisos.map((p) => ({ id_recurso: p.id_recurso, id_accion: p.id_accion })),
      };
      onSave(dto);
    } else if (rol) {
      onSave({
        id: rol.id_rol,
        dto: { nombre_rol: data.nombre_rol, descripcion: data.descripcion || undefined },
        permisos,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rol-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--surface-border)',
          padding: 'var(--s6)',
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="rol-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {modo === 'crear' ? 'Crear rol' : 'Editar rol'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden />
          </Button>
        </div>

        {error && (
          <Alert variant="error" title="Error" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s5)' }}>
            <div>
              <Input
                label="Nombre del rol"
                required
                error={errors.nombre_rol?.message}
                disabled={rol?.es_protegido}
                {...register('nombre_rol', { required: 'El nombre es obligatorio.' })}
              />
            </div>
            <div>
              <Input
                label="Descripción"
                placeholder="Opcional"
                {...register('descripcion')}
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--s5)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>
              Permisos
              {permisos.length === 0 && (
                <span style={{ color: 'var(--sem-error)', fontWeight: 400, marginLeft: 'var(--s2)' }}>
                  — Selecciona al menos un permiso
                </span>
              )}
            </p>
            <PermisosMatrix
              recursos={recursos}
              acciones={acciones}
              permisos={permisos}
              onChange={handlePermisoChange}
              readonly={rol?.es_protegido}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              disabled={permisos.length === 0}
            >
              {modo === 'crear' ? 'Crear rol' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
