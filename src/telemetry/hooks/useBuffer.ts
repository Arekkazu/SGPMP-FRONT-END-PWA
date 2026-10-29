// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: panel del buffer con datos del backend |
import { useCallback, useEffect, useState } from 'react';
import { dispositivosApi } from '../api/dispositivosApi';
import type { ApiError } from '../../shared/api/errors';
import type { EstadoBufferSchema } from '../types';

/** TC-DIS-148: estado del buffer Edge de los dispositivos de las fincas del usuario. */
export function useBuffer() {
  const [dispositivos, setDispositivos] = useState<EstadoBufferSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDispositivos(await dispositivosApi.buffer());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { dispositivos, loading, error, cargar };
}
