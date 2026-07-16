import { http } from '../../shared/api/http';
import type { AuditoriaPaginadaResponse, FiltrosAuditoria } from '../types';

export const auditoriaApi = {
  async consultar(filtros: FiltrosAuditoria): Promise<AuditoriaPaginadaResponse> {
    const params: Record<string, string | number> = {
      pagina: filtros.pagina,
      tamano: filtros.tamano,
    };
    if (filtros.id_usuario != null) params.id_usuario = filtros.id_usuario;
    if (filtros.tipo_evento != null) params.tipo_evento = filtros.tipo_evento;
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    const res = await http.get<AuditoriaPaginadaResponse>('/auditoria/', { params });
    return res.data;
  },
};
