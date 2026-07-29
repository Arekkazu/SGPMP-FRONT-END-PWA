import { http } from '../../shared/api/http';
import type {
  HistorialDiagnosticoResponse,
  ConsultarHistorialFiltros,
  ActivoSelectorItem,
} from '../types';

const BASE = '/prediccion/historial';

export const historialApi = {
  /** Historial de un activo (paginación por cursor). fecha_inicio/fecha_fin son requeridos. */
  async consultar(
    idActivoBiologico: number,
    filtros: ConsultarHistorialFiltros
  ): Promise<HistorialDiagnosticoResponse> {
    const res = await http.get<HistorialDiagnosticoResponse>(`${BASE}/${idActivoBiologico}`, {
      params: filtros,
    });
    return res.data;
  },

  /**
   * Listado de activos biológicos para el selector del filtro.
   * Se consulta el endpoint de M02 directamente (no se importa el módulo
   * biological_assets: regla "un módulo no importa de otro"). Endpoint presunto
   * — confirmar en Swagger; si falla, la vista degrada a input numérico manual.
   */
  async listarActivos(): Promise<ActivoSelectorItem[]> {
    const res = await http.get<{ items?: ActivoSelectorItem[] } | ActivoSelectorItem[]>(
      '/activos-biologicos/',
      { params: { por_pagina: 200 } }
    );
    const data = res.data;
    return Array.isArray(data) ? data : data.items ?? [];
  },
};
