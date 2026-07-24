import { http } from '../../shared/api/http';
import type {
  ActivoBiologicoResponse,
  RegistrarActivoDTO,
  ActualizarActivoIndividualDTO,
  ListarActivosFiltros,
  PaginaActivos,
} from '../types';

const BASE = '/activos-biologicos';

export const activosApi = {
  /**
   * ⚠️ Endpoint PRESUNTO — el markdown del backend no documenta un listado.
   * Confirmar en Swagger (ver TODO en do-it/biological_assets/TASKS.md).
   * Se asume GET /activos-biologicos/ con filtros + paginación estilo /historial.
   */
  async listar(filtros: ListarActivosFiltros = {}): Promise<PaginaActivos> {
    const res = await http.get<PaginaActivos>(`${BASE}/`, { params: filtros });
    return res.data;
  },

  async registrar(dto: RegistrarActivoDTO): Promise<ActivoBiologicoResponse> {
    const res = await http.post<ActivoBiologicoResponse>(`${BASE}/`, dto);
    return res.data;
  },

  async consultar(idActivo: number): Promise<ActivoBiologicoResponse> {
    const res = await http.get<ActivoBiologicoResponse>(`${BASE}/${idActivo}`);
    return res.data;
  },

  async actualizarIndividual(
    idActivo: number,
    dto: ActualizarActivoIndividualDTO
  ): Promise<ActivoBiologicoResponse> {
    const res = await http.patch<ActivoBiologicoResponse>(`${BASE}/${idActivo}`, dto);
    return res.data;
  },
};
