import { useState, useCallback } from 'react';
import { dashboardLayoutApi } from '../api/personalizacionApi';
import type { DashboardLayoutResponse, GuardarDashboardDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardLayoutApi.obtener();
      setLayout(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: GuardarDashboardDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await dashboardLayoutApi.guardar(dto);
      setLayout(data);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const restaurar = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await dashboardLayoutApi.restaurar();
      setLayout(data);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { layout, loading, saving, error, saveError, cargar, guardar, restaurar };
}
