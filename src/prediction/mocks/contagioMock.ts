// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-68: fuente del factor sanitario por paradigma, reglas aplicadas y calidad del cálculo |
// Datos simulados para Riesgo de Contagio (RF-68) — dueño IoT/IA, sin endpoint.
// Ver do-it/prediction/TASKS.md § Pendientes. Los valores ya vienen calculados por el motor.
import type { TipoModelo } from '../types';

export type NivelContagio = 'BAJO' | 'MEDIO' | 'ALTO';
/** POBLACIONAL usa el puntaje de anomalía del área; INDIVIDUAL cuenta individuos enfermos. */
export type FuenteFs = 'CONTEO_INDIVIDUAL' | 'SCORE_POBLACIONAL';
export type Ejecucion = 'CALCULADO' | 'CACHE' | 'SIN_CALCULO';
export type ResultadoRegla = 'CUMPLE' | 'NO_CUMPLE' | 'AJUSTE';

export interface ReglaAplicada { regla: string; valor: string; resultado: ResultadoRegla; origen: string }
export interface SalidaRf66 { id: string; valor: string; hora: string }
export interface CalculoHistorial {
  hora: string; disparador: string; ejecucion: Ejecucion; probabilidad: number; nivel: NivelContagio;
  fs: number; fa: number; fd: number; calidad: 'COMPLETA' | 'DEGRADADA'; confianzaReducida: boolean;
}

export interface LoteContagio {
  id: number;
  nombre: string;
  area: string;
  tipoModelo: TipoModelo;
  fuenteFs: FuenteFs;
  probabilidad: number | null;
  nivel: NivelContagio | null;
  calidad: 'COMPLETA' | 'DEGRADADA';
  confianzaReducida: boolean;
  sincronizacion: 'SINCRONIZADA' | 'JITTER' | 'DESINCRONIZADA';
  ejecucion: Ejecucion;
  alerta?: string;
  fs: number; fa: number; fd: number;
  /** Pesos efectivos: cambian cuando falta un factor y se redistribuye. */
  pesos: { fs: number; fa: number; fd: number };
  pesosRecalculados: boolean;
  salidas: SalidaRf66[];
  reglas: ReglaAplicada[];
  historial: CalculoHistorial[];
  nota?: string;
}

export const CONTAGIO_MOTOR = {
  w_fs: 0.5, w_fa: 0.3, w_fd: 0.2, version: 'ctg-1.2', configVersion: 3,
  eventosProcesados: 96, lotesDegradados: 2, sinCalculo: 1,
};

const W = { fs: 0.5, fa: 0.3, fd: 0.2 };
const nivelDe = (p: number): NivelContagio => (p >= 0.65 ? 'ALTO' : p >= 0.4 ? 'MEDIO' : 'BAJO');

function historial(base: number, disparadores: string[], degradada = false): CalculoHistorial[] {
  return disparadores.map((disparador, i) => {
    const p = Math.max(0.05, Math.min(0.95, base + Math.sin(i) * 0.05));
    return {
      hora: `09:${String(2 + i * 3).padStart(2, '0')}:00`, disparador, ejecucion: 'CALCULADO',
      probabilidad: Number(p.toFixed(2)), nivel: nivelDe(p),
      fs: Number((p * 1.05).toFixed(2)), fa: Number((p * 0.9).toFixed(2)), fd: Number((p * 0.8).toFixed(2)),
      calidad: degradada && i >= disparadores.length - 2 ? 'DEGRADADA' : 'COMPLETA', confianzaReducida: degradada && i >= disparadores.length - 2,
    };
  });
}

const REGLA_SUMA: ReglaAplicada = { regla: 'Suma de pesos = 1.00', valor: '0.50 + 0.30 + 0.20', resultado: 'CUMPLE', origen: 'RF-65 · pesos' };

