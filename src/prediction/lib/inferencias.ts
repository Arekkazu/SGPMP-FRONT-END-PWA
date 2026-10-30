// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66: view-model del monitor desde GET /prediccion/inferencias (antes monitorMock) |
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo 13.9 RF-66/RF-68: id del activo y fecha ISO para unir con contagio |
import { formatearFechaHora, formatearHora } from '../../shared/i18n/formato';
import type { InferenciaMonitorResponse, ModoEjecucion, TipoModelo } from '../types';

export type EstadoInferencia = 'EMITIDO' | 'RECHAZADO' | 'FALLIDO' | 'DESCARTADO' | 'NO_DISPONIBLE';
export type MotivoFallback = 'NODO_DESINCRONIZADO' | 'ERROR_MODELO' | 'TIMEOUT';

/** Lo que pintan el monitor y su detalle. Los valores derivados los decide el motor. */
export interface Inferencia {
  id: string;
  uuid: string;
  idActivo: number;
  /** ISO de la inferencia: `hora` es solo para mostrar. */
  fecha: string;
  /** Activo (individual) o lote/área (poblacional). */
  unidad: string;
  area: string;
  especie: string;
  tipoModelo: TipoModelo;
  estado: EstadoInferencia;
  modo: ModoEjecucion;
  fallback?: MotivoFallback;
  version: string;
  ventana: string;
  latenciaMs: number | null;
  hora: string;
  nivel: 0 | 1 | 2 | 3 | null;
  score?: number;
  umbralScore?: number;
  confianzaBaja?: boolean;
  vector?: { densidad: number; dispersion: number; tasa: number; individuos: number; cobertura: number };
  enfermedad?: string;
  confianza?: number;
  distRiesgo?: [number, number, number, number];
  distPatologias?: { nombre: string; prob: number }[];
  variables?: { nombre: string; valor: string }[];
  faltantes?: string[];
  contextoIncompleto?: boolean;
  hibrido?: { syncMs: number; nivelServidor: number; discrepancia: boolean };
  paquete?: string;
  eventoEdge?: string;
  alerta?: string;
  nota?: string;
}

const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/**
 * Un resultado de `modulo4.resultados_inferencia` en la forma del monitor. Esa tabla solo
 * guarda resultados emitidos: los rechazos y fallos quedan en la bitácora (RF-73).
 */
export function aInferencia(r: InferenciaMonitorResponse): Inferencia {
  const prob = r.probabilidad_riesgo ?? {};
  const niveles = [0, 1, 2, 3].map((k) => numero(prob[String(k)]));
  const enfermedades = Object.entries(r.probabilidad_enfermedad ?? {})
    .filter(([, p]) => typeof p === 'number')
    .map(([nombre, p]) => ({ nombre, prob: p }))
    .sort((a, b) => b.prob - a.prob);
  const ventana = r.fecha_inicio_ventana && r.fecha_fin_ventana
    ? `${formatearHora(r.fecha_inicio_ventana)}–${formatearHora(r.fecha_fin_ventana)}` : '—';
  return {
    id: `INF-${r.id_resultado_inferencia.slice(0, 8)}`,
    uuid: r.id_resultado_inferencia,
    idActivo: r.id_activo_biologico,
    fecha: r.fecha_inferencia,
    unidad: r.identificador_activo ?? `#${r.id_activo_biologico}`,
    area: `${r.nombre_area} · ${r.nombre_finca}`,
    especie: r.especie ?? '—',
    tipoModelo: r.tipo_modelo,
    estado: 'EMITIDO',
    modo: r.modo_ejecucion,
    version: r.nombre_version ?? `#${r.id_version_modelo}`,
    ventana,
    latenciaMs: r.latencia_ms,
    hora: formatearFechaHora(r.fecha_inferencia),
    nivel: ([0, 1, 2, 3] as const).includes(r.nivel_riesgo as 0) ? (r.nivel_riesgo as 0 | 1 | 2 | 3) : null,
    score: numero(prob.score_anomalia),
    umbralScore: numero(prob.umbral_score_anomalia),
    enfermedad: r.nombre_patologia ?? undefined,
    confianza: r.confianza_global,
    distRiesgo: niveles.every((p) => p !== undefined) ? (niveles as [number, number, number, number]) : undefined,
    distPatologias: enfermedades.length ? enfermedades : undefined,
    contextoIncompleto: r.contexto_incompleto,
    alerta: r.id_alerta_generada != null ? `ALR-${r.id_alerta_generada}` : undefined,
  };
}

/** El último resultado de cada unidad es su estado actual (la lista llega de la más reciente). */
export function ultimoPorUnidad(lista: Inferencia[]): Inferencia[] {
  const vistos = new Set<string>();
  return lista.filter((i) => (vistos.has(i.unidad) ? false : (vistos.add(i.unidad), true)));
}

/** Percentil 95 de las latencias conocidas; null sin datos. */
export function latenciaP95(lista: Inferencia[]): number | null {
  const ms = lista.map((i) => i.latenciaMs).filter((v): v is number => v != null).sort((a, b) => a - b);
  return ms.length ? ms[Math.min(ms.length - 1, Math.ceil(ms.length * 0.95) - 1)] : null;
}
