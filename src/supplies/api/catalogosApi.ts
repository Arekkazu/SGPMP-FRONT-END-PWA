// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | CP119/H-M05-03 RF-77: especies, fincas e infraestructuras para el reporte de gastos agregado |
import { http } from '../../shared/api/http';

export interface OpcionCatalogo { id: number; nombre: string }

/** Catálogos de Configuración (M09) que el reporte agregado necesita; solo los activos. */
export const catalogosApi = {
  async especies(): Promise<OpcionCatalogo[]> {
    const r = (await http.get<{ items: Array<{ id_especie: number; nombre: string }> }>('/configuracion/especies', { params: { solo_activas: true } })).data;
    return r.items.map((e) => ({ id: e.id_especie, nombre: e.nombre }));
  },
  async fincas(): Promise<OpcionCatalogo[]> {
    const r = (await http.get<{ items: Array<{ id_finca: number; nombre: string }> }>('/configuracion/fincas', { params: { solo_activas: true } })).data;
    return r.items.map((f) => ({ id: f.id_finca, nombre: f.nombre }));
  },
  async infraestructuras(idFinca: number): Promise<OpcionCatalogo[]> {
    const r = (await http.get<{ items: Array<{ id_infraestructura: number; nombre_infraestructura: string }> }>('/configuracion/infraestructuras', {
      params: { finca_id: idFinca, solo_activas: true },
    })).data;
    return r.items.map((i) => ({ id: i.id_infraestructura, nombre: i.nombre_infraestructura }));
  },
};
