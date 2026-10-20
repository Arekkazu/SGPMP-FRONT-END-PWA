import { http } from '../../shared/api/http';
import i18n from '../../shared/i18n';
import type { ApiError } from '../../shared/api/errors';
import type {
  ConfiguracionGlobalResponse,
  CrearConfiguracionGlobalDTO,
  ActualizarConfiguracionGlobalDTO,
} from '../types';

const BASE = '/configuracion/parametros';

type ConfiguracionEnAPI = Omit<ConfiguracionGlobalResponse, 'heartbeat'> & { heartbeat?: number };

/**
 * DEV-14 publica el nombre canónico junto al alias anterior. Normalizar ambos
 * contratos evita defaults ficticios y rechaza respuestas contradictorias.
 */
function normalizar(data: ConfiguracionEnAPI): ConfiguracionGlobalResponse {
  const umbral = data?.umbral_sin_senal !== undefined ? data.umbral_sin_senal : data?.heartbeat;
  const enteroPositivo = (valor: unknown): valor is number =>
    typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;

  if (
    !enteroPositivo(data?.frecuencia_muestreo) || !enteroPositivo(umbral) ||
    !Number.isSafeInteger(data?.id_configuracion_global) || !Number.isSafeInteger(data?.id_usuario) ||
    typeof data?.es_activo !== 'boolean' ||
    typeof data?.fecha_actualizacion !== 'string' || !Number.isFinite(Date.parse(data.fecha_actualizacion)) ||
    umbral < data.frecuencia_muestreo ||
    (data.heartbeat !== undefined && data.heartbeat !== umbral)
  ) {
    throw {
      code: 'CONTRATO_CONFIGURACION_INVALIDO',
      message: i18n.t('parametrossection.respuesta_invalida', { ns: 'configuration' }),
      status: 502,
    } satisfies ApiError;
  }

  return { ...data, heartbeat: umbral, umbral_sin_senal: umbral };
}

export const parametrosApi = {
  async obtener(): Promise<ConfiguracionGlobalResponse | null> {
    const res = await http.get<ConfiguracionEnAPI | null>(BASE);
    return res.data === null ? null : normalizar(res.data);
  },

  async crear(dto: CrearConfiguracionGlobalDTO): Promise<ConfiguracionGlobalResponse> {
    const res = await http.post<ConfiguracionGlobalResponse>(BASE, dto);
    return normalizar(res.data);
  },

  async actualizar(id: number, dto: ActualizarConfiguracionGlobalDTO): Promise<ConfiguracionGlobalResponse> {
    const res = await http.patch<ConfiguracionGlobalResponse>(`${BASE}/${id}`, dto);
    return normalizar(res.data);
  },
};
