import { http } from '../../shared/api/http';
import type {
  ConsultaAsociacionResponse,
  ConsultarHistorialFiltros,
  HistorialActivoResponse,
  FichaIntegralResponse,
  ConsultarIndicadoresFiltros,
  IndicadoresActivoResponse,
  DatosConsolidadosFiltros,
  DatosConsolidadosResponse,
} from '../types';

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
