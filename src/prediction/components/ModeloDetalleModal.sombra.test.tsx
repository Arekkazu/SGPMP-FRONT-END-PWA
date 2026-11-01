// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RFC-010 RF-69: estado SOMBRA, versión por animal y fuente de datos |
/** RFC-010: un modelo SINTETICA solo va a sombra; uno REAL se promueve de sombra a producción. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModeloDetalleModal } from './ModeloDetalleModal';
import type { VersionModeloResponse } from '../types';

function version(cambios: Partial<VersionModeloResponse> = {}): VersionModeloResponse {
  return {
    id_version_modelo: 19, nombre_version: 'ESPECIES_GRANDES_9001_261025_ed219d41',
    tipo_modelo: 'MODELO_ESPECIES_GRANDES', paradigma: 'INDIVIDUAL', componente: null,
    metricas_poblacionales: null, id_activo_biologico: 9001, fuente_datos: 'SINTETICA',
    estado_version: 'APROBADO', formato_artefacto: 'ONNX', tamanio_artefacto_bytes: 1000,
    hash_artefacto_sha256: 'a'.repeat(64), dataset_entrenamiento_hash: 'b'.repeat(64),
    id_proceso_rf71: 'ed219d41-eca2-4b09-8d86-9acb1b7a8cac', version_referencia: null,
    f1_score: 0.617, recall_clase_riesgo_alto: 0.676, precision_modelo: null, accuracy: null,
    roc_auc_score: null, recall_por_clase: null, matriz_confusion: null, compatibilidad_variables: null,
    notas_validacion: null,
    detalle_validacion: 'APROBADO SOLO PARA SOMBRA (fuente SINTETICA): f1_score_global=0.617 < umbral requerido 0.80',
    esta_produccion: false, fecha_entrenamiento: null, fecha_registro: null, fecha_despliegue: null,
    ...cambios,
  };
}

function abrir(modelo: VersionModeloResponse) {
  const onSolicitarActivar = vi.fn();
  const onSolicitarSombra = vi.fn();
  render(
    <ModeloDetalleModal
      modelo={modelo} loading={false} puedeEditar puedeEjecutar online saving={false} saveError={null}
      transiciones={null} despliegues={null} onGuardarNotas={vi.fn()} onClose={vi.fn()}
      onSolicitarActivar={onSolicitarActivar} onSolicitarSombra={onSolicitarSombra}
    />,
  );
  return { onSolicitarActivar, onSolicitarSombra };
}

describe('ModeloDetalleModal · RFC-010', () => {
  it('un sintético aprobado va a sombra sin notas y no se activa', () => {
    const { onSolicitarSombra } = abrir(version());
    expect(screen.getByText('Animal #9001')).toBeTruthy();
    expect(screen.getByText('Datos sintéticos')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Activar en producción/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/solo corre en sombra hasta reentrenarse con datos reales/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Poner en sombra/ }));
    expect(onSolicitarSombra).toHaveBeenCalledOnce();
  });

  it('una versión real en sombra con notas se promueve a producción', () => {
    const { onSolicitarActivar } = abrir(version({ estado_version: 'SOMBRA', fuente_datos: 'REAL', notas_validacion: 'Validada en campo' }));
    expect(screen.getByText('En sombra')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Poner en sombra/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Activar en producción/ }));
    expect(onSolicitarActivar).toHaveBeenCalledOnce();
  });

  it('un sintético en sombra no ofrece promoción', () => {
    abrir(version({ estado_version: 'SOMBRA', notas_validacion: 'Revisada' }));
    expect((screen.getByRole('button', { name: /Activar en producción/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
