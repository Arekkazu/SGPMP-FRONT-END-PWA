import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import type { ApiError } from '../../shared/api/errors';
import type { UsuarioCreateDTO } from '../types';

export function useRegistro() {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  async function registrar(dto: UsuarioCreateDTO): Promise<boolean> {
    if (!online) {
      setError({
        code: 'OFFLINE',
        message: 'Sin conexión. El registro y la verificación CAPTCHA requieren internet.',
        status: 0,
      });
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.crearUsuario(dto);
      setSuccess(true);
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { registrar, loading, error, success, online };
}
