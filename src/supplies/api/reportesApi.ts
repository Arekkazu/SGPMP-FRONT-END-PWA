// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-77: reporte de gastos acumulados, exportación e historial |
import { http } from '../../shared/api/http';
import type {
  ArchivoExportacion, EstadoTrabajoReporte, GenerarReportePayload, Lista, ReporteGasto,
  ResultadoGenerarReporte, TrabajoReporte,
} from '../types';

const BASE = '/suministros/reportes-gastos';

export const reportesApi = {
  /** 200 con el reporte, o 202 con el trabajo encolado cuando el volumen lo exige. */
  async generar(payload: GenerarReportePayload): Promise<ResultadoGenerarReporte> {
    const res = await http.post<ReporteGasto | TrabajoReporte>(BASE, payload);
    return res.status === 202
      ? { tipo: 'trabajo', trabajo: res.data as TrabajoReporte }
      : { tipo: 'reporte', reporte: res.data as ReporteGasto };
  },
  async trabajo(idCola: number): Promise<EstadoTrabajoReporte> {
    return (await http.get<EstadoTrabajoReporte>(`${BASE}/trabajos/${idCola}`)).data;
  },
  async historial(): Promise<Lista<ReporteGasto>> {
    return (await http.get<Lista<ReporteGasto>>(`${BASE}/historial`, { params: { limite: 20 } })).data;
  },
  async detalle(id: number): Promise<ReporteGasto> {
    return (await http.get<ReporteGasto>(`${BASE}/${id}`)).data;
  },
  async regenerar(id: number): Promise<ReporteGasto> {
    return (await http.get<ReporteGasto>(`${BASE}/${id}/regenerar`)).data;
  },
  async exportar(id: number, formato: 'PDF' | 'CSV'): Promise<ArchivoExportacion> {
    return (await http.post<ArchivoExportacion>(`${BASE}/${id}/exportacion`, { formato_exportacion: formato })).data;
  },
  /** El archivo vive 24 h (E6d): después responde 410. */
  async descargar(idArchivo: string): Promise<Blob> {
    return (await http.get(`${BASE}/exportaciones/${idArchivo}`, { responseType: 'blob' })).data as Blob;
  },
};
