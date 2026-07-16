import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRestablecer } from '../hooks/useRestablecer';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import './AuthPages.css';

const PW_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!*])[A-Za-z\d@#$%^&+=!*]{8,}$/;

interface FormFields {
  nueva_contrasena: string;
  confirmar_contrasena: string;
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  const rules = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[0-9]/.test(pw),
    /[@#$%^&+=!*]/.test(pw),
  ];
  const score = rules.filter(Boolean).length;
  const labels = ['', 'Débil', 'Media', 'Buena', 'Alta'];
  const colors = ['', '#c0280a', '#c07a00', '#c07a00', '#2e8634'];
  return { score, label: labels[score] ?? '', color: colors[score] ?? '' };
}

export function RestablecerPage() {
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
  const strength = passwordStrength(pw);

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
          <h1 className="auth-title">Enlace inválido</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
            El enlace de restablecimiento no es válido. Usa el enlace enviado a tu correo.
          </p>
          <Link to="/recuperar-contrasena" className="auth-link">Solicitar nuevo enlace</Link>
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
          <h1 className="auth-title">¡Contraseña restablecida!</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
            Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Link to="/login" className="auth-link">Ir a iniciar sesión →</Link>
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
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-sub">Elige una contraseña segura para tu cuenta.</p>

        {error && (
          <Alert
            variant="error"
            title="Error al restablecer"
            description={error.message}
            className="auth-alert"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <Input
              label="Nueva contraseña"
              type={showPw ? 'text' : 'password'}
              required
              error={errors.nueva_contrasena?.message}
              trailingIcon={showPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              onTrailingClick={() => setShowPw((v) => !v)}
              {...register('nueva_contrasena', {
                required: 'La contraseña es obligatoria.',
                pattern: { value: PW_REGEX, message: 'La contraseña no cumple los requisitos de seguridad.' },
              })}
            />
            <div className="pw-rules">
              {[
                [pw.length >= 8, 'Mínimo 8 caracteres'],
                [/[A-Z]/.test(pw), 'Una mayúscula'],
                [/[0-9]/.test(pw), 'Un número'],
                [/[@#$%^&+=!*]/.test(pw), 'Un símbolo (@ # $ % ^ & + = ! *)'],
                [pw.length > 0 && /^[A-Za-z\d@#$%^&+=!*]+$/.test(pw), 'Solo caracteres permitidos'],
              ].map(([met, label]) => (
                <span key={label as string} className={`pw-rule ${met ? 'pw-rule--met' : ''}`}>
                  {met ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
            {pw && (
              <>
                <div className="pw-strength-bar">
                  <div
                    className="pw-strength-fill"
                    style={{ width: `${strength.score * 25}%`, background: strength.color }}
                  />
                </div>
                <span className="pw-strength-label">
                  Fortaleza: <strong style={{ color: strength.color }}>{strength.label}</strong>
                </span>
              </>
            )}
          </div>

          <div className="auth-field">
            <Input
              label="Confirmar nueva contraseña"
              type={showConfirmPw ? 'text' : 'password'}
              required
              error={errors.confirmar_contrasena?.message}
              trailingIcon={showConfirmPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              onTrailingClick={() => setShowConfirmPw((v) => !v)}
              {...register('confirmar_contrasena', {
                required: 'Confirma tu contraseña.',
                validate: (v) => v === getValues('nueva_contrasena') || 'Las contraseñas no coinciden.',
              })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Restablecer contraseña
          </Button>
        </form>

        <hr className="auth-sep" />
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="auth-link" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
