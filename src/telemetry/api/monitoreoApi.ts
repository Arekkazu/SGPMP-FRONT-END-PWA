import { http } from '../../shared/api/http';
import type {
  DashboardResponseSchema,
  DashboardFiltros,
  HistorialPageSchema,
  HistorialFiltros,
  FormatoExportHistorial,
} from '../types';

const BASE = '/iot/monitoreo';

// #317: el backend serializa los Decimal como texto ("36.0000"); el tipo de
// dominio es numero y la vista hace toFixed y grafica sobre ellos, asi que se
// convierte aqui, en el borde. null se conserva (Number(null) daria 0).
const aNumero = (v: number | string | null): number | null => (v == null ? null : Number(v));

function aHistorial(h: HistorialPageSchema): HistorialPageSchema {
  return {
    ...h,
    items: h.items.map((l) => ({
      ...l,
      valor: aNumero(l.valor),
      valor_ajustado: aNumero(l.valor_ajustado),
      nivel_bateria_pct: aNumero(l.nivel_bateria_pct),
      calidad_senal_rssi: aNumero(l.calidad_senal_rssi),
      calidad_senal_snr: aNumero(l.calidad_senal_snr),
    })),
    estadisticas: h.estadisticas.map((e) => ({
      ...e,
      valor_minimo: aNumero(e.valor_minimo),
      valor_maximo: aNumero(e.valor_maximo),
      valor_promedio: aNumero(e.valor_promedio),
    })),
  };
}

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
    return aHistorial(res.data);
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
