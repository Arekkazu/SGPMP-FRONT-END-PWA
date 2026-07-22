import { http } from '../../shared/api/http';
import type {
  CicloBiologicoResponse, RegistrarCicloDTO, EditarCicloDTO,
  PatologiaEspecieItemResponse, RegistrarPatologiaDTO, EditarPatologiaDTO,
  MetricaProduccionResponse, RegistrarMetricaDTO, EditarMetricaDTO,
  UmbralAmbientalResponse, RegistrarUmbralDTO, EditarUmbralDTO,
} from '../types';

export const ciclosApi = {
  async listar(idEspecie: number, soloActivas = false): Promise<CicloBiologicoResponse[]> {
    const res = await http.get<CicloBiologicoResponse[]>('/configuracion/ciclos/', {
      params: { id_especie: idEspecie, solo_activas: soloActivas },
    });
    return res.data;
  },

  async registrar(dto: RegistrarCicloDTO): Promise<CicloBiologicoResponse> {
    const res = await http.post<CicloBiologicoResponse>('/configuracion/ciclos/', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarCicloDTO): Promise<CicloBiologicoResponse> {
    const res = await http.patch<CicloBiologicoResponse>(`/configuracion/ciclos/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<CicloBiologicoResponse> {
    const res = await http.patch<CicloBiologicoResponse>(`/configuracion/ciclos/${id}/desactivar`);
    return res.data;
  },
};

export const patologiasApi = {
  async listar(idEspecie: number, soloActivas = false): Promise<PatologiaEspecieItemResponse[]> {
    const res = await http.get<PatologiaEspecieItemResponse[]>('/configuracion/patologias/', {
      params: { id_especie: idEspecie, solo_activas: soloActivas },
    });
    return res.data;
  },

  async registrar(dto: RegistrarPatologiaDTO): Promise<PatologiaEspecieItemResponse> {
    const res = await http.post<PatologiaEspecieItemResponse>('/configuracion/patologias/', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarPatologiaDTO): Promise<PatologiaEspecieItemResponse> {
    const res = await http.patch<PatologiaEspecieItemResponse>(`/configuracion/patologias/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<PatologiaEspecieItemResponse> {
    const res = await http.patch<PatologiaEspecieItemResponse>(`/configuracion/patologias/${id}/desactivar`);
    return res.data;
  },
};

export const metricasApi = {
  async listar(idEspecie: number, soloActivas = false): Promise<MetricaProduccionResponse[]> {
    const res = await http.get<MetricaProduccionResponse[]>('/configuracion/metricas/', {
      params: { id_especie: idEspecie, solo_activas: soloActivas },
    });
    return res.data;
  },

  async registrar(dto: RegistrarMetricaDTO): Promise<MetricaProduccionResponse> {
    const res = await http.post<MetricaProduccionResponse>('/configuracion/metricas/', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarMetricaDTO): Promise<MetricaProduccionResponse> {
    const res = await http.patch<MetricaProduccionResponse>(`/configuracion/metricas/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<MetricaProduccionResponse> {
    const res = await http.patch<MetricaProduccionResponse>(`/configuracion/metricas/${id}/desactivar`);
    return res.data;
  },
};

export const umbralesApi = {
  async listar(idEspecie: number, soloActivas = false): Promise<UmbralAmbientalResponse[]> {
    const res = await http.get<UmbralAmbientalResponse[]>('/configuracion/umbrales/', {
      params: { id_especie: idEspecie, solo_activas: soloActivas },
    });
    return res.data;
  },

  async registrar(dto: RegistrarUmbralDTO): Promise<UmbralAmbientalResponse> {
    const res = await http.post<UmbralAmbientalResponse>('/configuracion/umbrales/', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarUmbralDTO): Promise<UmbralAmbientalResponse> {
    const res = await http.patch<UmbralAmbientalResponse>(`/configuracion/umbrales/${id}`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<UmbralAmbientalResponse> {
    const res = await http.patch<UmbralAmbientalResponse>(`/configuracion/umbrales/${id}/desactivar`);
    return res.data;
  },
};
