import { http } from '../../shared/api/http';
import type {
  RegistrarRetroalimentacionDTO,
  RetroalimentacionClinicaResponse,
} from '../types';

const BASE = '/prediccion/retroalimentacion';

export const retroApi = {
  /**
   * Registra retroalimentación clínica (solo Vet).
   * Errores de negocio: 409 RETROALIMENTACION_DUPLICADA, 422 FUERA_DE_VENTANA_TEMPORAL.
   * Nota: el backend aún no expone GET de lista (ver TASKS.md § Pendientes).
   */
  async registrar(dto: RegistrarRetroalimentacionDTO): Promise<RetroalimentacionClinicaResponse> {
    const res = await http.post<RetroalimentacionClinicaResponse>(`${BASE}/`, dto);
    return res.data;
  },
};
