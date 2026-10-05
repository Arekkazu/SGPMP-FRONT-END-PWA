/**
 * RF-65 v2.0 (RFC-009): el formulario envía los campos del paradigma del modelo —
 * umbral de anomalía y versión por componente para POBLACIONAL, umbrales de
 * riesgo y versión única para INDIVIDUAL/META.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MotorConfigForm } from './MotorConfigForm';
import type { TipoModelo, VersionModeloResponse } from '../types';

const version = (id: number, tipo: TipoModelo, componente: VersionModeloResponse['componente']) =>
  ({ id_version_modelo: id, nombre_version: `v${id}`, tipo_modelo: tipo, componente, estado_version: 'ACTIVO' }) as VersionModeloResponse;

const VERSIONES = [version(10, 'MODELO_AVES', 'DETECTOR'), version(11, 'MODELO_AVES', 'ANOMALIAS'), version(20, 'MODELO_ESPECIES_GRANDES', null)];

function renderForm(tipoModelo: TipoModelo) {
  const onGuardar = vi.fn();
  render(
    <MotorConfigForm tipoModelo={tipoModelo} config={null} versiones={VERSIONES} saving={false}
      saveError={null} online puedeEditar onGuardar={onGuardar} />,
  );
  return onGuardar;
}

describe('MotorConfigForm — campos por paradigma (RFC-009)', () => {
  it('POBLACIONAL envía umbral de anomalía y versión por componente, sin umbrales de riesgo', () => {
    const onGuardar = renderForm('MODELO_AVES');
    expect(screen.queryByText('Umbral de riesgo alto')).toBeNull();
    fireEvent.change(screen.getByLabelText('Versión activa · DETECTOR'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Guardar configuración'));

    const dto = onGuardar.mock.calls[0][0];
    expect(dto).toMatchObject({ tipo_modelo: 'MODELO_AVES', umbral_score_anomalia: 0.7, versiones_activas_por_componente: { DETECTOR: 10 } });
    expect(dto).not.toHaveProperty('umbral_riesgo_alto');
    expect(dto).not.toHaveProperty('id_version_modelo_activa');
  });

  it('INDIVIDUAL envía umbrales de riesgo y una versión única', () => {
    const onGuardar = renderForm('MODELO_ESPECIES_GRANDES');
    expect(screen.queryByText('Umbral de score de anomalía')).toBeNull();
    fireEvent.change(screen.getByLabelText('Versión del modelo activo'), { target: { value: '20' } });
    fireEvent.click(screen.getByText('Guardar configuración'));

    const dto = onGuardar.mock.calls[0][0];
    expect(dto).toMatchObject({ umbral_riesgo_alto: 0.7, umbral_alerta_critica: 0.85, id_version_modelo_activa: 20 });
    expect(dto).not.toHaveProperty('umbral_score_anomalia');
  });
});
