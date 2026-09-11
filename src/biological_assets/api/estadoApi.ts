import { http } from '../../shared/api/http';
import type {
  CambiarEstadoDTO,
  CambioEstadoResponse,
  CerrarCicloDTO,
  CierreActivoResponse,
} from '../types';

const BASE = '/activos-biologicos';

export const estadoApi = {
  async cambiarEstado(idActivo: number, dto: CambiarEstadoDTO): Promise<CambioEstadoResponse> {
    const res = await http.patch<CambioEstadoResponse>(`${BASE}/${idActivo}/estado`, dto);
    return res.data;
  },

  async cerrarCiclo(idActivo: number, dto: CerrarCicloDTO): Promise<CierreActivoResponse> {
    const res = await http.post<CierreActivoResponse>(`${BASE}/${idActivo}/cierre`, dto);
    return res.data;
  },
};
