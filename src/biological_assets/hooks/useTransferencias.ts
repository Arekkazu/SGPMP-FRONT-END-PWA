import { useState, useCallback } from 'react';
import { transferenciasApi } from '../api/transferenciasApi';
import type { InfraestructuraDisponibleResponse, RegistrarTransferenciaDTO, TransferenciaResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useTransferencias(idActivo: number) {
  const [disponibles, setDisponibles] = useState<InfraestructuraDisponibleResponse[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [errorDisponibles, setErrorDisponibles] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargarDisponibles = useCallback(async () => {
    setLoadingDisponibles(true);
    setErrorDisponibles(null);
    try {
      const res = await transferenciasApi.disponibles(idActivo);
      setDisponibles(res ?? []);
    } catch (e) {
      setErrorDisponibles(e as ApiError);
    } finally {
      setLoadingDisponibles(false);
    }
  }, [idActivo]);

  const registrar = useCallback(
    async (dto: RegistrarTransferenciaDTO): Promise<TransferenciaResponse | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        return await transferenciasApi.registrar(idActivo, dto);
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [idActivo]
  );

  return { disponibles, loadingDisponibles, errorDisponibles, saving, saveError, cargarDisponibles, registrar, setSaveError };
}
