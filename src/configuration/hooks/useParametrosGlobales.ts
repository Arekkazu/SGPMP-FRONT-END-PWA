import { useState, useCallback, useRef } from 'react';
import { parametrosApi } from '../api/parametrosApi';
import type { ConfiguracionGlobalResponse, CrearConfiguracionGlobalDTO, ActualizarConfiguracionGlobalDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

export function useParametrosGlobales() {
  const [config, setConfig] = useState<ConfiguracionGlobalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const consultando = useRef(false);
  const guardando = useRef(false);
  const revision = useRef(0);

  const cargar = useCallback(async () => {
    if (consultando.current || guardando.current) return;
    consultando.current = true;
    const actual = ++revision.current;
    setLoading(true);
    setError(null);
    try {
      const data = await parametrosApi.obtener();
      if (actual === revision.current) {
        setConfig(data);
        setSaveError(null);
      }
    } catch (e) {
      if (actual === revision.current) setError(e as ApiError);
    } finally {
      consultando.current = false;
      if (actual === revision.current) setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (
    operacion: () => Promise<ConfiguracionGlobalResponse>,
    exito: 'registrado' | 'guardado',
  ): Promise<boolean> => {
    // El ref también cubre dos activaciones antes del siguiente render.
    if (guardando.current) return false;
    guardando.current = true;
    ++revision.current;
    setLoading(false);
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await operacion();
      setConfig(nueva);
      setError(null);
      avisarExito(exito);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      guardando.current = false;
      setSaving(false);
    }
  }, []);

  const crear = useCallback((dto: CrearConfiguracionGlobalDTO) =>
    guardar(() => parametrosApi.crear(dto), 'registrado'), [guardar]);

  const actualizar = useCallback((id: number, dto: ActualizarConfiguracionGlobalDTO) =>
    guardar(() => parametrosApi.actualizar(id, dto), 'guardado'), [guardar]);

  return { config, loading, saving, error, saveError, cargar, crear, actualizar };
}
