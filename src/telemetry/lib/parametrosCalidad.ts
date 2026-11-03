// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-06 RF-62: parámetros aplicados de la evaluación de calidad en lenguaje del usuario |
import i18n from '../../shared/i18n';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { etiquetaCodigo } from './etiquetaCodigo';

/**
 * `parametros_aplicados` de una evaluación de calidad (RF-62) → filas legibles.
 *
 * El backend (`evaluar_calidad_telemetria_use_case.py`) guarda los parámetros de
 * `ParametrosCalidad` (k, M, N, P, umbrales de deriva, frecuencia) más el contexto
 * de la evaluación (serie analizada, límites físicos, evidencia del reloj). Antes
 * se pintaba `String(v)`: los objetos salían como `[object Object]` y las claves
 * crudas (`M`, `N`, `k`). Aquí cada clave conocida tiene etiqueta y unidad; lo que
 * no le dice nada al usuario (ids, trazas del reloj) va a "Detalle técnico".
 */
export interface FilaParametro {
  clave: string;
  etiqueta: string;
  valor: string;
  /** Sub-lista de un objeto anidado (serie analizada, límites físicos…). */
  hijos?: FilaParametro[];
}

export interface ParametrosLegibles {
  principales: FilaParametro[];
  tecnicos: FilaParametro[];
}

type Unidad = 'desviaciones' | 'lecturas' | 'porcentaje' | 'minutos' | 'fecha' | null;

/** Significado tomado de `ParametrosCalidad` (backend, `parametros_calidad_port.py`). */
const CONOCIDOS: Record<string, Unidad> = {
  k: 'desviaciones',
  M: 'lecturas',
  N: 'lecturas',
  P: 'lecturas',
  umbral_drift: 'porcentaje',
  umbral_drift_significativo: 'porcentaje',
  frecuencia_muestreo_min: 'minutos',
  // consistencia_temporal
  gaps_excluidos_rf60: null,
  lecturas_excluidas_rf60: null,
  inicio_serie: 'fecha',
  fin_serie: 'fecha',
  // limites_fisicos_aplicados / limites_fisicos
  minimo: null,
  maximo: null,
  fuente: null,
  estado: null,
  aplicados: null,
};

/** Objetos anidados que sí se le muestran al usuario, con sus hijos legibles. */
const GRUPOS = new Set(['consistencia_temporal', 'limites_fisicos_aplicados', 'limites_fisicos']);

/** Claves que solo sirven de traza: van al bloque plegable. */
const TECNICAS = new Set(['id_variable', 'reloj_rf53', 'restriccion_temporal']);

function t(clave: string, opciones?: Record<string, unknown>): string {
  return i18n.t(`telemetry:calidadparams.${clave}`, opciones ?? {}) as string;
}

function etiquetaDe(clave: string): string {
  return i18n.t(`telemetry:calidadparams.etiqueta.${clave}`, { defaultValue: etiquetaCodigo(clave) }) as string;
}

function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function valorSimple(clave: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return t(v ? 'si' : 'no');
  const unidad = CONOCIDOS[clave];
  if (unidad === 'fecha' && typeof v === 'string') return formatearFechaHora(v);
  const n = numero(v);
  if (n != null) {
    const texto = formatearNumero(n, { maximumFractionDigits: 2 });
    switch (unidad) {
      case 'desviaciones': return t('unidad.desviaciones', { count: n, n: texto });
      case 'lecturas': return t('unidad.lecturas', { count: n, n: texto });
      case 'porcentaje': return t('unidad.porcentaje', { n: texto });
      case 'minutos': return t('unidad.minutos', { n: texto });
      default: return texto;
    }
  }
  if (clave === 'fuente' && typeof v === 'string' && v.includes('variables_ambientales')) return t('fuente_catalogo');
  if (typeof v === 'string') {
    // Códigos del backend (PENDIENTE_VERSIONADO_M09, CATALOGO_M09…) en lenguaje del usuario.
    return /^[A-Z0-9_]+$/.test(v) ? etiquetaCodigo(v) : v;
  }
  if (Array.isArray(v)) return v.map((x) => valorSimple(clave, x)).join(', ');
  return '—';
}

function fila(clave: string, v: unknown): FilaParametro {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const hijos = Object.entries(v as Record<string, unknown>).map(([k, x]) => fila(k, x));
    return { clave, etiqueta: etiquetaDe(clave), valor: '', hijos };
  }
  return { clave, etiqueta: etiquetaDe(clave), valor: valorSimple(clave, v) };
}

export function parametrosLegibles(dict: Record<string, unknown> | null | undefined): ParametrosLegibles {
  const principales: FilaParametro[] = [];
  const tecnicos: FilaParametro[] = [];
  for (const [clave, v] of Object.entries(dict ?? {})) {
    const conocida = clave in CONOCIDOS || GRUPOS.has(clave);
    const anidado = v != null && typeof v === 'object';
    // Un objeto que no conocemos no se puede explicar: se guarda como traza, nunca `[object Object]`.
    if (TECNICAS.has(clave) || (!conocida && anidado)) tecnicos.push(fila(clave, v));
    else principales.push(fila(clave, v));
  }
  return { principales, tecnicos };
}