export const LOTES_CONTAGIO: LoteContagio[] = [
  {
    id: 3012, nombre: 'Lote bovinos Potrero 2', area: 'Potrero 2 · área 12', tipoModelo: 'MODELO_ESPECIES_GRANDES', fuenteFs: 'CONTEO_INDIVIDUAL',
    probabilidad: 0.81, nivel: 'ALTO', calidad: 'COMPLETA', confianzaReducida: false, sincronizacion: 'JITTER', ejecucion: 'CALCULADO', alerta: 'ALR-0040',
    fs: 0.83, fa: 0.79, fd: 0.8, pesos: W, pesosRecalculados: false,
    salidas: [{ id: 'BOV-1042', valor: 'P(alto) 0.91', hora: '09:18:05' }, { id: 'BOV-1057', valor: 'P(alto) 0.90', hora: '09:16:40' }, { id: 'BOV-1051', valor: 'P(alto) 0.87', hora: '09:17:40' }, { id: 'BOV-1060', valor: 'P(alto) 0.40', hora: '09:17:45' }],
    reglas: [
      REGLA_SUMA,
      { regla: 'Enfermo = P(riesgo alto) > 0.70', valor: '10 de 12 individuos', resultado: 'CUMPLE', origen: 'RF-68 · Fase 2' },
      { regla: 'Fs > 0.70 fuerza el nivel Alto', valor: 'Fs 0.83', resultado: 'AJUSTE', origen: 'RF-68 · regla de escalamiento' },
      { regla: 'Desfase entre salidas ≤ 30 s', valor: '35 s', resultado: 'AJUSTE', origen: 'RF-68 · sincronización (jitter 30–35 s tolerado)' },
      { regla: 'Sensores activos ≥ 60 %', valor: '92 %', resultado: 'CUMPLE', origen: 'RF-68 · E4' },
    ],
    historial: historial(0.78, ['Telemetría (ambiental)', 'RF-66 · INF-0106', 'RF-66 · INF-0113']),
  },
  {
    id: 2005, nombre: 'Lote pollos Galpón B', area: 'Galpón B · área 5', tipoModelo: 'MODELO_AVES', fuenteFs: 'SCORE_POBLACIONAL',
    probabilidad: 0.72, nivel: 'ALTO', calidad: 'COMPLETA', confianzaReducida: false, sincronizacion: 'SINCRONIZADA', ejecucion: 'CACHE', alerta: 'ALR-0041',
    fs: 0.78, fa: 0.71, fd: 0.62, pesos: W, pesosRecalculados: false,
    salidas: [{ id: 'INF-0108', valor: 'score_anomalia 0.78', hora: '09:14:24' }],
    reglas: [
      REGLA_SUMA,
      { regla: 'Fs = puntaje de anomalía del área', valor: '0.78', resultado: 'CUMPLE', origen: 'RF-68 · RFC-009' },
      { regla: 'Sin cambios desde el último cálculo', valor: 'misma entrada', resultado: 'AJUSTE', origen: 'RF-68 · se reutiliza el resultado en caché' },
      { regla: 'Sensores activos ≥ 60 %', valor: '94 %', resultado: 'CUMPLE', origen: 'RF-68 · E4' },
    ],
    historial: historial(0.7, ['RF-66 · INF-0108', 'Telemetría (ambiental)', 'Telemetría (ambiental)']),
  },
  {
    id: 2008, nombre: 'Lote porcino P1', area: 'Corral porcino 1 · área 8', tipoModelo: 'MODELO_PORCINOS', fuenteFs: 'SCORE_POBLACIONAL',
    probabilidad: 0.47, nivel: 'MEDIO', calidad: 'DEGRADADA', confianzaReducida: true, sincronizacion: 'SINCRONIZADA', ejecucion: 'CALCULADO',
    fs: 0.44, fa: 0, fd: 0.75, pesos: { fs: 0.71, fa: 0, fd: 0.29 }, pesosRecalculados: true,
    salidas: [{ id: 'INF-0115', valor: 'score_anomalia 0.44', hora: '09:19:52' }],
    reglas: [
      { regla: 'Datos ambientales vigentes', valor: 'última lectura 09:03:30', resultado: 'NO_CUMPLE', origen: 'RF-68 · E9' },
      { regla: 'Redistribuir el peso del factor faltante', valor: 'Fs 0.71 · Fd 0.29', resultado: 'AJUSTE', origen: 'RF-68 · E3' },
      { regla: '6 ejecuciones degradadas seguidas', valor: '6', resultado: 'NO_CUMPLE', origen: 'RF-68 · E10 (aviso técnico)' },
    ],
    historial: historial(0.45, ['Telemetría (densidad)', 'Telemetría (densidad)', 'RF-66 · INF-0114', 'RF-66 · INF-0115'], true),
    nota: 'El sensor ambiental no reporta desde las 09:03:30: Fa queda fuera y su peso se reparte entre Fs y Fd.',
  },
  {
    id: 3011, nombre: 'Lote ovinos Aprisco 1', area: 'Aprisco 1 · área 11', tipoModelo: 'MODELO_ESPECIES_MEDIANAS', fuenteFs: 'CONTEO_INDIVIDUAL',
    probabilidad: 0.29, nivel: 'BAJO', calidad: 'DEGRADADA', confianzaReducida: true, sincronizacion: 'SINCRONIZADA', ejecucion: 'CALCULADO',
    fs: 0.05, fa: 0.62, fd: 0.7, pesos: W, pesosRecalculados: false,
    salidas: [{ id: 'OV-0231', valor: 'P(alto) 0.27', hora: '09:15:12' }, { id: 'OV-0238', valor: 'P(alto) 0.31', hora: '09:14:58' }],
    reglas: [
      REGLA_SUMA,
      { regla: 'Inferencia reciente del ≥ 50 % del lote', valor: '9 de 20', resultado: 'NO_CUMPLE', origen: 'RF-68 · E8' },
      { regla: 'Enfermo = P(riesgo alto) > 0.70', valor: '0 de 9', resultado: 'CUMPLE', origen: 'RF-68 · Fase 2' },
    ],
    historial: historial(0.3, ['RF-66 · INF-0101', 'RF-66 · INF-0109'], true),
    nota: 'Solo 9 de los 20 animales tienen inferencia reciente: el cálculo sale con confianza reducida.',
  },
  {
    id: 2004, nombre: 'Lote pollos Galpón A', area: 'Galpón A · área 4', tipoModelo: 'MODELO_AVES', fuenteFs: 'SCORE_POBLACIONAL',
    probabilidad: 0.36, nivel: 'BAJO', calidad: 'COMPLETA', confianzaReducida: false, sincronizacion: 'SINCRONIZADA', ejecucion: 'CALCULADO',
    fs: 0.31, fa: 0.52, fd: 0.24, pesos: W, pesosRecalculados: false,
    salidas: [{ id: 'INF-0107', valor: 'score_anomalia 0.31', hora: '09:13:08' }],
    reglas: [REGLA_SUMA, { regla: 'Fs = puntaje de anomalía del área', valor: '0.31', resultado: 'CUMPLE', origen: 'RF-68 · RFC-009' }],
    historial: historial(0.34, ['Telemetría (densidad)', 'RF-66 · INF-0107']),
  },
  {
    id: 2010, nombre: 'Lote tilapia Estanque 1', area: 'Estanque 1 · área 10', tipoModelo: 'MODELO_ACUICULTURA', fuenteFs: 'SCORE_POBLACIONAL',
    probabilidad: null, nivel: null, calidad: 'DEGRADADA', confianzaReducida: true, sincronizacion: 'DESINCRONIZADA', ejecucion: 'SIN_CALCULO',
    fs: 0.22, fa: 0, fd: 0, pesos: W, pesosRecalculados: false,
    salidas: [{ id: 'INF-0102', valor: 'score_anomalia 0.22', hora: '08:58:39' }],
    reglas: [{ regla: 'Nodo de campo en línea', valor: 'sin conexión desde 09:01:05', resultado: 'NO_CUMPLE', origen: 'RF-68 · sin cálculo vigente' }],
    historial: historial(0.24, ['RF-66 · INF-0102']),
    nota: 'El nodo EDGE-ESTANQUE-1 está sin conexión: no hay cálculo vigente desde las 08:58:40.',
  },
];
