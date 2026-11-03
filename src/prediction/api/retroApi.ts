// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ampliación de la ventana para un resultado |
// | 2026-11-03 | Arekkazu | RF-72: bandeja de inferencias por evaluar (antes datos de ejemplo) |
import { http } from '../../shared/api/http';
import type {
  AmpliacionVentanaRetroResponse,
  BandejaRetroalimentacionResponse,
  FiltrosBandejaRetro,
  AmpliarVentanaRetroDTO,
  RegistrarRetroalimentacionDTO,
  RetroalimentacionClinicaResponse,
} from '../types';

const BASE = '/prediccion/retroalimentacion';

export const retroApi = {
  /** Inferencias por evaluar con su estado y totales (retroalimentacion_clinica · Leer). */
  async bandeja(filtros: FiltrosBandejaRetro, pagina: number, porPagina: number): Promise<BandejaRetroalimentacionResponse> {
    const res = await http.get<BandejaRetroalimentacionResponse>(`${BASE}/bandeja`, {
      params: { ...filtros, pagina, por_pagina: porPagina },
    });
    return res.data;
  },

  /**
   * Registra retroalimentación clínica (solo Vet).
   * Errores de negocio: 409 RETROALIMENTACION_DUPLICADA, 422 FUERA_DE_VENTANA_TEMPORAL.
   */
  async registrar(dto: RegistrarRetroalimentacionDTO): Promise<RetroalimentacionClinicaResponse> {
    const res = await http.post<RetroalimentacionClinicaResponse>(BASE, dto);
    return res.data;
  },

  /** Habilita un resultado vencido durante N días (Administrador; la ventana global no cambia). */
  async ampliarVentana(dto: AmpliarVentanaRetroDTO): Promise<AmpliacionVentanaRetroResponse> {
    const res = await http.post<AmpliacionVentanaRetroResponse>(`${BASE}/ampliaciones`, dto);
    return res.data;
  },
};
