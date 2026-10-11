import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Isotipo } from '../../shared/design-system/Isotipo';
import { consumirAvisoSesionCerrada } from '../../shared/api/http';
import type { LoginDTO } from '../types';
import './AuthPages.css';
import { SelectorIdioma } from '../../shared/design-system/SelectorIdioma';

export function LoginPage() {
  const { t } = useT('auth');
  const { login, loading, error, online } = useLogin();
  const [showPw, setShowPw] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  // El interceptor de http.ts deja esta bandera antes de un `location.replace`
  // a /login, asi que se lee una sola vez, al montar tras esa recarga completa.
  const [sesionCerrada] = useState(() => consumirAvisoSesionCerrada());

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginDTO>({ mode: 'onBlur' });

  const onSubmit = async (data: LoginDTO) => {
    const ok = await login(data);
    if (!ok && online) {
      setFailedAttempts((n) => Math.min(n + 1, 5));
    }
  };

  return (
    <div className="auth-bg">
      <SelectorIdioma />
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <Isotipo size={30} />
        </div>
        <h1 className="auth-title">{t('loginpage.iniciar_sesion')}</h1>
        <p className="auth-sub">{t('loginpage.nombre_del_producto')}</p>

        {sesionCerrada && (
          <Alert
            variant="warning"
            title={t('loginpage.sesion_cerrada')}
            description={t('loginpage.sesion_cerrada_descripcion')}
            className="auth-alert"
          />
        )}

        {!online && (
          <Alert
            variant="warning"
            title={t('loginpage.sin_conexion')}
            description={t('loginpage.el_inicio_de_sesion_requiere_conexion_a')}
            className="auth-alert"
          />
        )}

        {error && error.code !== 'OFFLINE' && (
          <>
            <Alert
              variant="error"
              title={t('loginpage.error_al_iniciar_sesion')}
              description={error.message}
              className="auth-alert"
            />
            {error.code === 'CUENTA_PENDIENTE' && (
              // El mensaje del backend remite a "re-enviar token de activación";
              // el correo ya tecleado prellena el formulario de destino.
              <p style={{ textAlign: 'center', marginBottom: 'var(--s4)' }}>
                <Link
                  to={{
                    pathname: '/reenviar-activacion',
                    state: { correo: getValues('correo_electronico') },
                  }}
                  className="auth-link"
                >{t('loginpage.reenviar_correo_de_activacion')}</Link>
              </p>
            )}
          </>
        )}

        {failedAttempts > 0 && (
          <div style={{ marginBottom: 'var(--s4)' }}>
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--sem-error)', fontWeight: 700, marginBottom: 6 }}>
              {t('loginpage.intentos_fallidos', { count: failedAttempts })}
            </p>
            <div className="auth-attempts-bar" role="img" aria-label={t('loginpage.intentos_fallidos', { count: failedAttempts })}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`auth-att-dot ${i <= failedAttempts ? 'auth-att-dot--used' : ''}`} />
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label={t('loginpage.correo_electronico')}
              type="email"
              placeholder="usuario@dominio.com"
              autoComplete="email"
              required
              error={errors.correo_electronico?.message}
              {...register('correo_electronico', {
                required: t('loginpage.el_correo_es_obligatorio'),
                pattern: {
                  value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
                  message: t('loginpage.el_formato_del_correo_electronico_no_es'),
                },
              })}
            />
          </div>

          <div className="auth-field">
            <Input
              label={t('loginpage.contrasena')}
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              required
              error={errors.contrasena?.message}
              trailingIcon={showPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              onTrailingClick={() => setShowPw((v) => !v)}
              {...register('contrasena', { required: t('loginpage.la_contrasena_es_obligatoria') })}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!online}
          >{t('loginpage.ingresar')}</Button>
        </form>

        <hr className="auth-sep" />
        <div className="auth-links">
          <Link to="/recuperar-contrasena" className="auth-link">{t('loginpage.olvidaste_tu_contrasena')}</Link>
          <Link to="/registro" className="auth-link">{t('loginpage.crear_cuenta_nueva')}</Link>
        </div>
      </div>
    </div>
  );
}
