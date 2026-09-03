import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import type { CambiarContrasenaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  saving: boolean;
  pwError: ApiError | null;
  pwSuccess: boolean;
  onSave: (dto: CambiarContrasenaDTO) => void;
}

const PW_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!*])[A-Za-z\d@#$%^&+=!*]{8,}$/;

export function CambiarContrasenaForm({ saving, pwError, pwSuccess, onSave }: Props) {
  const { t } = useT('perfil');
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, getValues, reset, formState: { errors } } = useForm<CambiarContrasenaDTO>({ mode: 'onBlur' });

  const onSubmit = (data: CambiarContrasenaDTO) => {
    onSave(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {pwError && (
        <Alert variant="error" title={t('cambiarcontrasenaform.error_al_cambiar_contrasena')} description={pwError.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {pwSuccess && (
        <Alert variant="success" title={t('cambiarcontrasenaform.contrasena_actualizada')} description={t('cambiarcontrasenaform.tu_contrasena_ha_sido_cambiada_exitosamente')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
        <Input
          label={t('cambiarcontrasenaform.contrasena_actual')}
          type={showActual ? 'text' : 'password'}
          required
          autoComplete="current-password"
          error={errors.contrasena_actual?.message}
          trailingIcon={showActual ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          onTrailingClick={() => setShowActual((v) => !v)}
          {...register('contrasena_actual', { required: 'La contraseña actual es obligatoria.' })}
        />

        <Input
          label={t('cambiarcontrasenaform.nueva_contrasena')}
          type={showNueva ? 'text' : 'password'}
          required
          autoComplete="new-password"
          error={errors.nueva_contrasena?.message}
          trailingIcon={showNueva ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          onTrailingClick={() => setShowNueva((v) => !v)}
          {...register('nueva_contrasena', {
            required: 'La nueva contraseña es obligatoria.',
            pattern: { value: PW_REGEX, message: 'Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.' },
          })}
        />

        <Input
          label={t('cambiarcontrasenaform.confirmar_nueva_contrasena')}
          type={showConfirm ? 'text' : 'password'}
          required
          autoComplete="new-password"
          error={errors.confirmar_nueva_contrasena?.message}
          trailingIcon={showConfirm ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          onTrailingClick={() => setShowConfirm((v) => !v)}
          {...register('confirmar_nueva_contrasena', {
            required: 'Confirma tu nueva contraseña.',
            validate: (v) => v === getValues('nueva_contrasena') || 'Las contraseñas no coinciden.',
          })}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" size="md" loading={saving}>{t('cambiarcontrasenaform.cambiar_contrasena')}</Button>
      </div>
    </form>
  );
}
