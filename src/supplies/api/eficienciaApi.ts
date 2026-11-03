// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74: cálculo, consulta e historial del ICA y panel del batch |
import { http } from '../../shared/api/http';
import type { ConsultaVigenteIca, EstadoBatchIca, FalloIca, ItemColaIca, Lista, PeriodoEvaluacion, ResultadoIca } from '../types';

const BASE = '/suministros/eficiencia-alimenticia';

export const eficienciaApi = {
  async calcular(idActivo: number, periodo: PeriodoEvaluacion): Promise<ResultadoIca> {
    return (await http.post<ResultadoIca>(`${BASE}/calcular`, { id_activo_biologico: idActivo, periodo_evaluacion: periodo })).data;
  },
  async vigente(idActivo: number, periodo: PeriodoEvaluacion): Promise<ConsultaVigenteIca> {
    return (await http.get<ConsultaVigenteIca>(`${BASE}/activos/${idActivo}/vigente`, { params: { periodo } })).data;
  },
  async historial(idActivo: number, periodo?: PeriodoEvaluacion): Promise<Lista<ResultadoIca>> {
    return (await http.get<Lista<ResultadoIca>>(`${BASE}/activos/${idActivo}/historial`, { params: { periodo } })).data;
  },
  async corridas(): Promise<EstadoBatchIca[]> {
    return (await http.get<EstadoBatchIca[]>(`${BASE}/batch/estado`)).data;
  },
  async cola(): Promise<Lista<ItemColaIca>> {
    return (await http.get<Lista<ItemColaIca>>(`${BASE}/batch/cola`)).data;
  },
  async fallos(): Promise<Lista<FalloIca>> {
    return (await http.get<Lista<FalloIca>>(`${BASE}/batch/fallos`)).data;
  },
  async ejecutarBatch(soloCola: boolean): Promise<EstadoBatchIca> {
    return (await http.post<EstadoBatchIca>(`${BASE}/batch/ejecutar`, { solo_cola: soloCola })).data;
  },
  async interrumpir(idEjecucion: number, motivo: string): Promise<EstadoBatchIca> {
    return (await http.post<EstadoBatchIca>(`${BASE}/batch/${idEjecucion}/interrumpir`, { motivo: motivo || null })).data;
  },
  async reintentar(idActivo: number): Promise<Lista<ResultadoIca>> {
    return (await http.post<Lista<ResultadoIca>>(`${BASE}/batch/activos/${idActivo}/reintentar`)).data;
  },
};
