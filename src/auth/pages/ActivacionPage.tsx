import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '../api/authApi';
import type { ApiError } from '../../shared/api/errors';
import './AuthPages.css';

type Estado = 'cargando' | 'exitoso' | 'expirado' | 'invalido' | 'sin-token';

export function ActivacionPage() {
  const { t } = useT('auth');
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');
  const [estado, setEstado] = useState<Estado>(token ? 'cargando' : 'sin-token');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    authApi
      .activarCuenta(token)
      .then((res) => {
        setMessage(res.message);
        setEstado('exitoso');
      })
      .catch((e: ApiError) => {
        if (e.code === 'TOKEN_EXPIRADO' || e.status === 410) setEstado('expirado');
        else setEstado('invalido');
        setMessage(e.message);
      });
  }, [token]);

  const iconMap: Record<Estado, React.ReactNode> = {
    cargando:   <Loader2 size={28} color="var(--sem-info)" className="spin" />,
    exitoso:    <CheckCircle size={28} color="var(--sem-success)" />,
    expirado:   <AlertTriangle size={28} color="var(--sem-warning)" />,
    invalido:   <XCircle size={28} color="var(--sem-error)" />,
    'sin-token': <AlertTriangle size={28} color="var(--sem-warning)" />,
  };

  const bgMap: Record<Estado, string> = {
    cargando:   'var(--sem-info-bg)',
    exitoso:    'var(--sem-success-bg)',
    expirado:   'var(--sem-warning-bg)',
    invalido:   'var(--sem-error-bg)',
    'sin-token': 'var(--sem-warning-bg)',
  };

  const titleMap: Record<Estado, string> = {
    cargando:   'Verificando enlace…',
    exitoso:    '¡Cuenta activada exitosamente!',
    expirado:   'El enlace de activación ha expirado',
    invalido:   'Enlace inválido o ya utilizado',
    'sin-token': 'Sin token de activación',
  };

  const descMap: Record<Estado, string> = {
    cargando:   'Por favor espera mientras verificamos tu enlace de activación.',
    exitoso:    message || 'Ya puedes iniciar sesión con tus credenciales.',
    expirado:   'Por seguridad los enlaces de activación tienen una vigencia limitada. Solicita un nuevo enlace.',
    invalido:   message || 'El enlace es incorrecto o la cuenta ya ha sido activada.',
    'sin-token': 'Usa el enlace enviado a tu correo o solicita uno nuevo.',
  };

  return (
    <div className="auth-bg">
      <div className="auth-card auth-center">
        <div
          className="auth-success-icon"
          style={{ background: bgMap[estado] }}
          aria-hidden="true"
        >
          {iconMap[estado]}
        </div>
        <h1 className="auth-title">{titleMap[estado]}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)', lineHeight: '1.6' }}>
          {descMap[estado]}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', alignItems: 'center' }}>
          {estado === 'exitoso' && (
            <Link to="/login" className="auth-link">{t('activacionpage.ir_a_iniciar_sesion')}</Link>
          )}
          {(estado === 'expirado' || estado === 'sin-token') && (
            <Link to="/reenviar-activacion" className="auth-link">{t('activacionpage.solicitar_nuevo_enlace_de_activacion')}</Link>
          )}
          <Link to="/login" className="auth-link" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('activacionpage.volver_al_inicio_de_sesion')}</Link>
        </div>
      </div>
      <style>{'.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
