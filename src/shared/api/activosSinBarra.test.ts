// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | AJF-09/AJF-14: la lista de activos se pide sin barra final |
/**
 * En DEV la lista de animales salía vacía: `GET /activos-biologicos/` responde 307 hacia una
 * URL sin el prefijo del proxy (/sigab-dev) y el navegador no llega. La ruta del backend es
 * `/activos-biologicos`, sin barra final.
 */
import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { historialApi } from '../../prediction/api/historialApi';
import { alertasApi } from '../../telemetry/api/alertasApi';

vi.mock('./http', () => ({ http: { get: vi.fn() } }));

describe('lista de activos', () => {
  it.each([
    ['historialApi (reentrenamiento, monitor, historial)', () => historialApi.listarActivos()],
    ['alertasApi (filtro de alertas)', () => alertasApi.listarActivos()],
  ])('%s llama /activos-biologicos sin barra', async (_n, llamar) => {
    vi.mocked(http.get).mockReset().mockResolvedValue({ data: { registros: [{ id_activo_biologico: 4, identificador: 'BOV-001-DEV' }], total_paginas: 1 } } as never);
    const activos = await llamar();
    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/activos-biologicos');
    expect(activos).toHaveLength(1);
  });
});
