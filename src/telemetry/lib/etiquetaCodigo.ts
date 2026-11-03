// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-19: códigos del backend en lenguaje del usuario |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-22: un texto que ya es legible se muestra tal cual, sin buscarlo en el catálogo |
import i18n from '../../shared/i18n';
import { humanizar } from '../../shared/lib/etiquetas';

const POSTCOMMIT = /^POSTCOMMIT_(.+)_(FALLIDO|COMPLETADO)$/;

/**
 * Código interno del backend → texto legible (T-19 del reporte de usabilidad):
 * FALLO_AMBIENTAL, TIEMPO_REAL, POSTCOMMIT_RF62_FALLIDO… Busca en el catálogo
 * `telemetry:codigos` y, si no está, lo humaniza. Solo para mostrar: el valor que
 * viaja al backend sigue siendo el código.
 */
export function etiquetaCodigo(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  // "pH del agua" ya es texto para personas: ni catálogo ni humanizar (daba "Ph del agua").
  if (!codigo.includes('_') && /\p{Ll}/u.test(codigo)) return codigo;
  const m = POSTCOMMIT.exec(codigo);
  if (m) {
    const etapa = i18n.t(`telemetry:codigos.etapa.${m[1]}`, { defaultValue: humanizar(m[1]).toLowerCase() });
    return i18n.t(`telemetry:codigos.postcommit_${m[2].toLowerCase()}`, { etapa });
  }
  return i18n.t(`telemetry:codigos.${codigo}`, { defaultValue: humanizar(codigo) });
}
