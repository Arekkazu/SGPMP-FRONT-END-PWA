import { http } from '../../shared/api/http';
import type { ConsultarBitacoraFiltros, BitacoraAuditoriaResponse } from '../types';

const BASE = '/activos-biologicos';

export const auditoriaApi = {
  /** Recurso 31 (bitacora_auditoria_m02) — solo lectura. Ingeniero de Campo no tiene acceso. */
  async bitacora(filtros: ConsultarBitacoraFiltros = {}): Promise<BitacoraAuditoriaResponse> {
    const res = await http.get<BitacoraAuditoriaResponse>(`${BASE}/auditoria`, { params: filtros });
    return res.data;
  },
};
