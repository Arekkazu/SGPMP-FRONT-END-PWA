// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-106: cliente del historial clínico predictivo |
import { http } from '../../shared/api/http';

export interface MarcadorHistorial {
  tipo: 'PREDICCION' | 'EVENTO_SANITARIO' | 'RETROALIMENTACION';
  fecha: string;
  id_resultado_inferencia?: string;
  id_evento?: number;
  nivel_riesgo?: number;
  confianza?: number | null;
  condicion?: string;
  descripcion?: string;
  valoracion?: 'CORRECTO' | 'PARCIAL' | 'INCORRECTO' | 'SIN_EVENTO';
  veterinario?: string;
  observaciones?: string | null;
  tiene_retroalimentacion?: boolean;
  en_conflicto?: boolean;
}

export interface HistorialPredictivo {
  activo: { id_activo_biologico: number; identificador: string | null; especie: string | null; finca: string | null; estado: string | null };
  rango_fechas_aplicado: { fecha_inicio: string; fecha_fin: string };
  ventana_correspondencia_horas: number;
  modo_visualizacion: 'LINEAL' | 'AGRUPADO';
  predicciones: MarcadorHistorial[];
  eventos_sanitarios: MarcadorHistorial[];
  retroalimentaciones: MarcadorHistorial[];
  grupos: MarcadorHistorial[][];
  correspondencias: { id_resultado_inferencia: string; id_evento: number; diferencia_minutos: number; diferencia: string; colision: boolean }[];
  tvco: { porcentaje: number | null; texto: string; tvco_denominador: number; tvco_excluidas_conflicto: number;
          excluidas_sin_retroalimentacion: number; tasa_error: number | null };
  pendientes: { total: number; pagina: number; por_pagina: number;
                items: { id_resultado_inferencia: string; fecha_inferencia: string; nivel_riesgo: number; condicion: string }[] };
  metadatos: { total_inferencias: number; total_eventos_sanitarios: number; total_retroalimentaciones: number;
               total_pendientes: number; total_conflictos: number };
  fuentes_no_disponibles: string[];
  mensaje: string | null;
}

export interface FiltrosHistorialPredictivo {
  fecha_inicio?: string;
  fecha_fin?: string;
  nivel_riesgo?: number[];
  modo_visualizacion?: 'LINEAL' | 'AGRUPADO';
  incluir_eventos_sanitarios?: boolean;
  incluir_retroalimentacion?: boolean;
  pagina_pendientes?: number;
}

export const historialPredictivoApi = {
  async consultar(idActivo: number, filtros: FiltrosHistorialPredictivo): Promise<HistorialPredictivo> {
    const { data } = await http.get<HistorialPredictivo>(`/historial-predictivo/${idActivo}`, {
      params: filtros, paramsSerializer: { indexes: null }, timeout: 30000,
    });
    return data;
  },
};
