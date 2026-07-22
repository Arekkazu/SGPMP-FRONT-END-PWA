import { useState, useCallback } from 'react';
import { calibracionApi, sensorAreaApi } from '../api/iotApi';
import type { CalibracionResponse, SensorAreaResponse, RegistrarCalibracionDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useCalibracion() {
  const [calibraciones, setCalibraciones] = useState<CalibracionResponse[]>([]);
  const [asociacion, setAsociacion] = useState<SensorAreaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAsoc, setLoadingAsoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargarCalibraciones = useCallback(async (idSensor: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await calibracionApi.listarCalibraciones(idSensor);
      setCalibraciones(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarAsociacion = useCallback(async (idSensor: number) => {
    setLoadingAsoc(true);
    setAsociacion(null);
    try {
      const asociaciones = await sensorAreaApi.listarAsociaciones(idSensor);
      // Active association: fecha_finalizacion === null
      const activa = asociaciones.find((a) => a.fecha_finalizacion === null) ?? null;
      setAsociacion(activa);
    } catch {
      setAsociacion(null);
    } finally {
      setLoadingAsoc(false);
    }
  }, []);

  const registrar = useCallback(async (idSensor: number, dto: RegistrarCalibracionDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await calibracionApi.calibrar(idSensor, dto);
      setCalibraciones((prev) => [nueva, ...prev]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { calibraciones, asociacion, loading, loadingAsoc, saving, error, saveError, cargarCalibraciones, cargarAsociacion, registrar };
}
