// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-73: RF de origen de cada evento de la bitácora M04 |

// El backend no guarda el RF de origen ni filtra por él: se deriva del prefijo de
// tipo_evento. Si aparece un tipo nuevo sin prefijo conocido, queda como null.
const PREFIJOS: [string, string][] = [
  ['CATALOGO_PATOLOGIA_', 'RF-64'],
  ['CONFIGURACION_MOTOR_', 'RF-65'],
  ['MOTOR_CONFIG_', 'RF-65'],
  ['INFERENCIA_', 'RF-66'],
  ['HISTORIAL_', 'RF-67'],
  ['CONTAGIO_', 'RF-68'],
  ['RIESGO_CONTAGIO', 'RF-68'],
  ['VERSION_', 'RF-69'],
  ['INTENTO_CARGA_MODELO', 'RF-69'],
  ['HASH_INVALIDO', 'RF-69'],
  ['OTA_', 'RF-70'],
  ['DESPLIEGUE_', 'RF-70'],
  ['DISTRIBUCION_', 'RF-70'],
  ['REENTRENAMIENTO_', 'RF-71'],
  ['RETROALIMENTACION_', 'RF-72'],
  ['CONFLICTO_RETROALIMENTACION', 'RF-72'],
  ['EXPORTACION_', 'RF-73'],
  ['AUDITORIA_', 'RF-73'],
];

export const RF_ORIGEN = ['RF-64', 'RF-65', 'RF-66', 'RF-67', 'RF-68', 'RF-69', 'RF-70', 'RF-71', 'RF-72', 'RF-73'];

export function rfDeEvento(tipoEvento: string): string | null {
  return PREFIJOS.find(([p]) => tipoEvento.startsWith(p))?.[1] ?? null;
}
