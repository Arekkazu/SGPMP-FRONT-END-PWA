// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #71 RF-41: el historial de eventos sirve también para individuales |
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
  MetricaActivo,
} from '../types';

const BASE = '/activos-biologicos';

export const eventosApi = {
  /**
   * Historial de eventos del activo (RF-39), individual o lote. Sin permiso clínico
   * el backend oculta el detalle sanitario pero conserva `sanitario.tipo` (#413).
   */
  async listar(idActivo: number): Promise<HistorialEventosResponse> {
    const res = await http.get<HistorialEventosResponse>(`${BASE}/${idActivo}/eventos`);
    return res.data;
  },

  /** Métricas de la especie del activo, bajo el permiso de activos (el Productor no lee M09). */
  async metricas(idActivo: number): Promise<MetricaActivo[]> {
    const res = await http.get<{ items: MetricaActivo[] }>(`${BASE}/${idActivo}/metricas`);
    return res.data.items;
  },

  /** Patologías de la especie del activo para el evento sanitario (RF-41), con el permiso de activos. */
  async patologias(idActivo: number): Promise<{ id_patologia: number; nombre: string }[]> {
    const res = await http.get<{ items: { id_patologia: number; nombre: string }[] }>(`${BASE}/${idActivo}/patologias`);
    return res.data.items;
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
