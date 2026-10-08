import { http } from '../../shared/api/http';
import type { CambiarFaseDTO, CicloProductivoAsignable, GestionFaseResponse, HistorialFasesResponse } from '../types';

const BASE = '/activos-biologicos';

export const fasesApi = {
  async historial(idActivo: number): Promise<HistorialFasesResponse> {
    const res = await http.get<HistorialFasesResponse>(`${BASE}/${idActivo}/fases`);
    return res.data;
  },

  async ciclosProductivos(idActivo: number): Promise<CicloProductivoAsignable[]> {
    const res = await http.get<{ items: CicloProductivoAsignable[] }>(`${BASE}/${idActivo}/ciclos-productivos`);
    return res.data.items;
  },

  async cambiarFase(idActivo: number, dto: CambiarFaseDTO): Promise<GestionFaseResponse> {
    const res = await http.post<GestionFaseResponse>(`${BASE}/${idActivo}/fases`, dto);
    return res.data;
  },
};
