// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-66: trazabilidad con el nombre de cada paso, sin códigos de requisitos |
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InferenciaDetalleModal } from './InferenciaDetalleModal';
import type { Inferencia } from '../lib/inferencias';

const BASE: Inferencia = {
  id: 'INF-3c45d08e', uuid: '3c45d08e-0000-4000-8000-000000000000', idActivo: 5, fecha: '2026-11-02T16:30:00Z',
  unidad: 'Lote 5', area: 'Porqueriza 1', especie: 'Cerdo', tipoModelo: 'MODELO_PORCINOS', estado: 'EMITIDO',
  modo: 'SERVIDOR', version: 'v1', ventana: '20 s', latenciaMs: 120, hora: '11:30', nivel: 0, idArea: null,
};

const traza = () => screen.getByRole('list', { name: /trazabilidad/i }).textContent ?? '';

describe('InferenciaDetalleModal: trazabilidad', () => {
  it('una inferencia de cámara recorre cámara, ventana y calidad, sin códigos', () => {
    render(<InferenciaDetalleModal inf={BASE} onClose={() => {}} />);
    expect(traza()).toMatch(/Cámara.*Ventana de video recibida.*Calidad de la imagen.*Resultado del modelo · INF-3c45d08e/);
    expect(traza()).not.toMatch(/RF-|Edge|Alerta/);
  });

  it('una de sensores pasa por el Edge y muestra la alerta si la hubo', () => {
    render(<InferenciaDetalleModal inf={{ ...BASE, tipoModelo: 'MODELO_ESPECIES_GRANDES', alerta: 'ALR-9' }} onClose={() => {}} />);
    expect(traza()).toMatch(/Sensor.*Lectura recibida.*Revisión en el Edge.*Envío al motor de IA.*Resultado del modelo · INF-3c45d08e.*Alerta · ALR-9/);
    expect(traza()).not.toMatch(/RF-|Cámara/);
  });
});
