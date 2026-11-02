// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66: monitor de inferencia con datos reales de GET /prediccion/inferencias |
// | 2026-11-02 | Arekkazu | RF-66: lo que ve la cámara del área en Predicción |
import { http } from '../../shared/api/http';
import type { InferenciaMonitorResponse, RiesgoContagioMonitorResponse } from '../types';

export interface FiltrosMonitor {
  tipo_modelo?: string;
  nivel_riesgo?: number;
  desde?: string;
  hasta?: string;
  limite?: number;
}

// Los Decimal del backend llegan como texto ("0.86"); el resto de la app trabaja con number.
const n = (v: unknown) => (v == null ? null : Number(v));

/** Último cuadro de una ventana de la cámara con las cajas detectadas (`imagen` es un data URL). */
export interface CapturaCamara { id_dispositivo_iot: number; fecha: string; n_individuos: number | null; imagen: string }

export const monitorApi = {
  /** Lo que ve la cámara del área: la captura más reciente o la de `ventanaFin`. Recurso 42 (R). */
  async captura(idArea: number, ventanaFin?: string): Promise<CapturaCamara> {
    const res = await http.get<CapturaCamara>(`/prediccion/areas/${idArea}/captura`, { params: ventanaFin ? { ventana_fin: ventanaFin } : {} });
    return res.data;
  },

  /** RF-66: resultados del motor en las fincas del usuario, los más recientes primero. Recurso 42 (R). */
  async inferencias(filtros: FiltrosMonitor = {}): Promise<InferenciaMonitorResponse[]> {
    const res = await http.get<InferenciaMonitorResponse[]>('/prediccion/inferencias', { params: { limite: 200, ...filtros } });
    return res.data.map((i) => ({ ...i, confianza_global: Number(i.confianza_global) }));
  },

  /** RF-68: cálculos de riesgo de contagio por lote. Recurso 41 (R). */
  async riesgoContagio(filtros: Omit<FiltrosMonitor, 'tipo_modelo'> = {}): Promise<RiesgoContagioMonitorResponse[]> {
    const res = await http.get<RiesgoContagioMonitorResponse[]>('/prediccion/riesgo-contagio', { params: { limite: 200, ...filtros } });
    return res.data.map((r) => ({
      ...r,
      probabilidad_contagio: Number(r.probabilidad_contagio),
      factor_sanitario_fs: Number(r.factor_sanitario_fs),
      factor_ambiental_fa: n(r.factor_ambiental_fa),
      factor_densidad_fd: n(r.factor_densidad_fd),
      w_fs_aplicado: Number(r.w_fs_aplicado),
      w_fa_aplicado: Number(r.w_fa_aplicado),
      w_fd_aplicado: Number(r.w_fd_aplicado),
      data_quality_score: n(r.data_quality_score),
      porcentaje_sensores_activos: n(r.porcentaje_sensores_activos),
    }));
  },
};
