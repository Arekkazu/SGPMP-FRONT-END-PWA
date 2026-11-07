// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-14 RF-71 FE-1/FE-4: fases del proceso y motivo del fallo en lenguaje del usuario |
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../shared/i18n';
import { ProcesosReentrenamiento, estadoFase } from './ProcesosReentrenamiento';
import { FASES_REENTRENAMIENTO, type ProcesoReentrenamientoResponse } from '../types';

const fases = (hasta: number, ultima: 'OK' | 'FALLIDA' | null) => FASES_REENTRENAMIENTO.map((nombre, i) => ({
  fase: i + 1, nombre,
  fecha_inicio: i + 1 <= hasta ? '2026-11-02T12:00:00Z' : null,
  fecha_fin: i + 1 < hasta || (i + 1 === hasta && ultima) ? '2026-11-02T12:05:00Z' : null,
  resultado: i + 1 < hasta ? 'OK' as const : i + 1 === hasta ? ultima : null,
}));

const proceso = (extra: Partial<ProcesoReentrenamientoResponse>): ProcesoReentrenamientoResponse => ({
  id_proceso_reentrenamiento: 'p1', tipo_modelo: 'MODELO_ESPECIES_GRANDES', id_activo_biologico: 4, identificador_activo: 'BOV-003',
  nombre_especie: 'Bovino', disparador: 'MANUAL', modo_generacion: 'REENTRENAMIENTO', estado: 'EN_CURSO', fase_actual: 4,
  fases: fases(4, null), porcentaje_progreso: 56, porcentaje_cpu: '68.50', memoria_ram_mb: 900, codigo_error: null, motivos: null,
  id_version_modelo_resultante: null, nombre_version_resultante: null, fecha_solicitud: '2026-11-02T11:59:00Z',
  fecha_inicio: '2026-11-02T12:00:00Z', fecha_fin: null, fecha_ultimo_latido: '2026-11-02T12:20:00Z', ...extra,
});

describe('ProcesosReentrenamiento', () => {
  it('estadoFase distingue completada, en curso, fallida y pendiente', () => {
    const f = fases(3, 'FALLIDA');
    expect(f.map(estadoFase).slice(0, 4)).toEqual(['completada', 'completada', 'fallida', 'pendiente']);
  });

  it('un proceso en curso marca la fase actual y muestra CPU y RAM', () => {
    render(<MemoryRouter><ProcesosReentrenamiento procesos={[proceso({})]} ahora={Date.parse('2026-11-02T12:30:00Z')} /></MemoryRouter>);
    expect(screen.getByText(/4\. Entrenamiento/).closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText(/CPU 69\s?%/)).toBeTruthy();
    expect(screen.getByText(/duró 30 min/)).toBeTruthy();
  });

  it('un fallo se explica con el código del pipeline en palabras', () => {
    render(<MemoryRouter><ProcesosReentrenamiento procesos={[proceso({ estado: 'FALLIDO', codigo_error: 'CALIBRACION_INCOMPLETA', motivos: ['2 días'], fases: fases(3, 'FALLIDA') })]} /></MemoryRouter>);
    expect(screen.getByText('El animal aún no tiene suficientes días de lecturas para calibrar.')).toBeTruthy();
    expect(screen.getByText('2 días')).toBeTruthy();
  });
});
