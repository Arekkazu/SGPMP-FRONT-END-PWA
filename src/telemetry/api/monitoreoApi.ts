import { http } from '../../shared/api/http';
import type {
  DashboardResponseSchema,
  DashboardFiltros,
  HistorialPageSchema,
  HistorialFiltros,
  FormatoExportHistorial,
} from '../types';

const BASE = '/iot/monitoreo';

export const monitoreoApi = {
  /**
   * Dashboard en tiempo real (RF-58). Recurso 33.
   * `id_infraestructura` se envía como query sobre la variante base `/dashboard`
   * (el contrato lo acepta ahí). No hay websockets → el "tiempo real" es polling.
   */
  async dashboard(filtros: DashboardFiltros = {}): Promise<DashboardResponseSchema> {
    const res = await http.get<DashboardResponseSchema>(`${BASE}/dashboard`, { params: filtros });
    return res.data;
  },

  /** Historial de lecturas con filtros (RF-59). Recurso 34. `fecha_inicio`/`fecha_fin` requeridos. */
  async historial(filtros: HistorialFiltros): Promise<HistorialPageSchema> {
    const res = await http.get<HistorialPageSchema>(`${BASE}/historial`, { params: filtros });
    return res.data;
  },

  /**
   * Exportar historial (RF-59). Recurso 34 (E).
   * ⚠️ El backend responde SIEMPRE 503 M08_NO_DISPONIBLE (stub M08). Ver TASKS.md.
   */
  async exportarHistorial(
    filtros: Omit<HistorialFiltros, 'incluir_alertas' | 'orden'>,
    formato: FormatoExportHistorial
  ): Promise<Blob> {
    const res = await http.get(`${BASE}/historial/exportar`, {
      params: { ...filtros, formato },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
