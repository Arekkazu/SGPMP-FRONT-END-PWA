import { useState, useCallback } from 'react';
import { dispositivosApi } from '../api/iotApi';
import type { DispositivoIotResponse, RegistrarDispositivoIotDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useDispositivosIot() {
  const [dispositivos, setDispositivos] = useState<DispositivoIotResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (soloActivos = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await dispositivosApi.listar(soloActivos);
      const data: DispositivoIotResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setDispositivos(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarDispositivoIotDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await dispositivosApi.registrar(dto);
      setDispositivos((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const desactivar = useCallback(async (id: number): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await dispositivosApi.desactivar(id);
      setDispositivos((prev) => prev.map((d) => (d.id_dispositivo_iot === id ? actualizado : d)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { dispositivos, loading, saving, error, saveError, cargar, registrar, desactivar };
}
