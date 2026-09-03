import React, { useEffect } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { useUsuarioDetalle } from '../hooks/useUsuarioDetalle';
import type { EditarPerfilAdminDTO } from '../types';

interface Props {
  idUsuario: number;
  onClose: () => void;
  onSaved: () => void;
  puedeEditar: boolean;
}

const NAME_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

function mascararId(valor: string): string {
  return valor.length > 4 ? '••••' + valor.slice(-4) : valor;
}

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 'var(--s1)',
};

const ROL_OPTIONS = [
  { value: 1, label: 'Administrador' },
  { value: 2, label: 'Productor' },
  { value: 3, label: 'Veterinario' },
  { value: 4, label: 'Contador' },
  { value: 5, label: 'Ingeniero Agrónomo' },
];

export function UsuarioModal({ idUsuario, onClose, onSaved, puedeEditar }: Props) {
  const { t } = useT('usuarios');
  const { detalle, loading, saving, error, saveError, cargar, editar } = useUsuarioDetalle();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditarPerfilAdminDTO>({ mode: 'onBlur' });

  useEffect(() => {
    cargar(idUsuario);
  }, [idUsuario, cargar]);

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
    }
  }, [detalle, reset]);

  const onSubmit = async (data: EditarPerfilAdminDTO) => {
    if (!detalle) return;
    const ok = await editar(idUsuario, { ...data, version: detalle.version });
    if (ok) onSaved();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="usuario-modal-title"
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
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="usuario-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('usuariomodal.detalle_de_usuario')}</h2>
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
              <Badge variant={detalle.nombre_rol.toLowerCase() as any}>{detalle.nombre_rol}</Badge>
              <Badge variant={detalle.estado_cuenta.toLowerCase() as any}>{detalle.estado_cuenta}</Badge>
            </div>

            {puedeEditar ? (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <input type="hidden" {...register('version')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                  <div>
                    <Input
                      label={t('usuariomodal.nombres')}
                      required
                      error={errors.nombre?.message}
                      {...register('nombre', {
                        required: 'Obligatorio.',
                        pattern: { value: NAME_REGEX, message: 'Solo letras y espacios.' },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.apellidos')}
                      required
                      error={errors.apellidos?.message}
                      {...register('apellidos', {
                        required: 'Obligatorio.',
                        pattern: { value: NAME_REGEX, message: 'Solo letras y espacios.' },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.correo_electronico')}
                      type="email"
                      error={errors.correo_electronico?.message}
                      {...register('correo_electronico', {
                        pattern: { value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/, message: 'Formato inválido.' },
                      })}
                    />
                  </div>
                  <div>
                    <Input
                      label={t('usuariomodal.telefono')}
                      type="tel"
                      hint="Opcional, 7-15 dígitos"
                      error={errors.telefono?.message}
                      {...register('telefono', {
                        pattern: { value: /^[0-9]{7,15}$/, message: 'Solo números, 7-15 dígitos.' },
                      })}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Input label={t('usuariomodal.direccion')} {...register('direccion')} />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>{t('usuariomodal.rol')}</label>
                    <select style={SELECT_STYLE} {...register('id_rol', { valueAsNumber: true })}>
                      {ROL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
                  <Button type="button" variant="secondary" size="md" onClick={onClose}>{t('usuariomodal.cancelar')}</Button>
                  <Button type="submit" variant="primary" size="md" loading={saving}>{t('usuariomodal.guardar')}</Button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
                {[
                  ['Nombres', detalle.nombre],
                  ['Apellidos', detalle.apellidos],
                  ['Correo', detalle.correo_electronico],
                  ['Identificación', `${detalle.tipo_identificacion}: ${mascararId(detalle.numero_identificacion)}`],
                  ['Fecha de nacimiento', detalle.fecha_nacimiento],
                  ['Fecha de registro', formatearFecha(detalle.fecha_registro)],
                  ['Teléfono', detalle.telefono ?? '—'],
                  ['Dirección', detalle.direccion ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</p>
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
