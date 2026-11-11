// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #393 RF-36: estado de la densidad del lote en el listado y en sus datos |
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DensidadLoteCard, EstadoDensidadTexto } from './DensidadLote';
import { consultasApi } from '../api/consultasApi';

vi.mock('../api/consultasApi', () => ({ consultasApi: { estadoDensidadLote: vi.fn() } }));

describe('Densidad del lote (#393)', () => {
  it('los cuatro estados se dicen con texto', () => {
    render(<>{(['OK', 'AVISO', 'EXCEDE', 'SIN_CONFIGURAR'] as const).map((e) => <EstadoDensidadTexto key={e} estado={e} />)}</>);
    for (const texto of ['Dentro del límite', 'Cerca del máximo', 'Supera el máximo', 'Sin máximo configurado']) {
      expect(screen.getByText(texto)).toBeInTheDocument();
    }
  });

  it('muestra barra, capacidad, cupo y que el máximo sale de la etapa', async () => {
    vi.mocked(consultasApi.estadoDensidadLote).mockResolvedValue({
      estado: 'AVISO', densidad_maxima: '2', fuente: 'ETAPA', nombre_etapa: 'Ceba', porcentaje_del_maximo: '88.00',
      aviso_preventivo_pct: 85, superficie: '50', capacidad_maxima: 100, cupo_disponible: 12, biomasa_maxima: null, biomasa_por_m2: null,
    });
    render(<MemoryRouter><DensidadLoteCard idActivo={7} /></MemoryRouter>);
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '88');
    expect(screen.getByText('Cerca del máximo')).toBeInTheDocument();
    expect(screen.getByText('100 animales')).toBeInTheDocument();
    expect(screen.getByText('12 animales')).toBeInTheDocument();
    expect(screen.getByText(/de la etapa «Ceba»/)).toBeInTheDocument();
  });

  it('sin máximo lo dice y no dibuja barra', async () => {
    vi.mocked(consultasApi.estadoDensidadLote).mockResolvedValue({
      estado: 'SIN_CONFIGURAR', densidad_maxima: null, fuente: null, nombre_etapa: null, porcentaje_del_maximo: null,
      aviso_preventivo_pct: 90, superficie: null, capacidad_maxima: null, cupo_disponible: null, biomasa_maxima: null, biomasa_por_m2: null,
    });
    render(<MemoryRouter><DensidadLoteCard idActivo={7} /></MemoryRouter>);
    expect(await screen.findByText(/Ni la etapa del lote ni la especie/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
