// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-71: estado de datos para reentrenar los modelos individuales |
// | 2026-10-31 | Arekkazu | RF-71/RF-73: solicitar el reentrenamiento (queda en la bitácora) |
// | 2026-10-31 | Arekkazu | RFC-010 RF-69: estado SOMBRA, versión por animal y fuente de datos |
// | 2026-11-02 | Arekkazu | AJF-14 RF-71: solicitud por animal y procesos de reentrenamiento |
import { http } from '../../shared/api/http';
import type {
  VersionModeloListResponse,
  VersionModeloResponse,
  ListarModelosFiltros,
  RegistrarNotasVersionDTO,
  EstadoReentrenamiento,
  TipoModelo, ListaProcesosReentrenamiento } from '../types';

const BASE = '/prediccion/modelos';

export const modelosApi = {
  async listar(filtros: ListarModelosFiltros = {}): Promise<VersionModeloListResponse> {
    const res = await http.get<VersionModeloListResponse>(BASE, { params: filtros });
    return res.data;
  },

  /** RF-71: retroalimentaciones nuevas por modelo individual y si alcanzan para reentrenar. */
  async estadoReentrenamiento(): Promise<EstadoReentrenamiento[]> {
    const res = await http.get<EstadoReentrenamiento[]>(`${BASE}/reentrenamiento`);
    return res.data;
  },

  /** RF-71/RF-73: deja REENTRENAMIENTO_SOLICITADO en la bitácora. 422 por debajo del mínimo. */
  async solicitarReentrenamiento(tipoModelo: TipoModelo): Promise<{ id_evento: string; estado: EstadoReentrenamiento }> {
    const res = await http.post<{ id_evento: string; estado: EstadoReentrenamiento }>(
      `${BASE}/reentrenamiento/solicitudes`, { tipo_modelo: tipoModelo });
    return res.data;
  },

  /** AJF-14: por animal abre un proceso que ejecuta el motor de IA. 409 si ya hay uno; 422 sin lecturas. */
  async solicitarReentrenamientoAnimal(idActivo: number, motivo?: string): Promise<{ id_evento: string; id_proceso_reentrenamiento: string }> {
    const res = await http.post<{ id_evento: string; id_proceso_reentrenamiento: string }>(
      `${BASE}/reentrenamiento/solicitudes`, { id_activo_biologico: idActivo, motivo });
    return res.data;
  },

  /** AJF-14: procesos de reentrenamiento con sus 7 fases. Recurso 43 (R). */
  async procesosReentrenamiento(filtros: { estado?: string; id_activo_biologico?: number; pagina?: number; por_pagina?: number } = {}): Promise<ListaProcesosReentrenamiento> {
    const res = await http.get<ListaProcesosReentrenamiento>(`${BASE}/reentrenamiento/procesos`, { params: filtros });
    return res.data;
  },

  async detalle(idVersion: number): Promise<VersionModeloResponse> {
    const res = await http.get<VersionModeloResponse>(`${BASE}/${idVersion}`);
    return res.data;
  },

  async registrarNotas(idVersion: number, dto: RegistrarNotasVersionDTO): Promise<VersionModeloResponse> {
    const res = await http.patch<VersionModeloResponse>(`${BASE}/${idVersion}/notas`, dto);
    return res.data;
  },

  /** RFC-010: APROBADO → SOMBRA. Corre en el motor y registra resultados, pero no alerta. */
  async ponerEnSombra(idVersion: number): Promise<VersionModeloResponse> {
    const res = await http.post<VersionModeloResponse>(`${BASE}/${idVersion}/sombra`);
    return res.data;
  },

  /** Activa una versión APROBADA o en SOMBRA con notas → 422 si faltan notas, si es SINTETICA o la transición es inválida. */
  async activar(idVersion: number): Promise<VersionModeloResponse> {
    const res = await http.post<VersionModeloResponse>(`${BASE}/${idVersion}/activar`);
    return res.data;
  },
};
