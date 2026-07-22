import { useState, useCallback } from 'react';
import { metricasApi } from '../api/especiesConfigApi';
import type { MetricaProduccionResponse, RegistrarMetricaDTO, EditarMetricaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useMetricasProduccion() {
  const [metricas, setMetricas] = useState<MetricaProduccionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idEspecie: number, soloActivas = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await metricasApi.listar(idEspecie, soloActivas);
      const data: MetricaProduccionResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setMetricas(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarMetricaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await metricasApi.registrar(dto);
      setMetricas((prev) => [...prev, nueva]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarMetricaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await metricasApi.editar(id, dto);
      setMetricas((prev) => prev.map((m) => (m.id_metrica_produccion === id ? actualizada : m)));
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
      const actualizada = await metricasApi.desactivar(id);
      setMetricas((prev) => prev.map((m) => (m.id_metrica_produccion === id ? actualizada : m)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { metricas, loading, saving, error, saveError, cargar, registrar, editar, desactivar };
}
