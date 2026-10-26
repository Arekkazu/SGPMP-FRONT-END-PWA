// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-02 RF-64: variables (I3P-1) y especies del backend, no listas estáticas |
import { http } from '../../shared/api/http';

export interface VariableCatalogo {
  id_variable_ambiental: number;
  nombre: string;
  unidad: string;
}

export interface EspecieCatalogo {
  id_especie: number;
  nombre: string;
}

/**
 * M4-02: los IDs de la lista estática no coincidían con la BD (el 3 era Amoníaco en
 * el front y Oxígeno disuelto en `modulo9.variables_ambientales`) y faltaban las
 * variables biométricas. Son los mismos catálogos de M09 (RF-16 / I3P-1).
 */
export const catalogosApi = {
  /** Recurso 20 (umbrales ambientales), R: Administrador y Veterinario. */
  async variables(): Promise<VariableCatalogo[]> {
    const res = await http.get<{ items: VariableCatalogo[] }>('/configuracion/variables-ambientales');
    return res.data.items ?? [];
  },
  /** Recurso 8 (especies), R. */
  async especies(): Promise<EspecieCatalogo[]> {
    const res = await http.get<{ items: EspecieCatalogo[] }>('/configuracion/especies', { params: { solo_activas: true } });
    return res.data.items ?? [];
  },
};
