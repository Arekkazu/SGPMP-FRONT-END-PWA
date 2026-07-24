import { http } from '../../shared/api/http';
import type { AsociarSensorActivoDTO, AsociacionSensorActivoResponse } from '../types';

const BASE = '/activos-biologicos';

export const sensoresApi = {
  /** Recurso 30 (asociacion_sensor_activo) — solo Admin/Ingeniero pueden crear. */
  async asociar(
    idActivo: number,
    dto: AsociarSensorActivoDTO
  ): Promise<AsociacionSensorActivoResponse> {
    const res = await http.post<AsociacionSensorActivoResponse>(
      `${BASE}/${idActivo}/sensores`,
      dto
    );
    return res.data;
  },
};
