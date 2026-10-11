import { useState, useCallback } from 'react';
import { sensoresDispositivoApi, sensorAreaApi } from '../api/iotApi';
import type { SensorResponse, AsociarSensorAreaDTO, AsociarSensorAreaResponse, RegistrarSensorDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useSensores() {
  const [sensores, setSensores] = useState<SensorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idDispositivo: number) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await sensoresDispositivoApi.listar(idDispositivo);
      const data: SensorResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setSensores(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  // Devuelve la respuesta (null si falló): la de una reasignación trae las
  // asociaciones sensor→activo que quedaron superadas (#290).
  const asociar = useCallback(async (idSensor: number, dto: AsociarSensorAreaDTO): Promise<AsociarSensorAreaResponse | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      return await sensorAreaApi.asociar(idSensor, dto);
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const registrar = useCallback(async (idDispositivo: number, dto: RegistrarSensorDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await sensoresDispositivoApi.registrar(idDispositivo, dto);
      setSensores((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { sensores, loading, saving, error, saveError, cargar, asociar, registrar };
}
