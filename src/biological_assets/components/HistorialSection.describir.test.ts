// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-01 RF-46: frases legibles de alertas IoT, predicción y contagio |
import { describe, expect, it } from 'vitest';
import { describirRegistro } from './HistorialSection';

const base = { fecha_evento: '2026-10-07T20:00:00Z', usuario_responsable: 'Ana', modulo_origen: 'modulo2' };

describe('describirRegistro (M2-05, #298 §6)', () => {
  it('la fase no muestra la observación técnica', () => {
    expect(describirRegistro({ ...base, categoria: 'FASE_PRODUCTIVA', descripcion: 'duracion_dias=3650, es_activa=true', detalle_especifico: { detalle_1: 'Ciclo cachama', detalle_2: 'Activa' } }))
      .toBe('Ciclo cachama (activa)');
  });
  it('sanitario dice qué pasó aunque el usuario no haya escrito nada', () => {
    expect(describirRegistro({ ...base, categoria: 'SANITARIO', descripcion: '', detalle_especifico: { detalle_1: 'Ich', detalle_2: 'Oxitetraciclina' } }))
      .toBe('Ich · Oxitetraciclina');
  });
  it('agrega la nota del usuario al final', () => {
    expect(describirRegistro({ ...base, categoria: 'ESTADO', descripcion: 'Fiebre', detalle_especifico: { detalle_1: 'ACTIVO', detalle_2: 'EN_TRATAMIENTO' } }))
      .toBe('Activo → En tratamiento — Fiebre');
  });
});

describe('describirRegistro · telemetría y predicción (AJF-01)', () => {
  const r = (categoria: string, detalle: Record<string, unknown>) => ({
    categoria, fecha_evento: '2026-11-01T08:00:00Z', descripcion: 'texto del backend', detalle_especifico: detalle,
    usuario_responsable: 'Sistema', modulo_origen: 'modulo4',
  }) as never;

  it('una alerta del animal se lee con su valor', () => {
    expect(describirRegistro(r('ALERTA_IOT', { tipo_alerta: 'FIEBRE', valor: '39.8', unidad: '°C', ambito: 'ANIMAL' }))).toMatch(/39,8 °C$/);
  });
  it('una alerta ambiental dice el área', () => {
    expect(describirRegistro(r('ALERTA_IOT', { tipo_alerta: 'FALLO_AMBIENTAL', ambito: 'AREA', nombre_area: 'Corral 1' }))).toMatch(/^Alerta ambiental crítica en Corral 1/);
  });
  it('un cambio de riesgo dice de dónde a dónde, la confianza y si fue de prueba', () => {
    expect(describirRegistro(r('PREDICCION', { nivel_anterior: 0, nivel_riesgo: 2, confianza_global: '0.75', modo_sombra: true })))
      .toMatch(/^Riesgo pasó de Normal a Moderado · 75\s?% \(de prueba, no generó alerta\)$/);
  });
  it('contagio alto con su probabilidad', () => {
    expect(describirRegistro(r('CONTAGIO', { probabilidad_contagio: '0.72' }))).toMatch(/^Riesgo de contagio alto · 72\s?%$/);
  });
});
