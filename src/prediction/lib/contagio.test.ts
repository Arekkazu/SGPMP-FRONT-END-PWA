// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-68: lotes de contagio desde los cálculos del backend |
// | 2026-10-30 | Arekkazu | INC-M04-223-G034 RF-68/67: evento CONTAGIO del historial |
// | 2026-11-02 | Arekkazu | RFC-021 C21.4 RF-68: exposición a focos vecinos |
// | 2026-11-02 | Arekkazu | RFC-021 RF-110 RF-68: mapa de propagación |
import { describe, expect, it } from 'vitest';
import { aLotes, contagioDelEvento, mapaPropagacion } from './contagio';
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

describe('exposición a áreas vecinas (RFC-021 C21.4)', () => {
  it('lee P_base, Fv y focos del cálculo; sin focos el backend la deja vacía', () => {
    const exposicion = { p_base: '0.3750', fv: '0.6000', lambda: '0.5', focos: [{ id_area: 2, via: 'AGUA', peso: '0.6', factor_sanitario: '1' }] };
    const [lote] = aLotes([calculo({ detalle_calculo: { exposicion } })]);
    expect(lote.exposicion).toEqual({ pBase: 0.375, fv: 0.6, focos: [{ idArea: 2, via: 'AGUA', peso: 0.6 }] });
    expect(lote.reglas.find((r) => r.regla === 'Exposición a áreas vecinas')?.valor).toBe('P base 0.375 · Fv 0.6 · área 2 por AGUA (w 0.6)');
    expect(aLotes([calculo({ detalle_calculo: { exposicion: {} } })])[0].exposicion).toBeNull();
    expect(aLotes([calculo({})])[0].exposicion).toBeNull();
  });
});

describe('mapaPropagacion (RFC-021)', () => {
  it('cada área toma su lote, el foco es el área que citan las expuestas y cada salto queda como paso', () => {
    const foco = { probabilidad_contagio: 0.69, nivel_riesgo_contagio: 2 };
    const lotes = aLotes([
      calculo({ id_activo_biologico: 2, ...foco, detalle_calculo: { id_area_productiva: 2 } }),
      calculo({ id_activo_biologico: 3, probabilidad_contagio: 0.555, nivel_riesgo_contagio: 1, detalle_calculo: {
        id_area_productiva: 3, exposicion: { p_base: '0.3648', fv: '0.6', focos: [{ id_area: 2, via: 'AGUA', peso: '0.6' }] } } }),
    ]);
    const areas = [{ id: 1, nombre: 'Estanque', activo: true }, { id: 2, nombre: 'Potrero 1', activo: true }, { id: 3, nombre: 'Corral 1', activo: true }];
    const { nodos, pasos } = mapaPropagacion(lotes, areas);
    expect(nodos.map((n) => [n.id, n.nivel, n.foco])).toEqual([[1, null, false], [2, 'ALTO', true], [3, 'MEDIO', false]]);
    expect(pasos).toMatchObject([{ desde: 2, hacia: 3, via: 'AGUA', pBase: 0.3648, probabilidad: 0.555 }]);
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
