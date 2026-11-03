// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66: el monitor pinta los resultados del backend |
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { MonitorInferenciaView } from './MonitorInferenciaView';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn() } }));

describe('MonitorInferenciaView (RF-66)', () => {
  it('muestra los resultados reales, sin el aviso de datos simulados', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: [{
        id_resultado_inferencia: 'c1f63d2e-35a4-4d3e-8c81-eaf7dc30f313', id_activo_biologico: 906, identificador_activo: 'CERDO-906',
        nombre_area: 'Corral 1', nombre_finca: 'Finca Uno', especie: 'Porcinos', tipo_modelo: 'MODELO_ESPECIES_GRANDES',
        paradigma: 'INDIVIDUAL', id_version_modelo: 8, nombre_version: 'grd-3.0', nivel_riesgo: 2, probabilidad_riesgo: {},
        id_patologia: 52, nombre_patologia: 'Estrés térmico', probabilidad_enfermedad: {}, confianza_global: '0.80',
        contexto_incompleto: false, latencia_excedida: false, modo_ejecucion: 'SERVIDOR', latencia_ms: 390,
        fecha_inicio_ventana: null, fecha_fin_ventana: null, fecha_inferencia: '2026-10-27T01:18:00Z',
        tiene_alerta_generada: false, id_alerta_generada: null,
      }],
    } as never);

    render(<MonitorInferenciaView />);

    expect(await screen.findByText('CERDO-906')).toBeTruthy();
    expect(screen.getByText('Estrés térmico')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/prediccion/inferencias', expect.anything());
    expect(screen.queryByText(/Datos simulados/)).toBeNull();
  });
});
