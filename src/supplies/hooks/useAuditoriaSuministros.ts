// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-80: bitácora de auditoría, detalle y exportación |
import { auditoriaApi } from '../api/auditoriaApi';
import { useAsync } from './useAsync';

export function useAuditoriaSuministros() {
  return {
    lista: useAsync(auditoriaApi.listar),
    detalle: useAsync(auditoriaApi.detalle),
    exportacion: useAsync(auditoriaApi.exportar),
  };
}
