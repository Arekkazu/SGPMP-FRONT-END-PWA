import React, { useEffect, useState } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Combobox } from '../../shared/design-system/Combobox';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { useUsuarioDetalle } from '../hooks/useUsuarioDetalle';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { mascararId } from '../../shared/lib/mascararId';
import { varianteRol, varianteEstado } from '../../shared/lib/varianteBadge';
import { fincasApi } from '../../configuration/api/fincasApi';
import { rolesApi } from '../../roles/api/rolesApi';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import { FincasAsignadas } from './FincasAsignadas';
import type { FincaResponse } from '../../configuration/types';
import type { EditarPerfilAdminDTO } from '../types';

interface Props {
  idUsuario: number;
  onClose: () => void;
  onSaved: () => void;
  puedeEditar: boolean;
}

const NAME_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

export function UsuarioModal({ idUsuario, onClose, onSaved, puedeEditar }: Props) {
  const { t } = useT('usuarios');
  const panelRef = useModalA11y(onClose);
  const { detalle, loading, saving, error, saveError, cargar, editar, asignarFincas } = useUsuarioDetalle();

  const [fincas, setFincas] = useState<FincaResponse[]>([]);
  const [fincasLoading, setFincasLoading] = useState(false);
  const [idsFincas, setIdsFincas] = useState<Set<number>>(new Set());
  const [roles, setRoles] = useState<{ id: number; nombre: string }[]>([]);
  // Rol con autocompletado: «Nombre (#id)», el nombre exacto o el ID.
  const [rolTexto, setRolTexto] = useState('');
  const [rolError, setRolError] = useState<string>();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditarPerfilAdminDTO>({ mode: 'onBlur' });

  useEffect(() => {
    cargar(idUsuario);
  }, [idUsuario, cargar]);

  useEffect(() => {
    if (!puedeEditar) return;
    rolesApi
      .listar()
      .then((lista) => setRoles(lista.map((r) => ({ id: r.id_rol, nombre: r.nombre_rol }))))
      .catch(() => setRoles([]));
  }, [puedeEditar]);

  useEffect(() => {
    if (detalle) {
      reset({
        nombre: detalle.nombre,
        apellidos: detalle.apellidos,
        correo_electronico: detalle.correo_electronico,
        telefono: detalle.telefono ?? '',
        direccion: detalle.direccion ?? '',
        version: detalle.version,
        id_rol: detalle.id_rol,
      });
      setIdsFincas(new Set((detalle.fincas ?? []).map((f) => f.id_finca)));
      // El detalle del backend no trae id_rol: sin él, el nombre exacto basta.
      setRolTexto(detalle.id_rol != null ? etiquetaDeCatalogo(detalle.nombre_rol, detalle.id_rol) : detalle.nombre_rol);
      setRolError(undefined);
    }
  }, [detalle, reset]);

  useEffect(() => {
    if (!puedeEditar) return;
    setFincasLoading(true);
    fincasApi
      .listar()
      .then((raw) => {
        const data: FincaResponse[] = Array.isArray(raw) ? raw : (raw as unknown as { items?: FincaResponse[] })?.items ?? [];
        setFincas(data);
      })
      .catch(() => setFincas([]))
      .finally(() => setFincasLoading(false));
  }, [puedeEditar]);

  const onSubmit = async (data: EditarPerfilAdminDTO) => {
    if (!detalle) return;
    const idRol = idDeCatalogo(rolTexto, roles);
    if (idRol == null) {
      setRolError(t('usuariomodal.rol_no_encontrado'));
      return;
    }
    // Un opcional vacío se omite: el backend valida '' y lo rechaza.
    const ok = await editar(idUsuario, {
      ...data,
      correo_electronico: data.correo_electronico || undefined,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
      id_rol: idRol,
      version: detalle.version,
    });
    if (!ok) return;
    const okFincas = await asignarFincas(idUsuario, { ids_fincas: Array.from(idsFincas) });
    if (okFincas) onSaved();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="usuario-modal-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel" style={{ padding: 'var(--s6)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="usuario-modal-title" style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('usuariomodal.detalle_de_usuario')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('usuariomodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <Alert variant="error" title={t('usuariomodal.error_al_cargar')} description={error.message} />
        )}

        {saveError && (
          <Alert variant="error" title={t('usuariomodal.error_al_guardar')} description={saveError.message} className="mb" />
        )}

        {detalle && !loading && (
          <>
            <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
              <Badge variant={varianteRol(detalle.nombre_rol)}>{detalle.nombre_rol}</Badge>
              <Badge variant={varianteEstado(detalle.estado_cuenta)}>{detalle.estado_cuenta}</Badge>
            </div>

            {puedeEditar ? (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <input type="hidden" {...register('version')} />
                <div className="ds-fg2" style={{ gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                  <div>
                    <Input
                      label={t('usuariomodal.nombres')}
                      required
                      error={errors.nombre?.message}
                      {...register('nombre', {
                        required: t('validacion.requerido', { ns: 'common' }),
                        pattern: { value: NAME_REGEX, message: t('usuariomodal.solo_letras_y_espacios') },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.apellidos')}
                      required
                      error={errors.apellidos?.message}
                      {...register('apellidos', {
                        required: t('validacion.requerido', { ns: 'common' }),
                        pattern: { value: NAME_REGEX, message: t('usuariomodal.solo_letras_y_espacios') },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.correo_electronico')}
                      type="email"
                      error={errors.correo_electronico?.message}
                      {...register('correo_electronico', {
                        pattern: { value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/, message: t('usuariomodal.formato_invalido') },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.telefono')}
                      type="tel"
                      hint={t('validacion.telefono_opcional', { ns: 'common' })}
                      error={errors.telefono?.message}
                      {...register('telefono', {
                        pattern: { value: /^[0-9]{7,15}$/, message: t('usuariomodal.solo_numeros_7_15_digitos') },
                      })}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Input label={t('usuariomodal.direccion')} {...register('direccion')} />
                  </div>
                  <div>
                    <Combobox
                      id="usuario-rol"
                      label={t('usuariomodal.rol')}
                      opciones={roles.map((r) => ({ valor: etiquetaDeCatalogo(r.nombre, r.id) }))}
                      value={rolTexto}
                      onChange={(v) => { setRolTexto(v); setRolError(undefined); }}
                      hint={t('usuariomodal.rol_hint')}
                      error={rolError}
                    />
                  </div>
                </div>
                {/* INC-M02-61-G52 (#97): el acceso a fincas es M:N. Una finca con otro
                    dueño también se asigna: el Veterinario atiende fincas ajenas. */}
                <FincasAsignadas
                  fincas={fincas}
                  seleccionadas={idsFincas}
                  onChange={setIdsFincas}
                  cargando={fincasLoading}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
                  <Button type="button" variant="secondary" size="md" onClick={onClose}>{t('usuariomodal.cancelar')}</Button>
                  <Button type="submit" variant="primary" size="md" loading={saving}>{t('usuariomodal.guardar')}</Button>
                </div>
              </form>
            ) : (
              <div className="ds-fg2" style={{ gap: 'var(--s3)' }}>
                {[
                  [t('usuariomodal.nombres'), detalle.nombre],
                  [t('usuariomodal.apellidos'), detalle.apellidos],
                  [t('usuariomodal.correo_electronico'), detalle.correo_electronico],
                  [t('usuariomodal.identificacion'), `${detalle.tipo_identificacion}: ${mascararId(detalle.numero_identificacion)}`],
                  [t('usuariomodal.fecha_de_nacimiento'), detalle.fecha_nacimiento],
                  [t('usuariomodal.fecha_de_registro'), formatearFecha(detalle.fecha_registro)],
                  [t('usuariomodal.telefono'), detalle.telefono ?? '—'],
                  [t('usuariomodal.direccion'), detalle.direccion ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2', textAlign: 'right' }}>
                  <Button type="button" variant="secondary" size="md" onClick={onClose}>{t('usuariomodal.cerrar')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
