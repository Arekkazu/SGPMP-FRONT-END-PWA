import { http } from '../../shared/api/http';
import type {
  ContextoInterfazResponse,
  IdentidadVisualResponse, GuardarIdentidadVisualDTO, ActualizarIdentidadVisualDTO,
  TemaResueltoResponse, TemaVisualResponse, GuardarTemaDTO,
  IdiomaResueltoResponse, PreferenciaIdiomaResponse, GuardarIdiomaDTO,
  DashboardLayoutResponse, GuardarDashboardDTO, WidgetCatalogoItem, WidgetDatosResponse,
} from '../types';

export const contextoApi = {
  async obtener(): Promise<ContextoInterfazResponse> {
    const res = await http.get<ContextoInterfazResponse>('/configuracion/interfaz/contexto');
    return res.data;
  },
};

export const identidadVisualApi = {
  async obtener(idFinca: number): Promise<IdentidadVisualResponse> {
    const res = await http.get<IdentidadVisualResponse>(`/configuracion/identidad-visual/${idFinca}`);
    return res.data;
  },

  async guardar(dto: GuardarIdentidadVisualDTO, logo?: File): Promise<IdentidadVisualResponse> {
    const form = new FormData();
    form.append('id_finca', String(dto.id_finca));
    form.append('primary_color', dto.primary_color);
    form.append('secondary_color', dto.secondary_color);
    form.append('org_display_name', dto.org_display_name);
    if (logo) form.append('logo', logo);
    const res = await http.post<IdentidadVisualResponse>('/configuracion/identidad-visual', form);
    return res.data;
  },

  async actualizar(idFinca: number, dto: ActualizarIdentidadVisualDTO, logo?: File): Promise<IdentidadVisualResponse> {
    const form = new FormData();
    form.append('primary_color', dto.primary_color);
    form.append('secondary_color', dto.secondary_color);
    form.append('org_display_name', dto.org_display_name);
    form.append('version', String(dto.version));
    if (logo) form.append('logo', logo);
    const res = await http.patch<IdentidadVisualResponse>(`/configuracion/identidad-visual/${idFinca}`, form);
    return res.data;
  },
};

export const temaVisualApi = {
  async obtener(): Promise<TemaResueltoResponse> {
    const res = await http.get<TemaResueltoResponse>('/configuracion/personalizacion/tema');
    return res.data;
  },

  async guardar(dto: GuardarTemaDTO): Promise<TemaVisualResponse> {
    const res = await http.patch<TemaVisualResponse>('/configuracion/personalizacion/tema', dto);
    return res.data;
  },

  async obtenerGlobal(): Promise<TemaResueltoResponse> {
    const res = await http.get<TemaResueltoResponse>('/configuracion/personalizacion/tema/global');
    return res.data;
  },

  async guardarGlobal(dto: GuardarTemaDTO): Promise<TemaVisualResponse> {
    const res = await http.patch<TemaVisualResponse>('/configuracion/personalizacion/tema/global', dto);
    return res.data;
  },
};

export const idiomaApi = {
  async obtener(): Promise<IdiomaResueltoResponse> {
    const res = await http.get<IdiomaResueltoResponse>('/configuracion/personalizacion/idioma');
    return res.data;
  },

  async guardar(dto: GuardarIdiomaDTO): Promise<PreferenciaIdiomaResponse> {
    const res = await http.patch<PreferenciaIdiomaResponse>('/configuracion/personalizacion/idioma', dto);
    return res.data;
  },

  // Devuelve `PreferenciaIdiomaResponse`, no el idioma resuelto: este endpoint
  // no aplica la jerarquía, lee la fila global directa (y puede ser `null`).
  async obtenerGlobal(): Promise<PreferenciaIdiomaResponse | null> {
    const res = await http.get<PreferenciaIdiomaResponse | null>('/configuracion/personalizacion/idioma/global');
    return res.data;
  },

  async guardarGlobal(dto: GuardarIdiomaDTO): Promise<PreferenciaIdiomaResponse> {
    const res = await http.patch<PreferenciaIdiomaResponse>('/configuracion/personalizacion/idioma/global', dto);
    return res.data;
  },
};

export const dashboardLayoutApi = {
  async obtener(): Promise<DashboardLayoutResponse> {
    const res = await http.get<DashboardLayoutResponse>('/configuracion/personalizacion/dashboard');
    return res.data;
  },

  async guardar(dto: GuardarDashboardDTO): Promise<DashboardLayoutResponse> {
    const res = await http.patch<DashboardLayoutResponse>('/configuracion/personalizacion/dashboard', dto);
    return res.data;
  },

  async restaurar(): Promise<DashboardLayoutResponse> {
    const res = await http.post<DashboardLayoutResponse>('/configuracion/personalizacion/dashboard/restaurar');
    return res.data;
  },

  async catalogo(): Promise<WidgetCatalogoItem[]> {
    const res = await http.get<WidgetCatalogoItem[]>('/configuracion/personalizacion/dashboard/widgets');
    return res.data;
  },

  async datos(): Promise<WidgetDatosResponse[]> {
    const res = await http.get<WidgetDatosResponse[]>('/configuracion/personalizacion/dashboard/datos');
    return res.data;
  },
};
