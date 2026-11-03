// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-13 RF-73: "Relacionado con" en vez del ID de referencia libre |
import i18n from '../../shared/i18n';
import { etiquetaTipoModelo } from '../types';

/**
 * AJF-13: entidades que el filtro deja elegir por nombre. Las de id UUID (resultado
 * de inferencia, retroalimentación) no van: se llega a ellas desde el detalle.
 * Son los valores que acepta `entidad_referencia` en `GET /prediccion/auditoria`.
 */
export const ENTIDADES_REFERENCIA = ['activo_biologico', 'version_modelo', 'patologia', 'configuracion_motor_ia'] as const;
export type EntidadReferencia = typeof ENTIDADES_REFERENCIA[number];

export interface OpcionReferencia { id: number; nombre: string; detalle?: string }

export interface ReferenciaEvento {
  entidad_referencia: string | null;
  id_referencia: string | null;
  nombre_referencia?: string | null;
}

/**
 * "Animal BOV-003", "Versión porcinos v3", "Patología Mastitis"… con el nombre que
 * resuelve el backend; sin nombre, el tipo y el id. `lote` es un activo biológico.
 */
export function etiquetaReferencia(e: ReferenciaEvento): string {
  if (!e.entidad_referencia && !e.id_referencia) return '—';
  const entidad = e.entidad_referencia === 'lote' ? 'activo_biologico' : (e.entidad_referencia ?? '');
  const tipo = i18n.t(`prediction:referencia.entidad.${entidad}`, { defaultValue: '' }) as string;
  let nombre = e.nombre_referencia ?? null;
  if (!nombre && entidad === 'tipo_modelo' && e.id_referencia) nombre = etiquetaTipoModelo(e.id_referencia);
  if (nombre) return tipo ? `${tipo} ${nombre}` : nombre;
  // UUIDs y entidades sin nombre: se acortan, el id completo queda en el detalle.
  const id = e.id_referencia && e.id_referencia.length > 12 ? `${e.id_referencia.slice(0, 8)}…` : e.id_referencia;
  return [tipo || entidad, id ? `#${id}` : ''].filter(Boolean).join(' ');
}
