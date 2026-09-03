import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import type { PerfilResponse, EditarPerfilDTO } from '../types';

interface Props {
  perfil: PerfilResponse;
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  saveSuccess: boolean;
  onSave: (dto: EditarPerfilDTO) => void;
}

const NAME_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

export function PerfilForm({ perfil, saving, saveError, saveSuccess, onSave }: Props) {
  const { t } = useT('perfil');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditarPerfilDTO>({ mode: 'onBlur' });

  useEffect(() => {
    reset({
      nombre: perfil.nombre,
      apellidos: perfil.apellidos,
      telefono: perfil.telefono ?? '',
      direccion: perfil.direccion ?? '',
      version: perfil.version,
    });
  }, [perfil, reset]);

  const onSubmit = (data: EditarPerfilDTO) => {
    onSave({ ...data, version: perfil.version });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register('version')} />

      {saveError && (
        <Alert
          variant="error"
          title={saveError.status === 412 ? 'Conflicto de datos' : 'Error al guardar'}
          description={saveError.status === 412 ? 'Los datos han cambiado. Recarga la página para ver la versión más reciente.' : saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {saveSuccess && (
        <Alert variant="success" title={t('perfilform.cambios_guardados')} description={t('perfilform.tu_perfil_ha_sido_actualizado_exitosamente')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
        <div>
          <Input
            label={t('perfilform.nombres')}
            required
            error={errors.nombre?.message}
            {...register('nombre', {
              required: 'El nombre es obligatorio.',
              pattern: { value: NAME_REGEX, message: 'Solo letras y espacios.' },
            })}
          />
        </div>
        <div>
          <Input
            label={t('perfilform.apellidos')}
            required
            error={errors.apellidos?.message}
            {...register('apellidos', {
              required: 'Los apellidos son obligatorios.',
              pattern: { value: NAME_REGEX, message: 'Solo letras y espacios.' },
            })}
          />
        </div>
        <div>
          <Input
            label={t('perfilform.telefono')}
            type="tel"
            hint="Opcional, 7-15 dígitos"
            error={errors.telefono?.message}
            {...register('telefono', {
              pattern: { value: /^[0-9]{7,15}$/, message: 'Solo números, 7-15 dígitos.' },
            })}
          />
        </div>
        <div>
          <Input
            label={t('perfilform.direccion')}
            placeholder={t('perfilform.calle_numero_ciudad')}
            {...register('direccion')}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" size="md" loading={saving}>{t('perfilform.guardar_cambios')}</Button>
      </div>
    </form>
  );
}
