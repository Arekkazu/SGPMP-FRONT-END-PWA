import { http } from '../../shared/api/http';
import type {
  OtaStatusResponse,
  DespliegueOtaListResponse,
  ListarDesplieguesFiltros,
} from '../types';

export const otaApi = {
  /** Estado OTA de una versión de modelo (recurso 44). */
  async estadoPorVersion(
    idVersion: number,
    filtros: { id_dispositivo?: number; estado?: string } = {}
  ): Promise<OtaStatusResponse> {
    const res = await http.get<OtaStatusResponse>(`/prediccion/modelos/${idVersion}/ota-status`, {
      params: filtros,
    });
    return res.data;
  },

  /** Listado de despliegues OTA con filtros (limit/offset). */
  async listarDespliegues(filtros: ListarDesplieguesFiltros = {}): Promise<DespliegueOtaListResponse> {
    const res = await http.get<DespliegueOtaListResponse>('/prediccion/despliegues', {
      params: filtros,
    });
    return res.data;
  },
};
