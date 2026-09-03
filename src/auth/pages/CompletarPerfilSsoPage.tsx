import React, { useEffect, useRef } from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('auth');
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
          <h1 className="auth-title">{t('completarperfilssopage.cargando_tu_perfil')}</h1>
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
            title={t('completarperfilssopage.no_se_pudo_cargar_tu_perfil')}
            description={loadError?.message || 'Ocurrió un error inesperado.'}
            className="auth-alert"
          />
          <Button variant="secondary" size="md" onClick={() => recargar()}>{t('completarperfilssopage.reintentar')}</Button>
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
        <h1 className="auth-title">{t('completarperfilssopage.completa_tu_perfil')}</h1>
        <p className="auth-sub">{t('completarperfilssopage.estas_ingresando_por_primera_vez_desde')}</p>

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
                label={t('completarperfilssopage.nombres')}
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
                label={t('completarperfilssopage.apellidos')}
                required
                error={errors.apellidos?.message}
                {...register('apellidos', {
                  required: 'Los apellidos son obligatorios.',
                  pattern: { value: NAME_REGEX, message: 'Solo letras, espacios y caracteres españoles.' },
                })}
              />
            </div>

            <div className="auth-field">
              <label className="ds-field__label" htmlFor="tipo_identificacion">{t('completarperfilssopage.tipo_de_identificacion')}<span className="ds-field__req">*</span>
              </label>
              <select
                id="tipo_identificacion"
                className="ds-field__input"
                {...register('tipo_identificacion', { required: true })}
              >
                <option value="CC">{t('completarperfilssopage.cedula_de_ciudadania_cc')}</option>
                <option value="CE">{t('completarperfilssopage.cedula_de_extranjeria_ce')}</option>
                <option value="Pasaporte">{t('completarperfilssopage.pasaporte')}</option>
              </select>
            </div>

            <div className="auth-field">
              <Input
                label={t('completarperfilssopage.numero_de_identificacion')}
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
                label={t('completarperfilssopage.fecha_de_nacimiento')}
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
              <label className="ds-field__label" htmlFor="genero">{t('completarperfilssopage.genero')}<span className="ds-field__req">*</span>
              </label>
              <select id="genero" className="ds-field__input" {...register('genero', { required: true })}>
                <option value="M">{t('completarperfilssopage.masculino_m')}</option>
                <option value="F">{t('completarperfilssopage.femenino_f')}</option>
                <option value="X">{t('completarperfilssopage.no_binario_x')}</option>
                <option value="T">{t('completarperfilssopage.trans_t')}</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={saving}>{t('completarperfilssopage.guardar_y_continuar')}</Button>
        </form>
      </div>
    </div>
  );
}
