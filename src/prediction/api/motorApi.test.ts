/**
 * FE-02 (RF-65 E7/E8/E10, DEV-09): `POST /prediccion/motor-ia` responde 201/200,
 * 202 o 409, siempre con la configuración guardada y el estado de cada nodo.
 * Antes el 202 se trataba como un guardado normal y el 409 llegaba como error.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { motorApi } from './motorApi';
import type { ConfigurarMotorDTO } from '../types';

vi.mock('../../shared/api/http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

const postMock = vi.mocked(http.post);
const getMock = vi.mocked(http.get);

const DTO: ConfigurarMotorDTO = {
  tipo_modelo: 'MODELO_ACUICULTURA', ventana_temporal_min: 10, modo_ejecucion: 'EDGE',
  w_factor_sanitario: 0.5, w_factor_ambiental: 0.3, w_factor_densidad: 0.2, umbral_score_anomalia: 0.6,
};

const NODO = {
  id_dispositivo_iot: 38, serial: 'DISPOSITIVOCAMARONERA41', config_version_servidor: 1, config_version_nodo: null,
  estado_sincronizacion: 'PENDIENTE', intentos_sincronizacion: 1, fecha_ultimo_intento: '2026-10-19T06:00:00Z',
  fecha_aplicacion: null, motivo_fallo: 'El dispositivo está desconectado; el comando no se publicó.',
};

function respuesta(status: number, sincronizacion: unknown) {
  return {
    status,
    data: {
      id_configuracion_motor: 4, tipo_modelo: 'MODELO_ACUICULTURA', paradigma: 'POBLACIONAL',
      umbral_riesgo_alto: null, umbral_alerta_critica: null, umbral_score_anomalia: '0.600',
      ventana_temporal_min: 10, modo_ejecucion: 'EDGE', config_version: 1,
      w_factor_sanitario: '0.500', w_factor_ambiental: '0.300', w_factor_densidad: '0.200',
      temp_min_config: null, temp_max_config: null, hr_min_config: null, hr_max_config: null,
      densidad_maxima_config: null, es_activa: true, id_usuario_responsable: 3, fecha_creacion: '2026-10-19T06:00:00Z',
      sincronizacion,
    },
  };
}

describe('motorApi.configurar — sincronización con los nodos (FE-02)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('202 con el nodo apagado devuelve la configuración y el nodo PENDIENTE', async () => {
    postMock.mockResolvedValue(respuesta(202, { estado: 'PENDIENTE', mensaje: 'x', nodos: [NODO] }));
    const r = await motorApi.configurar(DTO);
    expect(r.status).toBe(202);
    expect(r.config.config_version).toBe(1);
    expect(r.config.w_factor_sanitario).toBe(0.5);
    expect(r.config).not.toHaveProperty('sincronizacion');
    expect(r.sincronizacion.nodos[0]).toMatchObject({ serial: 'DISPOSITIVOCAMARONERA41', estado_sincronizacion: 'PENDIENTE' });
  });

  it('acepta el 409 como respuesta y no como error (E10)', async () => {
    postMock.mockResolvedValue(respuesta(409, { estado: 'DESINCRONIZADO', mensaje: 'x', nodos: [{ ...NODO, estado_sincronizacion: 'DESINCRONIZADO' }] }));
    const r = await motorApi.configurar(DTO);
    expect(r.status).toBe(409);
    const { validateStatus } = postMock.mock.calls[0][2] as { validateStatus: (s: number) => boolean };
    expect([200, 201, 202, 409].every(validateStatus)).toBe(true);
    expect([400, 403, 412, 422, 500].some(validateStatus)).toBe(false);
  });

  it('sin bloque de sincronización (backend anterior a DEV-09) no hay nodos', async () => {
    postMock.mockResolvedValue(respuesta(201, undefined));
    const r = await motorApi.configurar(DTO);
    expect(r.sincronizacion).toEqual({ estado: 'APLICADA', mensaje: '', nodos: [] });
  });

  it('consulta el estado por nodo del tipo de modelo', async () => {
    getMock.mockResolvedValue({ data: { estado: 'APLICADA', mensaje: 'ok', nodos: [] } });
    await motorApi.obtenerSincronizacion('MODELO_ACUICULTURA');
    expect(getMock).toHaveBeenCalledWith('/prediccion/motor-ia/MODELO_ACUICULTURA/sincronizacion');
  });
});
