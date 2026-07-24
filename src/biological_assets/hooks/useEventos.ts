import { useState, useCallback } from 'react';
import { eventosApi } from '../api/eventosApi';
import type {
  EventoActivoResponse,
  RegistrarEventoCrecimientoDTO,
  RegistrarEventoCrecimientoResponse,
  RegistrarEventoBajaDTO,
  RegistrarEventoSanitarioDTO,
  RegistrarEventoSanitarioResponse,
  RegistrarEventoProductivoDTO,
  RegistrarEventoReproductivoDTO,
  RegistrarEventoReproductivoResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useEventos(idActivo: number) {
  const [eventos, setEventos] = useState<EventoActivoResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  /** Historial de eventos en lote — solo POBLACIONAL (INDIVIDUAL → 409). */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventosApi.listar(idActivo);
      setEventos(data.eventos ?? []);
      setTotal(data.total ?? (data.eventos?.length ?? 0));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [idActivo]);

  function makeCreator<TDto, TRes>(fn: (id: number, dto: TDto) => Promise<TRes>) {
    return async (dto: TDto): Promise<TRes | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        return await fn(idActivo, dto);
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    };
  }

  const registrarCrecimiento = useCallback(
    makeCreator<RegistrarEventoCrecimientoDTO, RegistrarEventoCrecimientoResponse>(eventosApi.crecimiento),
    [idActivo]
  );
  const registrarBaja = useCallback(
    makeCreator<RegistrarEventoBajaDTO, EventoActivoResponse>(eventosApi.baja),
    [idActivo]
  );
  const registrarSanitario = useCallback(
    makeCreator<RegistrarEventoSanitarioDTO, RegistrarEventoSanitarioResponse>(eventosApi.sanitario),
    [idActivo]
  );
  const registrarProductivo = useCallback(
    makeCreator<RegistrarEventoProductivoDTO, EventoActivoResponse>(eventosApi.productivo),
    [idActivo]
  );
  const registrarReproductivo = useCallback(
    makeCreator<RegistrarEventoReproductivoDTO, RegistrarEventoReproductivoResponse>(eventosApi.reproductivo),
    [idActivo]
  );

  return {
    eventos, total, loading, error, saving, saveError, cargar,
    registrarCrecimiento, registrarBaja, registrarSanitario, registrarProductivo, registrarReproductivo,
    setSaveError,
  };
}
