import { useState, useCallback } from 'react';
import { perfilApi } from '../api/perfilApi';
import type { PerfilResponse, EditarPerfilDTO, CambiarContrasenaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function usePerfil() {
  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pwError, setPwError] = useState<ApiError | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await perfilApi.obtener();
      setPerfil(res);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const editar = useCallback(async (dto: EditarPerfilDTO): Promise<boolean> => {
    if (!perfil) return false;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await perfilApi.editar(perfil.id_usuario, dto);
      setPerfil(res);
      setSaveSuccess(true);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [perfil]);

  const cambiarContrasena = useCallback(async (dto: CambiarContrasenaDTO): Promise<boolean> => {
    if (!perfil) return false;
    setSaving(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await perfilApi.cambiarContrasena(perfil.id_usuario, dto);
      setPwSuccess(true);
      return true;
    } catch (e) {
      setPwError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [perfil]);

  return { perfil, loading, saving, error, saveError, saveSuccess, pwError, pwSuccess, cargar, editar, cambiarContrasena };
}
