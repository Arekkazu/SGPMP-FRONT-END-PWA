import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { parametrosApi } from './parametrosApi';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const api = vi.mocked(http);
const config = {
  id_configuracion_global: 7, frecuencia_muestreo: 5, heartbeat: 15,
  fecha_actualizacion: '2026-10-19T12:00:00Z', id_usuario: 3, es_activo: true,
};

beforeEach(() => vi.clearAllMocks());

describe('parametrosApi — contrato RF-18 / DEV-14', () => {
  it('normaliza la respuesta anterior sin inventar un valor por defecto', async () => {
    api.get.mockResolvedValue({ data: config });
    expect(await parametrosApi.obtener()).toEqual({ ...config, umbral_sin_senal: 15 });
    expect(api.get).toHaveBeenCalledWith('/configuracion/parametros');
  });

  it('acepta el nombre canónico sin el alias legado', async () => {
    const { heartbeat: _, ...resto } = config;
    api.get.mockResolvedValue({ data: { ...resto, umbral_sin_senal: 20 } });
    expect(await parametrosApi.obtener()).toEqual({ ...resto, heartbeat: 20, umbral_sin_senal: 20 });
  });

  it('conserva null como ausencia real de configuración', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await parametrosApi.obtener()).toBeNull();
  });

  it.each([
    { ...config, umbral_sin_senal: 20 },
    { ...config, heartbeat: undefined },
    { ...config, umbral_sin_senal: null },
    { ...config, heartbeat: '15' },
    { ...config, heartbeat: 1.5 },
    { ...config, heartbeat: 0 },
    { ...config, frecuencia_muestreo: 30 },
    { ...config, fecha_actualizacion: undefined },
    { ...config, fecha_actualizacion: 'fecha inválida' },
    { ...config, id_configuracion_global: undefined },
    { ...config, es_activo: undefined },
  ])('rechaza una respuesta incompleta, inválida o contradictoria: %j', async (data) => {
    api.get.mockResolvedValue({ data });
    await expect(parametrosApi.obtener()).rejects.toMatchObject({
      code: 'CONTRATO_CONFIGURACION_INVALIDO', status: 502,
    });
  });

  it('PATCH conserva ambos valores, el token y el alias compatible', async () => {
    const dto = { frecuencia_muestreo: 8, heartbeat: 20, fecha_actualizacion: config.fecha_actualizacion };
    api.patch.mockResolvedValue({ data: { ...config, ...dto, umbral_sin_senal: 20 } });
    const result = await parametrosApi.actualizar(7, dto);
    expect(api.patch).toHaveBeenCalledWith('/configuracion/parametros/7', dto);
    expect(result.umbral_sin_senal).toBe(20);
    expect(dto).not.toHaveProperty('umbral_bateria_baja_pct');
  });

  it('POST crea con los dos campos reales, sin exigir un token de edición', async () => {
    api.post.mockResolvedValue({ data: config });
    await parametrosApi.crear({ frecuencia_muestreo: 5, heartbeat: 15 });
    expect(api.post).toHaveBeenCalledWith('/configuracion/parametros', { frecuencia_muestreo: 5, heartbeat: 15 });
  });
});
