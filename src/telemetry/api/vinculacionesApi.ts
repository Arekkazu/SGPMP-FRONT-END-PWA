import { http } from '../../shared/api/http';
import type {
  ListaVinculacionesSchema,
  VinculacionLecturaSchema,
  VinculacionesFiltros,
  ResolverVinculacionDTO,
  CorregirVinculacionDTO,
} from '../types';

const BASE = '/iot/vinculaciones';

export const vinculacionesApi = {
  /** Listar vinculaciones (RF-61). Recurso 37 (R). */
  async listar(filtros: VinculacionesFiltros = {}): Promise<ListaVinculacionesSchema> {
    const res = await http.get<ListaVinculacionesSchema>(BASE, { params: filtros });
    return res.data;
  },

  async detalle(idVinculacion: number): Promise<VinculacionLecturaSchema> {
    const res = await http.get<VinculacionLecturaSchema>(`${BASE}/${idVinculacion}`);
    return res.data;
  },

  /** Resolver vinculación ambigua (RF-61-C). Recurso 37 (U) — solo Admin/Ing. */
  async resolver(idVinculacion: number, dto: ResolverVinculacionDTO): Promise<VinculacionLecturaSchema> {
    const res = await http.patch<VinculacionLecturaSchema>(`${BASE}/${idVinculacion}/resolver`, dto);
    return res.data;
  },

  /** Corregir vinculación confirmada (la anterior pasa a SUPERADA). Recurso 37 (U). */
  async corregir(idVinculacion: number, dto: CorregirVinculacionDTO): Promise<VinculacionLecturaSchema> {
    const res = await http.post<VinculacionLecturaSchema>(`${BASE}/${idVinculacion}/corregir`, dto);
    return res.data;
  },
};
