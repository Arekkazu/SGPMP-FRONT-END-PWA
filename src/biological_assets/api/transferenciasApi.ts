import { http } from '../../shared/api/http';
import type {
  InfraestructuraDisponibleResponse,
  RegistrarTransferenciaDTO,
  TransferenciaResponse,
} from '../types';

const BASE = '/activos-biologicos';

export const transferenciasApi = {
  async disponibles(idActivo: number): Promise<InfraestructuraDisponibleResponse[]> {
    const res = await http.get<InfraestructuraDisponibleResponse[]>(
      `${BASE}/${idActivo}/transferencias/disponibles`
    );
    return res.data;
  },

  async registrar(
    idActivo: number,
    dto: RegistrarTransferenciaDTO
  ): Promise<TransferenciaResponse> {
    const res = await http.post<TransferenciaResponse>(`${BASE}/${idActivo}/transferencias`, dto);
    return res.data;
  },
};
