// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
import type { EstadoSensorSchema } from '../types';

/**
 * RF-58 (DEV-39): estado de la lectura que el dashboard no muestra como valor operativo normal.
 *
 * - `sin_umbral` (E7): GRIS porque la variable no tiene umbral en M09.
 * - `fuera_de_rango` (R2): lectura FUERA_DE_RANGO, visible con indicador.
 * - `requiere_calibracion` (E2): ERROR_CALIBRACION en la vista técnica (trae el valor).
 * - `en_revision_tecnica` (E2): ERROR_CALIBRACION sin el permiso de datos técnicos (sin valor).
 */
export type EstadoLectura = 'sin_umbral' | 'fuera_de_rango' | 'requiere_calibracion' | 'en_revision_tecnica';

/** El backend manda la etiqueta en español; aquí se traduce a una clave para es-CO y en-US. */
const POR_ETIQUETA: Record<string, EstadoLectura> = {
  'Sin umbral configurado': 'sin_umbral',
  'Lectura fuera de rango': 'fuera_de_rango',
  'Requiere calibración': 'requiere_calibracion',
  'En revisión técnica': 'en_revision_tecnica',
};

export function estadoLectura(
  sensor: Pick<EstadoSensorSchema, 'sin_umbral' | 'indicador_anomalia' | 'estado_calidad' | 'etiqueta_estado' | 'ultimo_valor'>,
): EstadoLectura | null {
  const porEtiqueta = sensor.etiqueta_estado ? POR_ETIQUETA[sensor.etiqueta_estado] : undefined;
  if (porEtiqueta) return porEtiqueta;
  // Sin etiqueta conocida, se deduce de los indicadores (mismo criterio que el backend).
  if (sensor.indicador_anomalia) {
    if (sensor.estado_calidad === 'ERROR_CALIBRACION') {
      return sensor.ultimo_valor == null ? 'en_revision_tecnica' : 'requiere_calibracion';
    }
    return 'fuera_de_rango';
  }
  return sensor.sin_umbral ? 'sin_umbral' : null;
}
