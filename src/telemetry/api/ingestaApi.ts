// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-07 RF-53: lectura real de la bitácora de ingesta |
import { http } from '../../shared/api/http';
import type { FiltrosIngesta, IndicadoresIngesta, ListaIngesta } from '../types';

// Los Decimal del backend llegan como texto ("23.5000").
const n = (v: unknown) => (v == null ? null : Number(v));

export const ingestaApi = {
  /** Eventos de la ingesta, paginados (24 h por defecto, máx. 31 días). Recurso 36 (R). */
  async listar(filtros: FiltrosIngesta = {}): Promise<ListaIngesta> {
    const res = await http.get<ListaIngesta>('/iot/ingesta', { params: filtros });
    return { ...res.data, items: res.data.items.map((i) => ({ ...i, valor_crudo: n(i.valor_crudo), valor_ajustado: n(i.valor_ajustado) })) };
  },
  /** Lecturas de hoy en el día del usuario. Recurso 36 (R). */
  async indicadores(): Promise<IndicadoresIngesta> {
    const res = await http.get<IndicadoresIngesta>('/iot/ingesta/indicadores');
    return res.data;
  },
};
