import { useCallback } from 'react';
import { useAuth } from '../../shared/auth/useAuth';
import { authApi } from '../api/authApi';

export function useLogout() {
  const { clearSession } = useAuth();

  return useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // El cierre local debe completarse aunque el servidor no esté disponible
      // o la sesión ya haya expirado.
    } finally {
      clearSession();
      window.location.replace('/login');
    }
  }, [clearSession]);
}