import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRestablecer } from '../hooks/useRestablecer';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { PasswordStrength } from '../../shared/design-system/PasswordStrength';
import { Alert } from '../../shared/design-system/Alert';
import './AuthPages.css';

const PW_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!*])[A-Za-z\d@#$%^&+=!*]{8,}$/;

interface FormFields {
  nueva_contrasena: string;
  confirmar_contrasena: string;
}

export function RestablecerPage() {
  const { t } = useT('auth');
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const { restablecer, loading, error, success } = useRestablecer();

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormFields>({ mode: 'onBlur' });

  const pw = watch('nueva_contrasena', '');

  const onSubmit = (data: FormFields) => {
    if (!token) return;
    restablecer({
      token,
      nueva_contrasena: data.nueva_contrasena,
      confirmar_contrasena: data.confirmar_contrasena,
    });
  };

  if (!token) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon" style={{ background: 'var(--sem-warning-bg)' }}>
            <AlertTriangle size={28} color="var(--sem-warning)" aria-hidden />
          </div>
          <h1 className="auth-title">{t('restablecerpage.enlace_invalido')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>{t('restablecerpage.el_enlace_de_restablecimiento_no_es_valido')}</p>
          <Link to="/recuperar-contrasena" className="auth-link">{t('restablecerpage.solicitar_nuevo_enlace')}</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon">
            <CheckCircle size={28} color="var(--sem-success)" aria-hidden />
          </div>
          <h1 className="auth-title">{t('restablecerpage.contrasena_restablecida')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>{t('restablecerpage.tu_contrasena_ha_sido_actualizada')}</p>
          <Link to="/login" className="auth-link">{t('restablecerpage.ir_a_iniciar_sesion')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M8 22C8 16 12 11 16 11C20 11 24 16 24 22" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="17" r="2" fill="white" opacity=".8"/>
            <circle cx="20" cy="17" r="2" fill="white" opacity=".8"/>
            <path d="M13 21C13 19.5 14.3 18.5 16 18.5C17.7 18.5 19 19.5 19 21" stroke="white" strokeWidth="1.5"/>
          </svg>
        </div>
        <h1 className="auth-title">{t('restablecerpage.nueva_contrasena')}</h1>
        <p className="auth-sub">{t('restablecerpage.elige_una_contrasena_segura_para_tu_cuenta')}</p>

        {error && (
          <Alert
            variant="error"
            title={t('restablecerpage.error_al_restablecer')}
            description={error.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label={t('restablecerpage.nueva_contrasena')}
              type={showPw ? 'text' : 'password'}
              required
              ariaDescribedBy="restablecer-contrasena-fortaleza"
              error={errors.nueva_contrasena?.message}
              trailingIcon={showPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              onTrailingClick={() => setShowPw((v) => !v)}
              {...register('nueva_contrasena', {
                required: t('restablecerpage.la_contrasena_es_obligatoria'),
                pattern: { value: PW_REGEX, message: t('restablecerpage.la_contrasena_no_cumple_los_requisitos_de') },
              })}
            />
            <PasswordStrength id="restablecer-contrasena-fortaleza" valor={pw} />
          </div>

          <div className="auth-field">
            <Input
              label={t('restablecerpage.confirmar_nueva_contrasena')}
              type={showConfirmPw ? 'text' : 'password'}
              required
              error={errors.confirmar_contrasena?.message}
              trailingIcon={showConfirmPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              onTrailingClick={() => setShowConfirmPw((v) => !v)}
              {...register('confirmar_contrasena', {
                required: t('restablecerpage.confirma_tu_contrasena'),
                validate: (v) => v === getValues('nueva_contrasena') || t('validacion.las_contrasenas_no_coinciden', { ns: 'common' }),
              })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>{t('restablecerpage.restablecer_contrasena')}</Button>
        </form>

        <hr className="auth-sep" />
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="auth-link" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('restablecerpage.volver_al_inicio_de_sesion')}</Link>
        </div>
      </div>
    </div>
  );
}
