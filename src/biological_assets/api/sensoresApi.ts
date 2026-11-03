// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | QA-M02 RF-49: la ficha solo consulta los sensores asociados; ya no crea asociaciones |
import { http } from '../../shared/api/http';
import type { ConsultaAsociacionesSensorResponse } from '../types';

const BASE = '/activos-biologicos';

export const sensoresApi = {
  /** Asociaciones vigentes del activo, incluidas las ambientales de su infraestructura. */
  async listar(idActivo: number): Promise<ConsultaAsociacionesSensorResponse> {
    const res = await http.get<ConsultaAsociacionesSensorResponse>(`${BASE}/${idActivo}/sensores`);
    return res.data;
  },
};
