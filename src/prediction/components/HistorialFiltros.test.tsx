// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-67: activo o lote con autocompletado |
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HistorialFiltros, historialFiltrosVacio, type HistorialFiltrosState } from './HistorialFiltros';
import type { ActivoSelectorItem } from '../types';

const ACTIVOS: ActivoSelectorItem[] = [
  { id_activo_biologico: 2, identificador: 'BOV-001-DEV', tipo: 'INDIVIDUAL', nombre_especie: 'Bovino' },
  { id_activo_biologico: 5, identificador: null, tipo: 'POBLACIONAL', nombre_especie: 'Porcino' },
];

function Montaje({ onChange }: { onChange: (v: HistorialFiltrosState) => void }) {
  const [v, setV] = useState(historialFiltrosVacio());
  return (
    <HistorialFiltros
      value={v} activos={ACTIVOS} activosError={false} patologias={[]} loading={false}
      onChange={(n) => { setV(n); onChange(n); }} onConsultar={vi.fn()} onLimpiar={vi.fn()}
    />
  );
}

describe('HistorialFiltros · activo o lote', () => {
  it('escribir parte del código y salir del campo elige ese activo', () => {
    const onChange = vi.fn();
    render(<Montaje onChange={onChange} />);
    const campo = screen.getByRole('combobox', { name: /activo/i });
    fireEvent.change(campo, { target: { value: 'bov-001' } });
    fireEvent.blur(campo);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ activo: 'BOV-001-DEV (#2)', idActivo: '2' }));
  });

  it('acepta el ID y nombra el lote sin identificador', () => {
    const onChange = vi.fn();
    render(<Montaje onChange={onChange} />);
    const campo = screen.getByRole('combobox', { name: /activo/i });
    fireEvent.change(campo, { target: { value: '#5' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ idActivo: '5' }));
    fireEvent.blur(campo);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ activo: 'Lote 5 (#5)', idActivo: '5' }));
  });
});
