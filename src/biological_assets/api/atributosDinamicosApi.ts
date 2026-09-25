import { http } from '../../shared/api/http';
import type { AtributoDinamicoConfig, TipoDatoAtributo } from '../types';

interface MetricaRaw {
  id_metrica_produccion: number;
  nombre: string;
  unidad_medida: string;
  aplica_a_tipo_activo: string;
  tipo_dato?: string;
  es_obligatorio?: boolean;
  valor_min?: number | string | null;
  valor_max?: number | string | null;
}

const TIPOS_DATO: TipoDatoAtributo[] = ['NUMERICO', 'ENTERO', 'TEXTO', 'BOOLEANO'];

function aNumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function aConfig(m: MetricaRaw): AtributoDinamicoConfig {
  const tipo = (m.tipo_dato ?? '').toUpperCase() as TipoDatoAtributo;
  const aplica = m.aplica_a_tipo_activo.toUpperCase();
  return {
    id: m.id_metrica_produccion,
    nombre: m.nombre,
    unidad_medida: m.unidad_medida,
    // Un tipo desconocido se captura como texto: el backend decide si lo acepta.
    tipo_dato: TIPOS_DATO.includes(tipo) ? tipo : 'TEXTO',
    es_obligatorio: m.es_obligatorio ?? false,
    aplica_a_tipo_activo: aplica === 'INDIVIDUAL' || aplica === 'LOTE' ? aplica : 'AMBOS',
    valor_min: aNumero(m.valor_min),
    valor_max: aNumero(m.valor_max),
  };
}

export const atributosDinamicosApi = {
  /**
   * Métricas activas de la especie: la misma configuración contra la que el
   * backend valida `atributos_dinamicos` al registrar (RF-33 FA-07).
   */
  async listarPorEspecie(idEspecie: number): Promise<AtributoDinamicoConfig[]> {
    const res = await http.get<{ items: MetricaRaw[] } | MetricaRaw[]>('/configuracion/metricas', {
      params: { id_especie: idEspecie, solo_activas: true },
    });
    const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    return items.map(aConfig);
  },
};
