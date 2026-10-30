// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ampliación de la ventana para un resultado |
import { http } from '../../shared/api/http';
import type {
  AmpliacionVentanaRetroResponse,
  AmpliarVentanaRetroDTO,
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
    const res = await http.post<RetroalimentacionClinicaResponse>(BASE, dto);
    return res.data;
  },

  /** Habilita un resultado vencido durante N días (Administrador; la ventana global no cambia). */
  async ampliarVentana(dto: AmpliarVentanaRetroDTO): Promise<AmpliacionVentanaRetroResponse> {
    const res = await http.post<AmpliacionVentanaRetroResponse>(`${BASE}/ampliaciones`, dto);
    return res.data;
  },
};
