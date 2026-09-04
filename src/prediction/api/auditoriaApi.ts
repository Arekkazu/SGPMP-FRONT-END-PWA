import { http } from '../../shared/api/http';
import type {
  AuditoriaM04ListResponse,
  EventoAuditoriaM04Response,
  ListarAuditoriaFiltros,
  ExportarAuditoriaFiltros,
} from '../types';

const BASE = '/prediccion/auditoria';

export const auditoriaApi = {
  async listar(filtros: ListarAuditoriaFiltros = {}): Promise<AuditoriaM04ListResponse> {
    const res = await http.get<AuditoriaM04ListResponse>(BASE, { params: filtros });
    return res.data;
  },

  async detalle(idEvento: string): Promise<EventoAuditoriaM04Response> {
    const res = await http.get<EventoAuditoriaM04Response>(`${BASE}/${idEvento}`);
    return res.data;
  },

  /** Exporta la bitácora (blob CSV/JSON). El caller crea el enlace de descarga. */
  async exportar(filtros: ExportarAuditoriaFiltros = {}): Promise<Blob> {
    const res = await http.get(`${BASE}/exportar`, { params: filtros, responseType: 'blob' });
    return res.data as Blob;
  },
};
