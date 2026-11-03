// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-62: el panel de visión muestra lo que evaluó el backend (antes datos de ejemplo) |
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../shared/i18n';
import { CalidadVisionPanel } from './CalidadVisionPanel';

const vision = vi.fn();
vi.mock('../api/calidadApi', () => ({ calidadApi: { vision: (...a: unknown[]) => vision(...a) } }));

const OBS = {
  id_observacion_vision: 1, id_dispositivo_iot: 9, serial_camara: 'CAM-GALPON-A-01', id_infraestructura: 4,
  nombre_area: 'Galpón A', fecha_inicio_ventana: '2026-11-03T11:55:00Z', fecha_observacion: '2026-11-03T12:00:00Z',
  n_individuos_observados: 37, cobertura_ventana: '0.71', fps_efectivo: '8.4', cantidad_tracks_perdidos: 6,
  estado_calibracion: 'CALIBRADO', indice_calidad_vision: '52.90', clasificacion_calidad: 'DEGRADADA',
  es_apto_para_ia: true, es_confianza_baja: true, apto_para_nic41: false, fecha_evaluacion_calidad: '2026-11-03T12:01:00Z',
  flags_detectados: { tracking_inestable: { activo: true, tracks_perdidos_tolerables: 5 }, fps_insuficiente: { activo: true, fps_configurado: '12' }, cobertura_baja: { activo: false } },
};
const SIN_EVALUAR = { ...OBS, id_observacion_vision: 2, serial_camara: 'CAM-CUARENTENA-01', indice_calidad_vision: null, clasificacion_calidad: null, es_apto_para_ia: null, es_confianza_baja: null, flags_detectados: null, fecha_evaluacion_calidad: null };
const POLITICA = { w1: '0.40', w2: '0.35', w3: '0.25', tracks_perdidos_tolerables: 5, umbral_optima: '80', umbral_degradada: '40', factor_en_calibracion: '0.70' };
const respuesta = (extra = {}) => ({ items: [OBS, SIN_EVALUAR], total: 2, pagina: 1, por_pagina: 25, desde: '', hasta: '', politica: POLITICA, politica_motivo: null, ...extra });

describe('CalidadVisionPanel', () => {
  it('muestra las observaciones evaluadas, las pendientes y la política vigente', async () => {
    vision.mockResolvedValue(respuesta());
    render(<CalidadVisionPanel />);
    expect(await screen.findByText('CAM-GALPON-A-01')).toBeInTheDocument();
    const tabla = within(screen.getByRole('region', { name: 'Tabla de calidad de visión' }));
    expect(tabla.getByText('Degradada')).toBeInTheDocument();
    expect(tabla.getByText('Sin evaluar')).toBeInTheDocument();
    expect(screen.getByText(/0,4 · cobertura_ventana|0.4 · cobertura_ventana/)).toBeInTheDocument();
    // Solo los flags activos (dos), no los cuatro objetos.
    expect(tabla.queryByText(/cobertura baja/i)).not.toBeInTheDocument();
  });

  it('sin política configurada lo avisa, sin valores por defecto', async () => {
    vision.mockResolvedValue(respuesta({ politica: null, politica_motivo: 'No se ha configurado el parámetro w3.' }));
    render(<CalidadVisionPanel />);
    expect(await screen.findByText(/no está configurada/i)).toBeInTheDocument();
    expect(screen.getByText(/w3/)).toBeInTheDocument();
  });

  it('el filtro por clase consulta de nuevo desde la página 1', async () => {
    vision.mockResolvedValue(respuesta());
    render(<CalidadVisionPanel />);
    await screen.findByText('CAM-GALPON-A-01');
    fireEvent.change(screen.getByLabelText('Clasificación'), { target: { value: 'SIN_EVALUAR' } });
    await waitFor(() => expect(vision).toHaveBeenLastCalledWith({ clasificacion: 'SIN_EVALUAR' }, 1, 25));
  });
});
