import { http } from '../../shared/api/http';
import type {
  ListaAuditoriaIotSchema,
  EventoAuditoriaIotSchema,
  AuditoriaFiltros,
  VerificacionIntegridadSchema,
  FormatoExportBitacora,
} from '../types';

const BASE = '/iot/auditoria';

export const auditoriaApi = {
  /** Listar eventos de auditoría IoT (RF-63). Recurso 39 (R). */
  async listar(filtros: AuditoriaFiltros = {}): Promise<ListaAuditoriaIotSchema> {
    const res = await http.get<ListaAuditoriaIotSchema>(`${BASE}/`, { params: filtros });
    return res.data;
  },

  async detalle(idEvento: string): Promise<EventoAuditoriaIotSchema> {
    const res = await http.get<EventoAuditoriaIotSchema>(`${BASE}/${idEvento}`);
    return res.data;
  },

  /** Exportar bitácora (CSV/JSON). Recurso 39 (E) — solo Admin/Cont. */
  async exportar(filtros: AuditoriaFiltros, formato: FormatoExportBitacora): Promise<Blob> {
    const res = await http.get(`${BASE}/exportar`, { params: { ...filtros, formato }, responseType: 'blob' });
    return res.data as Blob;
  },

  /** Verificar integridad SHA-256 de la cadena (RF-63 FA-11). Recurso 39 (E). */
  async verificarIntegridad(fechaDesde?: string, fechaHasta?: string): Promise<VerificacionIntegridadSchema> {
    const params: Record<string, string> = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const res = await http.post<VerificacionIntegridadSchema>(`${BASE}/verificar-integridad`, null, { params });
    return res.data;
  },
};
