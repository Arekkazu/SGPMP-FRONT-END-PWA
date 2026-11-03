// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: actualiza detalle sin perder borradores |
import { useState, useCallback, useRef, useEffect } from 'react';
import { alertasApi } from '../api/alertasApi';
import type { AlertaDetalleSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useAlertaDetalle() {
  const [detalle, setDetalle] = useState<AlertaDetalleSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const revision = useRef(0);
  useEffect(() => () => { revision.current += 1; }, []);

  const cargar = useCallback(async (idAlerta: number, conservarActual = false) => {
    const solicitud = ++revision.current;
    setLoading(true);
    setError(null);
    if (!conservarActual) setDetalle(null);
    try {
      const data = await alertasApi.detalle(idAlerta);
      if (solicitud !== revision.current) return null;
      setDetalle(data);
      return data;
    } catch (e) {
      if (solicitud === revision.current) setError(e as ApiError);
      return null;
    } finally {
      if (solicitud === revision.current) setLoading(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    revision.current += 1;
    setDetalle(null); setError(null); setLoading(false);
  }, []);
  return { detalle, loading, error, cargar, limpiar };
}
