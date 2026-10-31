// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: confirmar el cambio de versión y suma de pesos obligatoria |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-04: alerta crítica 0,70 por defecto y sin versiones rechazadas |
// | 2026-10-29 | Arekkazu | TC-DIS-168 RF-65: modo_ejecucion como combobox con nombre |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19 RF-65: el componente se rotula con su nombre |
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

const version = (id: number, tipo: TipoModelo, componente: VersionModeloResponse['componente'], estado = 'ACTIVO') =>
  ({ id_version_modelo: id, nombre_version: `v${id}`, tipo_modelo: tipo, componente, estado_version: estado }) as VersionModeloResponse;

const VERSIONES = [version(10, 'MODELO_AVES', 'DETECTOR'), version(11, 'MODELO_AVES', 'ANOMALIAS'), version(20, 'MODELO_ESPECIES_GRANDES', null), version(21, 'MODELO_ESPECIES_GRANDES', null, 'RECHAZADO')];

function renderForm(tipoModelo: TipoModelo) {
  const onGuardar = vi.fn();
  render(
    <MotorConfigForm tipoModelo={tipoModelo} config={null} versiones={VERSIONES} saving={false}
      saveError={null} online puedeEditar nodosSinConfirmar={[]} onGuardar={onGuardar} />,
  );
  return onGuardar;
}

describe('MotorConfigForm — campos por paradigma (RFC-009)', () => {
  it('POBLACIONAL envía umbral de anomalía y versión por componente, sin umbrales de riesgo', () => {
    const onGuardar = renderForm('MODELO_AVES');
    expect(screen.queryByRole('slider', { name: 'Umbral de riesgo alto' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Versión activa · Detector'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Confirmar cambio'));
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
    fireEvent.click(screen.getByText('Confirmar cambio'));
    fireEvent.click(screen.getByText('Guardar configuración'));

    const dto = onGuardar.mock.calls[0][0];
    expect(dto).toMatchObject({ umbral_riesgo_alto: 0.7, umbral_alerta_critica: 0.7, id_version_modelo_activa: 20 });
    expect(dto).not.toHaveProperty('umbral_score_anomalia');
  });

  it('modo de ejecución es un combobox con nombre, valor y la ayuda del modo elegido (TC-DIS-168)', () => {
    const onGuardar = renderForm('MODELO_ESPECIES_GRANDES');
    const modo = screen.getByRole('combobox', { name: 'Modo de ejecución' }) as HTMLSelectElement;
    expect(modo.value).toBe('SERVIDOR');
    const ayudaServidor = document.getElementById(modo.getAttribute('aria-describedby') ?? '')?.textContent;
    fireEvent.change(modo, { target: { value: 'HIBRIDO' } });
    expect(document.getElementById(modo.getAttribute('aria-describedby') ?? '')?.textContent).not.toBe(ayudaServidor);
    fireEvent.click(screen.getByText('Guardar configuración'));
    expect(onGuardar.mock.calls[0][0]).toMatchObject({ modo_ejecucion: 'HIBRIDO' });
  });

  it('no ofrece versiones rechazadas (M4-04)', () => {
    renderForm('MODELO_ESPECIES_GRANDES');
    const opciones = Array.from((screen.getByLabelText('Versión del modelo activo') as HTMLSelectElement).options).map((o) => o.value);
    expect(opciones).toContain('20');
    expect(opciones).not.toContain('21');
  });

  it('cancelar la confirmación deja la versión sin cambiar', () => {
    const onGuardar = renderForm('MODELO_ESPECIES_GRANDES');
    fireEvent.change(screen.getByLabelText('Versión del modelo activo'), { target: { value: '20' } });
    fireEvent.click(screen.getByText('Cancelar'));
    fireEvent.click(screen.getByText('Guardar configuración'));
    expect(onGuardar.mock.calls[0][0]).toMatchObject({ id_version_modelo_activa: null });
  });

  it('META no deja guardar si los pesos no suman 1', () => {
    const onGuardar = renderForm('MODELO_RIESGO_CONTAGIO');
    fireEvent.change(screen.getByRole('slider', { name: 'Factor densidad' }), { target: { value: '0.5' } });
    expect(screen.getByRole('alert').textContent).toContain('1.00');
    fireEvent.click(screen.getByText('Guardar configuración'));
    expect(onGuardar).not.toHaveBeenCalled();
  });
});
