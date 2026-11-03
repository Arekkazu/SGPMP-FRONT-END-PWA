// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-68: la pestaña Contagio pinta los cálculos del backend |
// | 2026-11-02 | Arekkazu | AJF-11 RF-68: paginación, búsqueda y grafo plegable |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  const calculo = (id: number, area: string) => ({
    id_resultado_contagio: id, id_activo_biologico: id, identificador_activo: `LOTE-${id}`, nombre_area: area,
    nombre_finca: 'Finca Uno', especie: 'POLLO_ENGORDE', probabilidad_contagio: '0.3000', nivel_riesgo_contagio: 0,
    factor_sanitario_fs: '0.3', factor_ambiental_fa: null, factor_densidad_fd: null, w_fs_aplicado: '1', w_fa_aplicado: '0',
    w_fd_aplicado: '0', confianza_baja: false, data_quality_score: null, factores_ausentes: [], modo_ejecucion_calculo: 'NORMAL',
    n_enfermos_detectados: null, total_activos_lote: null, porcentaje_sensores_activos: null,
    fecha_calculo: '2026-10-29T10:00:00Z', id_alerta_generada: null, detalle_calculo: {},
  });

  it('pagina de a 15, busca por área sin tildes y vuelve a la página 1 al filtrar (AJF-11)', async () => {
    const datos = Array.from({ length: 20 }, (_, i) => calculo(i + 1, i < 3 ? 'Galpón Norte' : 'Corral'));
    vi.mocked(http.get).mockResolvedValue({ data: datos } as never);
    render(<RiesgoContagioView />);
    await screen.findByText('LOTE-1');
    expect(screen.getAllByText(/^LOTE-\d+$/)).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getAllByText(/^LOTE-\d+$/)).toHaveLength(5);
    fireEvent.change(screen.getByLabelText(/Buscar lote o área/), { target: { value: 'galpon norte' } });
    expect(screen.getAllByText(/^LOTE-\d+$/)).toHaveLength(3);
    expect(screen.getAllByText(/Pollo engorde/i).length).toBeGreaterThan(0);
  });

  it('el grafo se oculta y se muestra con aria-expanded (AJF-11)', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [calculo(1, 'Corral')] } as never);
    render(<RiesgoContagioView />);
    await screen.findByText('LOTE-1');
    const boton = screen.getByRole('button', { name: /Ocultar grafo/ });
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(boton);
    expect(screen.getByRole('button', { name: /Mostrar grafo/ }).getAttribute('aria-expanded')).toBe('false');
  });
});
