// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | FE-11 RF-59: aviso de truncado e intervalos sin lecturas |
/** FE-11 (RF-59 E6/E7, DEV-38): truncado a 10 000 lecturas e intervalos sin lecturas. */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../shared/i18n';
import { HistorialAvisos } from './HistorialAvisos';

const VACIO = {
  sensor_id: 12, tipo_variable: 'TEMPERATURA_AMBIENTAL', desde: '2026-10-20T10:00:00Z',
  hasta: '2026-10-20T11:30:00Z', duracion_min: 90, frecuencia_esperada_min: 5,
};

afterEach(async () => { await i18n.changeLanguage('es-CO'); });

describe('HistorialAvisos', () => {
  it('avisa del truncado con lo mostrado y lo encontrado', () => {
    render(<HistorialAvisos truncado totalEncontrado={12000} mostrados={10000} vacios={[]} />);
    expect(screen.getByText('Resultado truncado')).toBeTruthy();
    expect(screen.getByText(/primeras 10000 de 12000 lecturas/)).toBeTruthy();
  });

  it('lista los intervalos sin lecturas', () => {
    render(<HistorialAvisos truncado={false} totalEncontrado={3} mostrados={3} vacios={[VACIO]} />);
    expect(screen.getByRole('heading', { name: '1 intervalo sin lecturas' })).toBeTruthy();
    expect(screen.getByText(/TEMPERATURA_AMBIENTAL \(sensor 12\).*90 min.*cada 5 min/)).toBeTruthy();
    expect(screen.queryByText('Resultado truncado')).toBeNull();
  });

  it('en inglés también', async () => {
    await i18n.changeLanguage('en-US');
    render(<HistorialAvisos truncado totalEncontrado={12000} mostrados={10000} vacios={[VACIO, { ...VACIO, sensor_id: 13 }]} />);
    expect(screen.getByText('Truncated result')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '2 intervals without readings' })).toBeTruthy();
  });

  it('sin truncado ni huecos no muestra nada', () => {
    const { container } = render(<HistorialAvisos truncado={false} totalEncontrado={0} mostrados={0} vacios={[]} />);
    expect(container.textContent).toBe('');
  });
});
