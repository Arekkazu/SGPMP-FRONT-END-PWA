import { http } from '../../shared/api/http';
import type {
  ConfiguracionMotorIAListResponse,
  ConfiguracionMotorIAResponse,
  ConfigurarMotorDTO,
  ResultadoGuardarMotor,
  SincronizacionMotor,
} from '../types';

const BASE = '/prediccion/motor-ia';

/** Campos Decimal que el backend serializa como string (precisión) en vez de number. */
type CamposDecimales =
  | 'umbral_riesgo_alto'
  | 'umbral_alerta_critica'
  | 'w_factor_sanitario'
  | 'w_factor_ambiental'
  | 'w_factor_densidad'
  | 'temp_min_config'
  | 'temp_max_config'
  | 'hr_min_config'
  | 'hr_max_config'
  | 'densidad_maxima_config';

type ConfiguracionMotorIARaw = Omit<ConfiguracionMotorIAResponse, CamposDecimales> & {
  umbral_riesgo_alto: string;
  umbral_alerta_critica: string;
  w_factor_sanitario: string;
  w_factor_ambiental: string;
  w_factor_densidad: string;
  temp_min_config: string | null;
  temp_max_config: string | null;
  hr_min_config: string | null;
  hr_max_config: string | null;
  densidad_maxima_config: string | null;
};

function aNumeroONulo(v: string | null): number | null {
  return v === null ? null : Number(v);
}

/** Normaliza los Decimal serializados como string a `number` para la capa de dominio. */
function mapConfiguracion(raw: ConfiguracionMotorIARaw): ConfiguracionMotorIAResponse {
  return {
    ...raw,
    umbral_riesgo_alto: Number(raw.umbral_riesgo_alto),
    umbral_alerta_critica: Number(raw.umbral_alerta_critica),
    w_factor_sanitario: Number(raw.w_factor_sanitario),
    w_factor_ambiental: Number(raw.w_factor_ambiental),
    w_factor_densidad: Number(raw.w_factor_densidad),
    temp_min_config: aNumeroONulo(raw.temp_min_config),
    temp_max_config: aNumeroONulo(raw.temp_max_config),
    hr_min_config: aNumeroONulo(raw.hr_min_config),
    hr_max_config: aNumeroONulo(raw.hr_max_config),
    densidad_maxima_config: aNumeroONulo(raw.densidad_maxima_config),
  };
}

export const motorApi = {
  async listar(): Promise<ConfiguracionMotorIAListResponse> {
    const res = await http.get<{ total: number; items: ConfiguracionMotorIARaw[] }>(BASE);
    return { total: res.data.total, items: res.data.items.map(mapConfiguracion) };
  },

  /** El `tipo_modelo` puede llevar ñ → se codifica para la URL. */
  async obtenerPorTipo(tipoModelo: string): Promise<ConfiguracionMotorIAResponse> {
    const res = await http.get<ConfiguracionMotorIARaw>(`${BASE}/${encodeURIComponent(tipoModelo)}`);
    return mapConfiguracion(res.data);
  },

  /**
   * Upsert por `tipo_modelo` y envío a los nodos Edge (RF-65, DEV-09).
   *
   * 201/200: guardada y aplicada (o sin nodos). 202: guardada, algún nodo quedó
   * PENDIENTE (desconectado, E7) o FALLIDA (sin ACK, E8). 409: guardada, algún nodo
   * confirmó otra `config_version` (E10). El 409 trae la configuración y los nodos
   * en el cuerpo, no un error: se acepta aquí para que no lo convierta el interceptor.
   */
  async configurar(dto: ConfigurarMotorDTO): Promise<ResultadoGuardarMotor> {
    const res = await http.post<ConfiguracionMotorIARaw & { sincronizacion?: SincronizacionMotor }>(BASE, dto, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
    });
    const { sincronizacion, ...config } = res.data;
    return {
      config: mapConfiguracion(config),
      sincronizacion: sincronizacion ?? SIN_NODOS,
      status: res.status as ResultadoGuardarMotor['status'],
    };
  },

  /** Estado vigente de la configuración en cada nodo Edge (DEV-09). */
  async obtenerSincronizacion(tipoModelo: string): Promise<SincronizacionMotor> {
    const res = await http.get<SincronizacionMotor>(`${BASE}/${encodeURIComponent(tipoModelo)}/sincronizacion`);
    return res.data;
  },
};

/** Respuesta de un backend anterior a DEV-09, sin bloque de sincronización. */
const SIN_NODOS: SincronizacionMotor = { estado: 'APLICADA', mensaje: '', nodos: [] };
