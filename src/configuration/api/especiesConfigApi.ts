import { http } from '../../shared/api/http';
import type {
  CicloBiologicoResponse, RegistrarCicloDTO, EditarCicloDTO,
  PatologiaEspecieItemResponse, RegistrarPatologiaDTO, EditarPatologiaDTO,
  MetricaProduccionResponse, RegistrarMetricaDTO, EditarMetricaDTO,
  UmbralAmbientalResponse, RegistrarUmbralDTO, EditarUmbralDTO,
  VariableAmbientalCatalogo,
  SnapshotEspecie,
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

export const variablesAmbientalesApi = {
  async listar(): Promise<VariableAmbientalCatalogo[]> {
    const res = await http.get<{ total: number; items: VariableAmbientalCatalogo[] }>(
      '/configuracion/variables-ambientales'
    );
    return res.data.items;
  },
};

// =====================================================================
// Captura de configuración para plantillas (RF-31)
// =====================================================================

/**
 * Lee la configuración real de una especie y la deja en la forma exacta que
 * `POST /configuracion/plantillas` espera en `params_snapshot`.
 *
 * Cada categoría lleva solo los campos que el backend vuelve a escribir al
 * aplicar la plantilla (RF-32, `*_desde_snapshot`): los ids no viajan porque la
 * plantilla se aplica sobre otra especie, que tendrá ids propios.
 */
export async function capturarConfiguracionEspecie(idEspecie: number): Promise<SnapshotEspecie> {
  const [ciclos, patologias, metricas, umbrales] = await Promise.all([
    ciclosApi.listar(idEspecie, true),
    patologiasApi.listar(idEspecie, true),
    metricasApi.listar(idEspecie, true),
    umbralesApi.listar(idEspecie, true),
  ]);

  return {
    ciclos_biologicos: ciclos.map((c) => ({
      nombre: c.nombre,
      duracion_dias: c.duracion_dias,
      descripcion: c.descripcion,
    })),
    patologias: patologias.map((p) => ({
      nombre: p.nombre,
      descripcion: p.descripcion,
      es_activo: p.es_activo,
    })),
    metricas_produccion: metricas.map((m) => ({
      nombre: m.nombre,
      unidad_medida: m.unidad_medida,
      tipo_medicion: m.tipo_medicion,
      aplica_a_tipo_activo: m.aplica_a_tipo_activo,
    })),
    umbrales_ambientales: umbrales.map((u) => ({
      id_variable_ambiental: u.id_variable_ambiental,
      unidad_medida: u.unidad_medida,
      valor_min: String(u.valor_min),
      valor_max: String(u.valor_max),
      niveles: u.niveles.map((n) => ({
        nivel: n.nivel,
        limite_inferior: String(n.limite_inferior),
        limite_superior: String(n.limite_superior),
      })),
    })),
  };
}
