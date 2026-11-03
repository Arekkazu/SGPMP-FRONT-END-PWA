// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-81: historial de suministros por activo y su exportación |
import { historialApi } from '../api/historialApi';
import { useAsync } from './useAsync';

export function useHistorialSuministros() {
  return {
    consulta: useAsync(historialApi.consultar),
    exportacion: useAsync(historialApi.exportar),
    descarga: useAsync(historialApi.descargarTrabajo),
    consultarTrabajo: historialApi.trabajo,
  };
}
