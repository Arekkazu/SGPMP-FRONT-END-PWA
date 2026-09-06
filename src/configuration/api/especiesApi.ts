import { http } from '../../shared/api/http';
import type { EspecieResponse, RegistrarEspecieDTO, EditarEspecieDTO } from '../types';

const BASE = '/configuracion/especies';

export const especiesApi = {
  async listar(soloActivas = false): Promise<EspecieResponse[]> {
    const res = await http.get<EspecieResponse[]>(BASE, { params: { solo_activas: soloActivas } });
    return res.data;
  },

  async registrar(dto: RegistrarEspecieDTO): Promise<EspecieResponse> {
    const res = await http.post<EspecieResponse>(BASE, dto);
    return res.data;
  },

  async editar(id: number, dto: EditarEspecieDTO): Promise<EspecieResponse> {
    const res = await http.patch<EspecieResponse>(`${BASE}/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<EspecieResponse> {
    const res = await http.patch<EspecieResponse>(`${BASE}/${id}/desactivar`);
    return res.data;
  },

  async reactivar(id: number): Promise<EspecieResponse> {
    const res = await http.patch<EspecieResponse>(`${BASE}/${id}/reactivar`);
    return res.data;
  },
};
