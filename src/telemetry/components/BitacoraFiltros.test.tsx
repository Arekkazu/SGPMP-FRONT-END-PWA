// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-63: tipo de evento por área del sistema, sin códigos de requisito a la vista |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BITACORA_FILTROS_VACIO, BitacoraFiltros } from './BitacoraFiltros';

function abrir() {
  const onChange = vi.fn();
  render(<BitacoraFiltros value={BITACORA_FILTROS_VACIO} onChange={onChange} onAplicar={vi.fn()} onLimpiar={vi.fn()} />);
  return { onChange, select: screen.getByLabelText(/tipo de evento/i) as HTMLSelectElement };
}

describe('BitacoraFiltros · tipo de evento', () => {
  it('ninguna opción ni rótulo muestra un código de requisito', () => {
    const { select } = abrir();
    const textos = [...select.querySelectorAll('option, optgroup')].map((o) => o.textContent || o.getAttribute('label') || '');
    expect(textos.filter((x) => /\bRF[-\s]?\d/i.test(x))).toEqual([]);
    expect(screen.queryByText(/RF de origen/i)).toBeNull();
  });

  it('«Todos» de un grupo filtra por el área; un tipo, por ese tipo', () => {
    const { onChange, select } = abrir();
    fireEvent.change(select, { target: { value: 'c:RF23' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rf_origen: 'RF23', tipo_evento: '' }));
    fireEvent.change(select, { target: { value: 't:CREDENCIAL_MQTT_REVOCADA' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rf_origen: '', tipo_evento: 'CREDENCIAL_MQTT_REVOCADA' }));
    expect(screen.getByRole('option', { name: 'Credencial MQTT revocada' })).toBeTruthy();
  });
});
