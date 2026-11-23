// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-23 | Arekkazu | QA-M08 CU02 H-03 RF-104: la lista con «Todos» arranca en «Todos» y elegir un valor lo envía |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FiltrosReporte } from './FiltrosReporte';
import type { ReporteCatalogo } from '../tipos';

const RIESGO: ReporteCatalogo = {
  tipo_reporte: 'REPORTE_RIESGO_SANITARIO', titulo: 'Riesgo sanitario', periodo_cerrado: false,
  compara_periodos: false, limite_sincrono: 1000,
  filtros: [{ nombre: 'nivel_riesgo', etiqueta: 'Nivel de riesgo', tipo: 'lista', obligatorio: false,
              valores: ['ALTO', 'MEDIO', 'BAJO', 'TODOS'] }],
};

describe('FiltrosReporte · listas con «Todos»', () => {
  it('sin elegir muestra «Todos» y elegir «Alto» lo envía', () => {
    const onCambiar = vi.fn();
    render(<FiltrosReporte reporte={RIESGO} valores={{}} errores={{}} onCambiar={onCambiar} />);
    const lista = screen.getByLabelText(/nivel de riesgo/i) as HTMLSelectElement;
    // Antes el navegador mostraba «Alto» sin que estuviera elegido: el reporte salía sin filtrar.
    expect(lista.value).toBe('TODOS');
    fireEvent.change(lista, { target: { value: 'ALTO' } });
    expect(onCambiar).toHaveBeenCalledWith('nivel_riesgo', 'ALTO');
  });
});
