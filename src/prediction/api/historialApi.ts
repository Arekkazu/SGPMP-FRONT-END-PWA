// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-09 RF-67: el selector de animales leía items y pedía por_pagina; quedaba vacío |
// | 2026-11-03 | Arekkazu | AJF-09 RF-67: /activos-biologicos sin barra final (307 fuera del prefijo del proxy) |
import { http } from '../../shared/api/http';
import type {
  HistorialDiagnosticoResponse,
  ConsultarHistorialFiltros,
  ActivoSelectorItem,
} from '../types';

const BASE = '/prediccion/historial';

export const historialApi = {
  /** Historial de un activo (paginación por cursor). fecha_inicio/fecha_fin son requeridos. */
  async consultar(
    idActivoBiologico: number,
    filtros: ConsultarHistorialFiltros
  ): Promise<HistorialDiagnosticoResponse> {
    const res = await http.get<HistorialDiagnosticoResponse>(`${BASE}/${idActivoBiologico}`, {
      params: filtros,
    });
    return res.data;
  },

  /**
   * Animales y lotes para el selector del filtro (M02, sin importar el módulo).
   * AJF-09: el listado de M02 pagina con `page_size` (máx. 100) y devuelve `registros`;
   * aquí se pedía `por_pagina` y se leía `items`, así que el selector quedaba siempre vacío
   * y no había cómo consultar el historial. Mismo arreglo que CP34 en telemetría.
   * ponytail: hasta 10 páginas (1.000 activos); un buscador del lado del servidor si crece.
   */
  async listarActivos(): Promise<ActivoSelectorItem[]> {
    const todos: ActivoSelectorItem[] = [];
    for (let pagina = 1; pagina <= 10; pagina++) {
      const res = await http.get<{ registros?: ActivoSelectorItem[]; total_paginas?: number }>(
        // Sin barra final: con ella el backend responde 307 a una URL sin el prefijo del proxy
        // (/sigab-dev) y el navegador no llega; el selector quedaba vacío sin aviso.
        '/activos-biologicos', { params: { pagina, page_size: 100 } },
      );
      todos.push(...(res.data.registros ?? []));
      if (pagina >= (res.data.total_paginas ?? 1)) break;
    }
    return todos;
  },
};
