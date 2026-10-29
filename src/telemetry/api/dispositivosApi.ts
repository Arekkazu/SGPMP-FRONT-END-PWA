// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-10 RF-60: listado de dispositivos de la finca con estado |
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: panel del buffer Edge (GET /iot/buffer) |
import { http } from '../../shared/api/http';
import type {
  DispositivoConEstadoSchema,
  EstadoBufferSchema,
  EstadoDispositivoDetalleSchema,
  EstadoDispositivoIoTSchema,
  HistoricoTransicionSchema,
  AplicarMantenimientoDTO,
} from '../types';

const BASE = '/iot/dispositivos';

export const dispositivosApi = {
  /** M3-10: dispositivos de las fincas del usuario con estado, batería y señal. Recurso 35 (R). */
  async listar(estado?: string): Promise<DispositivoConEstadoSchema[]> {
    const res = await http.get<DispositivoConEstadoSchema[]>(BASE, { params: estado ? { estado } : {} });
    return res.data;
  },

  /** TC-DIS-148: último reporte del buffer Edge de cada dispositivo, los más ocupados primero. Recurso 35 (R). */
  async buffer(): Promise<EstadoBufferSchema[]> {
    const res = await http.get<EstadoBufferSchema[]>('/iot/buffer');
    // El backend manda los Decimal como texto ("85.000"), como en el historial (#317).
    const n = (v: unknown) => (v == null ? null : Number(v));
    return res.data.map((d) => ({
      ...d,
      capacidad_total: n(d.capacidad_total),
      capacidad_utilizada: n(d.capacidad_utilizada),
      porcentaje_ocupacion: n(d.porcentaje_ocupacion),
    }));
  },

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
