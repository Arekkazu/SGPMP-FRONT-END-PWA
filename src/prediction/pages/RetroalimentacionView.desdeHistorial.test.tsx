// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-20 | Arekkazu | QA-M08 CU04 H-01/H-02 RF-106: desde el historial abre el formulario y el filtro por animal se ve |
// | 2026-11-21 | Arekkazu | INC-M08-390-G023 RF-106: la bandeja pide la predicción y explica si no se puede evaluar |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { RetroalimentacionView } from './RetroalimentacionView';
import type { InferenciaPorEvaluar } from '../types';

const fila: InferenciaPorEvaluar = {
  id_resultado_inferencia: 'abc', id_activo_biologico: 7, identificador_activo: 'QA-M08-AREA-B-01', especie: 'Bovino',
  nombre_finca: 'Finca', nombre_area: 'Área', nivel_riesgo: 3, id_patologia: 1, nombre_patologia: 'Estrés térmico',
  confianza_global: 0.87, fecha_inferencia: '2026-11-15T21:13:00Z', tiene_alerta_generada: false, modo_sombra: false,
  estado_evaluacion: 'PENDIENTE', fecha_limite: '2026-12-15T21:13:00Z', numero_evaluaciones: 0, evaluada_por_mi: false,
  activo_en_baja: false, puede_evaluar: true,
};
const cargar = vi.fn();
let datos: unknown = null;
vi.mock('../hooks/useBandejaRetroalimentacion', () => ({
  POR_PAGINA_BANDEJA: 20,
  useBandejaRetroalimentacion: () => ({ datos, loading: false, error: null, cargar, recargar: vi.fn() }),
}));
vi.mock('../hooks/useRetroalimentacion', () => ({ useRetroalimentacion: () => ({ registrar: vi.fn(), saving: false, error: null }) }));
vi.mock('../hooks/usePatologias', () => ({ usePatologias: () => ({ patologias: [], cargar: vi.fn() }) }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));

const respuesta = { items: [fila], total: 1, pagina: 1, por_pagina: 20, ventana_dias: 30,
  indicadores: { pendientes: 1, evaluadas: 0, vencidas: 0 } };

function vista() {
  return <MemoryRouter initialEntries={['/prediccion/retroalimentacion?resultado=abc&activo=7']}><RetroalimentacionView /></MemoryRouter>;
}

test('desde el historial abre el formulario aunque la bandeja responda después', () => {
  datos = null;
  const { rerender } = render(vista());
  expect(screen.queryByRole('dialog')).toBeNull();

  datos = respuesta;
  rerender(vista());

  expect(screen.getByRole('dialog')).toHaveTextContent('QA-M08-AREA-B-01');
});

test('dice de qué animal es la lista y deja ver todos', () => {
  datos = respuesta;
  render(vista());
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  expect(screen.getByText('Mostrando solo las predicciones de QA-M08-AREA-B-01.')).toBeInTheDocument();
  cargar.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Ver todos los animales' }));
  expect(cargar).toHaveBeenCalledWith(expect.objectContaining({ id_activo_biologico: undefined }), 1);
});

test('pide a la bandeja la predicción elegida y, si ya no está, dice por qué no abre el formulario', () => {
  datos = { ...respuesta, items: [] };
  cargar.mockClear();
  render(vista());
  expect(cargar).toHaveBeenCalledWith(expect.objectContaining({ id_activo_biologico: 7, id_resultado_inferencia: 'abc' }), 1);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText(/ya no se puede evaluar: pasó el plazo/)).toBeInTheDocument();
});

test('si la predicción ya la evaluaste, lo dice en vez de no hacer nada', () => {
  datos = { ...respuesta, items: [{ ...fila, evaluada_por_mi: true }] };
  render(vista());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getAllByText('Ya registraste tu evaluación de esta inferencia.').length).toBeGreaterThan(0);
});
