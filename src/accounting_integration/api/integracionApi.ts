// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-95..102: cliente de la API /integracion |
import { http } from '../../shared/api/http';
import type {
  Anexo, ClienteExterno, ClientePayload, ClienteRegistrado, ConfiguracionCliente, Contrato, EnvelopeAaef, FiltrosAuditoria,
  PaginaEventos, VistaPrevia,
} from '../types';

const B = '/integracion';

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return (await http.get<T>(`${B}${url}`, { params })).data;
}
async function post<T>(url: string, body: unknown = {}): Promise<T> {
  return (await http.post<T>(`${B}${url}`, body)).data;
}

export const integracionApi = {
  // Vista previa del documento AAEF (RF-97, RF-AE02 5.10)
  vistaPrevia: async (nit: string, desde: string, hasta: string): Promise<VistaPrevia> => {
    const res = await http.get<EnvelopeAaef>(`${B}/aaef/vista-previa/productores/${nit}`, { params: { desde, hasta } });
    return {
      envelope: res.data, version: String(res.headers['x-version-contrato-aaef'] ?? ''),
      hash: String(res.headers['x-content-sha256'] ?? ''), texto: JSON.stringify(res.data, null, 2),
    };
  },

  // Clientes externos (RF-101)
  clientes: () => get<ClienteExterno[]>('/clientes'),
  registrarCliente: (p: ClientePayload) => post<ClienteRegistrado>('/clientes', p),
  editarCliente: async (id: number, p: ConfiguracionCliente & { fecha_actualizacion: string }) =>
    (await http.patch<ClienteExterno>(`${B}/clientes/${id}`, p)).data,
  cambiarEstado: (id: number, accion: 'suspender' | 'reactivar' | 'revocar', motivo?: string) =>
    post<ClienteExterno>(`/clientes/${id}/${accion}`, { motivo }),
  rotarSecreto: (id: number, motivo: string, fecha_vencimiento: string, client_secret?: string) =>
    post<{ client_secret: string }>(`/clientes/${id}/rotar`, { motivo, fecha_vencimiento, client_secret }),

  // Anexo y contratos (RF-AE02, RF-98)
  anexos: () => get<Anexo[]>('/anexos'),
  registrarAnexo: (p: Pick<Anexo, 'codigo_anexo' | 'version_anexo' | 'ruta_documento' | 'sha256_documento'>) => post<Anexo>('/anexos', p),
  enviarARevision: (id: number) => post<Anexo>(`/anexos/${id}/revision`),
  aprobarAnexo: (id: number, p: { id_intercambio: string; ack_aceptado: boolean; observaciones?: string }) =>
    post<Anexo>(`/anexos/${id}/aprobar`, p),
  contratos: () => get<Contrato[]>('/contratos'),
  registrarContrato: (p: {
    contrato_version: string; tipo_cambio: 'MAJOR' | 'MINOR'; fecha_vigencia: string; id_mapeo_anexo_aaef: number;
    mapeadores: string[]; periodo_gracia_dias?: number; descripcion?: string;
  }) => post<Contrato>('/contratos', p),
  activarContrato: (id: number) => post<Contrato>(`/contratos/${id}/activar`),
  deprecarContrato: (id: number, dias_gracia: number) => post<Contrato>(`/contratos/${id}/deprecar`, { dias_gracia }),

  // Auditoría de integración (RF-102)
  auditoria: (filtros: FiltrosAuditoria, pagina: number, tamano = 50) =>
    get<PaginaEventos>('/auditoria', { ...filtros, pagina, tamano }),
  exportarAuditoria: async (filtros: FiltrosAuditoria, formato: 'csv' | 'json') => {
    const res = await http.get(`${B}/auditoria/exportar`, { params: { ...filtros, formato }, responseType: 'blob' });
    const nombre = /filename="?([^";]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1]
      ?? `auditoria_integracion.${formato}`;
    return { blob: res.data as Blob, nombre };
  },
};
