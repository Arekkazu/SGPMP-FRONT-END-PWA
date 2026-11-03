// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | AJF-05 RF-59: catálogo de especies para elegir la especie del historial de la lista |
import { http } from '../../shared/api/http';

export interface EspecieTelemetria {
  id_especie: number;
  nombre: string;
}

export const especiesApi = {
  /** Catálogo de M09 (recurso 8, Leer): lo tienen Administrador, Productor, Veterinario, Ingeniero y Contador. */
  async listar(): Promise<EspecieTelemetria[]> {
    const res = await http.get<{ items?: EspecieTelemetria[] }>('/configuracion/especies', { params: { solo_activas: true } });
    return res.data.items ?? [];
  },
};
