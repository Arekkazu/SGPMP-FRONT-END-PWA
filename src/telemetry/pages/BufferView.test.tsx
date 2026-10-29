// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: panel del buffer con datos del backend |
/**
 * TC-DIS-148: el panel pintaba bufferMock.ts. Ahora lee GET /iot/buffer: indicadores
 * con rótulo (1.3.1), estado NORMAL/WARNING/CRITICO en texto (1.4.1) y política legible.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { BufferView } from './BufferView';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn() } }));

const base = {
  descripcion: null, nombre_infraestructura: 'Galpón A', nombre_finca: 'Finca Uno', estado_dispositivo: 'BUFFER_ACTIVO',
  ultimo_timestamp_pendiente: '2026-10-29T14:00:00Z', fecha_reporte: '2026-10-29T14:01:00Z', fecha_recepcion: '2026-10-29T14:01:02Z',
};

describe('BufferView (TC-DIS-148)', () => {
  it('muestra cada dispositivo con sus indicadores rotulados, el estado en texto y la política', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: [
        { ...base, id_dispositivo_iot: 1, serial: 'EDGE-01', estado_local_buffer: 'A', datos_pendientes: 187, metricas_disponibles: true,
          capacidad_total: '1000.0', capacidad_utilizada: '960.0', porcentaje_ocupacion: '96.000', estado_buffer: 'CRITICO',
          politica_buffer_activa: 'POLITICA_SOBRESCRITURA' },
        { ...base, id_dispositivo_iot: 2, serial: 'EDGE-02', estado_local_buffer: 'I', datos_pendientes: 0, metricas_disponibles: false,
          capacidad_total: null, capacidad_utilizada: null, porcentaje_ocupacion: null, estado_buffer: null, politica_buffer_activa: null },
      ],
    } as never);

    render(<BufferView />);

    const critico = await screen.findByRole('region', { name: 'EDGE-01' });
    expect(within(critico).getByText('Crítico (95 % o más)')).toBeTruthy();
    expect(within(critico).getByRole('meter', { name: 'Ocupación del buffer' }).getAttribute('value')).toBe('96');
    const dl = within(critico).getByText('Política activa').nextElementSibling;
    expect(dl?.textContent).toBe('Sobrescribe los más antiguos');
    expect(within(critico).getByText('Capacidad total').nextElementSibling?.textContent).toMatch(/1.?000/);

    const sinMetricas = screen.getByRole('region', { name: 'EDGE-02' });
    expect(within(sinMetricas).queryByRole('meter')).toBeNull();
    expect(within(sinMetricas).getByText(/todavía no reporta la capacidad/)).toBeTruthy();
    expect(screen.queryByText('Datos simulados')).toBeNull();
  });
});
