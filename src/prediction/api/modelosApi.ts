import { http } from '../../shared/api/http';
import type {
  VersionModeloListResponse,
  VersionModeloResponse,
  ListarModelosFiltros,
  RegistrarNotasVersionDTO,
} from '../types';

const BASE = '/prediccion/modelos';

export const modelosApi = {
  async listar(filtros: ListarModelosFiltros = {}): Promise<VersionModeloListResponse> {
    const res = await http.get<VersionModeloListResponse>(`${BASE}/`, { params: filtros });
    return res.data;
  },

  async detalle(idVersion: number): Promise<VersionModeloResponse> {
    const res = await http.get<VersionModeloResponse>(`${BASE}/${idVersion}`);
    return res.data;
  },

  async registrarNotas(idVersion: number, dto: RegistrarNotasVersionDTO): Promise<VersionModeloResponse> {
    const res = await http.patch<VersionModeloResponse>(`${BASE}/${idVersion}/notas`, dto);
    return res.data;
  },

  /** Activa una versión APROBADA con notas → 422 si faltan notas o la transición es inválida. */
  async activar(idVersion: number): Promise<VersionModeloResponse> {
    const res = await http.post<VersionModeloResponse>(`${BASE}/${idVersion}/activar`);
    return res.data;
  },
};
