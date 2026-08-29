import React from 'react';
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

interface FormFields {
  correo_electronico: string;
}

export function ReenviarPage() {
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
        <div className="auth-card auth-center">
          <div className="auth-success-icon">
            <CheckCircle size={28} color="var(--sem-success)" aria-hidden />
          </div>
          <h1 className="auth-title">Correo enviado</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
            Si el correo <strong>{getValues('correo_electronico')}</strong> tiene una cuenta pendiente de
            activación, recibirás un nuevo enlace. Revisa también la carpeta de spam.
          </p>
          <Link to="/login" className="auth-link">Ir a iniciar sesión</Link>
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
        <h1 className="auth-title">Reenviar activación</h1>
        <p className="auth-sub">
          Ingresa tu correo para recibir un nuevo enlace de activación.
        </p>

        {error && (
          <Alert
            variant="error"
            title="Error al reenviar"
            description={error.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label="Correo electrónico"
              type="email"
              required
              placeholder="usuario@dominio.com"
              autoComplete="email"
              error={errors.correo_electronico?.message}
              {...register('correo_electronico', {
                required: 'El correo es obligatorio.',
                pattern: {
                  value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
                  message: 'Formato de correo inválido.',
                },
              })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Reenviar enlace de activación
          </Button>
        </form>

        <hr className="auth-sep" />
        <div className="auth-links">
          <Link to="/login" className="auth-link">Volver al inicio de sesión</Link>
          <Link to="/registro" className="auth-link">Crear cuenta nueva</Link>
        </div>
      </div>
    </div>
  );
}
