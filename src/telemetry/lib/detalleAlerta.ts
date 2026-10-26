// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-05/M3-06: historial sin pasos repetidos y umbral superado |
import type { HistoricoEstadoAlertaSchema } from '../types';

/**
 * M3-05: "Activa → En atención" aparecía dos veces. El historial es inmutable y
 * hay filas de cuando el backend insertaba la transición además del trigger
 * (DEV-49): se agrupan al mostrar. De dos pasos iguales seguidos queda uno, con el
 * motivo y el autor del que los tenga.
 */
export function sinPasosRepetidos(historial: HistoricoEstadoAlertaSchema[]): HistoricoEstadoAlertaSchema[] {
  const resultado: HistoricoEstadoAlertaSchema[] = [];
  for (const paso of historial) {
    const previo = resultado[resultado.length - 1];
    const repetido = previo
      && previo.estado_anterior === paso.estado_anterior
      && previo.estado_nuevo === paso.estado_nuevo
      && paso.estado_anterior !== paso.estado_nuevo;
    if (!repetido) {
      resultado.push(paso);
      continue;
    }
    resultado[resultado.length - 1] = {
      ...previo,
      motivo: previo.motivo ?? paso.motivo,
      id_usuario: previo.id_usuario ?? paso.id_usuario,
      nombre_usuario: previo.nombre_usuario ?? paso.nombre_usuario,
    };
  }
  return resultado;
}

interface NivelRf17 {
  nivel?: string;
  limite_inferior?: string | number | null;
  limite_superior?: string | number | null;
}

/**
 * M3-06: una alerta "Crítica" de 25 °C no decía qué umbral superó. Las alertas por
 * lectura guardan los niveles del umbral RF-17 vigente (`niveles_rf17`) y las de ICA
 * la regla (`regla`). Devuelve el rango normal o la regla; null si no hay ninguno.
 */
export function umbralDeAlerta(metadato: Record<string, unknown> | null | undefined): { rangoNormal?: [string, string]; regla?: string } | null {
  if (!metadato) return null;
  const niveles = Array.isArray(metadato.niveles_rf17) ? (metadato.niveles_rf17 as NivelRf17[]) : [];
  const normal = niveles.find((n) => (n.nivel ?? '').toLowerCase() === 'normal');
  if (normal && normal.limite_inferior != null && normal.limite_superior != null) {
    return { rangoNormal: [String(normal.limite_inferior), String(normal.limite_superior)] };
  }
  return typeof metadato.regla === 'string' && metadato.regla ? { regla: metadato.regla } : null;
}
