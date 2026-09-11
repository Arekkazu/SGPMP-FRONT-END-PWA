import { useState, useCallback } from 'react';
import { parametrosApi } from '../api/parametrosApi';
import type { ConfiguracionGlobalResponse, CrearConfiguracionGlobalDTO, ActualizarConfiguracionGlobalDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useParametrosGlobales() {
  const [config, setConfig] = useState<ConfiguracionGlobalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parametrosApi.obtener();
      setConfig(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const crear = useCallback(async (dto: CrearConfiguracionGlobalDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await parametrosApi.crear(dto);
      setConfig(nueva);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const actualizar = useCallback(async (id: number, dto: ActualizarConfiguracionGlobalDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await parametrosApi.actualizar(id, dto);
      setConfig(actualizada);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { config, loading, saving, error, saveError, cargar, crear, actualizar };
}
