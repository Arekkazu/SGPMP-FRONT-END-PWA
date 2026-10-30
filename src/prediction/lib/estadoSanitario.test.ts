// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo 13.9 RF-66/RF-68: ficha por lote, tendencia y aporte de factores |
import { describe, expect, it } from 'vitest';
import { aporteFactores, lotesSanitarios } from './estadoSanitario';
import type { Inferencia } from './inferencias';
import type { LoteContagio } from './contagio';

const AHORA = Date.parse('2026-10-29T12:00:00Z');
const inf = (idActivo: number, horasAtras: number, nivel: 0 | 1 | 2 | 3, confianza = 0.8) =>
  ({ idActivo, unidad: `Lote ${idActivo}`, area: 'Estanque-01 · El Remanso', especie: 'Tilapia', nivel, confianza,
    fecha: new Date(AHORA - horasAtras * 3600_000).toISOString() }) as Inferencia;
const lote = (id: number, extra: Partial<LoteContagio> = {}) =>
  ({ id, nombre: `Lote ${id}`, area: 'Galpón · Prueba Alfa', especie: 'Pollos', fs: 0.8, fa: 0.5, fd: 0.2,
    pesos: { fs: 0.5, fa: 0.3, fd: 0.2 }, ...extra }) as LoteContagio;

describe('Estado sanitario (prototipo 13.9)', () => {
  it('una ficha por activo con la inferencia más reciente y su contagio', () => {
    const [l] = lotesSanitarios([inf(1, 5, 1), inf(1, 1, 3)], [lote(1)], AHORA);
    expect(l.actual?.nivel).toBe(3);
    expect(l.contagio?.id).toBe(1);
  });

  it('la tendencia compara la primera y la última de las últimas 24 h', () => {
    const [l] = lotesSanitarios([inf(1, 30, 3), inf(1, 20, 1), inf(1, 2, 2)], [], AHORA);
    expect(l.serie.map((s) => s.nivel)).toEqual([1, 2]);
    expect(l.tendencia).toBe('sube');
    expect(lotesSanitarios([inf(2, 2, 1)], [], AHORA)[0].tendencia).toBeNull();
  });

  it('primero el nivel más alto; el lote sin predicción va al final', () => {
    const orden = lotesSanitarios([inf(1, 1, 0), inf(2, 1, 3), inf(3, 1, 3, 0.95)], [lote(9)], AHORA);
    expect(orden.map((l) => l.idActivo)).toEqual([3, 2, 1, 9]);
    expect(orden[3].actual).toBeNull();
  });

  it('aporte de cada factor: peso × valor, en proporción', () => {
    const a = aporteFactores(lote(1))!;
    expect(a.fs).toBeCloseTo(0.4 / 0.59);
    expect(a.fs + a.fa + a.fd).toBeCloseTo(1);
    expect(aporteFactores(lote(1, { fs: 0, fa: null, fd: null }))).toBeNull();
  });
});
