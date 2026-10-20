import { useState, useCallback } from 'react';
import { otaApi } from '../api/otaApi';
import { modelosApi } from '../api/modelosApi';
import { cacheDespliegues, getDesplieguesCache } from '../db/prediccionTables';
import type {
  DespliegueOtaResponse,
  ListarDesplieguesFiltros,
  VersionModeloResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

const LIMIT = 20;

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

/**
 * RF-70 · Estado OTA / distribución de modelos (lectura, FE-01a).
 * Datos reales de `GET /prediccion/despliegues` (paginado, con caché read-only) y,
 * filtrando por versión, de `GET /prediccion/modelos/{id}/ota-status`. Los dos
 * respondían 500 hasta DEV-03 (auditoría M04 con valores fuera del enum).
 */
export function useOta() {
  const [despliegues, setDespliegues] = useState<DespliegueOtaResponse[]>([]);
  const [versiones, setVersiones] = useState<VersionModeloResponse[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (filtros: ListarDesplieguesFiltros = {}, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await otaApi.listarDespliegues({ ...filtros, limit: LIMIT, offset: (pagina - 1) * LIMIT });
      const items = data.items ?? [];
      setDespliegues(items);
      setPaginacion({
        pagina,
        totalRegistros: data.total ?? items.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? items.length) / LIMIT)),
      });
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheDespliegues(
          items.map((d) => ({
            id_despliegue_ota: d.id_despliegue_ota,
            id_version_modelo: d.id_version_modelo,
            id_dispositivo_iot: d.id_dispositivo_iot,
            tipo_modelo: d.tipo_modelo,
            estado_despliegue: d.estado_despliegue,
            fecha_inicio: d.fecha_inicio,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      if (pagina === 1) {
        const cached = await getDesplieguesCache();
        if (cached.length > 0) {
          setDespliegues(cached.map((c) => ({
            id_despliegue_ota: c.id_despliegue_ota,
            id_version_modelo: c.id_version_modelo,
            id_dispositivo_iot: c.id_dispositivo_iot,
            tipo_modelo: c.tipo_modelo as DespliegueOtaResponse['tipo_modelo'],
            paradigma: null, componente: null,
            modo_distribucion: '',
            estado_despliegue: c.estado_despliegue as DespliegueOtaResponse['estado_despliegue'],
            hash_modelo_sha256: null, resultado_validacion_hash: null, id_version_modelo_anterior: null,
            rollback_ejecutado: false, intentos_descarga: 0, max_reintentos: 0,
            tamano_modelo_bytes: null, tamano_descargado_bytes: null, duracion_proceso_ms: null,
            ventana_inicio: null, ventana_fin: null, nivel_bateria_al_inicio: null,
            fecha_inicio: c.fecha_inicio, fecha_fin: null, motivo_fallo: null,
          })));
          setPaginacion({ pagina: 1, totalPaginas: 1, totalRegistros: cached.length });
          setFromCache(true);
          return;
        }
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Despliegues de una versión con `GET /prediccion/modelos/{id}/ota-status` (RF-70).
   * El endpoint devuelve todos los de la versión, así que es una sola página.
   */
  const cargarPorVersion = useCallback(async (idVersion: number, estado?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await otaApi.estadoPorVersion(idVersion, estado ? { estado } : {});
      const items = data.despliegues ?? [];
      setDespliegues(items);
      setPaginacion({ pagina: 1, totalPaginas: 1, totalRegistros: data.total ?? items.length });
      setFromCache(false);
    } catch (e) {
      setDespliegues([]);
      setPaginacion({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Versiones para el filtro (best-effort: sin ellas la vista sigue funcionando). */
  const cargarVersiones = useCallback(async () => {
    try {
      const data = await modelosApi.listar({ limit: 100 });
      setVersiones(data.items ?? []);
    } catch {
      setVersiones([]);
    }
  }, []);

  return { despliegues, paginacion, loading, error, fromCache, cargar, cargarPorVersion, versiones, cargarVersiones };
}
