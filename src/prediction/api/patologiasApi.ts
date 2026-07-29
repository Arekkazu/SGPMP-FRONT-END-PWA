import { http } from '../../shared/api/http';
import type {
  PatologiaM04ListResponse,
  PatologiaM04Response,
  ListarPatologiasFiltros,
  RegistrarPatologiaDTO,
  EditarPatologiaDTO,
} from '../types';

const BASE = '/prediccion/patologias';

export const patologiasApi = {
  async listar(filtros: ListarPatologiasFiltros = {}): Promise<PatologiaM04ListResponse> {
    const res = await http.get<PatologiaM04ListResponse>(`${BASE}/`, { params: filtros });
    return res.data;
  },

  async detalle(idPatologia: number): Promise<PatologiaM04Response> {
    const res = await http.get<PatologiaM04Response>(`${BASE}/${idPatologia}`);
    return res.data;
  },

  async registrar(dto: RegistrarPatologiaDTO): Promise<PatologiaM04Response> {
    const res = await http.post<PatologiaM04Response>(`${BASE}/`, dto);
    return res.data;
  },

  async editar(idPatologia: number, dto: EditarPatologiaDTO): Promise<PatologiaM04Response> {
    const res = await http.patch<PatologiaM04Response>(`${BASE}/${idPatologia}`, dto);
    return res.data;
  },

  async desactivar(idPatologia: number): Promise<PatologiaM04Response> {
    const res = await http.patch<PatologiaM04Response>(`${BASE}/${idPatologia}/desactivar`);
    return res.data;
  },
};
