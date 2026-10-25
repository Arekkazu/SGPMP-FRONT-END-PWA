// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75/RF-76: listar, registrar y anular consumos y medicamentos |
import { suministrosApi } from '../api/suministrosApi';
import { useAsync } from './useAsync';

/** RF-75: consumos de alimento. */
export function useConsumos() {
  return {
    lista: useAsync(suministrosApi.listarConsumos),
    tipos: useAsync(suministrosApi.tiposAlimento),
    registro: useAsync(suministrosApi.registrarConsumo),
    anulacion: useAsync(suministrosApi.anularConsumo),
  };
}

/** RF-76: aplicaciones de medicamento. */
export function useMedicamentos() {
  return {
    lista: useAsync(suministrosApi.listarMedicamentos),
    registro: useAsync(suministrosApi.registrarMedicamento),
    anulacion: useAsync(suministrosApi.anularMedicamento),
  };
}
