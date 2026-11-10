// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: cliente de la API /finanzas (valoración NIC 41) |
// | 2026-11-05 | Arekkazu | M06 prototipos: listados del período y auditoría ordenable |
// | 2026-11-10 | Arekkazu | INC-M06-337/345/351 RF-86/87: cancelar cierre, ajuste de período anterior y acumulado |
import { http } from '../../shared/api/http';
import type {
  Acumulado, ActivoValorado, Asignacion, Cadena, CalculoPeriodo, MedicionPeriodo, ProductoPeriodo, VariacionPeriodo, Clasificacion, Comprobante, Configuracion, ConfiguracionGeneral, Costo, CostoPayload,
  CostosManuales, Cotizacion, EstadoDetalle, EstadoResumen, HistorialActivo, InformeDetalle, InformePayload, InformeResumen,
  Linea, Naturaleza, PaginaAuditoria, Periodo, Precio, PrecioPayload, Prevalidacion, Propuesta, ResultadoCierre,
  ResultadoCosto, Simulacion, TipoAjuste,
} from '../types';

const B = '/finanzas';

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return (await http.get<T>(`${B}${url}`, { params })).data;
}
async function post<T>(url: string, body: unknown = {}): Promise<T> {
  return (await http.post<T>(`${B}${url}`, body)).data;
}
async function put<T>(url: string, body: unknown): Promise<T> {
  return (await http.put<T>(`${B}${url}`, body)).data;
}

export interface Archivo { blob: Blob; nombre: string }

/** El backend pone el nombre en Content-Disposition (expuesto por CORS). */
async function archivo(url: string, formato: string, respaldo: string): Promise<Archivo> {
  const res = await http.get(`${B}${url}`, { params: { formato }, responseType: 'blob' });
  const cabecera = String(res.headers['content-disposition'] ?? '');
  const nombre = /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? `${respaldo}.${formato === 'excel' ? 'xlsx' : formato}`;
  return { blob: res.data as Blob, nombre };
}

