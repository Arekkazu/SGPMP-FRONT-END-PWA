// | Fecha      | Nombre           | Que se hizo                                   |
// |------------|------------------|-----------------------------------------------|
// | 2026-11-03 | Arekkazu         | RF-59: botón Limpiar que vuelve a los filtros por defecto y consulta |
/** RF-59 — el historial de telemetría no tenía cómo volver a los filtros por defecto. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HistorialFiltros, HISTORIAL_FILTROS_DEFAULT } from './HistorialFiltros';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';

describe('HistorialFiltros — Limpiar (RF-59)', () => {
  it('vuelve a los últimos 7 días sin filtros y consulta', () => {
    const onChange = vi.fn();
    const onAplicar = vi.fn();
    render(
      <HistorialFiltros
        areas={[]}
        value={{ ...HISTORIAL_FILTROS_DEFAULT, fecha_inicio: '2026-01-01', tipo_variable: 'NH3', estado_dato: 'FUERA_DE_RANGO' }}
        onChange={onChange}
        onAplicar={onAplicar}
        onExportar={vi.fn()}
        puedeExportar={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /limpiar/i }));
    const esperado = { ...HISTORIAL_FILTROS_DEFAULT, fecha_inicio: diasAtrasLocal(7), fecha_fin: hoyLocal() };
    expect(onChange).toHaveBeenCalledWith(esperado);
    expect(onAplicar).toHaveBeenCalledWith(esperado);
  });
});
