import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ssoApi } from '../api/ssoApi';
import { useAuth } from '../../shared/auth/useAuth';
import type { ApiError } from '../../shared/api/errors';

export type EstadoCallback = 'canjeando' | 'error';

export function useSsoCallback(token: string | null) {
  const { setSession } = useAuth();
  const history = useHistory();
  const [estado, setEstado] = useState<EstadoCallback>(token ? 'canjeando' : 'error');
  const [error, setError] = useState<ApiError | null>(
    token ? null : { code: 'SSO_SIN_TOKEN', message: 'No se recibió un token de AgroFusion en el enlace.', status: 0 }
  );
  const tokenSolicitadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || tokenSolicitadoRef.current === token) return;
    tokenSolicitadoRef.current = token;
    ssoApi
      .canjearToken(token)
      .then((res) => {
        setSession(res.token);
        history.replace(res.perfil_incompleto ? '/sso/completar-perfil' : '/dashboard');
      })
      .catch((e: ApiError) => {
        setError(e);
        setEstado('error');
      });
  }, [token, setSession, history]);

  return { estado, error };
}
