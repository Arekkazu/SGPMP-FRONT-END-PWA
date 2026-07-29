import { http } from '../../shared/api/http';
import type {
  ConfiguracionMotorIAListResponse,
  ConfiguracionMotorIAResponse,
  ConfigurarMotorDTO,
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
    const res = await http.get<{ total: number; items: ConfiguracionMotorIARaw[] }>(`${BASE}/`);
    return { total: res.data.total, items: res.data.items.map(mapConfiguracion) };
  },

  /** El `tipo_modelo` puede llevar ñ → se codifica para la URL. */
  async obtenerPorTipo(tipoModelo: string): Promise<ConfiguracionMotorIAResponse> {
    const res = await http.get<ConfiguracionMotorIARaw>(`${BASE}/${encodeURIComponent(tipoModelo)}`);
    return mapConfiguracion(res.data);
  },

  /** Upsert por `tipo_modelo`: 201 si crea, 200 si actualiza (ambos éxito). */
  async configurar(dto: ConfigurarMotorDTO): Promise<ConfiguracionMotorIAResponse> {
    const res = await http.post<ConfiguracionMotorIARaw>(`${BASE}/`, dto);
    return mapConfiguracion(res.data);
  },
};
