// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-03 RF-61: activos candidatos de la infraestructura al resolver |
import { http } from '../../shared/api/http';
import type {
  ListaVinculacionesSchema,
  VinculacionLecturaSchema,
  VinculacionesFiltros,
  ResolverVinculacionDTO,
  CorregirVinculacionDTO,
} from '../types';

const BASE = '/iot/vinculaciones';

/** Activo que puede recibir la lectura: los de la infraestructura donde se tomó. */
export interface CandidatoVinculacion {
  id_activo_biologico: number;
  identificador: string | null;
  tipo: string;
}

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

  /**
   * M3-03: candidatos para resolver una vinculación. Usa el listado de M02, que ya
   * filtra por las fincas del usuario; pide permiso de lectura de activos (29).
   */
  async candidatos(idInfraestructura: number): Promise<CandidatoVinculacion[]> {
    const res = await http.get<{ registros: CandidatoVinculacion[] }>('/activos-biologicos', {
      params: { id_infraestructura: idInfraestructura, page_size: 100 },
    });
    return res.data.registros;
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
