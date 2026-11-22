// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: cliente del API de reportes |
import { http } from '../../shared/api/http';
import type {
  FormatoReporte, Reporte, ReporteCatalogo, TipoFiltro, TipoReporte, ValoresFiltros, VistaPrevia,
} from '../tipos';

export interface OpcionFiltro {
  valor: number;
  etiqueta: string;
  estado?: string;
}

export const reportesApi = {
  async catalogo(): Promise<ReporteCatalogo[]> {
    return (await http.get<ReporteCatalogo[]>('/reportes/catalogo')).data;
  },
  async opciones(filtro: Exclude<TipoFiltro, 'fecha' | 'lista'>): Promise<OpcionFiltro[]> {
    return (await http.get<OpcionFiltro[]>(`/reportes/opciones/${filtro}`)).data;
  },
  async vistaPrevia(tipo: TipoReporte, filtros: ValoresFiltros): Promise<VistaPrevia> {
    return (await http.post<VistaPrevia>('/reportes/vista-previa', { tipo_reporte: tipo, filtros }, { timeout: 60000 })).data;
  },
  /** 201 con el reporte listo, o 202 si se genera en segundo plano (más de 1.000 registros). */
  async generar(tipo: TipoReporte, formato: FormatoReporte, filtros: ValoresFiltros): Promise<Reporte> {
    return (await http.post<Reporte>('/reportes', { tipo_reporte: tipo, formato, filtros }, { timeout: 60000 })).data;
  },
  async listar(): Promise<Reporte[]> {
    return (await http.get<Reporte[]>('/reportes')).data;
  },
  async cancelar(idReporte: string): Promise<Reporte> {
    return (await http.patch<Reporte>(`/reportes/${idReporte}/cancelado`)).data;
  },
  async descargar(idReporte: string, numeroParte: number, nombre: string): Promise<void> {
    const { data } = await http.get<Blob>(`/reportes/${idReporte}/partes/${numeroParte}/descarga`,
      { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(data);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  },
};
