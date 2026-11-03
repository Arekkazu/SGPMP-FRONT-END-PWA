// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-06 RF-62: parámetros aplicados legibles, sin [object Object] ni claves crudas |
import { describe, expect, it } from 'vitest';
import '../../shared/i18n';
import { parametrosLegibles } from './parametrosCalidad';

const EVALUACION = {
  k: 3, M: 5, N: 20, P: 3, umbral_drift: 5, umbral_drift_significativo: 10, frecuencia_muestreo_min: 5,
  id_variable: 7,
  reloj_rf53: { desfase_s: 12 },
  consistencia_temporal: { frecuencia_muestreo_min: 5, gaps_excluidos_rf60: 0, lecturas_excluidas_rf60: 2, inicio_serie: '2026-10-30T10:00:00+00:00', fin_serie: '2026-10-30T12:00:00+00:00' },
  limites_fisicos_aplicados: { minimo: '0', maximo: '100', fuente: 'CATALOGO_M09' },
};

describe('parametrosLegibles', () => {
  it('nunca muestra [object Object] ni la clave cruda de un parámetro conocido', () => {
    const { principales, tecnicos } = parametrosLegibles(EVALUACION);
    const todo = JSON.stringify([principales, tecnicos]);
    expect(todo).not.toContain('[object Object]');
    const etiquetas = principales.map((f) => f.etiqueta);
    for (const cruda of ['k', 'M', 'N', 'P', 'umbral_drift']) expect(etiquetas).not.toContain(cruda);
  });

  it('pone unidad a cada parámetro', () => {
    const { principales } = parametrosLegibles(EVALUACION);
    const valor = (c: string) => principales.find((f) => f.clave === c)?.valor;
    expect(valor('umbral_drift')).toBe('5 %');
    expect(valor('frecuencia_muestreo_min')).toBe('5 min');
    expect(valor('N')).toBe('20 lecturas');
  });

  it('los objetos anidados se muestran como sub-lista con etiquetas', () => {
    const { principales } = parametrosLegibles(EVALUACION);
    const limites = principales.find((f) => f.clave === 'limites_fisicos_aplicados');
    expect(limites?.hijos?.map((h) => h.valor)).toEqual(['0', '100', expect.any(String)]);
    expect(limites?.hijos?.[0].etiqueta).toBe('Mínimo');
  });

  it('las trazas internas y los objetos desconocidos van al detalle técnico', () => {
    const { principales, tecnicos } = parametrosLegibles({ ...EVALUACION, raro: { a: 1 } });
    expect(tecnicos.map((f) => f.clave).sort()).toEqual(['id_variable', 'raro', 'reloj_rf53']);
    expect(principales.some((f) => f.clave === 'id_variable')).toBe(false);
  });

  it('sin parámetros no hay filas', () => {
    expect(parametrosLegibles(null)).toEqual({ principales: [], tecnicos: [] });
  });
});
