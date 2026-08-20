import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, UserCog } from 'lucide-react';
import { useCompletarPerfilSso } from '../hooks/useCompletarPerfilSso';
import { Input } from '../../shared/design-system/Input';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import './AuthPages.css';

const NAME_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

interface Fields {
  nombre: string;
  apellidos: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  fecha_nacimiento: string;
  genero: string;
}

export function CompletarPerfilSsoPage() {
  const { perfil, loading, loadError, saving, saveError, completar, recargar } = useCompletarPerfilSso();
  const initializedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Fields>({ mode: 'onBlur' });

  useEffect(() => {
    if (perfil && !initializedRef.current) {
      reset({
        nombre: perfil.nombre || '',
        apellidos: perfil.apellidos || '',
        tipo_identificacion: perfil.tipo_identificacion || 'CC',
        numero_identificacion: perfil.numero_identificacion || '',
        fecha_nacimiento: perfil.fecha_nacimiento || '',
        genero: perfil.genero || 'M',
      });
      initializedRef.current = true;
    }
  }, [perfil, reset]);

  useEffect(() => {
    if (saveError?.status === 409) {
      setError('numero_identificacion', { message: saveError.message });
    }
  }, [saveError, setError]);

  const onSubmit = (data: Fields) => {
    completar(data);
  };

  if (loading) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon" style={{ background: 'var(--sem-info-bg)' }} aria-hidden="true">
            <Loader2 size={28} color="var(--sem-info)" className="spin" />
          </div>
          <h1 className="auth-title">Cargando tu perfil…</h1>
        </div>
        <style>{'.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  if (loadError || !perfil) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <Alert
            variant="error"
            title="No se pudo cargar tu perfil"
            description={loadError?.message || 'Ocurrió un error inesperado.'}
            className="auth-alert"
          />
          <Button variant="secondary" size="md" onClick={() => recargar()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <UserCog size={26} color="white" strokeWidth={1.5} />
        </div>
        <h1 className="auth-title">Completa tu perfil</h1>
        <p className="auth-sub">
          Estás ingresando por primera vez desde AgroFusion. Completa estos datos para continuar.
        </p>

        {saveError && saveError.status !== 409 && (
          <Alert
            variant="error"
            title={saveError.status === 412 ? 'Los datos cambiaron' : 'Error al guardar'}
            description={saveError.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-form-grid">
            <div className="auth-field">
              <Input
                label="Nombres"
                required
                error={errors.nombre?.message}
                {...register('nombre', {
                  required: 'El nombre es obligatorio.',
                  pattern: { value: NAME_REGEX, message: 'Solo letras, espacios y caracteres españoles.' },
                })}
              />
            </div>

            <div className="auth-field">
              <Input
                label="Apellidos"
                required
                error={errors.apellidos?.message}
                {...register('apellidos', {
                  required: 'Los apellidos son obligatorios.',
                  pattern: { value: NAME_REGEX, message: 'Solo letras, espacios y caracteres españoles.' },
                })}
              />
            </div>

            <div className="auth-field">
              <label className="ds-field__label" htmlFor="tipo_identificacion">
                Tipo de identificación <span className="ds-field__req">*</span>
              </label>
              <select
                id="tipo_identificacion"
                className="ds-field__input"
                {...register('tipo_identificacion', { required: true })}
              >
                <option value="CC">Cédula de ciudadanía (CC)</option>
                <option value="CE">Cédula de extranjería (CE)</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>

            <div className="auth-field">
              <Input
                label="Número de identificación"
                required
                maxLength={20}
                error={errors.numero_identificacion?.message}
                {...register('numero_identificacion', {
                  required: 'El número de identificación es obligatorio.',
                })}
              />
            </div>

            <div className="auth-field">
              <Input
                label="Fecha de nacimiento"
                type="date"
                required
                error={errors.fecha_nacimiento?.message}
                {...register('fecha_nacimiento', {
                  required: 'La fecha de nacimiento es obligatoria.',
                  validate: (v) => {
                    const birth = new Date(v);
                    const today = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    const m = today.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                    return age >= 18 || 'Debes ser mayor de 18 años.';
                  },
                })}
              />
            </div>

            <div className="auth-field">
              <label className="ds-field__label" htmlFor="genero">
                Género <span className="ds-field__req">*</span>
              </label>
              <select id="genero" className="ds-field__input" {...register('genero', { required: true })}>
                <option value="M">Masculino (M)</option>
                <option value="F">Femenino (F)</option>
                <option value="X">No binario (X)</option>
                <option value="T">Trans (T)</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={saving}>
            Guardar y continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
