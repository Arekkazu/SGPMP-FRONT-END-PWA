import React from 'react';
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
          <h1 className="auth-title">Correo enviado</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
            Si el correo <strong>{getValues('correo_electronico')}</strong> está registrado, recibirás
            un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
          </p>
          <Link to="/login" className="auth-link">Volver al inicio de sesión</Link>
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
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-sub">
          Ingresa tu correo y te enviaremos un enlace de recuperación.
        </p>

        {error && (
          <Alert
            variant="error"
            title="Error al enviar"
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
            Enviar enlace de recuperación
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
