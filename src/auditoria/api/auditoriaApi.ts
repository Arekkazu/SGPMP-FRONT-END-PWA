import { http } from '../../shared/api/http';
import { aInstanteUtc } from '../../shared/lib/fecha';
import type {
  AuditoriaExportacion,
  AuditoriaPaginadaResponse,
  EstadoExportacion,
  ExportacionEncolada,
  FiltrosAuditoria,
  TipoEvento,
} from '../types';

// El backend arma el CSV completo en un request. La instancia global corta a los
// 15 s (shared/api/http.ts) y eso no alcanza para 10.000 filas con verificación
// de integridad.
const TIMEOUT_EXPORTACION_MS = 60_000;

type Params = Record<string, string | number | boolean>;

function construirParams(filtros: Partial<FiltrosAuditoria>): Params {
  const params: Params = {};
  if (filtros.id_usuario != null) params.id_usuario = filtros.id_usuario;
  if (filtros.tipo_evento != null) params.tipo_evento = filtros.tipo_evento;
  // Los filtros viajan siempre como instante UTC: el backend compara contra
  // una columna timestamptz y un valor sin zona se leería en la del servidor.
  const desde = filtros.fecha_desde && aInstanteUtc(filtros.fecha_desde);
  const hasta = filtros.fecha_hasta && aInstanteUtc(filtros.fecha_hasta);
  if (desde) params.fecha_desde = desde;
  if (hasta) params.fecha_hasta = hasta;
  return params;
}

/** Lee las cabeceras de conteo que el backend expone vía CORS. */
function leerConteos(headers: Record<string, unknown>, filas: number) {
  const total = Number(headers['x-total-registros']);
  const exportados = Number(headers['x-registros-exportados']);
  return {
    total: Number.isFinite(total) ? total : filas,
    exportados: Number.isFinite(exportados) ? exportados : filas,
  };
}

export const auditoriaApi = {
  async consultar(filtros: FiltrosAuditoria): Promise<AuditoriaPaginadaResponse> {
    const res = await http.get<AuditoriaPaginadaResponse>('/auditoria/', {
      params: { ...construirParams(filtros), pagina: filtros.pagina, tamano: filtros.tamano },
    });
    return res.data;
  },

  /** Catálogo de `modulo1.tipos_eventos`, para no mantener una copia local. */
  async tiposEvento(): Promise<TipoEvento[]> {
    const res = await http.get<TipoEvento[]>('/auditoria/catalogo/tipos-evento');
    return res.data;
  },

  async exportar(filtros: Partial<FiltrosAuditoria>): Promise<AuditoriaExportacion> {
    // `text` y no `blob`: con blob el cuerpo de un error también llega como Blob
    // y mapToApiError pierde el código y el mensaje del backend.
    const res = await http.get<string>('/auditoria/exportar', {
      params: construirParams(filtros),
      responseType: 'text',
      timeout: TIMEOUT_EXPORTACION_MS,
    });
    const csv = res.data;
    const { total, exportados } = leerConteos(res.headers as Record<string, unknown>, 0);
    return { csv, total, exportados, truncado: exportados < total };
  },

  async solicitarExportacion(filtros: Partial<FiltrosAuditoria>): Promise<ExportacionEncolada> {
    const res = await http.post<ExportacionEncolada>('/auditoria/exportaciones', null, {
      params: construirParams(filtros),
    });
    return res.data;
  },

  async consultarExportacion(idCola: number): Promise<EstadoExportacion> {
    const res = await http.get<EstadoExportacion>(`/auditoria/exportaciones/${idCola}`);
    return res.data;
  },

  async descargarExportacion(idCola: number): Promise<AuditoriaExportacion> {
    const res = await http.get<string>(`/auditoria/exportaciones/${idCola}/descargar`, {
      responseType: 'text',
      timeout: TIMEOUT_EXPORTACION_MS,
    });
    const csv = res.data;
    const { total, exportados } = leerConteos(res.headers as Record<string, unknown>, 0);
    return { csv, total, exportados, truncado: exportados < total };
  },
};
