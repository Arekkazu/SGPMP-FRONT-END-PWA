import { useState, useCallback } from 'react';
import { dashboardLayoutApi } from '../api/personalizacionApi';
import type {
  DashboardLayoutResponse,
  GuardarDashboardDTO,
  WidgetCatalogoItem,
  WidgetDatosResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayoutResponse | null>(null);
  // El catalogo ya no esta quemado en el componente: lo define modulo9.widgets y
  // el backend lo filtra por el rol, asi que un Productor no ve paneles tecnicos
  // que el guardado le iba a rechazar con 403.
  const [catalogo, setCatalogo] = useState<WidgetCatalogoItem[]>([]);
  const [datos, setDatos] = useState<WidgetDatosResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cat] = await Promise.all([
        dashboardLayoutApi.obtener(),
        dashboardLayoutApi.catalogo(),
      ]);
      setLayout(data);
      setCatalogo(cat);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cat, filas] = await Promise.all([
        dashboardLayoutApi.obtener(),
        dashboardLayoutApi.catalogo(),
        dashboardLayoutApi.datos(),
      ]);
      setLayout(data);
      setCatalogo(cat);
      setDatos(filas);
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

  return {
    layout, catalogo, datos, loading, saving, error, saveError,
    cargar, cargarDatos, guardar, restaurar,
  };
}
