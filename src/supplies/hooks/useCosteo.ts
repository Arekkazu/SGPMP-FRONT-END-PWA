// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-78/RF-79: acumulado del ciclo, registros, correcciones y NIC-41 |
import { costeoApi } from '../api/costeoApi';
import { historialApi } from '../api/historialApi';
import { activosApi } from '../api/activosApi';
import { useAsync } from './useAsync';

export function useCosteo() {
  return {
    acumulado: useAsync(costeoApi.acumuladoActivo),
    /** Registros del ciclo (RF-81) para poder corregirlos. */
    registros: useAsync(historialApi.consultar),
    registro: useAsync(costeoApi.registrar),
    correccion: useAsync(costeoApi.corregir),
  };
}

export function useNic41() {
  return {
    ciclos: useAsync(activosApi.ciclos),
    versiones: useAsync(costeoApi.versionesNic41),
    consolidacion: useAsync(costeoApi.consolidarNic41),
    detalle: useAsync(costeoApi.detalleNic41),
    correccion: useAsync(costeoApi.corregirNic41),
  };
}