export const finanzasApi = {
  // Configuración contable (RF-84, RF-88, RF-109)
  configuracion: () => get<Configuracion>('/configuracion'),
  actualizarConfiguracion: (c: Pick<ConfiguracionGeneral, 'tipo_cierre' | 'pct_umbral_desviacion_precio' | 'dias_alerta_vencimiento_precio'>) =>
    put<ConfiguracionGeneral>('/configuracion', c),
  guardarEspecie: (idEspecie: number, p: { clasificacion: Clasificacion; categoria_precio: string; vida_util_meses: number | null }) =>
    put<unknown>(`/configuracion/especies/${idEspecie}`, p),
  guardarCostosVenta: (idEspecie: number, p: { pct_transporte: string; pct_comisiones: string; pct_impuestos: string }) =>
    put<{ id_parametro_costo_venta: number }>(`/configuracion/costos-venta/${idEspecie}`, p),
  guardarAsignacion: (a: Omit<Asignacion, 'id_asignacion_cuenta_contable'>) =>
    post<{ id_asignacion_cuenta_contable: number; lineas_resueltas: number }>('/configuracion/matriz', a),
  desactivarAsignacion: async (id: number) => { await http.delete(`${B}/configuracion/matriz/${id}`); return true; },

  // Precios de mercado (RF-89)
  precios: (idEspecie?: number) => get<Precio[]>('/precios', idEspecie ? { id_especie: idEspecie } : undefined),
  registrarPrecio: (p: PrecioPayload) =>
    post<{ id_precio_mercado: number; estado: string; desviacion_pct: string | null; fecha_vigencia: string }>('/precios', p),

  // Reconocimiento inicial (RF-82, RF-88 escenario A)
  propuestas: () => get<Propuesta[]>('/reconocimientos/propuestas'),
  propuesta: (idActivo: number, clasificacion?: Clasificacion) =>
    get<Propuesta>(`/reconocimientos/propuestas/${idActivo}`, clasificacion ? { clasificacion } : undefined),
  confirmar: (idActivo: number, body: { clasificacion?: Clasificacion; costos_manuales?: CostosManuales; justificacion?: string }) =>
    post<{ id_reconocimiento_inicial: number; valor_inicial: string; advertencias: string[] }>(`/reconocimientos/${idActivo}`, body),
  revertir: (idActivo: number, motivo: string) => post<unknown>(`/reconocimientos/${idActivo}/reversion`, { motivo_reversion: motivo }),

  // Valoración (RF-83 a RF-86) y modelo de costo (RF-88)
  activos: () => get<ActivoValorado[]>('/activos'),
  historial: (idActivo: number) => get<HistorialActivo>(`/activos/${idActivo}`),
  simular: (idActivo: number) => get<Simulacion>(`/activos/${idActivo}/simulacion`),
  procesarEventos: () => post<{ eventos: Record<string, number>; provisiones_m05: Record<string, number> }>('/eventos/procesar'),
  lineas: (idPeriodo: number, estado?: string) => get<Linea[]>('/lineas', { id_periodo_contable: idPeriodo, estado }),
  registrarDeterioro: (idActivo: number, body: { id_evento_sanitario: number; impacto_economico_cop: string; justificacion: string }) =>
    post<unknown>(`/activos/${idActivo}/deterioros`, body),
  cambiarAValorRazonable: (idActivo: number) => post<unknown>(`/activos/${idActivo}/valor-razonable`),
  eventosSanitarios: (idActivo: number) =>
    get<Array<{ id_evento: number; fecha: string; tipo: string; diagnostico: string | null }>>(`/activos/${idActivo}/eventos-sanitarios`),
  mediciones: (idPeriodo: number) => get<MedicionPeriodo[]>(`/periodos/${idPeriodo}/mediciones`),
  variaciones: (idPeriodo: number) => get<VariacionPeriodo[]>(`/periodos/${idPeriodo}/variaciones`),
  calculos: (idPeriodo: number) => get<CalculoPeriodo[]>(`/periodos/${idPeriodo}/calculos`),
  productos: (idPeriodo: number) => get<ProductoPeriodo[]>(`/periodos/${idPeriodo}/productos`),

  // Costos (RF-90)
  costos: (filtros: { id_activo_biologico?: number; id_periodo_contable?: number; estado?: string; origen_costo?: string }) =>
    get<Costo[]>('/costos', filtros),
  registrarCosto: (p: CostoPayload) => post<ResultadoCosto>('/costos', p),
  clasificarCosto: (id: number, naturaleza: Naturaleza, justificacion: string) =>
    post<unknown>(`/costos/${id}/clasificacion`, { naturaleza_costo: naturaleza, justificacion }),

  // Períodos y cierre (RF-87) y trazabilidad (RF-91)
  periodos: () => get<Periodo[]>('/periodos'),
  prevalidar: (id: number) => get<Prevalidacion>(`/periodos/${id}/prevalidacion`),
  cerrar: (id: number, body: { autorizar_exclusiones: boolean; incluir_activos_sin_precio: boolean }) =>
    post<ResultadoCierre>(`/periodos/${id}/cierre`, body),
  cancelarCierre: (id: number) => post<{ estado: string }>(`/periodos/${id}/cierre/cancelacion`),
  ajustarLinea: (idLinea: number, body: { tipo_ajuste: TipoAjuste; valor: string; justificacion: string }) =>
    post<{ id_linea_asiento_nic41: number; periodo: string; periodo_corregido: string }>(`/lineas-asiento/${idLinea}/ajustes`, body),
  comprobantes: (id: number) => get<Comprobante[]>(`/periodos/${id}/comprobantes`),
  descargarComprobantes: (id: number, formato: 'csv' | 'pdf') => archivo(`/periodos/${id}/comprobantes/descarga`, formato, `comprobantes-${id}`),
  verificarTrazabilidad: (id: number) =>
    post<{ verificadas: number; pendientes: Prevalidacion['lineas_sin_trazabilidad'] }>(`/periodos/${id}/trazabilidad`),
  cadena: (idLinea: number) => get<Cadena>(`/lineas/${idLinea}/cadena`),

  // Cotizaciones (RF-COT)
  cotizaciones: (estado?: string) => get<Cotizacion[]>('/cotizaciones', estado ? { estado } : undefined),
  registrarCotizacion: (body: { activos_cotizados: number[]; valor_cotizacion_propuesto: string; condiciones?: string | null; fecha_vencimiento?: string | null }) =>
    post<{ id_cotizacion: number }>('/cotizaciones', body),
  modificarCotizacion: async (id: number, body: { version: number; justificacion: string; valor_cotizacion_propuesto?: string; condiciones?: string | null; fecha_vencimiento?: string | null }) =>
    (await http.patch(`${B}/cotizaciones/${id}`, body)).data,
  anularCotizacion: (id: number, version: number, motivo: string) =>
    post<unknown>(`/cotizaciones/${id}/anulacion`, { version, motivo_anulacion: motivo }),

  // Estado de resultados (RF-93) y revelaciones (RF-92)
  estados: (idPeriodo: number) => get<EstadoResumen[]>(`/periodos/${idPeriodo}/estados-resultados`),
  estado: (id: number) => get<EstadoDetalle>(`/estados-resultados/${id}`),
  acumulado: (idPeriodo: number) => get<Acumulado>(`/periodos/${idPeriodo}/estado-resultados/acumulado`),
  generarEstado: (idPeriodo: number, filtros: { id_especie?: number; id_finca?: number; id_activo_biologico?: number }) =>
    post<{ id_estado: number }>(`/periodos/${idPeriodo}/estados-resultados`, filtros),
  aprobarEstado: (id: number) => post<unknown>(`/estados-resultados/${id}/aprobacion`),
  descargarEstado: (id: number, formato: 'pdf' | 'excel') => archivo(`/estados-resultados/${id}/descarga`, formato, `estado-resultados-${id}`),
  informes: (idPeriodo: number) => get<InformeResumen[]>(`/periodos/${idPeriodo}/revelaciones`),
  informe: (id: number) => get<InformeDetalle>(`/revelaciones/${id}`),
  generarInforme: (idPeriodo: number, body: InformePayload) => post<{ id_informe: number; version_informe: string }>(`/periodos/${idPeriodo}/revelaciones`, body),
  resolverInforme: (id: number, aprobar: boolean, razon?: string) =>
    post<unknown>(`/revelaciones/${id}/resolucion`, { aprobar, razon_rechazo: razon ?? null }),
  descargarInforme: (id: number, formato: 'pdf' | 'excel') => archivo(`/revelaciones/${id}/descarga`, formato, `revelaciones-${id}`),

  // Auditoría (RF-94)
  auditoria: (filtros: { id_periodo_contable?: number; id_activo_biologico?: number; tipo_evento?: string; severidad?: string;
    pagina: number; tamano?: number; orden?: 'ASC' | 'DESC' }) =>
    get<PaginaAuditoria>('/auditoria', { tamano: 50, ...filtros, formato: 'LEGIBLE' }),
};
