// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | RF-19 v1.1: titular tributario de la finca (M06 cierra por titular) |
import { http } from '../../shared/api/http';
import type {
  FincaResponse, RegistrarFincaDTO, EditarFincaDTO, TitularFinca,
  InfraestructuraResponse, RegistrarInfraestructuraDTO, EditarInfraestructuraDTO,
} from '../types';

export const fincasApi = {
  async listar(soloActivas = false): Promise<FincaResponse[]> {
    // El backend responde { total, items }, no un arreglo.
    const res = await http.get<{ items: FincaResponse[] }>('/configuracion/fincas', { params: { solo_activas: soloActivas } });
    return res.data.items;
  },

  async obtener(id: number): Promise<FincaResponse> {
    const res = await http.get<FincaResponse>(`/configuracion/fincas/${id}`);
    return res.data;
  },

  async registrar(dto: RegistrarFincaDTO): Promise<FincaResponse> {
    const res = await http.post<FincaResponse>('/configuracion/fincas', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarFincaDTO): Promise<FincaResponse> {
    const res = await http.patch<FincaResponse>(`/configuracion/fincas/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<FincaResponse> {
    const res = await http.patch<FincaResponse>(`/configuracion/fincas/${id}/desactivar`);
    return res.data;
  },

  /** RF-19 v1.1: entidad que lleva la contabilidad de la finca (M06 cierra por titular). */
  async titular(id: number): Promise<TitularFinca> {
    return (await http.get<TitularFinca>(`/configuracion/fincas/${id}/titular`)).data;
  },

  /** `tipo_id_tributaria: null` quita el titular. */
  async asignarTitular(id: number, dto: Omit<TitularFinca, 'id_finca' | 'nombre'>): Promise<TitularFinca> {
    return (await http.put<TitularFinca>(`/configuracion/fincas/${id}/titular`, dto)).data;
  },

  async reactivar(id: number): Promise<FincaResponse> {
    const res = await http.patch<FincaResponse>(`/configuracion/fincas/${id}/reactivar`);
    return res.data;
  },
};

export const infraestructurasApi = {
  async listarPorFinca(fincaId: number, soloActivas = false): Promise<InfraestructuraResponse[]> {
    const res = await http.get<{ items: InfraestructuraResponse[] }>('/configuracion/infraestructuras', {
      params: { finca_id: fincaId, solo_activas: soloActivas },
    });
    return res.data.items;
  },

  async obtener(id: number): Promise<InfraestructuraResponse> {
    const res = await http.get<InfraestructuraResponse>(`/configuracion/infraestructuras/${id}`);
    return res.data;
  },

  async registrar(dto: RegistrarInfraestructuraDTO): Promise<InfraestructuraResponse> {
    const res = await http.post<InfraestructuraResponse>('/configuracion/infraestructuras', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarInfraestructuraDTO): Promise<InfraestructuraResponse> {
    const res = await http.patch<InfraestructuraResponse>(`/configuracion/infraestructuras/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<InfraestructuraResponse> {
    const res = await http.patch<InfraestructuraResponse>(`/configuracion/infraestructuras/${id}/desactivar`);
    return res.data;
  },

  /** RF-20 v1.1: reactivar un área inactiva (Admin). */
  async reactivar(id: number): Promise<InfraestructuraResponse> {
    const res = await http.patch<InfraestructuraResponse>(`/configuracion/infraestructuras/${id}/reactivar`);
    return res.data;
  },
};
