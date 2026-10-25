import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '../api/authApi';
import type { ApiError } from '../../shared/api/errors';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import './AuthPages.css';
import { SelectorIdioma } from '../../shared/design-system/SelectorIdioma';
import { Isotipo } from '../../shared/design-system/Isotipo';

interface FormFields {
  correo_electronico: string;
}

export function ReenviarPage() {
  const { t } = useT('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [sent, setSent] = useState(false);

  // El login envía el correo ya tecleado cuando la cuenta está pendiente.
  const { state } = useLocation<{ correo?: string } | undefined>();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormFields>({
    mode: 'onBlur',
    defaultValues: { correo_electronico: state?.correo ?? '' },
  });

  const onSubmit = async (data: FormFields) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.reenviarToken(data.correo_electronico);
      setSent(true);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-bg">
        <SelectorIdioma />
        <div className="auth-card auth-center">
          <div className="auth-success-icon">
            <CheckCircle size={28} color="var(--sem-success)" aria-hidden />
          </div>
          <h1 className="auth-title">{t('reenviarpage.correo_enviado')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>{t('reenviarpage.si_el_correo')}{' '}<strong>{getValues('correo_electronico')}</strong>{' '}{t('reenviarpage.tiene_cuenta_pendiente')}
          </p>
          <Link to="/login" className="auth-link">{t('reenviarpage.ir_a_iniciar_sesion')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <SelectorIdioma />
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <Isotipo size={30} />
        </div>
        <h1 className="auth-title">{t('reenviarpage.reenviar_activacion')}</h1>
        <p className="auth-sub">{t('reenviarpage.ingresa_tu_correo_para_recibir_un_nuevo')}</p>

        {error && (
          <Alert
            variant="error"
            title={t('reenviarpage.error_al_reenviar')}
            description={error.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label={t('reenviarpage.correo_electronico')}
              type="email"
              required
              placeholder="usuario@dominio.com"
              autoComplete="email"
              error={errors.correo_electronico?.message}
              {...register('correo_electronico', {
                required: t('reenviarpage.el_correo_es_obligatorio'),
                pattern: {
                  value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
                  message: t('reenviarpage.formato_de_correo_invalido'),
                },
              })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>{t('reenviarpage.reenviar_enlace_de_activacion')}</Button>
        </form>

        <hr className="auth-sep" />
        <div className="auth-links">
          <Link to="/login" className="auth-link">{t('reenviarpage.volver_al_inicio_de_sesion')}</Link>
          <Link to="/registro" className="auth-link">{t('reenviarpage.crear_cuenta_nueva')}</Link>
        </div>
      </div>
    </div>
  );
}
