// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-09 RF-67: el selector de animales lee `registros` y recorre las páginas de M02 |
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { historialApi } from './historialApi';
import { extraerConfianza } from '../lib/riesgo';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn() } }));
afterEach(() => vi.mocked(http.get).mockReset());

describe('historialApi.listarActivos', () => {
  it('pide page_size 100 y junta los registros de todas las páginas', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({ data: { registros: [{ id_activo_biologico: 4 }], total_paginas: 2 } } as never)
      .mockResolvedValueOnce({ data: { registros: [{ id_activo_biologico: 5 }], total_paginas: 2 } } as never);
    const activos = await historialApi.listarActivos();
    expect(activos.map((a) => a.id_activo_biologico)).toEqual([4, 5]);
    expect(http.get).toHaveBeenNthCalledWith(1, '/activos-biologicos/', { params: { pagina: 1, page_size: 100 } });
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});

describe('extraerConfianza', () => {
  it('lee la confianza_global que manda el historial', () => {
    expect(extraerConfianza({ confianza_global: 0.82 })).toBe(0.82);
  });
});
