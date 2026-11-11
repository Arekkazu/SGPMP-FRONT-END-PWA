// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #393 RF-36: estado de la densidad del lote en el listado y en sus datos |
import { http } from '../../shared/api/http';
import type {
  ConsultaAsociacionResponse,
  ConsultarHistorialFiltros,
  HistorialActivoResponse,
  FichaIntegralResponse,
  ConsultarIndicadoresFiltros,
  IndicadoresActivoResponse,
  DatosConsolidadosFiltros,
  DatosConsolidadosResponse, EstadoDensidadLote } from '../types';

const BASE = '/activos-biologicos';

export const consultasApi = {
  async infraestructura(
    idActivo: number,
    tipoConsulta: 'ACTIVA' | 'HISTORIAL' = 'ACTIVA'
  ): Promise<ConsultaAsociacionResponse> {
    const res = await http.get<ConsultaAsociacionResponse>(`${BASE}/${idActivo}/infraestructura`, {
      params: { tipo_consulta: tipoConsulta },
    });
    return res.data;
  },

  async historial(
    idActivo: number,
    filtros: ConsultarHistorialFiltros = {}
  ): Promise<HistorialActivoResponse> {
    const res = await http.get<HistorialActivoResponse>(`${BASE}/${idActivo}/historial`, {
      params: filtros,
    });
    return res.data;
  },

  /** #393/#394 (RF-36): ficha del lote; aquí se usa su estado de densidad. */
  async estadoDensidadLote(idActivo: number): Promise<EstadoDensidadLote | null> {
    const res = await http.get<{ estado_densidad: EstadoDensidadLote | null }>(`${BASE}/${idActivo}/ficha-lote`);
    return res.data.estado_densidad;
  },

  async fichaIntegral(idActivo: number): Promise<FichaIntegralResponse> {
    const res = await http.get<FichaIntegralResponse>(`${BASE}/${idActivo}/ficha-integral`);
    return res.data;
  },

  async indicadores(
    idActivo: number,
    filtros: ConsultarIndicadoresFiltros = {}
  ): Promise<IndicadoresActivoResponse> {
    const res = await http.get<IndicadoresActivoResponse>(`${BASE}/${idActivo}/indicadores`, {
      params: filtros,
    });
    return res.data;
  },

  async datosConsolidados(
    idActivo: number,
    filtros: DatosConsolidadosFiltros = {}
  ): Promise<DatosConsolidadosResponse> {
    const res = await http.get<DatosConsolidadosResponse>(`${BASE}/${idActivo}/datos-consolidados`, {
      params: filtros,
    });
    return res.data;
  },
};
