// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: la vinculación se describe con nombres, no con IDs |
import i18n from '../../shared/i18n';
import { valorConUnidad } from './sensorEscala';
import type { VinculacionLecturaSchema } from '../types';

/** «BOV-101», o la especie con su número si el activo no tiene identificador. */
export function nombreActivoVinculado(v: VinculacionLecturaSchema): string {
  if (v.id_activo_biologico == null) return i18n.t('telemetry:vinculacion.sin_activo');
  if (v.nombre_activo) return v.nombre_activo;
  return v.especie_activo ? `${v.especie_activo} #${v.id_activo_biologico}` : `#${v.id_activo_biologico}`;
}

/** «pH del agua · 7,2 pH». Sin nombre de variable (backend anterior) queda el número de lectura. */
export function lecturaVinculada(v: VinculacionLecturaSchema): string {
  if (!v.nombre_variable) return i18n.t('telemetry:vinculacion.lectura_numero', { id: v.id_telemetria });
  return `${v.nombre_variable} · ${valorConUnidad(v.valor_lectura, v.unidad_lectura)}`;
}

/** «Finca El Remanso › Estanque-01». */
export function ubicacionVinculada(v: VinculacionLecturaSchema): string {
  if (!v.nombre_infraestructura) return `#${v.id_infraestructura}`;
  return v.nombre_finca ? `${v.nombre_finca} › ${v.nombre_infraestructura}` : v.nombre_infraestructura;
}
