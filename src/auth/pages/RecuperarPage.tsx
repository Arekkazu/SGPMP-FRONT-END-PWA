import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle } from 'lucide-react';
import { useRecuperar } from '../hooks/useRecuperar';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import './AuthPages.css';

interface FormFields {
  correo_electronico: string;
}

export function RecuperarPage() {
  const { t } = useT('auth');
  const { recuperar, loading, error, sent } = useRecuperar();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormFields>({ mode: 'onBlur' });

  const onSubmit = (data: FormFields) => recuperar(data.correo_electronico);

  if (sent) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon">
            <CheckCircle size={28} color="var(--sem-success)" aria-hidden />
          </div>
          <h1 className="auth-title">{t('recuperarpage.correo_enviado')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>{t('recuperarpage.si_el_correo')}<strong>{getValues('correo_electronico')}</strong> está registrado, recibirás
            un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
          </p>
          <Link to="/login" className="auth-link">{t('recuperarpage.volver_al_inicio_de_sesion')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <Mail size={24} color="white" />
        </div>
        <h1 className="auth-title">{t('recuperarpage.recuperar_contrasena')}</h1>
        <p className="auth-sub">{t('recuperarpage.ingresa_tu_correo_y_te_enviaremos_un_enlace')}</p>

        {error && (
          <Alert
            variant="error"
            title={t('recuperarpage.error_al_enviar')}
            description={error.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label={t('recuperarpage.correo_electronico')}
              type="email"
              required
              placeholder="usuario@dominio.com"
              autoComplete="email"
              error={errors.correo_electronico?.message}
              {...register('correo_electronico', {
                required: t('recuperarpage.el_correo_es_obligatorio'),
                pattern: {
                  value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
                  message: t('recuperarpage.formato_de_correo_invalido'),
                },
              })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>{t('recuperarpage.enviar_enlace_de_recuperacion')}</Button>
        </form>

        <hr className="auth-sep" />
        <div className="auth-links">
          <Link to="/login" className="auth-link">{t('recuperarpage.volver_al_inicio_de_sesion')}</Link>
          <Link to="/registro" className="auth-link">{t('recuperarpage.crear_cuenta_nueva')}</Link>
        </div>
      </div>
    </div>
  );
}
