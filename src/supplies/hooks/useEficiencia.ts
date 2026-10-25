// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74: ICA vigente, historial, cálculo y panel del batch |
import { eficienciaApi } from '../api/eficienciaApi';
import { useAsync } from './useAsync';

export function useEficiencia() {
  return {
    vigente: useAsync(eficienciaApi.vigente),
    historial: useAsync(eficienciaApi.historial),
    calculo: useAsync(eficienciaApi.calcular),
  };
}

export function useBatchIca() {
  return {
    corridas: useAsync(eficienciaApi.corridas),
    cola: useAsync(eficienciaApi.cola),
    fallos: useAsync(eficienciaApi.fallos),
    ejecucion: useAsync(eficienciaApi.ejecutarBatch),
    interrupcion: useAsync(eficienciaApi.interrumpir),
    reintento: useAsync(eficienciaApi.reintentar),
  };
}
