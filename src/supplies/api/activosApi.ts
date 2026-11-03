// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: activos para el selector del módulo |
import { http } from '../../shared/api/http';
import type { ActivoOpcion, InstanciaCiclo } from '../types';

interface ActivosPaginados { registros: ActivoOpcion[]; total_paginas: number }

/** Activos que el usuario puede ver (RLS por finca). El backend pagina de a 100 como máximo. */
export const activosApi = {
  async listar(pagina = 1): Promise<ActivosPaginados> {
    return (await http.get<ActivosPaginados>('/activos-biologicos', { params: { pagina, page_size: 100 } })).data;
  },
  /** Instancias de ciclo del activo (id_gestion_fases): la clave de RF-78/RF-79. */
  async ciclos(idActivo: number): Promise<InstanciaCiclo[]> {
    return (await http.get<{ fases: InstanciaCiclo[] }>(`/activos-biologicos/${idActivo}/fases`)).data.fases;
  },
};
