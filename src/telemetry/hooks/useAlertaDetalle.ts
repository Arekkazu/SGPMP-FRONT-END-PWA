import { useState, useCallback } from 'react';
import { alertasApi } from '../api/alertasApi';
import type { AlertaDetalleSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useAlertaDetalle() {
  const [detalle, setDetalle] = useState<AlertaDetalleSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idAlerta: number) => {
    setLoading(true);
    setError(null);
    setDetalle(null);
    try {
      const data = await alertasApi.detalle(idAlerta);
      setDetalle(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const limpiar = useCallback(() => { setDetalle(null); setError(null); }, []);

  return { detalle, loading, error, cargar, limpiar };
}
