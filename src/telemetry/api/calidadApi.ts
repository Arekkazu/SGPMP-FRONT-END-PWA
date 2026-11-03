// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-62: observaciones de visión evaluadas (antes datos de ejemplo) |
import { http } from '../../shared/api/http';
import type {
  ListaCalidadSchema,
  TelemetriaCalidadSchema,
  CalidadFiltros,
  SolicitarReevaluacionDTO,
  ReevaluacionResponseSchema,
  FiltrosCalidadVision,
  ListaCalidadVision,
} from '../types';

const BASE = '/iot/calidad';

export const calidadApi = {
  /** Observaciones de visión con su índice y la política vigente (RF-62). Recurso 38 (R). */
  async vision(filtros: FiltrosCalidadVision, pagina: number, porPagina: number): Promise<ListaCalidadVision> {
    const res = await http.get<ListaCalidadVision>(`${BASE}/vision`, { params: { ...filtros, pagina, por_pagina: porPagina } });
    return res.data;
  },

  /** Listar evaluaciones de calidad (RF-62). Recurso 38 (R). */
  async listar(filtros: CalidadFiltros = {}): Promise<ListaCalidadSchema> {
    const res = await http.get<ListaCalidadSchema>(BASE, { params: filtros });
    return res.data;
  },

  async detalle(idTelemetria: number): Promise<TelemetriaCalidadSchema> {
    const res = await http.get<TelemetriaCalidadSchema>(`${BASE}/${idTelemetria}`);
    return res.data;
  },

  /** Evaluar calidad de una lectura puntual. Recurso 38 (E) — solo Admin/Ing. */
  async evaluar(idTelemetria: number): Promise<TelemetriaCalidadSchema> {
    const res = await http.post<TelemetriaCalidadSchema>(`${BASE}/${idTelemetria}/evaluar`, {});
    return res.data;
  },

  /**
   * Solicitar reevaluación masiva (RF-62 FA-08). Recurso 38 (E) — solo Admin/Ing.
   * El nombre del `usuario_responsable` que registra la bitácora RF-63 lo resuelve el
   * backend desde el módulo de identidad (bug del `usuario_actual.email` corregido el
   * 2026-07-27). El hook sigue manejando errores genéricos por robustez.
   */
  async reevaluar(dto: SolicitarReevaluacionDTO): Promise<ReevaluacionResponseSchema> {
    const res = await http.post<ReevaluacionResponseSchema>(`${BASE}/reevaluar`, dto);
    return res.data;
  },
};
