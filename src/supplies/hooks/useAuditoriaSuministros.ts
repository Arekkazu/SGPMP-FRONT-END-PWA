// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-80: bitácora de auditoría, detalle y exportación |
// | 2026-11-12 | Arekkazu | USAB-M05-M06 N-07 RF-80: usuarios de la bitácora por nombre para el filtro |
import { auditoriaApi } from '../api/auditoriaApi';
import { useAsync } from './useAsync';

export function useAuditoriaSuministros() {
  return {
    lista: useAsync(auditoriaApi.listar),
    actores: useAsync(auditoriaApi.actores),
    detalle: useAsync(auditoriaApi.detalle),
    exportacion: useAsync(auditoriaApi.exportar),
  };
}
