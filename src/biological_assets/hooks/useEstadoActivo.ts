import { useState, useCallback } from 'react';
import { estadoApi } from '../api/estadoApi';
import type {
  CambiarEstadoDTO,
  CambioEstadoResponse,
  CerrarCicloDTO,
  CierreActivoResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useEstadoActivo(idActivo: number) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cambiarEstado = useCallback(
    async (dto: CambiarEstadoDTO): Promise<CambioEstadoResponse | null> => {
      setSaving(true);
      setError(null);
      try {
        return await estadoApi.cambiarEstado(idActivo, dto);
      } catch (e) {
        setError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [idActivo]
  );

  const cerrarCiclo = useCallback(
    async (dto: CerrarCicloDTO): Promise<CierreActivoResponse | null> => {
      setSaving(true);
      setError(null);
      try {
        return await estadoApi.cerrarCiclo(idActivo, dto);
      } catch (e) {
        setError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [idActivo]
  );

  return { saving, error, cambiarEstado, cerrarCiclo, setError };
}
