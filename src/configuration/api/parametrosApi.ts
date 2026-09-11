import { http } from '../../shared/api/http';
import type {
  ConfiguracionGlobalResponse,
  CrearConfiguracionGlobalDTO,
  ActualizarConfiguracionGlobalDTO,
} from '../types';

const BASE = '/configuracion/parametros';

export const parametrosApi = {
  async obtener(): Promise<ConfiguracionGlobalResponse | null> {
    const res = await http.get<ConfiguracionGlobalResponse | null>(BASE);
    return res.data;
  },

  async crear(dto: CrearConfiguracionGlobalDTO): Promise<ConfiguracionGlobalResponse> {
    const res = await http.post<ConfiguracionGlobalResponse>(BASE, dto);
    return res.data;
  },

  async actualizar(id: number, dto: ActualizarConfiguracionGlobalDTO): Promise<ConfiguracionGlobalResponse> {
    const res = await http.patch<ConfiguracionGlobalResponse>(`${BASE}/${id}`, dto);
    return res.data;
  },
};
