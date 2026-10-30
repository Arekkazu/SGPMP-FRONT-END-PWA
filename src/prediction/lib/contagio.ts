// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-68: lotes de contagio desde GET /prediccion/riesgo-contagio (antes contagioMock) |
// | 2026-10-30 | Arekkazu | INC-M04-223-G034 RF-68/67: evento CONTAGIO del historial con nivel y probabilidad |
import type { Tono } from '../components/Pill';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import type { RiesgoContagioMonitorResponse } from '../types';

export type NivelContagio = 'BAJO' | 'MEDIO' | 'ALTO';
/** POBLACIONAL usa el puntaje de anomalía del área; INDIVIDUAL cuenta individuos enfermos. */
export type FuenteFs = 'CONTEO_INDIVIDUAL' | 'SCORE_POBLACIONAL';
export type ResultadoRegla = 'CUMPLE' | 'NO_CUMPLE' | 'AJUSTE';

export interface ReglaAplicada { regla: string; valor: string; resultado: ResultadoRegla; origen: string }
export interface CalculoHistorial {
  hora: string; disparador: string; probabilidad: number; nivel: NivelContagio | null;
  fs: number; fa: number | null; fd: number | null; calidad: 'COMPLETA' | 'DEGRADADA'; confianzaReducida: boolean;
}

export interface LoteContagio {
  id: number;
  nombre: string;
  area: string;
  especie: string;
  fuenteFs: FuenteFs | null;
  probabilidad: number;
  nivel: NivelContagio | null;
  calidad: 'COMPLETA' | 'DEGRADADA';
  confianzaReducida: boolean;
  alerta?: string;
  fs: number; fa: number | null; fd: number | null;
  /** Pesos efectivos: cambian cuando falta un factor y se redistribuye. */
  pesos: { fs: number; fa: number; fd: number };
  pesosRecalculados: boolean;
  configVersion: number | null;
  fecha: string;
  reglas: ReglaAplicada[];
  /** Del más antiguo al más reciente. */
  historial: CalculoHistorial[];
  nota?: string;
}

const NIVELES: Record<number, NivelContagio> = { 0: 'BAJO', 1: 'MEDIO', 2: 'ALTO' };
export const NIVEL_TONO: Record<NivelContagio, Tono> = { ALTO: 'error', MEDIO: 'warning', BAJO: 'success' };

/** Evento CONTAGIO del historial RF-67 (RF-68 paso 9): null si el payload no es de contagio. */
export function contagioDelEvento(payload: Record<string, unknown> | null): { probabilidad: number; nivel: NivelContagio | null } | null {
  const p = payload?.probabilidad_contagio;
  if (typeof p !== 'number') return null;
  const n = payload?.nivel_riesgo_contagio;
  return { probabilidad: p, nivel: typeof n === 'number' ? NIVELES[n] ?? null : null };
}
const texto = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function degradado(r: RiesgoContagioMonitorResponse): boolean {
  return r.confianza_baja || !!r.factores_ausentes?.length || texto(r.detalle_calculo?.motivos_degradacion).length > 0;
}

