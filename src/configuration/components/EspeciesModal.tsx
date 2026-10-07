import React, { useEffect } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { EditarEspecieDTO, EspecieResponse, RegistrarEspecieDTO } from '../types';
import { TIPOS_MODELO_ASIGNABLES, TIPO_MODELO_LABEL, type TipoModelo } from '../../prediction/types';
import type { ApiError } from '../../shared/api/errors';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';

interface FormValues {
  nombre: string;
  descripcion: string;
  tipo_modelo: TipoModelo | '';
}

const CAMPOS = ['nombre', 'descripcion', 'tipo_modelo'] as const;

interface Props {
  especie: EspecieResponse | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarEspecieDTO) => Promise<boolean>;
  onEditar: (id: number, dto: EditarEspecieDTO) => Promise<boolean>;
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
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const modoEditar = especie !== null;
  const titulo = modoEditar ? `Editar especie — ${especie.nombre}` : 'Nueva especie';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });
  const alertaGeneral = useErroresDeServidor(saveError, setError, CAMPOS);

  const descValue = watch('descripcion', '');

  useEffect(() => {
    if (especie) {
      reset({ nombre: especie.nombre, descripcion: especie.descripcion ?? '', tipo_modelo: especie.tipo_modelo ?? '' });
    } else {
      reset({ nombre: '', descripcion: '', tipo_modelo: '' });
    }
  }, [especie, reset]);

  const onSubmit = async (data: FormValues) => {
    const descripcion = data.descripcion.trim() || undefined;
    const tipo_modelo = data.tipo_modelo || null;
    let ok: boolean;

    if (modoEditar && especie) {
      ok = await onEditar(especie.id_especie, {
        nombre: data.nombre.trim(),
        descripcion,
        tipo_modelo,
        fecha_actualizacion: especie.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({ nombre: data.nombre.trim(), descripcion, tipo_modelo });
    }

    if (ok) onClose();
  };

  return (
    <div
      ref={dialogRef}
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

        {saveError && alertaGeneral && (
          <Alert
            variant="error"
            title={saveError.status === 412 ? t('especiesmodal.conflicto_de_edicion') : t('especiesmodal.error_al_guardar')}
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
                required: t('especiesmodal.el_nombre_es_obligatorio'),
                minLength: { value: 3, message: t('especiesmodal.minimo_3_caracteres') },
                maxLength: { value: 50, message: t('especiesmodal.maximo_50_caracteres') },
                pattern: { value: NOMBRE_REGEX, message: t('especiesmodal.solo_letras_y_espacios') },
              })}
            />

            <div>
              <label
                htmlFor="especie-desc"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}
              >{t('especiesmodal.descripcion')}</label>
              <textarea
                id="especie-desc"
                aria-invalid={!!errors.descripcion}
                aria-describedby={errors.descripcion ? 'especie-desc-err' : undefined}
                style={TEXTAREA}
                placeholder={t('especiesmodal.descripcion_opcional_de_la_especie')}
                {...register('descripcion', {
                  maxLength: { value: 255, message: t('especiesmodal.maximo_255_caracteres') },
                })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s1)' }}>
                {errors.descripcion ? (
                  <p id="especie-desc-err" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>
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

            <Select
              id="especie-tipo-modelo"
              label={t('especiesmodal.familia_de_modelo_ia')}
              hint={t('especiesmodal.ayuda_familia_de_modelo')}
              error={errors.tipo_modelo?.message}
              {...register('tipo_modelo')}
            >
              <option value="">{t('especiesmodal.sin_familia_de_modelo')}</option>
              {TIPOS_MODELO_ASIGNABLES.map((tm) => <option key={tm} value={tm}>{TIPO_MODELO_LABEL[tm]}</option>)}
            </Select>

            {modoEditar && especie && (
              <div style={{ padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Creado: {especie.fecha_creacion ? formatearFecha(especie.fecha_creacion) : '—'}
                {especie.fecha_actualizacion && (
                  <span> · Actualizado: {formatearFecha(especie.fecha_actualizacion)}</span>
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
