import { http } from '../../shared/api/http';
import type { TipoAreaResponse, RegistrarTipoAreaDTO } from '../types';

const BASE = '/configuracion/tipos-area';

export const tipoAreaApi = {
  async listar(soloActivos = false): Promise<TipoAreaResponse[]> {
    const res = await http.get<TipoAreaResponse[]>(BASE, { params: { solo_activos: soloActivos } });
    return res.data;
  },

  async registrar(dto: RegistrarTipoAreaDTO): Promise<TipoAreaResponse> {
    const res = await http.post<TipoAreaResponse>(BASE, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<TipoAreaResponse> {
    const res = await http.patch<TipoAreaResponse>(`${BASE}/${id}/desactivar`);
    return res.data;
  },
};
