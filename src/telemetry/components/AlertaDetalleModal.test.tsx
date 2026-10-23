// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | FE-12 RF-57: Descartar solo con permiso D y transiciones del backend |
/** FE-12 (RF-57 E11, DEV-30): "Descartar" solo aparece con D sobre alertas operativas, y
 *  las acciones son las mismas transiciones que acepta el backend. */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertaDetalleModal, accionesDisponibles } from './AlertaDetalleModal';
import type { AlertaDetalleSchema } from '../types';

describe('accionesDisponibles', () => {
  it.each([
    ['ACTIVA', true, ['EN_ATENCION', 'DESCARTADA']],
    ['ACTIVA', false, ['EN_ATENCION']],
    ['EN_ATENCION', true, ['RESUELTA']],
    ['RESUELTA', true, []],
    ['DESCARTADA', true, []],
    ['VENCIDA', true, []],
  ])('%s (puede descartar: %s) → %j', (estado, puede, esperado) => {
    expect(accionesDisponibles(estado, puede)).toEqual(esperado);
  });
});

describe('AlertaDetalleModal', () => {
  const detalle = { id_alerta: 5, tipo_alerta: 'AMBIENTAL', estado_alerta: 'ACTIVA', historico_estados: [] } as unknown as AlertaDetalleSchema;
  const props = { detalle, loading: false, error: null, puedeGestionar: true, online: true, onAccion: vi.fn(), onClose: vi.fn() };

  it('sin permiso D no muestra el botón de descartar', () => {
    render(<AlertaDetalleModal {...props} puedeDescartar={false} />);
    expect(screen.getByRole('button', { name: /Tomar en atención/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Falso positivo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Resolver/ })).toBeNull();
  });

  it('con permiso D lo muestra', () => {
    render(<AlertaDetalleModal {...props} puedeDescartar />);
    expect(screen.getByRole('button', { name: /Falso positivo/ })).toBeTruthy();
  });
});
