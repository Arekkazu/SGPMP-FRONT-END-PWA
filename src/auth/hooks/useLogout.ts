// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-16: motivo del cierre de sesión y vuelta a la pantalla anterior |
// | 2026-11-21 | Arekkazu | INC-M08-385-G026 RF-107: la cola y el historial de avisos se descartan sin depender de la recarga |
import { useCallback } from 'react';
import { useAuth } from '../../shared/auth/useAuth';
import { authApi } from '../api/authApi';
import { marcarSesionCerrada, type MotivoSesionCerrada } from '../../shared/api/http';
import { olvidarRutaRetorno } from '../../shared/auth/rutaRetorno';
import { limpiarToasts } from '../../shared/hooks/useToast';

export function useLogout() {
  const { clearSession } = useAuth();

  /**
   * Sin motivo es el logout voluntario: no deja aviso ni ruta de retorno. Con motivo
   * (`inactividad`) LoginPage lo explica y el reingreso vuelve a la misma pantalla (T-16).
   */
  return useCallback(async (motivo?: MotivoSesionCerrada): Promise<void> => {
    if (motivo) marcarSesionCerrada(motivo);
    else olvidarRutaRetorno();
    try {
      await authApi.logout();
    } catch {
      // El cierre local debe completarse aunque el servidor no esté disponible
      // o la sesión ya haya expirado.
    } finally {
      limpiarToasts();
      clearSession();
      window.location.replace(`${import.meta.env.BASE_URL}login`);
    }
  }, [clearSession]);
}
