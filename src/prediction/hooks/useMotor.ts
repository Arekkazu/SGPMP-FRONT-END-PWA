import { useState, useCallback } from 'react';
import { motorApi } from '../api/motorApi';
import { modelosApi } from '../api/modelosApi';
import { cacheMotor, getMotorCache } from '../db/prediccionTables';
import type {
  ConfiguracionMotorIAResponse,
  ConfigurarMotorDTO,
  VersionModeloResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/**
 * RF-65 · Configuración del motor de inferencia.
 * Carga las configuraciones por tipo de modelo (+ versiones disponibles para el
 * selector) con caché Dexie read-only, y hace upsert.
 */
export function useMotor() {
  const [configs, setConfigs] = useState<ConfiguracionMotorIAResponse[]>([]);
  const [versiones, setVersiones] = useState<VersionModeloResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await motorApi.listar();
      const items = data.items ?? [];
      setConfigs(items);
      setFromCache(false);
      // Versiones para el selector (best-effort; no bloquea la vista si falla).
      try {
        const vers = await modelosApi.listar({ limit: 100 });
        setVersiones(vers.items ?? []);
      } catch {
        setVersiones([]);
      }
      const now = Date.now();
      try {
        await cacheMotor(
          items.map((c) => ({
            id_configuracion_motor: c.id_configuracion_motor,
            tipo_modelo: c.tipo_modelo,
            umbral_riesgo_alto: c.umbral_riesgo_alto,
            umbral_alerta_critica: c.umbral_alerta_critica,
            ventana_temporal_min: c.ventana_temporal_min,
            modo_ejecucion: c.modo_ejecucion,
            es_activa: c.es_activa,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      const cached = await getMotorCache();
      if (cached.length > 0) {
        setConfigs(
          cached.map((c) => ({
            id_configuracion_motor: c.id_configuracion_motor,
            tipo_modelo: c.tipo_modelo as ConfiguracionMotorIAResponse['tipo_modelo'],
            umbral_riesgo_alto: c.umbral_riesgo_alto,
            umbral_alerta_critica: c.umbral_alerta_critica,
            ventana_temporal_min: c.ventana_temporal_min,
            modo_ejecucion: c.modo_ejecucion as ConfiguracionMotorIAResponse['modo_ejecucion'],
            id_version_modelo_activa: null,
            config_version: 0,
            w_factor_sanitario: 0.5, w_factor_ambiental: 0.3, w_factor_densidad: 0.2,
            temp_min_config: null, temp_max_config: null, hr_min_config: null, hr_max_config: null,
            densidad_maxima_config: null,
            es_activa: c.es_activa,
            id_usuario_responsable: 0,
            fecha_creacion: '',
          }))
        );
        setFromCache(true);
        return;
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (dto: ConfigurarMotorDTO): Promise<ConfiguracionMotorIAResponse | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await motorApi.configurar(dto);
      setConfigs((prev) => {
        const resto = prev.filter((c) => c.tipo_modelo !== actualizada.tipo_modelo);
        return [...resto, actualizada];
      });
      return actualizada;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

  return { configs, versiones, loading, saving, error, saveError, fromCache, cargar, guardar, limpiarSaveError };
}
