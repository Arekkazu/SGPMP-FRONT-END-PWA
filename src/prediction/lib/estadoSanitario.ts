// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo 13.9 RF-66/RF-68: una ficha por lote con inferencia, tendencia y contagio |
import type { Inferencia } from './inferencias';
import type { LoteContagio } from './contagio';

/** Prototipo 13.9: Monitor y Contagio en una sola ficha por lote o animal. */
export interface LoteSanitario {
  idActivo: number;
  unidad: string;
  area: string;
  especie: string;
  /** Inferencia más reciente; null si el lote solo tiene cálculo de contagio. */
  actual: Inferencia | null;
  /** Niveles de las últimas 24 h, del más antiguo al más reciente. */
  serie: { fecha: string; nivel: number }[];
  tendencia: 'sube' | 'baja' | 'estable' | null;
  contagio: LoteContagio | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Contribución de cada factor al riesgo de contagio (peso × valor), en proporción. */
export function aporteFactores(c: LoteContagio): { fs: number; fa: number; fd: number } | null {
  const fs = c.pesos.fs * c.fs, fa = c.pesos.fa * (c.fa ?? 0), fd = c.pesos.fd * (c.fd ?? 0);
  const total = fs + fa + fd;
  return total > 0 ? { fs: fs / total, fa: fa / total, fd: fd / total } : null;
}

/** Lo que necesita actuar primero: nivel más alto y, a igual nivel, mayor confianza. */
function porRiesgo(a: LoteSanitario, b: LoteSanitario): number {
  const nivel = (l: LoteSanitario) => l.actual?.nivel ?? -1;
  return nivel(b) - nivel(a) || (b.actual?.confianza ?? 0) - (a.actual?.confianza ?? 0);
}

export function lotesSanitarios(inferencias: Inferencia[], contagio: LoteContagio[], ahora = Date.now()): LoteSanitario[] {
  const porActivo = new Map<number, Inferencia[]>();
  for (const i of inferencias) porActivo.set(i.idActivo, [...(porActivo.get(i.idActivo) ?? []), i]);
  const contagioPor = new Map(contagio.map((c) => [c.id, c]));

  const lotes: LoteSanitario[] = [...porActivo.entries()].map(([idActivo, lista]) => {
    const orden = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const actual = orden[orden.length - 1];
    const serie = orden
      .filter((i) => i.nivel != null && ahora - new Date(i.fecha).getTime() <= DIA_MS)
      .map((i) => ({ fecha: i.fecha, nivel: i.nivel as number }));
    const cambio = serie.length > 1 ? serie[serie.length - 1].nivel - serie[0].nivel : null;
    return {
      idActivo, unidad: actual.unidad, area: actual.area, especie: actual.especie, actual, serie,
      tendencia: cambio == null ? null : cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : 'estable',
      contagio: contagioPor.get(idActivo) ?? null,
    };
  });
  for (const c of contagio) {
    if (porActivo.has(c.id)) continue;
    lotes.push({ idActivo: c.id, unidad: c.nombre, area: c.area, especie: c.especie, actual: null, serie: [], tendencia: null, contagio: c });
  }
  return lotes.sort(porRiesgo);
}
