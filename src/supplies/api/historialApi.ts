// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-81: historial de suministros, exportación y trabajos pesados |
import { http } from '../../shared/api/http';
import type { ConsultaAsincrona, EstadoTrabajoHistorial, FiltrosHistorial, LineaHistorial, ResultadoHistorial, ResumenHistorial } from '../types';

const BASE = '/suministros/historial';

export type ResultadoExportacion = { tipo: 'archivo'; blob: Blob; nombre: string } | { tipo: 'asincrono'; consulta: ConsultaAsincrona };

function nombreDeArchivo(disposicion: string | undefined, porDefecto: string): string {
  return disposicion?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] ?? porDefecto;
}

export const historialApi = {
  /** 200 con la página, o 202 cuando el volumen del activo es de nivel 3-4 (se procesa en cola). */
  async consultar(filtros: FiltrosHistorial): Promise<ResultadoHistorial> {
    const res = await http.get(BASE, { params: filtros });
    if (res.status === 202) return { tipo: 'asincrono', consulta: res.data as ConsultaAsincrona };
    const data = res.data as { items: LineaHistorial[]; resumen: ResumenHistorial };
    return { tipo: 'pagina', items: data.items, resumen: data.resumen };
  },
  /** Archivo directo, o 202 si supera 10.000 registros. */
  async exportar(filtros: FiltrosHistorial, formato: 'PDF' | 'EXCEL'): Promise<ResultadoExportacion> {
    const { pagina: _p, registros_por_pagina: _r, ...resto } = filtros;
    const res = await http.get(`${BASE}/exportar`, { params: { ...resto, formato_exportacion: formato }, responseType: 'blob' });
    if (res.status === 202) return { tipo: 'asincrono', consulta: JSON.parse(await (res.data as Blob).text()) as ConsultaAsincrona };
    const ext = formato === 'PDF' ? 'pdf' : 'xlsx';
    return { tipo: 'archivo', blob: res.data as Blob, nombre: nombreDeArchivo(res.headers['content-disposition'], `historial_suministros.${ext}`) };
  },
  async trabajo(idCola: number): Promise<EstadoTrabajoHistorial> {
    return (await http.get<EstadoTrabajoHistorial>(`${BASE}/trabajos/${idCola}`)).data;
  },
  async descargarTrabajo(idCola: number): Promise<Blob> {
    return (await http.get(`${BASE}/trabajos/${idCola}/descargar`, { responseType: 'blob' })).data as Blob;
  },
};
