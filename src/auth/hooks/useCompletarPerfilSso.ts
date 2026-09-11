import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ssoApi } from '../api/ssoApi';
import { useAuth } from '../../shared/auth/useAuth';
import type { ApiError } from '../../shared/api/errors';
import type { CompletarPerfilSsoDTO, SsoPerfilPropio } from '../types';

const ESTADO_PENDIENTE_DATOS = 'Pendiente Datos';

export function useCompletarPerfilSso() {
  const { refreshUserInfo } = useAuth();
  const history = useHistory();
  const [perfil, setPerfil] = useState<SsoPerfilPropio | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await ssoApi.obtenerPerfilPropio();
      if (res.estado_cuenta !== ESTADO_PENDIENTE_DATOS) {
        history.replace('/dashboard');
        return;
      }
      setPerfil(res);
    } catch (e) {
      setLoadError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const completar = useCallback(
    async (dto: Omit<CompletarPerfilSsoDTO, 'version'>): Promise<void> => {
      if (!perfil) return;
      setSaving(true);
      setSaveError(null);
      try {
        await ssoApi.completarPerfil(perfil.id_usuario, { ...dto, version: perfil.version });
        await refreshUserInfo();
        history.replace('/dashboard');
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 412) {
          try {
            setPerfil(await ssoApi.obtenerPerfilPropio());
          } catch {
            // si tampoco se puede refrescar, igual se muestra el aviso de reintentar abajo
          }
          setSaveError({ ...err, message: 'Los datos cambiaron mientras completabas el formulario. Vuelve a enviarlo.' });
        } else if (err.status === 403) {
          history.replace('/dashboard');
        } else {
          setSaveError(err);
        }
      } finally {
        setSaving(false);
      }
    },
    [perfil, refreshUserInfo, history]
  );

  return { perfil, loading, loadError, saving, saveError, completar, recargar: cargar };
}
