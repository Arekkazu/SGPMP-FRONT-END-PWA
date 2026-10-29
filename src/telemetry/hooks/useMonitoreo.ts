// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-08 RF-58: total y conteo del semáforo de todo el alcance, no de la página |
// | 2026-10-29 | Arekkazu | INC-M03-211-G98 RF-58: panel de alertas activas del dashboard |
import { useState, useCallback } from 'react';
import { monitoreoApi } from '../api/monitoreoApi';
import { cacheDashboard, getSensoresCache, getUnidadesCache } from '../db/telemetriaTables';
import type { EstadoSensorSchema, ResumenUnidadSchema, DashboardFiltros, PanelAlertasActivasSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useMonitoreo() {
  const [sensores, setSensores] = useState<EstadoSensorSchema[]>([]);
  const [unidades, setUnidades] = useState<ResumenUnidadSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null);
  // M3-08: la vista trae 50 sensores (FA-07); estos son los de todo el alcance.
  const [total, setTotal] = useState(0);
  const [conteo, setConteo] = useState<Record<string, number> | null>(null);
  const [panelAlertas, setPanelAlertas] = useState<PanelAlertasActivasSchema | null>(null);

  const cargar = useCallback(async (filtros: DashboardFiltros = {}, silencioso = false) => {
    if (silencioso) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await monitoreoApi.dashboard({ por_pagina: 50, ...filtros });
      const s = data.sensores ?? [];
      const u = data.resumen_unidades ?? [];
      setSensores(s);
      setUnidades(u);
      setTotal(data.total ?? s.length);
      setConteo(data.conteo_semaforo ?? null);
      setPanelAlertas(data.panel_alertas_activas ?? null);
      setFromCache(false);
      setActualizadoEn(Date.now());

      const now = Date.now();
      try {
        await cacheDashboard(
          s.map((x) => ({
            id_sensor: x.id_sensor,
            id_dispositivo_iot: x.id_dispositivo_iot,
            nombre_sensor: x.nombre_sensor,
            tipo_variable: x.tipo_variable,
            categoria_variable: x.categoria_variable,
            ultimo_valor: x.ultimo_valor,
            ultima_unidad: x.ultima_unidad,
            ultimo_timestamp_captura: x.ultimo_timestamp_captura,
            estado_semaforo: x.estado_semaforo,
            estado_conectividad: x.estado_conectividad,
            id_infraestructura: x.id_infraestructura,
            nombre_infraestructura: x.nombre_infraestructura,
            id_finca: x.id_finca,
            nombre_finca: x.nombre_finca,
            cachedAt: now,
          })),
          u.map((x) => ({
            id_infraestructura: x.id_infraestructura,
            nombre_infraestructura: x.nombre_infraestructura,
            nombre_finca: x.nombre_finca,
            total_sensores: x.total_sensores,
            sensores_online: x.sensores_online,
            sensores_sin_senal: x.sensores_sin_senal,
            sensores_con_error: x.sensores_con_error,
            estado_general: x.estado_general,
            alertas_activas_count: x.alertas_activas_count,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      const [cs, cu] = await Promise.all([getSensoresCache(), getUnidadesCache()]);
      if (cs.length > 0) {
        setSensores(
          cs.map((c) => ({
            id_sensor: c.id_sensor,
            id_dispositivo_iot: c.id_dispositivo_iot,
            nombre_sensor: c.nombre_sensor,
            tipo_variable: c.tipo_variable,
            categoria_variable: c.categoria_variable,
            ultimo_valor: c.ultimo_valor,
            ultima_unidad: c.ultima_unidad,
            ultimo_timestamp_captura: c.ultimo_timestamp_captura,
            estado_semaforo: c.estado_semaforo,
            estado_calidad: '',
            estado_desviacion: '',
            estado_conectividad: c.estado_conectividad,
            tiempo_sin_reporte_min: 0,
            dato_desactualizado: true,
            id_alerta: null,
            severidad_alerta: null,
            tendencia: null,
            id_infraestructura: c.id_infraestructura,
            nombre_infraestructura: c.nombre_infraestructura,
            id_finca: c.id_finca,
            nombre_finca: c.nombre_finca,
            nivel_bateria_pct: null,
            calidad_senal_rssi: null,
            calidad_senal_snr: null,
          }))
        );
        setUnidades(
          cu.map((c) => ({
            id_infraestructura: c.id_infraestructura,
            nombre_infraestructura: c.nombre_infraestructura,
            id_finca: 0,
            nombre_finca: c.nombre_finca,
            total_sensores: c.total_sensores,
            sensores_online: c.sensores_online,
            sensores_sin_senal: c.sensores_sin_senal,
            sensores_con_error: c.sensores_con_error,
            estado_general: c.estado_general,
            alertas_activas_count: c.alertas_activas_count,
            ultimo_dato_recibido: null,
          }))
        );
        setTotal(cs.length);
        setConteo(null);
        setFromCache(true);
      } else {
        setError(e as ApiError);
      }
    } finally {
      if (silencioso) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  return { sensores, unidades, total, conteo, panelAlertas, loading, refreshing, error, fromCache, actualizadoEn, cargar };
}
