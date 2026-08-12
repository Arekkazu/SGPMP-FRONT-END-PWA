import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AlertTriangle, Lock, Loader2, XCircle } from 'lucide-react';
import { useSsoCallback } from '../hooks/useSsoCallback';
import './AuthPages.css';

type TipoError = 'token_invalido' | 'cuenta_bloqueada' | 'cuenta_deshabilitada' | 'generico';

function resolverTipoError(code: string, status: number): TipoError {
  if (code === 'SSO_TOKEN_INVALIDO' || status === 401) return 'token_invalido';
  if (code === 'CUENTA_BLOQUEADA' || status === 423) return 'cuenta_bloqueada';
  if (code === 'CUENTA_DESHABILITADA' || status === 403) return 'cuenta_deshabilitada';
  return 'generico';
}

export function SsoCallbackPage() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');
  const { estado, error } = useSsoCallback(token);

  if (estado === 'canjeando') {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon" style={{ background: 'var(--sem-info-bg)' }} aria-hidden="true">
            <Loader2 size={28} color="var(--sem-info)" className="spin" />
          </div>
          <h1 className="auth-title">Verificando tu sesión con AgroFusion…</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Por favor espera, esto solo toma un momento.
          </p>
        </div>
        <style>{'.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  const tipo = error ? resolverTipoError(error.code, error.status) : 'generico';

  const iconMap: Record<TipoError, React.ReactNode> = {
    token_invalido: <XCircle size={28} color="var(--sem-error)" />,
    cuenta_bloqueada: <Lock size={28} color="var(--sem-warning)" />,
    cuenta_deshabilitada: <Lock size={28} color="var(--sem-error)" />,
    generico: <AlertTriangle size={28} color="var(--sem-error)" />,
  };

  const bgMap: Record<TipoError, string> = {
    token_invalido: 'var(--sem-error-bg)',
    cuenta_bloqueada: 'var(--sem-warning-bg)',
    cuenta_deshabilitada: 'var(--sem-error-bg)',
    generico: 'var(--sem-error-bg)',
  };

  const titleMap: Record<TipoError, string> = {
    token_invalido: 'El enlace expiró o no es válido',
    cuenta_bloqueada: 'Cuenta bloqueada temporalmente',
    cuenta_deshabilitada: 'Cuenta deshabilitada',
    generico: 'No se pudo iniciar sesión con AgroFusion',
  };

  const descMap: Record<TipoError, string> = {
    token_invalido: 'Vuelve a intentar desde AgroFusion.',
    cuenta_bloqueada: error?.message || 'Tu cuenta está bloqueada temporalmente por intentos fallidos. Intenta de nuevo más tarde.',
    cuenta_deshabilitada: error?.message || 'Tu cuenta está deshabilitada. Contacta a un administrador.',
    generico: error?.message || 'Ocurrió un error inesperado. Vuelve a iniciar sesión de la forma habitual.',
  };

  return (
    <div className="auth-bg">
      <div className="auth-card auth-center">
        <div className="auth-success-icon" style={{ background: bgMap[tipo] }} aria-hidden="true">
          {iconMap[tipo]}
        </div>
        <h1 className="auth-title">{titleMap[tipo]}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
          {descMap[tipo]}
        </p>
        <Link to="/login" className="auth-link">Volver al inicio de sesión</Link>
      </div>
    </div>
  );
}
