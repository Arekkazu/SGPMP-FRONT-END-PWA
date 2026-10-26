// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-10: filtro por estado, señal en palabras y selección de fila |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-10: los que fallan primero |
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '../../shared/i18n';
import { DispositivosLista, nivelSenal, porProblema } from './DispositivosLista';
import type { DispositivoConEstadoSchema } from '../types';

const d = (id: number, estado: string, rssi: number | null): DispositivoConEstadoSchema => ({
  id_dispositivo_iot: id, serial: `EDGE-${id}`, descripcion: `Edge ${id}`, id_infraestructura: 3,
  nombre_infraestructura: 'Área QA 01', nombre_finca: 'El Remanso', estado_actual: estado,
  fecha_ultimo_contacto: null, nivel_bateria_pct: '8.00', calidad_senal_rssi: rssi,
});

describe('DispositivosLista (M3-10)', () => {
  it('traduce el RSSI a palabras', () => {
    expect(nivelSenal(-60)).toBe('buena');
    expect(nivelSenal('-75')).toBe('regular');
    expect(nivelSenal(-95)).toBe('debil');
    expect(nivelSenal(null)).toBeNull();
  });

  it('filtra por estado y avisa la fila elegida', async () => {
    const onSeleccionar = vi.fn();
    render(<DispositivosLista items={[d(1, 'SIN_SEÑAL', -95), d(2, 'ACTIVO', -60)]} loading={false} error={null} seleccionado={null} onSeleccionar={onSeleccionar} />);

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'SIN_SEÑAL');
    expect(screen.getByText('Edge 1')).toBeInTheDocument();
    expect(screen.queryByText('Edge 2')).not.toBeInTheDocument();
    expect(screen.getByText('Débil')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Edge 1'));
    expect(onSeleccionar).toHaveBeenCalledWith(1);
  });

  it('ordena los que fallan primero y, a igual estado, la batería más baja', () => {
    const lista = [
      { ...d(1, 'ACTIVO', -60), nivel_bateria_pct: '80' },
      { ...d(2, 'DESCONOCIDO', null) },
      { ...d(3, 'ACTIVO', -60), nivel_bateria_pct: '15' },
      { ...d(4, 'SIN_SEÑAL', -95) },
    ].sort(porProblema);

    expect(lista.map((x) => x.id_dispositivo_iot)).toEqual([4, 2, 3, 1]);
  });
});
