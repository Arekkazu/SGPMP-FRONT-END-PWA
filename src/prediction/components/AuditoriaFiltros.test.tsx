// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | QA-M04 RF-73: «Hasta» anterior a «Desde» se avisa y no se aplica |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AUDITORIA_FILTROS_VACIO, AuditoriaFiltros } from './AuditoriaFiltros';

describe('AuditoriaFiltros rango de fechas', () => {
  it('«Hasta» anterior a «Desde» muestra el error y no aplica', () => {
    const onAplicar = vi.fn();
    render(
      <AuditoriaFiltros
        value={{ ...AUDITORIA_FILTROS_VACIO, fecha_desde: '2026-11-03', fecha_hasta: '2026-11-02' }}
        onChange={() => {}} onAplicar={onAplicar} onLimpiar={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    expect(onAplicar).not.toHaveBeenCalled();
  });
});
