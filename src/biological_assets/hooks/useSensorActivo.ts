import { useState, useCallback } from 'react';
import { sensoresApi } from '../api/sensoresApi';
import type { AsociarSensorActivoDTO, AsociacionSensorActivoResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useSensorActivo(idActivo: number) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const asociar = useCallback(
    async (dto: AsociarSensorActivoDTO): Promise<AsociacionSensorActivoResponse | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        return await sensoresApi.asociar(idActivo, dto);
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [idActivo]
  );

  return { saving, saveError, asociar, setSaveError };
}
