// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: historial de cambios de la configuración desde la bitácora M04 (RF-73) |
import { useState, useCallback } from 'react';
import { motorApi } from '../api/motorApi';
import { modelosApi } from '../api/modelosApi';
import { auditoriaApi } from '../api/auditoriaApi';
import { cacheMotor, getMotorCache } from '../db/prediccionTables';
import type {
  ConfiguracionMotorIAResponse,
  ConfigurarMotorDTO,
  EventoAuditoriaM04Response,
  ResultadoGuardarMotor,
  SincronizacionMotor,
  VersionModeloResponse,
} from '../types';
import { PARADIGMA_POR_TIPO } from '../types';
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
  const [sincronizacion, setSincronizacion] = useState<SincronizacionMotor | null>(null);
  const [syncError, setSyncError] = useState<ApiError | null>(null);
  const [ultimoGuardado, setUltimoGuardado] = useState<ResultadoGuardarMotor | null>(null);
  const [historial, setHistorial] = useState<EventoAuditoriaM04Response[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState<ApiError | null>(null);

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
            umbral_score_anomalia: c.umbral_score_anomalia,
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
            paradigma: PARADIGMA_POR_TIPO[c.tipo_modelo as ConfiguracionMotorIAResponse['tipo_modelo']],
            umbral_riesgo_alto: c.umbral_riesgo_alto,
            umbral_alerta_critica: c.umbral_alerta_critica,
            umbral_score_anomalia: c.umbral_score_anomalia ?? null,
            versiones_activas_por_componente: null,
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

  /**
   * Guarda y devuelve también el resultado de la sincronización con los nodos
   * (DEV-09): 202 y 409 son configuraciones guardadas que no llegaron igual a todos.
   */
  const guardar = useCallback(async (dto: ConfigurarMotorDTO): Promise<ResultadoGuardarMotor | null> => {
    setSaving(true);
    setSaveError(null);
    setUltimoGuardado(null);
    try {
      const resultado = await motorApi.configurar(dto);
      const actualizada = resultado.config;
      setConfigs((prev) => {
        const resto = prev.filter((c) => c.tipo_modelo !== actualizada.tipo_modelo);
        return [...resto, actualizada];
      });
      setUltimoGuardado(resultado);
      setSincronizacion(resultado.sincronizacion);
      return resultado;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Estado de la configuración de `tipoModelo` en cada nodo Edge. Sin configuración
   * guardada (404) no hay nodos que mostrar; otros fallos quedan en `syncError`.
   */
  const cargarSincronizacion = useCallback(async (tipoModelo: string) => {
    setSyncError(null);
    try {
      setSincronizacion(await motorApi.obtenerSincronizacion(tipoModelo));
    } catch (e) {
      setSincronizacion(null);
      if ((e as ApiError).status !== 404) setSyncError(e as ApiError);
    }
  }, []);

  /**
   * Cambios anteriores de una configuración (solo lectura). No hay endpoint propio:
   * cada guardado deja un CONFIGURACION_MOTOR_CAMBIADA inmutable en la bitácora M04,
   * así que pide lectura de auditoría (recurso 46).
   */
  const cargarHistorial = useCallback(async (idConfiguracion: number) => {
    setHistorialLoading(true);
    setHistorialError(null);
    try {
      const data = await auditoriaApi.listar({
        tipo_evento: 'CONFIGURACION_MOTOR_CAMBIADA',
        id_referencia: String(idConfiguracion),
        por_pagina: 100,
      });
      setHistorial(data.items ?? []);
    } catch (e) {
      setHistorial([]);
      setHistorialError(e as ApiError);
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  const limpiarSaveError = useCallback(() => {
    setSaveError(null);
    setUltimoGuardado(null);
  }, []);

  return {
    configs, versiones, loading, saving, error, saveError, fromCache, cargar, guardar, limpiarSaveError,
    sincronizacion, syncError, ultimoGuardado, cargarSincronizacion,
    historial, historialLoading, historialError, cargarHistorial,
  };
}
