import { http } from '../../shared/api/http';
import type {
  HistorialEventosResponse,
  RegistrarEventoCrecimientoDTO,
  RegistrarEventoCrecimientoResponse,
  RegistrarEventoBajaDTO,
  RegistrarEventoSanitarioDTO,
  RegistrarEventoSanitarioResponse,
  RegistrarEventoProductivoDTO,
  RegistrarEventoReproductivoDTO,
  RegistrarEventoReproductivoResponse,
  EventoActivoResponse,
} from '../types';

const BASE = '/activos-biologicos';

export const eventosApi = {
  /** Historial de eventos "en lote" — solo aplica a POBLACIONAL (backend lanza 409/BusinessRuleError si INDIVIDUAL). */
  async listar(idActivo: number): Promise<HistorialEventosResponse> {
    const res = await http.get<HistorialEventosResponse>(`${BASE}/${idActivo}/eventos`);
    return res.data;
  },

  async crecimiento(
    idActivo: number,
    dto: RegistrarEventoCrecimientoDTO
  ): Promise<RegistrarEventoCrecimientoResponse> {
    const res = await http.post<RegistrarEventoCrecimientoResponse>(
      `${BASE}/${idActivo}/eventos/crecimiento`,
      dto
    );
    return res.data;
  },

  async baja(idActivo: number, dto: RegistrarEventoBajaDTO): Promise<EventoActivoResponse> {
    const res = await http.post<EventoActivoResponse>(`${BASE}/${idActivo}/eventos/baja`, dto);
    return res.data;
  },

  async sanitario(
    idActivo: number,
    dto: RegistrarEventoSanitarioDTO
  ): Promise<RegistrarEventoSanitarioResponse> {
    const res = await http.post<RegistrarEventoSanitarioResponse>(
      `${BASE}/${idActivo}/eventos/sanitario`,
      dto
    );
    return res.data;
  },

  async productivo(
    idActivo: number,
    dto: RegistrarEventoProductivoDTO
  ): Promise<EventoActivoResponse> {
    const res = await http.post<EventoActivoResponse>(`${BASE}/${idActivo}/eventos/productivo`, dto);
    return res.data;
  },

  async reproductivo(
    idActivo: number,
    dto: RegistrarEventoReproductivoDTO
  ): Promise<RegistrarEventoReproductivoResponse> {
    const res = await http.post<RegistrarEventoReproductivoResponse>(
      `${BASE}/${idActivo}/eventos/reproductivo`,
      dto
    );
    return res.data;
  },
};