/** Reglas que el cálculo aplicó, con los valores que guardó (RF-68 Fase 2, E4 y pesos de RF-65). */
function reglasDe(r: RiesgoContagioMonitorResponse): ReglaAplicada[] {
  const suma = r.w_fs_aplicado + r.w_fa_aplicado + r.w_fd_aplicado;
  const reglas: ReglaAplicada[] = [{
    regla: 'Suma de pesos = 1.00',
    valor: `${r.w_fs_aplicado} + ${r.w_fa_aplicado} + ${r.w_fd_aplicado}`,
    resultado: Math.abs(suma - 1) < 0.001 ? 'CUMPLE' : 'NO_CUMPLE',
    origen: 'RF-65 · pesos',
  }];
  if (r.detalle_calculo?.definicion_fs === 'CONTEO_INDIVIDUAL' && r.n_enfermos_detectados != null && r.total_activos_lote != null) {
    reglas.push({ regla: 'Enfermo = P(riesgo alto) > 0.70', valor: `${r.n_enfermos_detectados} de ${r.total_activos_lote} individuos`, resultado: 'CUMPLE', origen: 'RF-68 · Fase 2' });
  }
  if (r.porcentaje_sensores_activos != null) {
    reglas.push({
      regla: 'Sensores activos ≥ 60 %', valor: `${formatearNumero(r.porcentaje_sensores_activos, { maximumFractionDigits: 0 })} %`,
      resultado: r.porcentaje_sensores_activos >= 60 ? 'CUMPLE' : 'NO_CUMPLE', origen: 'RF-68 · E4',
    });
  }
  if (r.factores_ausentes?.length) {
    reglas.push({ regla: 'Factores ausentes: pesos redistribuidos', valor: r.factores_ausentes.join(', '), resultado: 'AJUSTE', origen: 'RF-68 · calidad de datos' });
  }
  for (const motivo of texto(r.detalle_calculo?.motivos_degradacion)) {
    reglas.push({ regla: 'Cálculo degradado', valor: motivo, resultado: 'AJUSTE', origen: 'RF-68 · calidad de datos' });
  }
  return reglas;
}

function aHistorial(r: RiesgoContagioMonitorResponse): CalculoHistorial {
  return {
    hora: formatearFechaHora(r.fecha_calculo), disparador: r.modo_ejecucion_calculo ?? '—',
    probabilidad: r.probabilidad_contagio, nivel: NIVELES[r.nivel_riesgo_contagio] ?? null,
    fs: r.factor_sanitario_fs, fa: r.factor_ambiental_fa, fd: r.factor_densidad_fd,
    calidad: degradado(r) ? 'DEGRADADA' : 'COMPLETA', confianzaReducida: r.confianza_baja,
  };
}

/** Un lote por activo: su cálculo más reciente es el estado actual; los anteriores, su historial. */
export function aLotes(calculos: RiesgoContagioMonitorResponse[]): LoteContagio[] {
  const porLote = new Map<number, RiesgoContagioMonitorResponse[]>();
  for (const c of calculos) porLote.set(c.id_activo_biologico, [...(porLote.get(c.id_activo_biologico) ?? []), c]);
  return [...porLote.values()].map((lista): LoteContagio => {
    const orden = [...lista].sort((a, b) => a.fecha_calculo.localeCompare(b.fecha_calculo));
    const r = orden[orden.length - 1];
    const fuente = r.detalle_calculo?.definicion_fs;
    const alerta = r.detalle_calculo?.id_alerta_rf57 ?? r.id_alerta_generada;
    const motivos = texto(r.detalle_calculo?.motivos_degradacion);
    const config = r.detalle_calculo?.config_version;
    return {
      id: r.id_activo_biologico,
      nombre: r.identificador_activo ?? `#${r.id_activo_biologico}`,
      area: `${r.nombre_area} · ${r.nombre_finca}`,
      especie: r.especie ?? '—',
      fuenteFs: fuente === 'CONTEO_INDIVIDUAL' || fuente === 'SCORE_POBLACIONAL' ? fuente : null,
      probabilidad: r.probabilidad_contagio,
      nivel: NIVELES[r.nivel_riesgo_contagio] ?? null,
      calidad: degradado(r) ? 'DEGRADADA' : 'COMPLETA',
      confianzaReducida: r.confianza_baja,
      alerta: alerta != null ? `ALR-${alerta}` : undefined,
      fs: r.factor_sanitario_fs, fa: r.factor_ambiental_fa, fd: r.factor_densidad_fd,
      pesos: { fs: r.w_fs_aplicado, fa: r.w_fa_aplicado, fd: r.w_fd_aplicado },
      pesosRecalculados: !!r.factores_ausentes?.length,
      configVersion: typeof config === 'number' ? config : null,
      fecha: formatearFechaHora(r.fecha_calculo),
      reglas: reglasDe(r),
      historial: orden.map(aHistorial),
      nota: motivos.length ? motivos.join(' · ') : undefined,
    };
  }).sort((a, b) => b.probabilidad - a.probabilidad);
}
