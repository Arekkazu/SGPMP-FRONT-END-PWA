// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-23 | Arekkazu | PR-667: el vacío se muestra en el día local, no en el de UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: conteos con plural y separador de miles |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-01: 7 días por defecto y el rango rápido consulta |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-22: el mock incluye el dashboard de áreas; números con separador |
// | 2026-10-31 | Arekkazu | TC-DIS-160 RF-59 a11y 1.1.1/1.3.1: una fila por lectura, hueco dentro de la lectura; T-19/T-22/T-23 |
/**
 * FE-11 (RF-59 E6 / CA-19 y E7 / CA-17): con la respuesta de DEV-38, el historial avisa
 * cuando el resultado se truncó y marca los intervalos sin datos.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { LOCALE_DEFAULT } from '../../shared/i18n';
import type { HistorialPageSchema, LecturaHistoricaSchema, VacioTemporalSchema } from '../types';

const historial = vi.hoisted(() => vi.fn());
// T-18: el filtro de área pide las áreas al resumen del dashboard.
const dashboard = vi.hoisted(() => vi.fn(async () => ({ resumen_unidades: [] })));
vi.mock('../api/monitoreoApi', () => ({ monitoreoApi: { historial, exportarHistorial: vi.fn(), dashboard } }));
vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));

import { HistorialView } from './HistorialView';
import { duracionLegible, zonasDelGrafico } from '../lib/vaciosTemporales';
import { fechaHoraCaptura } from '../lib/sensorEscala';

function lectura(id: number, ts: string): LecturaHistoricaSchema {
  return {
    id_telemetria: id, id_sensor: 2, nombre_sensor: 'pH estanque', id_variable: 2, tipo_variable: 'pH del agua',
    categoria_variable: 'HIDRICA', valor: 7, valor_ajustado: null, unidad_medida: 'pH', timestamp_captura: ts,
    estado_calidad: 'LECTURA_VALIDA', estado_semaforo_historico: 'VERDE', origen_dato: 'TIEMPO_REAL',
    id_infraestructura: 1, infraestructura: 'Estanque', finca: 'F', id_activo_biologico: null, especie: null,
    id_alerta: null, nivel_bateria_pct: null, calidad_senal_rssi: null, calidad_senal_snr: null,
  } as LecturaHistoricaSchema;
}

// Orden DESC, como la vista: el hueco de 2 h está entre la lectura 2 (04:00) y la 3 (01:59:30).
const ITEMS = [
  lectura(1, '2026-10-20T04:00:30Z'),
  lectura(2, '2026-10-20T04:00:00Z'),
  lectura(3, '2026-10-20T01:59:30Z'),
];
const VACIO: VacioTemporalSchema = {
  sensor_id: 2, tipo_variable: 'pH del agua', desde: '2026-10-20T01:59:30Z', hasta: '2026-10-20T04:00:00Z',
  duracion_min: 121, frecuencia_esperada_min: 1,
};

function respuesta(cambios: Partial<HistorialPageSchema> = {}): HistorialPageSchema {
  return {
    total: 3, total_encontrado: 3, truncado: false, aviso: null, pagina: 1, por_pagina: 100, paginas_totales: 1,
    filtros_aplicados: {}, rango_real_datos: {}, items: ITEMS, estadisticas: [], vacios_temporales: [], ...cambios,
  };
}

beforeEach(() => historial.mockReset());
afterEach(async () => { await i18n.changeLanguage(LOCALE_DEFAULT); });

describe('HistorialView — E6 / CA-19: resultado truncado', () => {
  it('una consulta grande muestra el aviso y cuántas lecturas se ven de cuántas', async () => {
    historial.mockResolvedValue(respuesta({ total: 10_000, total_encontrado: 12_000, truncado: true, paginas_totales: 100 }));
    render(<HistorialView />);
    expect(await screen.findByText('Resultado truncado')).toBeInTheDocument();
    // T-22: con separador de miles, como el resto de la pantalla (antes "22253").
    expect(screen.getByText(/encontró 12\.000 lecturas y solo se muestran las primeras 10\.000/)).toBeInTheDocument();
    expect(screen.getByText('10.000 de 12.000 lecturas')).toBeInTheDocument();
  });

  it('sin truncado no hay aviso', async () => {
    historial.mockResolvedValue(respuesta());
    render(<HistorialView />);
    expect(await screen.findByText('3 lecturas')).toBeInTheDocument();
    expect(screen.queryByText('Resultado truncado')).not.toBeInTheDocument();
  });

  it('el aviso también está en en-US', async () => {
    await i18n.changeLanguage('en-US');
    historial.mockResolvedValue(respuesta({ total: 10_000, total_encontrado: 12_000, truncado: true }));
    render(<HistorialView />);
    expect(await screen.findByText('Truncated result')).toBeInTheDocument();
  });
});

describe('HistorialView — E7 / CA-17: intervalos vacíos', () => {
  it('un hueco se ve marcado en la tabla, entre las dos lecturas que lo delimitan', async () => {
    historial.mockResolvedValue(respuesta({ vacios_temporales: [VACIO] }));
    render(<HistorialView />);
    expect(await screen.findByText('El periodo tiene 1 intervalo sin datos')).toBeInTheDocument();

    // TC-DIS-160: una fila por lectura (como la gráfica); el hueco va dentro de la lectura
    // 2 (04:00), la que lo cierra, antes de la 3 (01:59:30).
    const filas = screen.getAllByRole('row').slice(1); // sin el encabezado
    expect(filas).toHaveLength(3);
    const marca = within(filas[1]).getByTestId('fila-vacio');
    // Día y hora locales: 01:59:30Z en America/Bogota es el 19 a las 20:59.
    expect(marca).toHaveTextContent(`Sin datos por 2 h desde ${fechaHoraCaptura(VACIO.desde)}`);
    expect(within(marca).getByText(/frecuencia esperada: 1 min/)).toBeInTheDocument();
  });

  it('sin vacíos no hay marca ni aviso', async () => {
    historial.mockResolvedValue(respuesta());
    render(<HistorialView />);
    await screen.findByText('3 lecturas');
    expect(screen.queryByTestId('fila-vacio')).not.toBeInTheDocument();
    expect(screen.queryByText(/intervalo sin datos/)).not.toBeInTheDocument();
  });
});

describe('HistorialView — M3-01: rango por defecto y rangos rápidos', () => {
  it('carga 7 días por defecto y un rango rápido vuelve a consultar', async () => {
    historial.mockResolvedValue(respuesta());
    render(<HistorialView />);
    await screen.findByText('3 lecturas');
    const primera = historial.mock.calls[0][0];
    const dias = (Date.parse(primera.fecha_fin) - Date.parse(primera.fecha_inicio)) / 86_400_000;
    expect(dias).toBe(7);

    await userEvent.click(screen.getByRole('button', { name: 'Últimos 30 días' }));
    expect(historial).toHaveBeenCalledTimes(2);
  });

});

describe('vaciosTemporales', () => {
  it('la gráfica sombrea solo los vacíos con sus dos extremos en la página', () => {
    const ts = ITEMS.map((i) => i.timestamp_captura);
    expect(zonasDelGrafico([VACIO], ts)).toEqual([{ x1: '2026-10-20T01:59:30Z', x2: '2026-10-20T04:00:00Z' }]);
    expect(zonasDelGrafico([VACIO], ts.slice(0, 2))).toEqual([]);
  });

  it('expresa la duración en minutos, horas o días', () => {
    expect(duracionLegible(45)).toEqual({ valor: 45, unidad: 'min' });
    expect(duracionLegible(121)).toEqual({ valor: 2, unidad: 'h' });
    expect(duracionLegible(4320)).toEqual({ valor: 3, unidad: 'd' });
  });
});
