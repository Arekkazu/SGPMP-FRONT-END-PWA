import { useState, useCallback } from 'react';
import { configuracionRemotaApi } from '../api/iotApi';
import type { ConfiguracionRemotaResponse, ConfigurarRemotamenteDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useConfiguracionRemota() {
  const [historial, setHistorial] = useState<ConfiguracionRemotaResponse[]>([]);
  const [ultima, setUltima] = useState<ConfiguracionRemotaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [encolada, setEncolada] = useState(false);

  const cargar = useCallback(async (idDispositivo: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await configuracionRemotaApi.listarConfiguraciones(idDispositivo);
      setHistorial(data);
      if (data.length > 0) setUltima(data[0]);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const configurar = useCallback(async (idDispositivo: number, dto: ConfigurarRemotamenteDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    setEncolada(false);
    try {
      // 202 Accepted is a success status — Axios resolves it normally
      const nueva = await configuracionRemotaApi.configurar(idDispositivo, dto);
      setHistorial((prev) => [nueva, ...prev]);
      setUltima(nueva);
      // Estado PENDIENTE means the config was enqueued, not yet applied
      setEncolada(nueva.estado === 'PENDIENTE' || nueva.estado === 'pendiente');
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { historial, ultima, loading, saving, error, saveError, encolada, cargar, configurar };
}
