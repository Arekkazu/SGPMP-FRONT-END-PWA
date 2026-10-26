// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-05 RF-70: buscador y filtro por categoría en el paso de dispositivos |
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

  /** Dispositivos activos que se pueden elegir como objetivo (`GET /configuracion/dispositivos-iot`). */
  async listarDispositivosObjetivo(): Promise<DispositivoObjetivoOta[]> {
    const res = await http.get<{ items: DispositivoObjetivoOta[] } | DispositivoObjetivoOta[]>(
      '/configuracion/dispositivos-iot',
      { params: { solo_activos: true } },
    );
    const items = Array.isArray(res.data) ? res.data : res.data.items;
    return items.map(({ id_dispositivo_iot, serial, descripcion, es_activo, categoria }) => ({ id_dispositivo_iot, serial, descripcion, es_activo, categoria }));
  },
};

/** El backend serializa los Decimal como texto. */
type DistribucionOtaRaw = Omit<DistribucionOtaResponse, 'nivel_bateria_minimo'> & { nivel_bateria_minimo: string | number | null };

function mapDistribucion(raw: DistribucionOtaRaw): DistribucionOtaResponse {
  return { ...raw, nivel_bateria_minimo: raw.nivel_bateria_minimo === null ? null : Number(raw.nivel_bateria_minimo) };
}
