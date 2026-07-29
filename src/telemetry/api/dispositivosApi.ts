import { http } from '../../shared/api/http';
import type {
  EstadoDispositivoDetalleSchema,
  EstadoDispositivoIoTSchema,
  HistoricoTransicionSchema,
  AplicarMantenimientoDTO,
} from '../types';

const BASE = '/iot/dispositivos';

export const dispositivosApi = {
  /** Estado actual + historial reciente de un dispositivo (RF-60). Recurso 35. */
  async estado(idDispositivo: number, limiteHistorial = 20): Promise<EstadoDispositivoDetalleSchema> {
    const res = await http.get<EstadoDispositivoDetalleSchema>(`${BASE}/${idDispositivo}/estado`, {
      params: { limite_historial: limiteHistorial },
    });
    return res.data;
  },

  /** Historial completo de transiciones de estado. Recurso 35. */
  async historial(idDispositivo: number, limite = 50): Promise<HistoricoTransicionSchema[]> {
    const res = await http.get<HistoricoTransicionSchema[]>(`${BASE}/${idDispositivo}/historial`, {
      params: { limite },
    });
    return res.data;
  },

  /**
   * Transición manual de mantenimiento `EN_MANTENIMIENTO ↔ ACTIVO` (RF-60 CA-7/CA-8).
   * Recurso 35 (U) — solo Admin/Ing. Devuelve el estado ya actualizado.
   * Errores: 404 `ESTADO_DISPOSITIVO_NO_ENCONTRADO`, 422 `ESTADO_SIN_CAMBIO`.
   */
  async mantenimiento(idDispositivo: number, dto: AplicarMantenimientoDTO): Promise<EstadoDispositivoIoTSchema> {
    const res = await http.patch<EstadoDispositivoIoTSchema>(`${BASE}/${idDispositivo}/mantenimiento`, dto);
    return res.data;
  },
};
