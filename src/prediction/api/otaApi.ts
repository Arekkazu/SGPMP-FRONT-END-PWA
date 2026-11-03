// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-05 RF-70: buscador y filtro por categoría en el paso de dispositivos |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M4-05 RF-70: solo equipos compatibles con el tipo de modelo de la versión |
import { http } from '../../shared/api/http';
import type {
  OtaStatusResponse,
  DespliegueOtaListResponse,
  ListarDesplieguesFiltros,
  CrearDistribucionOtaDTO,
  DistribucionOtaResponse,
  DispositivoObjetivoOta,
} from '../types';

export const otaApi = {
  /** Estado OTA de una versión de modelo (recurso 44). */
  async estadoPorVersion(
    idVersion: number,
    filtros: { id_dispositivo?: number; estado?: string } = {}
  ): Promise<OtaStatusResponse> {
    const res = await http.get<OtaStatusResponse>(`/prediccion/modelos/${idVersion}/ota-status`, {
      params: filtros,
    });
    return res.data;
  },

  /** Listado de despliegues OTA con filtros (limit/offset). */
  async listarDespliegues(filtros: ListarDesplieguesFiltros = {}): Promise<DespliegueOtaListResponse> {
    const res = await http.get<DespliegueOtaListResponse>('/prediccion/despliegues', {
      params: filtros,
    });
    return res.data;
  },

  /**
   * Lanza una distribución OTA (DEV-15, recurso 44 · E): una fila PENDIENTE por
   * nodo y aviso `ota/notify` a la fase canary. 201 con la distribución y sus despliegues.
   */
  async crearDistribucion(dto: CrearDistribucionOtaDTO): Promise<DistribucionOtaResponse> {
    const res = await http.post<DistribucionOtaRaw>('/prediccion/ota/distribuciones', dto);
    return mapDistribucion(res.data);
  },

  /** Estado del rollout y de cada nodo de una distribución (recurso 44 · R). */
  async obtenerDistribucion(idDistribucion: number): Promise<DistribucionOtaResponse> {
    const res = await http.get<DistribucionOtaRaw>(`/prediccion/ota/distribuciones/${idDistribucion}`);
    return mapDistribucion(res.data);
  },

  /**
   * M4-05: equipos que pueden recibir una versión de ese tipo de modelo: activos, en estado
   * ACTIVO y en un área con ese modelo asignado (`GET /prediccion/ota/dispositivos-objetivo`).
   * Antes salían los 575 equipos de todas las fincas, incluidas cámaras e inactivos.
   */
  async listarDispositivosObjetivo(tipoModelo: string): Promise<DispositivoObjetivoOta[]> {
    const res = await http.get<Omit<DispositivoObjetivoOta, 'es_activo'>[]>(
      '/prediccion/ota/dispositivos-objetivo',
      { params: { tipo_modelo: tipoModelo } },
    );
    return res.data.map((d) => ({ ...d, es_activo: true }));
  },
};

/** El backend serializa los Decimal como texto. */
type DistribucionOtaRaw = Omit<DistribucionOtaResponse, 'nivel_bateria_minimo'> & { nivel_bateria_minimo: string | number | null };

function mapDistribucion(raw: DistribucionOtaRaw): DistribucionOtaResponse {
  return { ...raw, nivel_bateria_minimo: raw.nivel_bateria_minimo === null ? null : Number(raw.nivel_bateria_minimo) };
}
