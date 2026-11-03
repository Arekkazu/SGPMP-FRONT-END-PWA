// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-16: motivo del cierre de sesión y vuelta a la pantalla anterior |
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../../shared/auth/useAuth';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { contarPendientes } from '../../shared/sync/syncQueue';
import { descartarAvisoSesionCerrada } from '../../shared/api/http';
import { tomarRutaRetorno } from '../../shared/auth/rutaRetorno';
import type { ApiError } from '../../shared/api/errors';
import type { LoginDTO } from '../types';

export function useLogin() {
  const { setSession } = useAuth();
  const history = useHistory();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendientes, setPendientes] = useState(0);

  // Una sesión que murió mientras se trabajaba offline deja la cola en Dexie: se
  // reenvía al entrar, y el login lo anuncia para que el usuario sepa por qué volver.
  useEffect(() => {
    contarPendientes().then(setPendientes, () => {});
  }, []);

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
      setSession(res.token);
      descartarAvisoSesionCerrada();
      // T-16: de vuelta a la pantalla donde se cerró la sesión, no al Panel principal.
      history.replace(tomarRutaRetorno() ?? '/dashboard');
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { login, loading, error, online, pendientes };
}
