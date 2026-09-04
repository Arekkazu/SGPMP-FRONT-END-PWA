import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { RegistrarTipoAreaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface FormValues {
  nombre: string;
}

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarTipoAreaDTO) => Promise<boolean>;
}

const NOMBRE_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

export function TipoAreaModal({ saving, saveError, onClose, onRegistrar }: Props) {
  const { t } = useT('configuration');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    reset({ nombre: '' });
  }, [reset]);

  const onSubmit = async (data: FormValues) => {
    const ok = await onRegistrar({ nombre: data.nombre.trim() });
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tipo-area-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--surface-border)', padding: 'var(--s6)',
        width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="tipo-area-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('tipoareamodal.registrar_tipo_de_area')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('tipoareamodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && (
          <Alert
            variant="error"
            title={t('tipoareamodal.error_al_guardar')}
            description={saveError.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label={t('tipoareamodal.nombre')}
            required
            aria-required="true"
            placeholder={t('tipoareamodal.ej_aviario_jaula_corral_de_engorde')}
            error={errors.nombre?.message}
            {...register('nombre', {
              required: t('tipoareamodal.el_nombre_es_obligatorio'),
              minLength: { value: 3, message: t('tipoareamodal.minimo_3_caracteres') },
              maxLength: { value: 30, message: t('tipoareamodal.maximo_30_caracteres') },
              pattern: { value: NOMBRE_REGEX, message: t('tipoareamodal.solo_letras_y_espacios') },
            })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('tipoareamodal.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>{t('tipoareamodal.registrar_tipo_de_area')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
