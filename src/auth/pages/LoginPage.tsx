import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import type { LoginDTO } from '../types';
import './AuthPages.css';

const AGROFUSION_LOGIN_URL = import.meta.env.VITE_AGROFUSION_LOGIN_URL as string | undefined;

export function LoginPage() {
  const { t } = useT('auth');
  const { login, loading, error, online } = useLogin();
  const [showPw, setShowPw] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleAgroFusionLogin = () => {
    if (AGROFUSION_LOGIN_URL) window.location.href = AGROFUSION_LOGIN_URL;
  };

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
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M8 22C8 16 12 11 16 11C20 11 24 16 24 22" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="17" r="2" fill="white" opacity=".8"/>
            <circle cx="20" cy="17" r="2" fill="white" opacity=".8"/>
            <path d="M13 21C13 19.5 14.3 18.5 16 18.5C17.7 18.5 19 19.5 19 21" stroke="white" strokeWidth="1.5"/>
            <path d="M10 11L8 8M22 11L24 8" stroke="#a8d8a8" strokeWidth="1.5"/>
          </svg>
        </div>
        <h1 className="auth-title">{t('loginpage.iniciar_sesion')}</h1>
        <p className="auth-sub">{t('loginpage.sgp_multiespecie_sistema_de_gestion_pecuaria')}</p>

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
            <p style={{ fontSize: '11px', color: 'var(--sem-error)', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Intentos fallidos ({failedAttempts} de 5)
            </p>
            <div className="auth-attempts-bar" role="img" aria-label={`${failedAttempts} de 5 intentos fallidos`}>
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

        <div className="auth-divider" role="presentation">o</div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          disabled={!AGROFUSION_LOGIN_URL}
          onClick={handleAgroFusionLogin}
        >
          <Building2 size={18} aria-hidden />{t('loginpage.continuar_con_agrofusion')}</Button>
        {!AGROFUSION_LOGIN_URL && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--s2)' }}>{t('loginpage.configuracion_pendiente')}</p>
        )}

        <hr className="auth-sep" />
        <div className="auth-links">
          <Link to="/recuperar-contrasena" className="auth-link">{t('loginpage.olvidaste_tu_contrasena')}</Link>
          <Link to="/registro" className="auth-link">{t('loginpage.crear_cuenta_nueva')}</Link>
        </div>
      </div>
    </div>
  );
}
