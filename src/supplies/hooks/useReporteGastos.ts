// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-77: generar, consultar, exportar y descargar reportes de gastos |
import { reportesApi } from '../api/reportesApi';
import { useAsync } from './useAsync';

export function useReporteGastos() {
  return {
    generacion: useAsync(reportesApi.generar),
    historial: useAsync(reportesApi.historial),
    detalle: useAsync(reportesApi.detalle),
    regeneracion: useAsync(reportesApi.regenerar),
    exportacion: useAsync(reportesApi.exportar),
    descarga: useAsync(reportesApi.descargar),
    consultarTrabajo: reportesApi.trabajo,
  };
}
