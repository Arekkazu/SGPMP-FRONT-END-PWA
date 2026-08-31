import { http } from '../../shared/api/http';
import { aInstanteUtc } from '../lib/fechaFiltro';
import type { AuditoriaPaginadaResponse, FiltrosAuditoria } from '../types';

export const auditoriaApi = {
  async consultar(filtros: FiltrosAuditoria): Promise<AuditoriaPaginadaResponse> {
    const params: Record<string, string | number> = {
      pagina: filtros.pagina,
      tamano: filtros.tamano,
    };
    if (filtros.id_usuario != null) params.id_usuario = filtros.id_usuario;
    if (filtros.tipo_evento != null) params.tipo_evento = filtros.tipo_evento;
    // Los filtros viajan siempre como instante UTC: el backend compara contra
    // una columna timestamptz y un valor sin zona se leería en la del servidor.
    const desde = filtros.fecha_desde && aInstanteUtc(filtros.fecha_desde);
    const hasta = filtros.fecha_hasta && aInstanteUtc(filtros.fecha_hasta);
    if (desde) params.fecha_desde = desde;
    if (hasta) params.fecha_hasta = hasta;
    const res = await http.get<AuditoriaPaginadaResponse>('/auditoria/', { params });
    return res.data;
  },
};
