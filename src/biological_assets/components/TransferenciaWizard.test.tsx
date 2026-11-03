// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
/**
 * FE-07 (RF-48 1.2, RFC-012): los destinos llegan ya filtrados por grupo de manejo y
 * capacidad efectiva (DEV-23); el wizard muestra el cupo con la capacidad derivada y
 * los 422 nuevos con el mensaje del backend.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiError } from '../../shared/api/errors';

const estado = vi.hoisted(() => ({
  disponibles: [
    { id_infraestructura: 7, nombre: 'Estanque 7', tipo: 'Estanque', capacidad_maxima: 50, ocupacion_actual: 30, id_especie: null },
    { id_infraestructura: 8, nombre: 'Estanque 8', tipo: 'Estanque', capacidad_maxima: null, ocupacion_actual: 0, id_especie: null },
  ],
  saveError: null as ApiError | null,
}));
vi.mock('../hooks/useTransferencias', () => ({
  useTransferencias: () => ({
    disponibles: estado.disponibles, loadingDisponibles: false, errorDisponibles: null, saving: false,
    saveError: estado.saveError, cargarDisponibles: vi.fn(), registrar: vi.fn(), setSaveError: vi.fn(),
  }),
}));

import { TransferenciaWizard } from './TransferenciaWizard';

function renderWizard() {
  render(<TransferenciaWizard idActivo={30} origenId={6} origenNombre="Estanque 6" onClose={vi.fn()} onDone={vi.fn()} />);
}

describe('TransferenciaWizard — capacidad derivada (RFC-012)', () => {
  it('muestra ocupación, capacidad y cupo libre de cada destino', () => {
    estado.saveError = null;
    renderWizard();
    expect(screen.getByRole('option', { name: /Estanque 7 · Estanque \(ocupación: 30\/50 · libres: 20\)/ })).toBeInTheDocument();
    // Sin capacidad derivada no se inventa un cupo.
    expect(screen.getByRole('option', { name: 'Estanque 8 · Estanque' })).toBeInTheDocument();
    expect(screen.getByText(/grupo de manejo de la especie y con cupo para este activo/)).toBeInTheDocument();
  });

  it('un 422 de capacidad se muestra con su mensaje y marca el destino', () => {
    estado.saveError = {
      code: 'CAPACIDAD_EXCEDIDA', status: 422, field: 'infraestructura_destino_id',
      message: "Capacidad excedida: la carga del área 'Estanque 7' superaría su capacidad efectiva (50 individuos).",
    };
    renderWizard();
    expect(screen.getAllByText(/Capacidad excedida: la carga del área 'Estanque 7'/).length).toBe(2); // aviso + campo
  });
});
