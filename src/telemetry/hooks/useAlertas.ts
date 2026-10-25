// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: bloquea envíos simultáneos y conserva rechazos |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-08 RF-57: resueltas hoy por fecha de resolución |
import { useState, useCallback, useRef } from 'react';
import { alertasApi } from '../api/alertasApi';
import { cacheAlertas, getAlertasCache } from '../db/telemetriaTables';
import type { AlertaSchema, ListarAlertasFiltros, ActualizarEstadoAlertaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { errorEstadoAlerta } from '../lib/errorEstadoAlerta';
import { hoyLocal, inicioDelDiaUtc } from '../../shared/lib/fecha';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  porPagina: number;
}

export interface ResumenAlertas {
  activas: number;
  enAtencion: number;
  vencidas: number;
  resueltasHoy: number;
}

interface Opciones {
  /** Usa el endpoint de alertas técnicas (recurso 36) en vez de operativas (32). */
  tecnicas?: boolean;
}


export function useAlertas({ tecnicas = false }: Opciones = {}) {
  const enviando = useRef(false);
  const limpiarSaveError = useCallback(() => setSaveError(null), []);
  const [alertas, setAlertas] = useState<AlertaSchema[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0, porPagina: 50 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [resumen, setResumen] = useState<ResumenAlertas | null>(null);

  const listar = tecnicas ? alertasApi.listarTecnicas : alertasApi.listar;
  const patchEstado = tecnicas ? alertasApi.cambiarEstadoTecnica : alertasApi.cambiarEstado;

  const cargar = useCallback(async (filtros: ListarAlertasFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listar({ por_pagina: 50, ...filtros });
      const items = data.items ?? [];
      const porPagina = data.por_pagina || 50;
      setAlertas(items);
      setPaginacion({
        pagina: data.pagina ?? 1,
        porPagina,
        totalRegistros: data.total ?? items.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? items.length) / porPagina)),
      });
      setFromCache(false);
      if (!tecnicas) {
        const now = Date.now();
        try {
          await cacheAlertas(
            items.map((a) => ({
              id_alerta: a.id_alerta,
              tipo_alerta: a.tipo_alerta,
              severidad: a.severidad,
              estado_alerta: a.estado_alerta,
              origen_evento: a.origen_evento,
              tipo_variable: a.tipo_variable,
              valor: a.valor,
              unidad: a.unidad,
              fecha_generacion: a.fecha_generacion,
              cachedAt: now,
            }))
          );
        } catch {
          // caché no crítica
        }
      }
    } catch (e) {
      if (!tecnicas) {
        const cached = await getAlertasCache();
        if (cached.length > 0) {
          setAlertas(
            cached.map((c) => ({
              id_alerta: c.id_alerta,
              tipo_alerta: c.tipo_alerta,
              severidad: c.severidad,
              estado_alerta: c.estado_alerta,
              origen_evento: c.origen_evento,
              tipo_variable: c.tipo_variable,
              valor: c.valor,
              unidad: c.unidad,
              fecha_evento: c.fecha_generacion,
              fecha_generacion: c.fecha_generacion,
              fecha_registro: null, fecha_notificacion: null, fecha_atencion: null,
              fecha_resolucion: null, fecha_vencimiento: null, ultima_ocurrencia: null,
              frecuencia_evento: 1, reglas_activas: [],
              contexto_activo_biologico: null, metadato_evento: null,
              accion_sugerida: null, motivo_descarte: null, diagnostico: null,
              conflicto_resolucion: null, severidad_edge_original: null, severidad_ia: null,
              tiene_inferencia_no_disponible: false, tiene_contexto_incompleto: false,
              tiene_generada_por_reevaluacion: false,
              id_sensor: null, id_dispositivo_ioit: null, id_activo_biologico: null,
              id_infraestructura: null, id_evento_edge_computing: null, id_telemetria: null,
              id_paquete_inferencia: null, id_usuario_atencion: null, id_usuario_resolucion: null,
              referencia_alerta_original: null,
            }))
          );
          setFromCache(true);
          return;
        }
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [listar, tecnicas]);

  /** KPIs por estado vía conteos ligeros (por_pagina=1, se lee `total`). */
  const cargarResumen = useCallback(async () => {
    try {
      const [act, aten, venc, res] = await Promise.all([
        listar({ estado: 'ACTIVA', por_pagina: 1 }),
        listar({ estado: 'EN_ATENCION', por_pagina: 1 }),
        listar({ estado: 'VENCIDA', por_pagina: 1 }),
        // M3-08: "hoy" por la fecha de resolución y en el día del usuario; antes filtraba
        // por fecha de generación y una alerta de ayer resuelta hoy no contaba.
        listar({ estado: 'RESUELTA', fecha_resolucion_desde: inicioDelDiaUtc(hoyLocal()), por_pagina: 1 }),
      ]);
      setResumen({
        activas: act.total ?? 0,
        enAtencion: aten.total ?? 0,
        vencidas: venc.total ?? 0,
        resueltasHoy: res.total ?? 0,
      });
    } catch {
      setResumen(null);
    }
  }, [listar]);

  const cambiarEstado = useCallback(
    async (idAlerta: number, dto: ActualizarEstadoAlertaDTO): Promise<AlertaSchema | null> => {
      if (enviando.current) return null;
      enviando.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        const actualizada = await patchEstado(idAlerta, dto);
        setAlertas((prev) => prev.map((a) => (a.id_alerta === idAlerta ? actualizada : a)));
        if (!tecnicas) {
          try { await cacheAlertas([{ ...actualizada, cachedAt: Date.now() }]); }
          catch { /* La caché no invalida una mutación ya confirmada por el servidor. */ }
        }
        return actualizada;
      } catch (e) {
        setSaveError(errorEstadoAlerta(e as ApiError));
        return null;
      } finally {
        enviando.current = false;
        setSaving(false);
      }
    },
    [patchEstado]
  );

  return {
    alertas, paginacion, loading, saving, error, saveError, fromCache, resumen,
    cargar, cargarResumen, cambiarEstado, limpiarSaveError,
  };
}
