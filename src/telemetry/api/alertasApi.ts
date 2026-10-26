// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-19: filtros de alertas por área, activo y tipo con nombre |
import { http } from '../../shared/api/http';
import type {
  ListaAlertasSchema,
  AlertaDetalleSchema,
  AlertaSchema,
  ListarAlertasFiltros,
  ActualizarEstadoAlertaDTO,
} from '../types';

const BASE = '/iot/alertas';
const BASE_TECNICAS = '/iot/alertas-tecnicas';

export const alertasApi = {
  // ── Alertas operativas (recurso 32) ────────────────────────────────
  async listar(filtros: ListarAlertasFiltros = {}): Promise<ListaAlertasSchema> {
    const res = await http.get<ListaAlertasSchema>(BASE, { params: filtros });
    return res.data;
  },

  async detalle(idAlerta: number): Promise<AlertaDetalleSchema> {
    const res = await http.get<AlertaDetalleSchema>(`${BASE}/${idAlerta}`);
    return res.data;
  },

  async cambiarEstado(idAlerta: number, dto: ActualizarEstadoAlertaDTO): Promise<AlertaSchema> {
    const res = await http.patch<AlertaSchema>(`${BASE}/${idAlerta}/estado`, dto);
    return res.data;
  },

  // ── Alertas técnicas (recurso 36, solo Admin/Ing) ──────────────────
  async listarTecnicas(filtros: ListarAlertasFiltros = {}): Promise<ListaAlertasSchema> {
    const res = await http.get<ListaAlertasSchema>(BASE_TECNICAS, { params: filtros });
    return res.data;
  },

  async cambiarEstadoTecnica(idAlerta: number, dto: ActualizarEstadoAlertaDTO): Promise<AlertaSchema> {
    const res = await http.patch<AlertaSchema>(`${BASE_TECNICAS}/${idAlerta}/estado`, dto);
    return res.data;
  },

  /**
   * T-18: activos de las fincas del usuario para el filtro de alertas. Mismo endpoint
   * de M02 que usa Predicción, sin importar ese módulo (un módulo no importa de otro).
   */
  async listarActivos(): Promise<ActivoOpcionTelemetria[]> {
    const res = await http.get<{ items?: ActivoOpcionTelemetria[] } | ActivoOpcionTelemetria[]>(
      '/activos-biologicos/', { params: { por_pagina: 200 } },
    );
    return Array.isArray(res.data) ? res.data : res.data.items ?? [];
  },
};

export interface ActivoOpcionTelemetria {
  id_activo_biologico: number;
  identificador: string | null;
  nombre_especie: string | null;
}
