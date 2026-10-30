// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-29 | Arekkazu | INC-M03-82-G192 RF-62: política de visión configurable desde M09   |
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: mismo contrato para la ventana de retroalimentación |
import { http } from '../../shared/api/http';
import type { ApiError } from '../../shared/api/errors';

/** Un parámetro de la política de visión de RF-62 (misma forma que /configuracion/parametros-alertas). */
export interface ParametroPolitica {
  nombre: string;
  descripcion: string;
  valor: number | string | null;
  valor_configurado: number | string | null;
  valor_base: number | string | null;
  fuente: 'CONFIGURADO' | 'VALOR_BASE' | 'SIN_CONFIGURAR';
  rango_minimo: number | string | null;
  rango_maximo: number | string | null;
}


/** Una respuesta que no es la lista de parámetros no debe romper la pestaña Sistema. */
function lista(data: unknown): ParametroPolitica[] {
  if (!Array.isArray(data)) {
    throw { code: 'CONTRATO_POLITICA_INVALIDO', message: 'Respuesta inesperada del servidor.', status: 502 } satisfies ApiError;
  }
  return data as ParametroPolitica[];
}

/** GET/PATCH de un grupo de parámetros DEV-14 administrados desde M09. */
export function parametrosApi(base: string) {
  return {
    async obtener(): Promise<ParametroPolitica[]> {
      return lista((await http.get<unknown>(base)).data);
    },
    async actualizar(parametros: Record<string, number>): Promise<ParametroPolitica[]> {
      return lista((await http.patch<unknown>(base, { parametros })).data);
    },
  };
}

export type ParametrosApi = ReturnType<typeof parametrosApi>;

export const politicaVisionApi = parametrosApi('/configuracion/politica-vision');
/** RF-72: ventana_retroalimentacion_dias (7 a 365). */
export const ventanaRetroalimentacionApi = parametrosApi('/configuracion/parametros-retroalimentacion');
