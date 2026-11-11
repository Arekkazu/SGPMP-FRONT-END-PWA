// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: activos para el selector del módulo |
// | 2026-11-10 | Arekkazu | TC-DIS-209/210/214 RF-75/76: detalle del activo (tipo y población) para el cálculo por individuo |
import { http } from '../../shared/api/http';
import type { ActivoOpcion, InstanciaCiclo } from '../types';

interface ActivosPaginados { registros: ActivoOpcion[]; total_paginas: number }

export interface DetalleActivo {
  id_activo_biologico: number;
  tipo: string;
  identificador: string | null;
  /** Solo para un lote POBLACIONAL: individuos vivos hoy. */
  cantidad_actual: number | null;
}

/** Activos que el usuario puede ver (RLS por finca). El backend pagina de a 100 como máximo. */
export const activosApi = {
  async listar(pagina = 1): Promise<ActivosPaginados> {
    return (await http.get<ActivosPaginados>('/activos-biologicos', { params: { pagina, page_size: 100 } })).data;
  },
  /** Instancias de ciclo del activo (id_gestion_fases): la clave de RF-78/RF-79. */
  async ciclos(idActivo: number): Promise<InstanciaCiclo[]> {
    return (await http.get<{ fases: InstanciaCiclo[] }>(`/activos-biologicos/${idActivo}/fases`)).data.fases ?? [];
  },
  async detalle(idActivo: number): Promise<DetalleActivo> {
    const d = (await http.get<{
      id_activo_biologico: number; tipo: string; identificador: string | null;
      detalle_poblacional: { cantidad_actual: number | null } | null;
    }>(`/activos-biologicos/${idActivo}`)).data;
    return { id_activo_biologico: d.id_activo_biologico, tipo: d.tipo, identificador: d.identificador, cantidad_actual: d.detalle_poblacional?.cantidad_actual ?? null };
  },
};
