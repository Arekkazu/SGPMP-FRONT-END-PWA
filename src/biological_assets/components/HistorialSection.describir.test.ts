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
