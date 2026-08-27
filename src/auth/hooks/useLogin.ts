import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../../shared/auth/useAuth';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import type { ApiError } from '../../shared/api/errors';
import type { LoginDTO } from '../types';

export function useLogin() {
  const { setSession } = useAuth();
  const history = useHistory();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function login(dto: LoginDTO): Promise<boolean> {
    if (!online) {
      setError({
        code: 'OFFLINE',
        message: 'Sin conexión. El inicio de sesión requiere conexión a internet.',
        status: 0,
      });
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(dto);
      setSession(res.token, res.expira_en);
      history.replace('/dashboard');
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { login, loading, error, online };
}
