import { http } from '../../shared/api/http';
import type {
  ListaAlertasSchema,
  AlertaDetalleSchema,
  AlertaSchema,
  ListarAlertasFiltros,
  ActualizarEstadoAlertaDTO,
} from '../types';

const BASE = '/iot/alertas';
const BASE_TECNICAS = '/iot/alertas-tecnicas';

export const alertasApi = {
  // ── Alertas operativas (recurso 32) ────────────────────────────────
  async listar(filtros: ListarAlertasFiltros = {}): Promise<ListaAlertasSchema> {
    const res = await http.get<ListaAlertasSchema>(`${BASE}/`, { params: filtros });
    return res.data;
  },

  async detalle(idAlerta: number): Promise<AlertaDetalleSchema> {
    const res = await http.get<AlertaDetalleSchema>(`${BASE}/${idAlerta}`);
    return res.data;
  },

  async cambiarEstado(idAlerta: number, dto: ActualizarEstadoAlertaDTO): Promise<AlertaSchema> {
    const res = await http.patch<AlertaSchema>(`${BASE}/${idAlerta}/estado`, dto);
    return res.data;
  },

  // ── Alertas técnicas (recurso 36, solo Admin/Ing) ──────────────────
  async listarTecnicas(filtros: ListarAlertasFiltros = {}): Promise<ListaAlertasSchema> {
    const res = await http.get<ListaAlertasSchema>(BASE_TECNICAS, { params: filtros });
    return res.data;
  },

  async cambiarEstadoTecnica(idAlerta: number, dto: ActualizarEstadoAlertaDTO): Promise<AlertaSchema> {
    const res = await http.patch<AlertaSchema>(`${BASE_TECNICAS}/${idAlerta}/estado`, dto);
    return res.data;
  },
};
