import { useState, useCallback } from 'react';
import { identidadVisualApi } from '../api/personalizacionApi';
import type { IdentidadVisualResponse, GuardarIdentidadVisualDTO, ActualizarIdentidadVisualDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useIdentidadVisual() {
  const [identidad, setIdentidad] = useState<IdentidadVisualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [conflicto412, setConflicto412] = useState(false);

  const cargar = useCallback(async (idFinca: number) => {
    setLoading(true);
    setError(null);
    setConflicto412(false);
    try {
      const data = await identidadVisualApi.obtener(idFinca);
      setIdentidad(data);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 404) {
        setIdentidad(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarIdentidadVisualDTO, logo?: File): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await identidadVisualApi.guardar(dto, logo);
      setIdentidad(data);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const actualizar = useCallback(async (idFinca: number, dto: ActualizarIdentidadVisualDTO, logo?: File): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    setConflicto412(false);
    try {
      const data = await identidadVisualApi.actualizar(idFinca, dto, logo);
      setIdentidad(data);
      return true;
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 412) {
        setConflicto412(true);
      } else {
        setSaveError(err);
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { identidad, loading, saving, error, saveError, conflicto412, cargar, guardar, actualizar };
}
