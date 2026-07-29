import { useState, useCallback } from 'react';
import { retroApi } from '../api/retroApi';
import type {
  RegistrarRetroalimentacionDTO,
  RetroalimentacionClinicaResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/**
 * RF-72 · Registro de retroalimentación clínica (solo Vet).
 * El backend no expone GET de lista todavía (ver TASKS.md § Pendientes),
 * por lo que este hook solo cubre el registro.
 */
export function useRetroalimentacion() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const registrar = useCallback(
    async (dto: RegistrarRetroalimentacionDTO): Promise<RetroalimentacionClinicaResponse | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        return await retroApi.registrar(dto);
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

  return { saving, saveError, registrar, limpiarSaveError };
}
