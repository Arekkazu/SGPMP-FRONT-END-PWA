// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-68: lotes de contagio desde los cálculos del backend |
// | 2026-10-30 | Arekkazu | INC-M04-223-G034 RF-68/67: evento CONTAGIO del historial |
import { describe, expect, it } from 'vitest';
import { aLotes, contagioDelEvento } from './contagio';
import type { RiesgoContagioMonitorResponse } from '../types';

const calculo = (cambios: Partial<RiesgoContagioMonitorResponse>): RiesgoContagioMonitorResponse => ({
  id_resultado_contagio: 1, id_activo_biologico: 30, identificador_activo: 'LOTE-30', nombre_area: 'Galpón B', nombre_finca: 'Finca Uno',
  especie: 'Pollo de engorde', probabilidad_contagio: 0.62, nivel_riesgo_contagio: 1, factor_sanitario_fs: 0.5,
  factor_ambiental_fa: 0.7, factor_densidad_fd: null, w_fs_aplicado: 0.625, w_fa_aplicado: 0.375, w_fd_aplicado: 0,
  confianza_baja: true, data_quality_score: 0.8, factores_ausentes: ['FD'], modo_ejecucion_calculo: 'NORMAL',
  n_enfermos_detectados: 4, total_activos_lote: 10, porcentaje_sensores_activos: 55, fecha_calculo: '2026-10-29T10:00:00Z',
  id_alerta_generada: null, detalle_calculo: { definicion_fs: 'CONTEO_INDIVIDUAL', config_version: 3, motivos_degradacion: ['FD sin sensor'] },
  ...cambios,
});

describe('aLotes (RF-68)', () => {
  it('un lote por activo: el cálculo más reciente es el estado y los demás su historial', () => {
    const [lote] = aLotes([
      calculo({ id_resultado_contagio: 2, fecha_calculo: '2026-10-29T11:00:00Z', probabilidad_contagio: 0.7, nivel_riesgo_contagio: 2, detalle_calculo: { id_alerta_rf57: 99, definicion_fs: 'SCORE_POBLACIONAL' } }),
      calculo({}),
    ]);
    expect(lote).toMatchObject({ id: 30, nombre: 'LOTE-30', nivel: 'ALTO', probabilidad: 0.7, alerta: 'ALR-99', fuenteFs: 'SCORE_POBLACIONAL' });
    expect(lote.historial.map((h) => h.probabilidad)).toEqual([0.62, 0.7]);
  });

  it('las reglas salen de lo que guardó el cálculo y marcan la degradación', () => {
    const [lote] = aLotes([calculo({})]);
    expect(lote.calidad).toBe('DEGRADADA');
    expect(lote.pesosRecalculados).toBe(true);
    expect(lote.fd).toBeNull();
    const reglas = Object.fromEntries(lote.reglas.map((r) => [r.regla, r.resultado]));
    expect(reglas).toMatchObject({
      'Suma de pesos = 1.00': 'CUMPLE',
      'Enfermo = P(riesgo alto) > 0.70': 'CUMPLE',
      'Sensores activos ≥ 60 %': 'NO_CUMPLE',
      'Factores ausentes: pesos redistribuidos': 'AJUSTE',
      'Cálculo degradado': 'AJUSTE',
    });
    expect(lote.nota).toBe('FD sin sensor');
  });
});

describe('contagioDelEvento (RF-67, INC-M04-223-G034)', () => {
  it('lee nivel y probabilidad del evento CONTAGIO; null en los demás tipos', () => {
    expect(contagioDelEvento({ probabilidad_contagio: 0.55, nivel_riesgo_contagio: 2 })).toEqual({ probabilidad: 0.55, nivel: 'ALTO' });
    expect(contagioDelEvento({ probabilidad_contagio: 0.2 })).toEqual({ probabilidad: 0.2, nivel: null });
    expect(contagioDelEvento({ nivel_riesgo: 2, confianza_global: 0.9 })).toBeNull();
    expect(contagioDelEvento(null)).toBeNull();
  });
});
