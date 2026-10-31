// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M4-05 RF-70: solo equipos compatibles con el tipo de modelo de la versión |
/** FE-01b (RF-70, DEV-15): endpoints del orquestador OTA. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { otaApi } from './otaApi';

vi.mock('../../shared/api/http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(http.get);
const postMock = vi.mocked(http.post);

const DISTRIBUCION = {
  id_distribucion_ota: 1, id_version_modelo: 35, tipo_modelo: 'MODELO_AVES', componente: 'DETECTOR',
  modo_distribucion: 'INMEDIATO', ventana_inicio: null, ventana_fin: null, nivel_bateria_minimo: '30.00',
  tamano_fragmento_bytes: 65536, max_reintentos_descarga: 3, porcentaje_parcial: 25, fase_rollout: 'CANARY',
  estado_distribucion: 'EN_CURSO', id_usuario: 1, fecha_creacion: null, fecha_actualizacion: null, despliegues: [],
};

describe('otaApi — orquestador OTA (FE-01b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lanza la distribución y convierte el Decimal de batería a número', async () => {
    postMock.mockResolvedValue({ data: DISTRIBUCION });
    const dto = {
      id_version_modelo: 35, lista_dispositivos_objetivo: [38, 1], modo_distribucion: 'INMEDIATO' as const,
      tamano_fragmento_bytes: 65536, max_reintentos_descarga: 3, porcentaje_parcial: 25, nivel_bateria_minimo: 30,
    };
    const r = await otaApi.crearDistribucion(dto);
    expect(postMock).toHaveBeenCalledWith('/prediccion/ota/distribuciones', dto);
    expect(r.nivel_bateria_minimo).toBe(30);
  });

  it('consulta una distribución por id', async () => {
    getMock.mockResolvedValue({ data: { ...DISTRIBUCION, nivel_bateria_minimo: null } });
    const r = await otaApi.obtenerDistribucion(1);
    expect(getMock).toHaveBeenCalledWith('/prediccion/ota/distribuciones/1');
    expect(r.nivel_bateria_minimo).toBeNull();
  });

  it('M4-05: pide al backend solo los equipos compatibles con el tipo de modelo', async () => {
    getMock.mockResolvedValue({ data: [{ id_dispositivo_iot: 38, serial: 'EDGE-38', descripcion: 'Gateway', categoria: 'SENSOR', nombre_infraestructura: 'Galpón 1' }] });
    const r = await otaApi.listarDispositivosObjetivo('MODELO_AVES');
    expect(getMock).toHaveBeenCalledWith('/prediccion/ota/dispositivos-objetivo', { params: { tipo_modelo: 'MODELO_AVES' } });
    expect(r).toEqual([{ id_dispositivo_iot: 38, serial: 'EDGE-38', descripcion: 'Gateway', categoria: 'SENSOR', nombre_infraestructura: 'Galpón 1', es_activo: true }]);
  });
});
