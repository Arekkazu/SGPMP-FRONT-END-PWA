// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | QA-M02 RF-49: la ficha solo consulta los sensores asociados; ya no crea asociaciones |
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SensoresSection } from './SensoresSection';
import { valorMetrica } from './DatosAnaliticosSection';

vi.mock('../api/sensoresApi', () => ({
  sensoresApi: {
    listar: vi.fn().mockResolvedValue({
      id_activo_biologico: 2, tipo_consulta: 'ACTIVA',
      asociaciones: [{
        id_asociacion_activo_sensor: 1, id_activo_biologico: 2, tipo_activo: 'INDIVIDUAL', tipo_asociacion: 'DIRECTA',
        dispositivo_iot_id: 3, sensor_id: 5, id_infraestructura: 1, fecha_inicio: '2026-11-01T00:00:00Z', fecha_fin: null,
        estado_asociacion: 'ACTIVA', motivo: null, advertencia: null, nombre_sensor: 'DS18B20', serial_dispositivo: 'ESP32-01',
      }],
    }),
  },
}));

describe('SensoresSection (solo lectura)', () => {
  it('lista los sensores por nombre y no ofrece asociar', async () => {
    render(<SensoresSection idActivo={2} />);
    expect(await screen.findByText('DS18B20')).toBeTruthy();
    expect(screen.getByText('ESP32-01')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /asociar/i })).toBeNull();
  });
});

describe('valorMetrica', () => {
  it('nunca muestra null ni listas crudas', () => {
    expect(valorMetrica('cantidad_actual', null)).toBe('—');
    expect(valorMetrica('indicadores_historicos', [])).toBe('—');
    expect(valorMetrica('peso_actual', 450)).toBe('450');
  });
});
