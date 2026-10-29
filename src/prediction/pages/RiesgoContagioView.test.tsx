// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-68: la pestaña Contagio pinta los cálculos del backend |
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { RiesgoContagioView } from './RiesgoContagioView';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn() } }));

describe('RiesgoContagioView (RF-68)', () => {
  it('muestra los lotes reales con su probabilidad, sin datos simulados', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: [{
        id_resultado_contagio: 1, id_activo_biologico: 30, identificador_activo: 'LOTE-30', nombre_area: 'Galpón B',
        nombre_finca: 'Finca Uno', especie: 'Pollo de engorde', probabilidad_contagio: '0.6200', nivel_riesgo_contagio: 2,
        factor_sanitario_fs: '0.5000', factor_ambiental_fa: '0.7000', factor_densidad_fd: '0.4000', w_fs_aplicado: '0.500',
        w_fa_aplicado: '0.300', w_fd_aplicado: '0.200', confianza_baja: false, data_quality_score: null, factores_ausentes: [],
        modo_ejecucion_calculo: 'NORMAL', n_enfermos_detectados: null, total_activos_lote: null, porcentaje_sensores_activos: null,
        fecha_calculo: '2026-10-29T10:00:00Z', id_alerta_generada: null, detalle_calculo: { definicion_fs: 'SCORE_POBLACIONAL' },
      }],
    } as never);

    render(<RiesgoContagioView />);

    expect(await screen.findByText('LOTE-30')).toBeTruthy();
    expect(screen.getAllByText('62%').length).toBeGreaterThan(0);
    expect(http.get).toHaveBeenCalledWith('/prediccion/riesgo-contagio', expect.anything());
    expect(screen.queryByText(/datos de ejemplo|Datos simulados/)).toBeNull();
  });
});
