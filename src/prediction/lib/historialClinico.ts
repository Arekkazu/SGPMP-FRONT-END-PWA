// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-282..285 RF-106: relación inferencia ↔ evento sanitario y retroalimentación, TVCO y grupos |
import type { EventoHistorialResponse } from '../types';

/**
 * RF-106: lo que el historial cuenta de cada inferencia además de su nivel. La retroalimentación llega en la propia
 * inferencia (`payload.retroalimentacion`) o como evento RETROALIMENTACION del mismo resultado; un evento sanitario se
 * relaciona con la última inferencia anterior a él, si ocurrió dentro de las 72 horas siguientes.
 */
export interface Relacion {
  /** Estados de la retroalimentación (CORRECTO, PARCIAL, INCORRECTO, SIN_EVENTO). */
  retros: string[];
  conflicto: boolean;
  sanitario: { descripcion: string; minutos: number } | null;
}

const VENTANA_SANITARIA_MIN = 72 * 60;
const minutos = (desde: string, hasta: string) => Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60_000);

export function relacionar(eventos: EventoHistorialResponse[]): Map<string, Relacion> {
  const orden = [...eventos].sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento));
  const inferencias = orden.filter((e) => e.tipo_evento === 'INFERENCIA');
  const porResultado = new Map(inferencias.filter((e) => e.id_resultado_inferencia).map((e) => [e.id_resultado_inferencia, e]));
  const relaciones = new Map<string, Relacion>(inferencias.map((e) => {
    const propia = e.payload?.retroalimentacion;
    const retros = (Array.isArray(propia) ? propia : propia ? [propia] : []).map(String);
    return [e.id_evento, { retros, conflicto: new Set(retros).size > 1, sanitario: null }];
  }));
  for (const e of orden) {
    if (e.tipo_evento === 'RETROALIMENTACION' && e.id_resultado_inferencia) {
      const inferencia = porResultado.get(e.id_resultado_inferencia);
      const r = inferencia && relaciones.get(inferencia.id_evento);
      if (!r) continue;
      if (typeof e.payload?.estado_retroalimentacion === 'string') r.retros.push(e.payload.estado_retroalimentacion);
      r.conflicto = r.conflicto || e.payload?.es_conflicto_retroalimentacion === true || new Set(r.retros).size > 1;
    } else if (e.tipo_evento === 'EVENTO_SANITARIO') {
      const previa = [...inferencias].reverse().find((i) => i.fecha_evento <= e.fecha_evento);
      const r = previa && relaciones.get(previa.id_evento);
      const m = previa ? minutos(previa.fecha_evento, e.fecha_evento) : Infinity;
      if (r && !r.sanitario && m <= VENTANA_SANITARIA_MIN) {
        r.sanitario = { descripcion: String(e.payload?.descripcion ?? e.payload?.tipo_evento ?? ''), minutos: m };
      }
    }
  }
  return relaciones;
}

/**
 * Tasa de Validación Clínica Observada (RF-106): correctas / retroalimentadas sin conflicto. Las que no tienen
 * retroalimentación y las que están en conflicto quedan fuera del denominador. Sin denominador: `tasa` null.
 */
export function tasaValidacion(relaciones: Iterable<Relacion>) {
  let correctas = 0; let validadas = 0; let excluidas = 0; let pendientes = 0;
  for (const r of relaciones) {
    if (r.retros.length === 0) pendientes += 1;
    else if (r.conflicto) excluidas += 1;
    else { validadas += 1; if (r.retros[0] === 'CORRECTO') correctas += 1; }
  }
  return { tasa: validadas ? correctas / validadas : null, correctas, validadas, excluidas, pendientes };
}

/** RF-106 restricción 5: los eventos seguidos a menos de `umbral` minutos se agrupan en un solo marcador. */
export function agrupar<T extends { fecha_evento: string }>(eventos: T[], umbral = 60): T[][] {
  const grupos: T[][] = [];
  for (const e of eventos) {
    const ultimo = grupos[grupos.length - 1];
    const vecino = ultimo?.[ultimo.length - 1];
    if (vecino && Math.abs(minutos(vecino.fecha_evento, e.fecha_evento)) < umbral) ultimo.push(e);
    else grupos.push([e]);
  }
  return grupos;
}
