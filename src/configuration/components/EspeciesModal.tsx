import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { EspecieResponse, RegistrarEspecieDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface FormValues {
  nombre: string;
  descripcion: string;
}

interface Props {
  especie: EspecieResponse | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarEspecieDTO) => Promise<boolean>;
  onEditar: (id: number, dto: { nombre: string; descripcion?: string; fecha_actualizacion: string }) => Promise<boolean>;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  resize: 'vertical',
  outline: 'none',
};

const NOMBRE_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

export function EspeciesModal({ especie, saving, saveError, onClose, onRegistrar, onEditar }: Props) {
  const { t } = useT('configuration');
  const modoEditar = especie !== null;
  const titulo = modoEditar ? `Editar especie — ${especie.nombre}` : 'Nueva especie';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  const descValue = watch('descripcion', '');

  useEffect(() => {
    if (especie) {
      reset({ nombre: especie.nombre, descripcion: especie.descripcion ?? '' });
    } else {
      reset({ nombre: '', descripcion: '' });
    }
  }, [especie, reset]);

  const onSubmit = async (data: FormValues) => {
    const descripcion = data.descripcion.trim() || undefined;
    let ok: boolean;

    if (modoEditar && especie) {
      ok = await onEditar(especie.id_especie, {
        nombre: data.nombre.trim(),
        descripcion,
        fecha_actualizacion: especie.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({ nombre: data.nombre.trim(), descripcion });
    }

    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="especie-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          maxWidth: 480,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="especie-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {titulo}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('especiesmodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && (
          <Alert
            variant={saveError.status === 412 ? 'error' : 'error'}
            title={saveError.status === 412 ? 'Conflicto de edición' : 'Error al guardar'}
            description={saveError.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <Input
              label={t('especiesmodal.nombre')}
              required
              aria-required="true"
              placeholder={t('especiesmodal.ej_bovino_avicola_porcino')}
              error={errors.nombre?.message}
              {...register('nombre', {
                required: 'El nombre es obligatorio.',
                minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres.' },
                pattern: { value: NOMBRE_REGEX, message: 'Solo letras y espacios.' },
              })}
            />

            <div>
              <label
                htmlFor="especie-desc"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}
              >{t('especiesmodal.descripcion')}</label>
              <textarea
                id="especie-desc"
                style={TEXTAREA}
                placeholder={t('especiesmodal.descripcion_opcional_de_la_especie')}
                {...register('descripcion', {
                  maxLength: { value: 255, message: 'Máximo 255 caracteres.' },
                })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s1)' }}>
                {errors.descripcion ? (
                  <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>
                    {errors.descripcion.message}
                  </p>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: '11px', color: (descValue?.length ?? 0) > 240 ? 'var(--sem-warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {descValue?.length ?? 0} / 255
                </span>
              </div>
            </div>

            {modoEditar && especie && (
              <div style={{ padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Creado: {especie.fecha_creacion ? new Date(especie.fecha_creacion).toLocaleDateString('es-CO') : '—'}
                {especie.fecha_actualizacion && (
                  <span> · Actualizado: {new Date(especie.fecha_actualizacion).toLocaleDateString('es-CO')}</span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('especiesmodal.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              {modoEditar ? 'Guardar cambios' : 'Registrar especie'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
