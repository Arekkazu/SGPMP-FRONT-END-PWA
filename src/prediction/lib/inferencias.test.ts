// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66: conversión del resultado del motor al monitor |
import { describe, expect, it } from 'vitest';
import { aInferencia, latenciaP95, ultimoPorUnidad } from './inferencias';
import type { InferenciaMonitorResponse } from '../types';

const base: InferenciaMonitorResponse = {
  id_resultado_inferencia: 'c1f63d2e-35a4-4d3e-8c81-eaf7dc30f313', id_activo_biologico: 906,
  identificador_activo: 'CERDO-hist-jkdmuixo', nombre_area: 'Corral 1', nombre_finca: 'Finca Uno', especie: 'Porcinos',
  tipo_modelo: 'MODELO_ESPECIES_GRANDES', paradigma: 'INDIVIDUAL', id_version_modelo: 8, nombre_version: 'grd-3.0',
  nivel_riesgo: 2, probabilidad_riesgo: { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 }, id_patologia: 52, nombre_patologia: 'Estrés térmico',
  probabilidad_enfermedad: { 'Estrés térmico': 0.7, Ninguna: 0.2 }, confianza_global: 0.8, contexto_incompleto: false,
  latencia_excedida: false, modo_ejecucion: 'SERVIDOR', latencia_ms: 390, fecha_inicio_ventana: null, fecha_fin_ventana: null,
  fecha_inferencia: '2026-10-27T01:18:00Z', tiene_alerta_generada: true, id_alerta_generada: 31,
};

describe('aInferencia (RF-66)', () => {
  it('lleva el resultado del motor a lo que pinta el monitor', () => {
    const i = aInferencia(base);
    expect(i).toMatchObject({
      id: 'INF-c1f63d2e', unidad: 'CERDO-hist-jkdmuixo', area: 'Corral 1 · Finca Uno', estado: 'EMITIDO', nivel: 2,
      version: 'grd-3.0', enfermedad: 'Estrés térmico', confianza: 0.8, alerta: 'ALR-31', latenciaMs: 390,
    });
    expect(i.distRiesgo).toEqual([0.1, 0.2, 0.6, 0.1]);
    expect(i.distPatologias?.[0]).toEqual({ nombre: 'Estrés térmico', prob: 0.7 });
  });

  it('sin probabilidades completas no inventa la distribución; sin identificador usa el id', () => {
    const i = aInferencia({ ...base, identificador_activo: null, probabilidad_riesgo: { 2: 0.7 }, probabilidad_enfermedad: {}, id_alerta_generada: null });
    expect(i.unidad).toBe('#906');
    expect(i.distRiesgo).toBeUndefined();
    expect(i.distPatologias).toBeUndefined();
    expect(i.alerta).toBeUndefined();
  });

  it('el estado actual de cada unidad es su resultado más reciente; p95 de latencias', () => {
    const lista = [aInferencia(base), aInferencia({ ...base, id_resultado_inferencia: 'b'.repeat(36), latencia_ms: 2500 })];
    expect(ultimoPorUnidad(lista)).toHaveLength(1);
    expect(latenciaP95(lista)).toBe(2500);
    expect(latenciaP95([])).toBeNull();
  });
});
