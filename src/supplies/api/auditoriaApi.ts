// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-80: bitácora de auditoría del módulo |
// | 2026-11-12 | Arekkazu | USAB-M05-M06 N-07 RF-80: usuarios de la bitácora por nombre para el filtro |
import { http } from '../../shared/api/http';
import type { ActorAuditoria, EventoAuditoriaSuministro, FiltrosAuditoria, ListaAuditoria } from '../types';

const BASE = '/suministros/auditoria';

export const auditoriaApi = {
  async listar(filtros: FiltrosAuditoria): Promise<ListaAuditoria> {
    return (await http.get<ListaAuditoria>(BASE, { params: filtros })).data;
  },
  /** Quienes aparecen en la bitácora, por nombre: el filtro «Usuario» ya no pide su número (N-07). */
  async actores(): Promise<ActorAuditoria[]> {
    return (await http.get<ActorAuditoria[]>(`${BASE}/actores`)).data;
  },
  async detalle(id: number): Promise<EventoAuditoriaSuministro> {
    return (await http.get<EventoAuditoriaSuministro>(`${BASE}/${id}`)).data;
  },
  async exportar(filtros: FiltrosAuditoria, formato: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> {
    const { pagina: _p, registros_por_pagina: _r, ...resto } = filtros;
    return (await http.get(`${BASE}/exportar`, { params: { ...resto, formato }, responseType: 'blob' })).data as Blob;
  },
};
